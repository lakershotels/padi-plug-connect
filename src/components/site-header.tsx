import { Link } from "@tanstack/react-router";
import { Search, ShoppingBag, Bell, User as UserIcon, Menu, MessageSquare, Wallet as WalletIcon, Download } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUnreadTotal } from "@/lib/chat.functions";
import { getWalletBalance } from "@/lib/wallet.functions";
import { isAdmin as isAdminFn } from "@/lib/admin.functions";
import { formatMoney } from "@/lib/money";
import { usePwaInstall } from "@/hooks/use-pwa-install";


function IconBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="pointer-events-none absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function SiteHeader() {
  const { user, loading } = useSession();
  const { triggerInstall } = usePwaInstall();
  const [mobileOpen, setMobileOpen] = useState(false);
  const qc = useQueryClient();

  const { data: unread } = useQuery({
    queryKey: ["unreadTotal"],
    queryFn: () => getUnreadTotal(),
    enabled: !!user,
    refetchInterval: 60_000,
  });
  const unreadCount = unread?.count ?? 0;

  const { data: wallet } = useQuery({
    queryKey: ["walletBalance"],
    queryFn: () => getWalletBalance(),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const { data: admin } = useQuery({
    queryKey: ["isAdmin"],
    queryFn: () => isAdminFn(),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  const showAdmin = !!admin?.isAdmin;

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("header-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["unreadTotal"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["walletBalance"] });
        qc.invalidateQueries({ queryKey: ["wallet"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-hero text-primary-foreground shadow-elevated">
            P
          </span>
          <span>PadiPlug</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-6 text-sm font-medium md:flex">
          <Link to="/marketplace" className="text-muted-foreground transition-colors hover:text-foreground">
            Marketplace
          </Link>
          <Link to="/artisans" className="text-muted-foreground transition-colors hover:text-foreground">
            Artisans
          </Link>
          <Link to="/deals" className="text-muted-foreground transition-colors hover:text-foreground">
            Deals
          </Link>
          <Link to="/sell" className="text-muted-foreground transition-colors hover:text-foreground">
            Sell on PadiPlug
          </Link>
          <Link to="/plans" className="text-muted-foreground transition-colors hover:text-foreground">
            Plans
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <form
            className="relative hidden lg:block"
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchTerm.trim();
              if (q) window.location.assign(`/search?q=${encodeURIComponent(q)}`);
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products, services, sellers…"
              aria-label="Search PadiPlug"
              className="h-9 w-64 rounded-full border border-border/70 bg-secondary/40 pl-9 pr-3 text-sm outline-none focus:border-primary/50"
            />
          </form>
          <Button variant="ghost" size="icon" asChild className="lg:hidden">
            <Link to="/search" search={{ q: "" }} aria-label="Search"><Search className="h-5 w-5" /></Link>
          </Button>


          {!loading && user ? (
            <>
              <Button variant="outline" size="sm" asChild className="hidden h-9 gap-1.5 rounded-full border-primary/30 bg-primary/5 px-3 font-semibold text-primary hover:bg-primary/10 sm:inline-flex">
                <Link to="/wallet" aria-label="Wallet balance">
                  <WalletIcon className="h-4 w-4" />
                  <span className="tabular-nums">{formatMoney(wallet?.balance_kobo ?? 0)}</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className="sm:hidden">
                <Link to="/wallet" aria-label="Wallet"><WalletIcon className="h-5 w-5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link to="/notifications" aria-label="Notifications"><Bell className="h-5 w-5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link to="/messages" aria-label={`Messages${unreadCount ? `, ${unreadCount} unread` : ""}`}>
                  <MessageSquare className="h-5 w-5" />
                  <IconBadge count={unreadCount} />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/cart" aria-label="Cart"><ShoppingBag className="h-5 w-5" /></Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Account"><UserIcon className="h-5 w-5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/dashboard">Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/orders">My orders</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/messages">Messages</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/wallet">Wallet</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/favorites">Favorites</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/vendor">Vendor console</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/artisan">Artisan console</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/plans">Plans & Ads</Link></DropdownMenuItem>
                  <DropdownMenuItem onClick={triggerInstall} className="gap-2">
                    <Download className="h-4 w-4" /> Install PadiPlug
                  </DropdownMenuItem>
                  {showAdmin && (
                    <DropdownMenuItem asChild><Link to="/admin">Admin</Link></DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden gap-2 sm:flex">
              <Button variant="ghost" asChild><Link to="/auth">Sign in</Link></Button>
              <Button asChild className="bg-gradient-hero text-primary-foreground shadow-elevated hover:opacity-95">
                <Link to="/auth">Join PadiPlug</Link>
              </Button>
            </div>
          )}

          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" onClick={() => setMobileOpen((o) => !o)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 text-sm">
            {user && (
              <Link to="/wallet" className="mb-2 flex items-center justify-between rounded-xl bg-gradient-hero px-4 py-3 text-primary-foreground">
                <span className="flex items-center gap-2 text-sm opacity-90"><WalletIcon className="h-4 w-4" /> Wallet</span>
                <span className="font-display text-lg font-bold tabular-nums">{formatMoney(wallet?.balance_kobo ?? 0)}</span>
              </Link>
            )}
            <Link to="/marketplace" className="rounded-md px-3 py-2 hover:bg-muted">Marketplace</Link>
            <Link to="/artisans" className="rounded-md px-3 py-2 hover:bg-muted">Artisans</Link>
            <Link to="/deals" className="rounded-md px-3 py-2 hover:bg-muted">Deals</Link>
            <Link to="/sell" className="rounded-md px-3 py-2 hover:bg-muted">Sell on PadiPlug</Link>
            <Link to="/plans" className="rounded-md px-3 py-2 hover:bg-muted">Plans & Ads</Link>
            <button
              type="button"
              onClick={() => { triggerInstall(); setMobileOpen(false); }}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left font-medium hover:bg-muted"
            >
              <Download className="h-4 w-4" /> Install PadiPlug
            </button>
            {!user && (
              <Link to="/auth" className="rounded-md bg-primary px-3 py-2 text-center text-primary-foreground">
                Sign in / Join
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
