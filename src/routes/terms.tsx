import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — PadiPlug" },
      { name: "description", content: "The rules that govern how buyers, vendors, and artisans use PadiPlug." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 prose prose-neutral dark:prose-invert">
      <h1 className="font-display text-4xl font-bold">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <h2>1. About PadiPlug</h2>
      <p>PadiPlug ("we", "us", "our") operates a marketplace connecting African customers with verified vendors and artisans. By creating an account or using the platform you agree to these Terms.</p>

      <h2>2. Eligibility</h2>
      <p>You must be at least 18 years old and legally able to enter contracts in your country of residence. Vendors and artisans must provide accurate business information and comply with local laws.</p>

      <h2>3. Escrow &amp; payments</h2>
      <p>All payments are held by PadiPlug in escrow until the customer taps <strong>Done / Order Received / Service Completed</strong>. Funds are then released to the seller after our commission is deducted. PadiPlug is not a bank and does not pay interest on wallet balances.</p>

      <h2>4. Commissions &amp; fees</h2>
      <p>PadiPlug charges a service commission (currently 5%) on the total value of each completed order. Payment processor fees (e.g. Monnify) may apply to top-ups and withdrawals.</p>

      <h2>5. Disputes</h2>
      <p>If an order is not delivered as described, either party may open a dispute within 7 days of fulfilment. Our team reviews evidence and may refund the buyer, release funds to the seller, or split the funds. Our decision is final.</p>

      <h2>6. Prohibited items and conduct</h2>
      <p>You may not list illegal goods, counterfeit items, weapons, hazardous materials, or content that infringes intellectual property. Harassment, fraud, and off-platform payment attempts result in immediate account termination.</p>

      <h2>7. Account termination</h2>
      <p>We may suspend or terminate accounts that violate these Terms. Available wallet balances (excluding funds under dispute) will be returned within 30 days.</p>

      <h2>8. Limitation of liability</h2>
      <p>PadiPlug facilitates transactions but is not the seller of listed products or services. To the maximum extent permitted by law, our liability for any claim is limited to the commission we collected on the transaction in question.</p>

      <h2>9. Changes to these Terms</h2>
      <p>We may update these Terms. Material changes will be communicated by email or in-app notification at least 14 days before they take effect.</p>

      <h2>10. Contact</h2>
      <p>Questions? Reach us at <a href="mailto:support@padiplug.com">support@padiplug.com</a>.</p>
    </article>
  );
}
