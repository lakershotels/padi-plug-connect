import { useEffect, useState } from "react";

/** Brief branded splash on first load so the installed app opens like a native one. */
export function AppSplash() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGone(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <div className="pp-splash" aria-hidden="true">
      <div className="flex flex-col items-center gap-4">
        <img src="/app-icon-192.png" alt="" width={88} height={88} className="rounded-3xl shadow-elevated" />
        <div className="font-display text-xl font-bold tracking-tight">PadiPlug</div>
        <div className="text-xs text-muted-foreground">Africa's trusted marketplace</div>
      </div>
    </div>
  );
}
