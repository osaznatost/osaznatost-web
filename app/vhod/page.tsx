import { Page } from "@/components/ui";

export const metadata = { title: "Вход" };

export default async function Vhod({ searchParams }: { searchParams: Promise<{ next?: string; greshka?: string }> }) {
  const sp = await searchParams;
  return (
    <Page narrow>
      <div className="max-w-sm">
        <h1 className="text-2xl font-bold mb-2">Вътрешен прототип</h1>
        <p className="text-muted mb-6">Сайтът още не е публичен. Въведете паролата, която сте получили.</p>
        <form method="post" action="/api/vhod" className="space-y-4">
          <input type="hidden" name="next" value={sp.next ?? "/"} />
          <input type="password" name="password" autoFocus required aria-label="Парола" placeholder="Парола" />
          {sp.greshka && <p className="text-sm text-red">Паролата не е вярна.</p>}
          <button className="bg-red hover:bg-red-dark text-white font-semibold px-5 py-2.5 rounded">Влез</button>
        </form>
      </div>
    </Page>
  );
}
