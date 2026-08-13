// scripts/fix-wrangler.js
// Removes obsolete top-level "env" and "build" properties
// from .output/server/wrangler.json.
// Safe to run repeatedly.

import fs from 'node:fs';
import path from 'node:path';

const target = path.join(
  process.cwd(),
  '.output',
  'server',
  'wrangler.json'
);

if (!fs.existsSync(target)) {
  console.log(`[fix-wrangler] No file at ${target} — nothing to do.`);
  process.exit(0);
}

try {
  const raw = fs.readFileSync(target, 'utf8');
  const cfg = JSON.parse(raw);

  let changed = false;

  if (Object.prototype.hasOwnProperty.call(cfg, 'env')) {
    delete cfg.env;
    changed = true;
    console.log('[fix-wrangler] Removed top-level "env" property.');
  }

  if (Object.prototype.hasOwnProperty.call(cfg, 'build')) {
    delete cfg.build;
    changed = true;
    console.log('[fix-wrangler] Removed top-level "build" property.');
  }

  if (changed) {
    fs.writeFileSync(
      target,
      JSON.stringify(cfg, null, 2) + '\n',
      'utf8'
    );

    console.log('[fix-wrangler] wrangler.json updated successfully.');
  } else {
    console.log(
      '[fix-wrangler] No obsolete "env" or "build" properties found.'
    );
  }
} catch (err) {
  console.error(
    '[fix-wrangler] Failed to process wrangler.json:',
    err
  );
  process.exit(2);
}