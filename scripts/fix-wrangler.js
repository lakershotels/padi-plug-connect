// scripts/fix-wrangler.js
// Removes top-level "env" property from .output/server/wrangler.json if present.
// Safe to run idempotently. Exit code 0 on no-op.

const fs = require('fs');
const path = require('path');

const target = path.join(process.cwd(), '.output', 'server', 'wrangler.json');

if (!fs.existsSync(target)) {
  console.log(`[fix-wrangler] No file at ${target} — nothing to do.`);
  process.exit(0);
}

try {
  const raw = fs.readFileSync(target, 'utf8');
  const cfg = JSON.parse(raw);

  if (cfg.env) {
    delete cfg.env;
    fs.writeFileSync(target, JSON.stringify(cfg, null, 2));
    console.log('[fix-wrangler] Removed "env" property from .output/server/wrangler.json');
  } else {
    console.log('[fix-wrangler] No "env" property found — nothing to do.');
  }
} catch (err) {
  console.error('[fix-wrangler] Failed to process wrangler.json:', err);
  process.exit(2);
}
