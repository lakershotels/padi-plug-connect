import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — PadiPlug" },
      { name: "description", content: "How PadiPlug collects, uses, and protects your personal information." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 prose prose-neutral dark:prose-invert">
      <h1 className="font-display text-4xl font-bold">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Account info</strong>: name, email, phone, profile photo.</li>
        <li><strong>Seller info</strong>: business name, address, ID and selfie for verification.</li>
        <li><strong>Transactions</strong>: orders, wallet history, disputes, reviews.</li>
        <li><strong>Device data</strong>: IP address, device type, and analytics events.</li>
      </ul>

      <h2>2. How we use it</h2>
      <p>To operate the marketplace, process escrow payments, verify sellers, prevent fraud, provide customer support, and improve the product. We never sell your personal information.</p>

      <h2>3. Payments</h2>
      <p>Card and bank details are handled directly by our payment partner (Monnify) and are never stored on PadiPlug servers.</p>

      <h2>4. Sharing</h2>
      <p>We share limited information with sellers you transact with (name, delivery address), with our payment and logistics partners, and with law enforcement when legally required.</p>

      <h2>5. Data retention</h2>
      <p>We retain transaction records for at least 7 years to comply with tax and anti-money-laundering laws. You may request deletion of your profile at any time by emailing <a href="mailto:privacy@padiplug.com">privacy@padiplug.com</a>.</p>

      <h2>6. Your rights</h2>
      <p>You have the right to access, correct, export, or delete your personal data. Contact us to exercise these rights.</p>

      <h2>7. Security</h2>
      <p>Data is encrypted in transit and at rest. Wallet operations require authenticated sessions, and we run row-level security on every table containing user data.</p>

      <h2>8. Children</h2>
      <p>PadiPlug is not directed to children under 18. We do not knowingly collect data from minors.</p>

      <h2>9. Contact</h2>
      <p>Data protection questions: <a href="mailto:privacy@padiplug.com">privacy@padiplug.com</a>.</p>
    </article>
  );
}
