# Осъзнатост (osaznatost-web)

Граждански инструмент: какво прави държавата, с числа и източници.

## Стек
Next.js 16 (App Router) · TypeScript · Tailwind 4 · Observable Plot · Supabase · Cloudflare Workers (OpenNext).
Шрифт: Sofia Sans (Lettersoup), с `lang="bg"` за българските форми на кирилицата.

## Локално
```bash
npm install
npm run dev        # http://localhost:3000
npx vitest run     # тестове на калкулаторите
```

## Променливи на средата (GitHub secrets → Cloudflare)
| Име | За какво |
|---|---|
| `SITE_PASSWORD` | Парола за вътрешния прототип. Без нея сайтът е отворен. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL на Supabase проекта |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | публичен ключ (само четене, RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | само за cron задачите, никога в браузъра |

## Структура
- `lib/params.ts` — всички параметри (ставки, лихви, инфлация) с дата и източник
- `lib/calc/` — формули на калкулаторите + тестове
- `app/kalkulatori/*` — петте калкулатора
- `app/pari/dalg` — държавен дълг
- `app/proverki/*` — проверки на твърдения
- `proxy.ts` — защита с парола
- `supabase/migrations/` — схема на базата

## Правила
Всяко число има източник и дата. Една методология за всички. Факт ≠ твърдение ≠ оценка.
