export function Kids4SafeBrand({ stacked = false, className = "" }: { stacked?: boolean; className?: string }) {
  if (stacked) return <img src="/brand/logo.png" width="200" height="200" alt="Kids4Safe" className={"object-contain " + className} />;
  return <span className={"inline-flex items-center gap-2 whitespace-nowrap " + className}>
    <img src="/brand/favicon.png" width="36" height="36" alt="" className="h-9 w-9 object-contain" />
    <span className="font-black tracking-tight text-[var(--text-primary)]">Kids<span className="text-[var(--brand-accent)]">4</span>Safe</span>
  </span>;
}
