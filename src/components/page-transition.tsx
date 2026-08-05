import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Re-mounts children on every route change so each page animates in, native-style. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
