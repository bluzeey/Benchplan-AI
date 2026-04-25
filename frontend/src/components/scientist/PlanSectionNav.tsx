type Section = {
  id: string
  title: string
}

export function PlanSectionNav({ sections }: { sections: Section[] }) {
  return (
    <aside className="card sticky">
      <h4>Sections</h4>
      <div className="column">
        {sections.map((section) => (
          <a key={section.id} href={`#section-${section.id}`}>
            {section.title}
          </a>
        ))}
      </div>
    </aside>
  )
}
