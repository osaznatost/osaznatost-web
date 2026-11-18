// Лентата с бутоните горе в страницата на място, човек или фирма: всяка секция е на същата страница.
export function SectionNav({ items }: { items: [string, string][] }) {
  return (
    <nav aria-label="Секции на страницата" className="sticky top-14 lg:top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 mb-8 bg-white/95 backdrop-blur border-b border-rule">
      <ul className="flex gap-2 overflow-x-auto text-[15px] whitespace-nowrap">
        {items.map(([id, label]) => (
          <li key={id}><a href={`#${id}`} className="block px-3 py-1.5 rounded-full bg-surface no-underline text-ink hover:ring-1 hover:ring-green">{label}</a></li>
        ))}
      </ul>
    </nav>
  );
}

/** Секция с котва; отстъп отгоре, за да не се скрива заглавието под лентата. */
export function Anchor({ id, title, lead, children }: { id: string; title: string; lead?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16 scroll-mt-32 lg:scroll-mt-20">
      <h2 className="display text-[2.4rem] leading-none mb-2">{title}</h2>
      {lead && <p className="text-[15px] text-muted mb-5 max-w-3xl">{lead}</p>}
      {children}
    </section>
  );
}
