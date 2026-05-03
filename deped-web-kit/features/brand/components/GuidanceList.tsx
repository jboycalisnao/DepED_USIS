type GuidanceListProps = {
  items: string[];
};

export function GuidanceList({ items }: GuidanceListProps) {
  return (
    <ul className="m-0 grid gap-3 border-l-4 border-deped-yellow pl-5 text-deped-ink">
      {items.map((item) => (
        <li key={item} className="leading-[1.65]">
          {item}
        </li>
      ))}
    </ul>
  );
}
