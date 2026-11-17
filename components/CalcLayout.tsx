export function CalcLayout({ form, result }: { form: React.ReactNode; result: React.ReactNode }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="space-y-4">{form}</div>
      <div className="lg:border-l lg:border-rule lg:pl-10">{result}</div>
    </div>
  );
}

export function NumInput({
  value, onChange, step = 1, min = 0, max, suffix,
}: { value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ""}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
      {suffix && <span className="text-muted text-sm whitespace-nowrap">{suffix}</span>}
    </div>
  );
}

export function Segmented<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="radiogroup" className="inline-flex border border-rule rounded overflow-hidden">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-2 text-sm ${value === o.value ? "bg-red text-white" : "bg-white text-ink hover:bg-surface"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Verdict({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className={`border-l-4 pl-4 py-2 my-4 ${ok ? "border-green bg-green-soft" : "border-red bg-[#fbeef0]"}`}>
      {children}
    </div>
  );
}
