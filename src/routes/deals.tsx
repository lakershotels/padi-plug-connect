import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/deals")({
  head: () => ({ meta: [{ title: "Deals — PadiPlug" }, { name: "description", content: "Discounts and offers from PadiPlug sellers." }] }),
  component: () => (
    <div className="mx-auto max-w-7xl px-4 py-16 text-center">
      <h1 className="font-display text-3xl font-bold">Deals & discounts</h1>
      <p className="mt-2 text-muted-foreground">Fresh drops from our vendors, coming soon. Meanwhile, <a className="text-primary hover:underline" href="/marketplace">browse the marketplace</a>.</p>
    </div>
  ),
});
