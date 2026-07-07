import { Link } from "@tanstack/react-router";

export function SiteFooter() {
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
