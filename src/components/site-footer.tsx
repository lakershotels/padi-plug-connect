import { Link } from "@tanstack/react-router";
import { Apple, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export function SiteFooter() {
  const [deferred, setDeferred] = useState<any>(null);

  useEffect(() => {
    const onPrompt = (e: any) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async (platform: "ios" | "android") => {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    toast.info(
      platform === "ios"
        ? "On iPhone: tap Share, then “Add to Home Screen”."
        : "On Android: tap the browser menu, then “Install app” / “Add to Home screen”.",
    );
  };

  return (
    <footer className="mt-24 border-t border-border/60 bg-card/50">

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-hero text-primary-foreground">P</span>
            PadiPlug
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            The trusted African marketplace. Buy, book, and grow — with escrow protection on every order.
          </p>
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">Add PadiPlug to your phone</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => install("ios")}
                aria-label="Add PadiPlug to iPhone home screen"
                title="Add to iPhone home screen"
                className="grid h-9 w-9 place-items-center rounded-lg border bg-card text-foreground transition-colors hover:bg-secondary"
              >
                <Apple className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => install("android")}
                aria-label="Install PadiPlug on Android"
                title="Install on Android"
                className="grid h-9 w-9 place-items-center rounded-lg border bg-card text-foreground transition-colors hover:bg-secondary"
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 text-sm font-semibold">Marketplace</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/marketplace">Browse products</Link></li>
            <li><Link to="/artisans">Find artisans</Link></li>
            <li><Link to="/deals">Deals & discounts</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">For sellers</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/sell">Start selling</Link></li>
            <li><Link to="/vendor">Vendor console</Link></li>
            <li><Link to="/artisan">Artisan console</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Trust &amp; Legal</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Escrow protection</li>
            <li>Verified sellers</li>
            <li>Dispute resolution</li>
            <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PadiPlug. Proudly African.
      </div>
    </footer>
  );
}
