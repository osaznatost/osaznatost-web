"use client";
// Грешка при показването на страницата: вместо празен екран — обяснение и бутон за нов опит.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="max-w-2xl mx-auto px-4 py-16 text-[15px]">
      <h1 className="text-2xl font-semibold mb-2">Страницата не се зареди</h1>
      <p className="mb-4 text-muted">Част от данните не отговориха навреме. Опитайте пак след малко.</p>
      <button onClick={() => reset()} className="bg-green text-white rounded-sm px-4 py-2 font-semibold">Опитай пак</button>
    </main>
  );
}
