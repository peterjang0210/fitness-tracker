export function PlaceholderList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="panel">
      <h2>{title}</h2>
      <ul className="plain-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}
