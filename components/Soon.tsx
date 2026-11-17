import { Page, Title } from "./ui";

export function Soon({ title, lead, items }: { title: string; lead: string; items: string[] }) {
  return (
    <Page narrow>
      <Title lead={lead}>{title}</Title>
      <p className="text-sm uppercase tracking-wider text-muted font-semibold mb-3">В разработка</p>
      <ul className="list-disc pl-5 space-y-2">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </Page>
  );
}
