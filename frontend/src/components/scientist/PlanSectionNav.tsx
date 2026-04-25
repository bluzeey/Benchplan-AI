type Section = {
  id: string
  title: string
}

export function PlanSectionNav({ sections }: { sections: Section[] }) {
  return (
    <aside className="card sticky">
      <h4>Sections</h4>
      <p className="muted">Jump to generated modules</p>
      <div className="column">
        {sections.length === 0 ? <p className="muted mono">No structured sections found</p> : null}
        {sections.map((section, index) => (
          <a key={section.id} href={`#section-${section.id}`} className="button-link">
            {String(index + 1).padStart(2, "0")} • {section.title}
          </a>
        ))}
      </div>
    </aside>
  )
}
