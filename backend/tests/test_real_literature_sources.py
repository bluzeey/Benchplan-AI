"""Synthetic official-API response fixtures only; pytest-socket forbids real calls."""

import json
import logging
import socket
from urllib.parse import parse_qs
from unittest.mock import Mock

import httpx
import pytest
from pytest_socket import SocketBlockedError

from apps.literature import services
from apps.literature.services import europe_pmc, protocols_io, pubmed, scoring

PRIVATE = "private-hypothesis-and-secret-token"
CLIENTS = [pubmed.search_pubmed, europe_pmc.search_europe_pmc]


def article(pmid="32123456", title="Synthetic response citation", doi="10.1234/citation", year="2024"):
    return f"""<PubmedArticle><MedlineCitation><PMID>{pmid}</PMID><Article>
    <ArticleTitle>{title}</ArticleTitle>
    <Journal><JournalIssue><PubDate><Year>{year}</Year></PubDate></JournalIssue></Journal>
    <AuthorList><Author><ForeName>Ada</ForeName><LastName>Sample</LastName></Author>
    <Author><CollectiveName>Fixture Consortium</CollectiveName></Author></AuthorList>
    <Abstract><AbstractText Label="BACKGROUND">Synthetic <i>abstract</i>.</AbstractText>
    <AbstractText Label="RESULTS">Second section.</AbstractText></Abstract></Article></MedlineCitation>
    <PubmedData><ArticleIdList><ArticleId IdType="doi">{doi}</ArticleId></ArticleIdList></PubmedData>
    </PubmedArticle>"""


def xml_response(*articles):
    return "<PubmedArticleSet>" + "".join(articles) + "</PubmedArticleSet>"


def epmc_paper(**updates):
    return {
        "source": "MED", "id": "32123456", "title": "Synthetic response citation",
        "pubYear": "2024", "doi": "10.1234/citation", "abstractText": "<p>Synthetic abstract.</p>",
        "authorList": {"author": [{"fullName": "Sample A"}, {"collectiveName": "Fixture Consortium"}]},
        **updates,
    }


def reference(source="pubmed", title="Synthetic retrieved citation", doi="10.1234/citation", **updates):
    return {"source": source, "title": title, "doi": doi, "year": 2024, **updates}


@pytest.fixture
def transport(monkeypatch):
    original_client = httpx.Client
    requests, options = [], []
    state = {"handler": lambda request: httpx.Response(503)}

    def dispatch(request):
        requests.append(request)
        return state["handler"](request)

    def client(**kwargs):
        options.append(kwargs)
        return original_client(transport=httpx.MockTransport(dispatch), **kwargs)

    monkeypatch.setattr(httpx, "Client", client)
    monkeypatch.setattr(pubmed.time, "sleep", lambda _: None)
    monkeypatch.setattr(pubmed, "_last_request_at", 0.0)
    return state, requests, options


def stub_pubmed(transport, *, ids=None, body=None, fetch_status=200):
    state, requests, options = transport
    ids = ["32123456"] if ids is None else ids
    body = xml_response(article()) if body is None else body

    def handler(request):
        if request.url.path.endswith("esearch.fcgi"):
            return httpx.Response(200, json={"esearchresult": {"idlist": ids}})
        return httpx.Response(fetch_status, content=body)

    state["handler"] = handler
    return requests, options


def stub_epmc(transport, papers):
    transport[0]["handler"] = lambda request: httpx.Response(200, json={"resultList": {"result": papers}})


@pytest.fixture
def source_mocks(monkeypatch):
    monkeypatch.delenv("SEMANTIC_SCHOLAR_API_KEY", raising=False)
    mocks = {}
    for name in ("pubmed", "europe_pmc", "protocols_io", "openalex", "semantic_scholar"):
        mocks[name] = Mock(return_value=[])
        monkeypatch.setattr(services, f"search_{name}", mocks[name])
    return mocks


def test_sockets_are_disabled():
    with pytest.raises(SocketBlockedError):
        socket.socket()


def test_pubmed_maps_retrieved_metadata_and_bounded_post_parameters(transport):
    requests, options = stub_pubmed(transport, body=xml_response(
        article(title="Synthetic <i>mixed</i> title &amp; metadata", doi="https://doi.org/10.1234/MIXED")
    ))
    rows = pubmed.search_pubmed(PRIVATE)
    assert len(rows) == 1
    row = rows[0]
    assert row["title"] == "Synthetic mixed title & metadata"
    assert row["pmid"] == "32123456"
    assert row["doi"] == "10.1234/mixed"
    assert row["year"] == 2024
    assert row["url"] == "https://pubmed.ncbi.nlm.nih.gov/32123456/"
    assert row["authors"] == ["Ada Sample", "Fixture Consortium"]
    assert row["abstract"] == "Synthetic abstract. Second section."
    assert PRIVATE not in row["why_relevant"]
    assert len(requests) == 2
    assert all(r.method == "POST" and not r.url.query for r in requests)
    assert all(r.url.host == "eutils.ncbi.nlm.nih.gov" for r in requests)
    search, fetch = [parse_qs(r.content.decode()) for r in requests]
    assert search["term"] == [PRIVATE]
    assert search["db"] == ["pubmed"] and search["retmode"] == ["json"]
    assert search["retmax"] == ["10"] and search["retstart"] == ["0"]
    assert fetch["id"] == ["32123456"] and fetch["retmode"] == ["xml"]
    assert options[0]["follow_redirects"] is False and options[0]["trust_env"] is False
    assert options[0]["timeout"].connect == 3.0 and options[0]["timeout"].read == 5.0


def test_pubmed_only_accepts_requested_pmids_and_preserves_search_order(transport):
    stub_pubmed(transport, ids=["22", "11", "22", {}, "00000000", "javascript:bad"],
                body=xml_response(article("999"), article("11"), article("22"), article("22")))
    rows = pubmed.search_pubmed("synthetic query")
    assert [row["pmid"] for row in rows] == ["22", "11"]
    assert parse_qs(transport[1][1].content.decode())["id"] == ["22,11"]


def test_pubmed_missing_metadata_is_not_invented(transport):
    stub_pubmed(transport, body=xml_response(
        '<PubmedArticle><MedlineCitation><PMID>32123456</PMID><Article>'
        '<ArticleTitle>Title only</ArticleTitle><Journal><JournalIssue><PubDate>'
        '<MedlineDate>2020 Jan-Feb</MedlineDate></PubDate></JournalIssue></Journal>'
        '</Article></MedlineCitation></PubmedArticle>'
    ))
    row = pubmed.search_pubmed("synthetic query")[0]
    assert row["doi"] == "" and row["year"] == 2020
    assert row["abstract"] == "" and row["authors"] == []


def test_pubmed_accepts_standard_external_dtd_without_loading_it(transport):
    body = '<!DOCTYPE PubmedArticleSet SYSTEM "https://dtd.invalid/pubmed.dtd">' + xml_response(article())
    stub_pubmed(transport, body=body)
    assert len(pubmed.search_pubmed("synthetic query")) == 1
    assert len(transport[1]) == 2


@pytest.mark.parametrize("client", CLIENTS)
@pytest.mark.parametrize("query", ["", " \t\n", "x" * 2001, "unsafe\x00query", None, 4])
def test_invalid_queries_make_no_requests(transport, client, query):
    assert client(query) == []
    assert transport[1] == []


@pytest.mark.parametrize("client", CLIENTS)
@pytest.mark.parametrize("status", [204, 301, 302, 401, 403, 404, 429, 500, 503])
def test_http_status_failures_never_retry_or_follow_redirects(transport, client, status):
    transport[0]["handler"] = lambda request: httpx.Response(
        status, headers={"location": "https://untrusted.invalid/"}, text=PRIVATE
    )
    assert client("synthetic query") == []
    assert len(transport[1]) == 1


@pytest.mark.parametrize("status", [302, 403, 429, 500, 503])
def test_pubmed_fetch_status_failure_returns_no_partial_citations(transport, status):
    stub_pubmed(transport, fetch_status=status)
    assert pubmed.search_pubmed("synthetic query") == []
    assert len(transport[1]) == 2


@pytest.mark.parametrize("client", CLIENTS)
@pytest.mark.parametrize("error", [httpx.ConnectError, httpx.ReadTimeout])
def test_transport_errors_are_private_and_empty(transport, client, error, caplog, capsys):
    def handler(request):
        raise error(PRIVATE, request=request)

    transport[0]["handler"] = handler
    with caplog.at_level(logging.INFO):
        assert client(PRIVATE) == []
    assert PRIVATE not in caplog.text
    assert PRIVATE not in capsys.readouterr().out
    assert len(transport[1]) == 1


@pytest.mark.parametrize("payload", [
    None, [], "wrong", {}, {"error": PRIVATE},
    {"esearchresult": None}, {"esearchresult": []},
    {"esearchresult": {"idlist": "123"}},
    {"esearchresult": {"idlist": None}},
    {"esearchresult": {"idlist": []}},
    {"esearchresult": {"idlist": [{}, None, 42, "00000000", "http://bad"]}},
    {"esearchresult": {"idlist": ["123"], "errorlist": {"phrasesnotfound": [PRIVATE]}}},
])
def test_pubmed_invalid_missing_and_empty_search_responses(transport, payload):
    transport[0]["handler"] = lambda request: httpx.Response(200, content=json.dumps(payload))
    assert pubmed.search_pubmed("synthetic query") == []
    assert len(transport[1]) == 1


@pytest.mark.parametrize("body", [
    "not xml", "<PubmedArticleSet>", "<html>service unavailable</html>",
    "<ERROR>private</ERROR>", "<PubmedArticleSet/>",
    xml_response(article("0")), xml_response(article(title="")), xml_response(article("999")),
    '<!DOCTYPE PubmedArticleSet [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'
    + xml_response(article(title="&xxe;")),
    '<!DOCTYPE PubmedArticleSet [<!ENTITY x "expanded">]>' + xml_response(article(title="&x;")),
    xml_response(article()).encode("utf-16"),
])
def test_pubmed_malformed_or_malicious_fetch_responses(transport, body):
    stub_pubmed(transport, body=body)
    assert pubmed.search_pubmed("synthetic query") == []


def test_pubmed_caps_ids_and_results(transport):
    ids = [str(i) for i in range(1, 31)]
    stub_pubmed(transport, ids=ids, body=xml_response(*(article(i) for i in ids)))
    assert len(pubmed.search_pubmed("synthetic query")) == 10
    assert len(parse_qs(transport[1][1].content.decode())["id"][0].split(",")) == 10


def test_europe_pmc_maps_core_metadata(transport):
    stub_epmc(transport, [epmc_paper(title="Synthetic <i>Europe PMC</i> citation", doi="DOI:10.1234/CORE")])
    row = europe_pmc.search_europe_pmc(PRIVATE)[0]
    assert row["source"] == "europe_pmc"
    assert row["title"] == "Synthetic Europe PMC citation"
    assert row["year"] == 2024 and row["doi"] == "10.1234/core"
    assert row["pmid"] == "32123456"
    assert row["url"] == "https://europepmc.org/article/MED/32123456"
    assert row["authors"] == ["Sample A", "Fixture Consortium"]
    assert row["abstract"] == "Synthetic abstract."
    assert PRIVATE not in row["why_relevant"]
    request = transport[1][0]
    assert request.method == "POST" and str(request.url) == europe_pmc.SEARCH_URL
    params = parse_qs(request.content.decode())
    assert params["query"] == [PRIVATE] and params["resultType"] == ["core"]
    assert params["pageSize"] == ["10"] and params["format"] == ["json"]
    assert params["cursorMark"] == ["*"]
    assert len(transport[1]) == 1


def test_europe_pmc_missing_optional_metadata_and_non_med_records(transport):
    stub_epmc(transport, [
        {"source": "PPR", "id": "PPR123", "title": "Synthetic preprint"},
        epmc_paper(pubYear="unknown", doi=None, authorList={"author": "bad"}, abstractText=[]),
        epmc_paper(source="PMC", id="PMC123", pmid="32123456", title="Synthetic full text"),
    ])
    rows = europe_pmc.search_europe_pmc("synthetic query")
    assert rows[0]["pmid"] == "" and rows[0]["doi"] == "" and rows[0]["year"] is None
    assert rows[0]["url"] == "https://europepmc.org/article/PPR/PPR123"
    assert rows[1]["year"] is None and rows[1]["authors"] == [] and rows[1]["abstract"] == ""
    assert rows[2]["pmid"] == "32123456"


@pytest.mark.parametrize("payload", [
    None, [], "wrong", {}, {"error": PRIVATE}, {"errMsg": PRIVATE},
    {"resultList": None}, {"resultList": []}, {"resultList": {}},
    {"resultList": {"result": None}}, {"resultList": {"result": "bad"}},
])
def test_europe_pmc_missing_or_malicious_envelopes(transport, payload):
    transport[0]["handler"] = lambda request: httpx.Response(200, content=json.dumps(payload))
    assert europe_pmc.search_europe_pmc("synthetic query") == []
    assert len(transport[1]) == 1


def test_europe_pmc_skips_bad_rows_without_losing_valid_rows(transport):
    stub_epmc(transport, [
        None, [], {"title": "No identifier"}, epmc_paper(title=None),
        epmc_paper(source="../MED"), epmc_paper(source="EVIL"), epmc_paper(id="https://evil.invalid"),
        epmc_paper(id="00000000"), epmc_paper(), epmc_paper(),
    ])
    rows = europe_pmc.search_europe_pmc("synthetic query")
    assert len(rows) == 1 and rows[0]["pmid"] == "32123456"


def test_europe_pmc_never_follows_pagination_or_record_links(transport):
    transport[0]["handler"] = lambda request: httpx.Response(200, json={
        "nextPageUrl": "https://evil.invalid", "nextCursorMark": "next",
        "resultList": {"result": [epmc_paper(id=str(i)) for i in range(1, 40)]},
    })
    assert len(europe_pmc.search_europe_pmc("synthetic query")) == 10
    assert len(transport[1]) == 1


@pytest.mark.parametrize("client", CLIENTS)
def test_invalid_json_is_empty(transport, client):
    transport[0]["handler"] = lambda request: httpx.Response(200, text="{invalid")
    assert client("synthetic query") == []


@pytest.mark.parametrize("client", CLIENTS)
def test_declared_oversize_response_is_empty(transport, client):
    transport[0]["handler"] = lambda request: httpx.Response(
        200, headers={"content-length": str(pubmed.MAX_RESPONSE_BYTES + 1)}, content=b"{}"
    )
    assert client("synthetic query") == []


@pytest.mark.parametrize("client", CLIENTS)
def test_streamed_response_size_is_capped(transport, client, monkeypatch):
    class Chunks(httpx.SyncByteStream):
        def __iter__(self):
            yield b"x" * 65536
            yield b"x" * 65536

    monkeypatch.setattr(pubmed, "MAX_RESPONSE_BYTES", 65536)
    transport[0]["handler"] = lambda request: httpx.Response(200, stream=Chunks())
    assert client("synthetic query") == []


@pytest.mark.parametrize("client", CLIENTS)
def test_response_deadline_is_enforced(transport, client, monkeypatch):
    monkeypatch.setattr(pubmed, "RESPONSE_DEADLINE_SECONDS", -1)
    transport[0]["handler"] = lambda request: httpx.Response(200, content=b"{}")
    assert client("synthetic query") == []


def test_protocols_io_has_no_fake_or_unauthenticated_results(transport, monkeypatch):
    monkeypatch.setenv("PROTOCOLS_IO_API_KEY", PRIVATE)
    assert protocols_io.search_protocols_io(PRIVATE) == []
    assert transport[1] == []


@pytest.mark.parametrize("value, expected", [
    ("DOI: 10.1234/ABC", "10.1234/abc"),
    ("HTTPS://DX.DOI.ORG/10.1234%2FABC", "10.1234/abc"),
    ("10.1000/182", "10.1000/182"),
    ("10.1000/example-doi", ""), ("javascript:bad", ""), ([], ""), (None, ""),
])
def test_doi_normalization(value, expected):
    assert pubmed._normalize_doi(value) == expected


def test_search_preserves_query_plan_and_result_shape(source_mocks):
    source_mocks["pubmed"].return_value = [reference(pmid="32123456")]
    queries, refs = services.run_literature_search("Synthetic hypothesis")
    assert queries == [
        "Synthetic hypothesis", "Synthetic hypothesis protocol", "Synthetic hypothesis assay",
        "Synthetic hypothesis comparator control", "Synthetic hypothesis mechanism", "Synthetic hypothesis review",
    ]
    assert len(refs) == 1 and refs[0]["source"] == "pubmed"
    assert [call.args[0] for call in source_mocks["pubmed"].call_args_list] == queries[:4]
    source_mocks["semantic_scholar"].assert_not_called()
    assert source_mocks["openalex"].call_count == 4


def test_search_survives_individual_outages_without_logging(source_mocks, caplog, capsys):
    source_mocks["pubmed"].side_effect = RuntimeError(PRIVATE)
    source_mocks["openalex"].side_effect = RuntimeError(PRIVATE)
    source_mocks["protocols_io"].side_effect = RuntimeError(PRIVATE)
    source_mocks["europe_pmc"].return_value = [reference("europe_pmc")]
    _, refs = services.run_literature_search(PRIVATE)
    assert len(refs) == 1 and refs[0]["source"] == "europe_pmc"
    assert PRIVATE not in refs[0]["why_relevant"]
    assert PRIVATE not in caplog.text and PRIVATE not in capsys.readouterr().out


def test_all_source_outages_produce_no_citations(source_mocks):
    for mock in source_mocks.values():
        mock.side_effect = RuntimeError(PRIVATE)
    assert services.run_literature_search("Synthetic hypothesis")[1] == []


@pytest.mark.parametrize("payload", [None, {}, "invalid", [None, [], {}, {"source": ["pubmed"]}]])
def test_search_tolerates_malformed_source_results(source_mocks, payload):
    source_mocks["pubmed"].return_value = payload
    source_mocks["europe_pmc"].return_value = [reference("europe_pmc")]
    assert len(services.run_literature_search("Synthetic hypothesis")[1]) == 1


@pytest.mark.parametrize("row", [
    reference("invented_source"), reference("protocols_io"), reference("openalex"),
    reference(title=""), reference(title="Untitled"), reference(doi="", url="https://pubmed.ncbi.nlm.nih.gov/"),
    reference(doi="10.1000/example-doi", pmid="00000000", url="https://pubmed.ncbi.nlm.nih.gov/"),
    reference(doi="", url="javascript:alert(1)"),
    reference(doi="", url="https://secret:token@publisher.invalid/paper"),
])
def test_search_rejects_fake_missing_or_misattributed_citations(source_mocks, row):
    source_mocks["pubmed"].return_value = [row]
    assert services.run_literature_search("Synthetic hypothesis")[1] == []


def test_search_deduplicates_doi_pmid_and_transitive_bridges(source_mocks):
    source_mocks["pubmed"].return_value = [
        reference(title="First citation title", doi="HTTPS://DOI.ORG/10.1234/SHARED", pmid=""),
        reference(title="Second citation title", doi="", pmid="00032123456"),
    ]
    source_mocks["europe_pmc"].return_value = [
        reference("europe_pmc", title="Bridge citation title", doi="doi:10.1234/shared", pmid="32123456")
    ]
    _, refs = services.run_literature_search("Synthetic hypothesis")
    assert len(refs) == 1
    assert refs[0]["source"] == "pubmed" and refs[0]["title"] == "First citation title"
    assert refs[0]["doi"] == "10.1234/shared" and refs[0]["pmid"] == "32123456"


def test_search_title_fallback_normalizes_unicode_punctuation_and_missing_year(source_mocks):
    source_mocks["pubmed"].return_value = [
        reference(title="Ｓynthetic citation: a study.", doi="", year=None, url="https://publisher.invalid/paper")
    ]
    source_mocks["europe_pmc"].return_value = [
        reference("europe_pmc", title="Synthetic Citation A Study", doi="", year=2024,
                  url="https://europepmc.org/article/PMC/PMC123")
    ]
    assert len(services.run_literature_search("Synthetic hypothesis")[1]) == 1


def test_search_distinguishes_same_title_with_conflicting_identifiers(source_mocks):
    source_mocks["pubmed"].return_value = [
        reference(doi="10.1234/first"), reference(doi="10.1234/second"),
        reference(doi="", url="https://publisher.invalid/ambiguous"),
    ]
    assert len(services.run_literature_search("Synthetic hypothesis")[1]) == 2


def test_search_distinguishes_same_title_in_different_years(source_mocks):
    source_mocks["pubmed"].return_value = [
        reference(doi="", pmid="123", year=2023), reference(doi="", pmid="456", year=2024),
    ]
    assert len(services.run_literature_search("Synthetic hypothesis")[1]) == 2


@pytest.mark.parametrize("limit", [0, -1, None, "10", True])
def test_nonpositive_or_invalid_limit_makes_no_calls(source_mocks, limit):
    queries, refs = services.run_literature_search("Synthetic hypothesis", limit)
    assert len(queries) == 6 and refs == []
    assert all(mock.call_count == 0 for mock in source_mocks.values())


def test_search_caps_source_rows_and_requested_result_count(source_mocks):
    def rows(query):
        return [reference(title=f"{query} citation {i}", doi=f"10.1234/{query.replace(' ', '-')}-{i}")
                for i in range(50)]
    source_mocks["pubmed"].side_effect = rows
    _, refs = services.run_literature_search("Synthetic", max_results=10000)
    assert len(refs) == 40
    assert source_mocks["pubmed"].call_count == 4
    assert len(services.run_literature_search("Synthetic", max_results=3)[1]) == 3


def test_search_hard_caps_aggregate_results(source_mocks):
    for source in ("pubmed", "europe_pmc", "openalex"):
        source_mocks[source].side_effect = lambda query, source=source: [
            reference(source, title=f"{source} {query} {i}", doi=f"10.1234/{source}-{query.replace(' ', '-')}-{i}")
            for i in range(10)
        ]
    assert len(services.run_literature_search("Synthetic", max_results=10000)[1]) == 100


@pytest.mark.parametrize("empty_or_failure", [[], RuntimeError(PRIVATE)])
def test_authenticated_semantic_fallback_remains_bounded(source_mocks, monkeypatch, empty_or_failure):
    monkeypatch.setenv("SEMANTIC_SCHOLAR_API_KEY", PRIVATE)
    if isinstance(empty_or_failure, Exception):
        source_mocks["semantic_scholar"].side_effect = empty_or_failure
    else:
        source_mocks["semantic_scholar"].return_value = empty_or_failure
    source_mocks["openalex"].return_value = [reference("openalex")]
    _, refs = services.run_literature_search("Synthetic")
    assert len(refs) == 1 and refs[0]["source"] == "openalex"
    assert source_mocks["semantic_scholar"].call_count == source_mocks["openalex"].call_count == 4


def test_authenticated_semantic_results_do_not_call_openalex(source_mocks, monkeypatch):
    monkeypatch.setenv("SEMANTIC_SCHOLAR_API_KEY", PRIVATE)
    source_mocks["semantic_scholar"].return_value = [reference("semantic_scholar")]
    assert services.run_literature_search("Synthetic")[1][0]["source"] == "semantic_scholar"
    source_mocks["openalex"].assert_not_called()


@pytest.mark.parametrize("refs", [[], [None], [{}], [reference(doi="", pmid="0")],
                                     [reference(doi="10.1000/example-doi")], [reference("invented_source")]])
def test_no_real_references_are_inconclusive_without_llm(refs, external_calls):
    result = scoring.score_novelty(PRIVATE, refs)
    assert result["novelty_signal"] == "inconclusive" and result["confidence"] == 0
    assert result["scoring_breakdown"]["reason"] == "no_real_references"
    assert "not evidence" in result["summary"]
    external_calls.generate_json.assert_not_called()


def test_unavailable_llm_is_inconclusive_private_and_not_keyword_scored(external_calls, caplog, capsys):
    external_calls.generate_json.side_effect = RuntimeError(PRIVATE)
    hypothesis = "C57BL/6 FITC 30% 4 weeks Lactobacillus rhamnosus GG control " + PRIVATE
    result = scoring.score_novelty(hypothesis, [reference()])
    assert result["novelty_signal"] == "inconclusive" and result["confidence"] == 0
    assert result["scoring_breakdown"]["reason"] == "llm_unavailable"
    assert "unavailable" in result["summary"]
    assert "fallback_rule_based" not in json.dumps(result)
    assert PRIVATE not in caplog.text and PRIVATE not in capsys.readouterr().out
    assert PRIVATE not in json.dumps(result)


def valid_score(**updates):
    return {
        "novelty_signal": "similar_work_exists", "confidence": 0.72,
        "summary": "Overlap is limited to the supplied synthetic citation.",
        "scoring_breakdown": {"evidence_strength": 0.4},
        **updates,
    }


@pytest.mark.parametrize("response", [
    None, [], "invalid", {}, valid_score(novelty_signal="NOVEL"),
    valid_score(novelty_signal=[]), valid_score(confidence=None),
    valid_score(confidence="0.8"), valid_score(confidence=True), valid_score(confidence=-0.1),
    valid_score(confidence=1.1), valid_score(confidence=float("nan")), valid_score(confidence=float("inf")),
    valid_score(summary=""), valid_score(summary=[]), valid_score(summary="x" * 10001),
    valid_score(scoring_breakdown=None), valid_score(scoring_breakdown=[]),
    valid_score(scoring_breakdown={"score": float("nan")}),
    valid_score(scoring_breakdown={"reason": "x" * 20001}),
    {"novelty_signal": "not_found", "confidence": 0.9, "summary": "Missing breakdown"},
])
def test_invalid_llm_output_is_inconclusive(response, external_calls):
    external_calls.generate_json.side_effect = None
    external_calls.generate_json.return_value = response
    result = scoring.score_novelty("Synthetic", [reference()])
    assert result["novelty_signal"] == "inconclusive" and result["confidence"] == 0
    assert result["scoring_breakdown"]["reason"] == "invalid_llm_response"


def test_valid_llm_output_preserves_schema_and_grounded_payload(external_calls):
    external_calls.generate_json.side_effect = None
    external_calls.generate_json.return_value = valid_score(confidence=0.72345)
    result = scoring.score_novelty("Synthetic", [reference(abstract="Synthetic abstract."), reference()])
    assert set(result) == {"novelty_signal", "confidence", "summary", "scoring_breakdown"}
    assert result["novelty_signal"] == "similar_work_exists" and result["confidence"] == 0.723
    kwargs = external_calls.generate_json.call_args.kwargs
    assert kwargs["payload"]["num_references"] == 1
    assert kwargs["payload"]["references"][0]["abstract"] == "Synthetic abstract."
    assert "never proof of novelty" in kwargs["system_message"]


def test_llm_inconclusive_has_zero_confidence(external_calls):
    external_calls.generate_json.side_effect = None
    external_calls.generate_json.return_value = valid_score(novelty_signal="inconclusive", confidence=0.7)
    assert scoring.score_novelty("Synthetic", [reference()])["confidence"] == 0


def test_offline_search_and_scoring_outage_contract(transport, monkeypatch, external_calls):
    monkeypatch.delenv("SEMANTIC_SCHOLAR_API_KEY", raising=False)
    monkeypatch.setattr(services, "search_openalex", Mock(side_effect=RuntimeError(PRIVATE)))

    def handler(request):
        if request.url.host == "eutils.ncbi.nlm.nih.gov":
            return httpx.Response(503)
        return httpx.Response(200, json={"resultList": {"result": [epmc_paper()]}})

    transport[0]["handler"] = handler
    queries, refs = services.run_literature_search("Synthetic")
    result = scoring.score_novelty("Synthetic", refs)
    assert len(queries) == 6 and len(refs) == 1
    assert refs[0]["source"] == "europe_pmc" and refs[0]["doi"] == "10.1234/citation"
    assert result["novelty_signal"] == "inconclusive" and result["confidence"] == 0
    assert len(transport[1]) == 8


def test_search_total_request_budget_with_semantic_outage(transport, monkeypatch):
    monkeypatch.setenv("SEMANTIC_SCHOLAR_API_KEY", PRIVATE)
    semantic = Mock(side_effect=RuntimeError(PRIVATE))
    openalex = Mock(return_value=[])
    monkeypatch.setattr(services, "search_semantic_scholar", semantic)
    monkeypatch.setattr(services, "search_openalex", openalex)

    def handler(request):
        if request.url.path.endswith("esearch.fcgi"):
            return httpx.Response(200, json={"esearchresult": {"idlist": ["32123456"]}})
        if request.url.path.endswith("efetch.fcgi"):
            return httpx.Response(200, content=xml_response(article()))
        return httpx.Response(200, json={"resultList": {"result": [epmc_paper()]}})

    transport[0]["handler"] = handler
    assert len(services.run_literature_search("Synthetic")[1]) == 1
    assert len(transport[1]) == 12
    assert semantic.call_count == openalex.call_count == 4
    assert len(transport[1]) + semantic.call_count + openalex.call_count == 20
