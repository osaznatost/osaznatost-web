import Link from "next/link";

/** Еднаква бележка навсякъде, където показваме сигнали или червени флагове. */
export default function SignalNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-muted ${className}`}>
      Сигналът е повод за въпрос, не доказателство за нарушение.{" "}
      <Link href="/metodologiya#signal" className="underline">Как работим със сигналите</Link>
    </p>
  );
}
