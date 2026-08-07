import { Link } from "@tanstack/react-router";
import { Home, Search, Hammer, Package, User as UserIcon } from "lucide-react";

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/marketplace", label: "Shop", icon: Package },
  { to: "/search", label: "Search", icon: Search },
  { to: "/artisans", label: "Artisans", icon: Hammer },
  { to: "/dashboard", label: "Account", icon: UserIcon },
] as const;

export function MobileTabBar() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors"
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
