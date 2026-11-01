import assert from 'node:assert/strict'
import test from 'node:test'
import { LiteratureQcRunSchema } from './schemas.ts'

const pending = { id: 'fixture-qc', status: 'running', novelty_signal: '', confidence: null, summary: '' }

test('a running literature check has no novelty result yet', () => {
  assert.equal(LiteratureQcRunSchema.parse(pending).novelty_signal, null)
})

test('a completed literature check retains its result and rejects unknown results', () => {
  const completed = { ...pending, status: 'completed', novelty_signal: 'similar_work_exists' }
  assert.equal(LiteratureQcRunSchema.parse(completed).novelty_signal, 'similar_work_exists')
  assert.equal(LiteratureQcRunSchema.safeParse({ ...completed, novelty_signal: 'unexpected' }).success, false)
})
