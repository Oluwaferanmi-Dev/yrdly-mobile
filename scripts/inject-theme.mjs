/**
 * inject-theme.mjs
 *
 * Injects useAppTheme() into every src/app screen and replaces the most
 * common hardcoded light-theme colours with dynamic equivalents.
 *
 * Run from project root: node scripts/inject-theme.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'src', 'app');
const CONTEXT_ROOT = '../../context/ThemeContext';

// Compute relative path from a file to the context directory
function contextPath(filePath) {
  const rel = relative(dirname(filePath), join(__dirname, '..', 'src', 'context', 'ThemeContext'));
  // normalise to forward slashes and ensure leading ./
  let p = rel.replace(/\\/g, '/');
  if (!p.startsWith('.')) p = './' + p;
  return p;
}

// Files we skip (already done manually or don't need theming)
const SKIP = ['_layout.tsx'];

// Colour substitutions inside StyleSheet.create() blocks.
// Each entry: [regex, replacement-with-colors-var]
// We replace static values with a reference to `colors` from useAppTheme.
// Because StyleSheet.create is static, we move affected styles to inline or useMemo.
// STRATEGY: we inject `const { colors } = useAppTheme();` into the component
// then replace the MOST COMMON hardcoded colours found across all files.
const BG_LIGHT   = /(backgroundColor:\s*['"])#(?:FFFFFF|ffffff|FAFAFA|fafafa|FFF|fff)(['"])/g;
const BG_CARD    = /(backgroundColor:\s*['"])#(?:FFFFFF|ffffff|FFF|fff)(['"])/g;
const BG_INPUT   = /(backgroundColor:\s*['"])#(?:F9F9F9|f9f9f9|F2F2F2|f2f2f2)(['"])/g;
const TEXT_MAIN  = /(color:\s*['"])#(?:1C1C1C|1c1c1c|000000|000)(['"])/g;
const TEXT_SEC   = /(color:\s*['"])#(?:616161|424242)(['"])/g;
const BORDER_COL = /(borderColor:\s*['"])#(?:E0E0E0|e0e0e0|F2F2F2|f2f2f2)(['"])/g;

function walkFiles(dir, collected = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walkFiles(full, collected);
    else if (e.name.endsWith('.tsx') && !SKIP.includes(e.name)) collected.push(full);
  }
  return collected;
}

function processFile(filePath) {
  let src = readFileSync(filePath, 'utf8');

  // Skip if already has useAppTheme
  if (src.includes('useAppTheme')) return false;

  // Skip if it has no StyleSheet.create – no styles to update
  if (!src.includes('StyleSheet.create')) return false;

  // --- 1. Add import ---
  const ctxPath = contextPath(filePath);
  const importLine = `import { useAppTheme } from '${ctxPath}';\n`;

  // Insert after first import block (after last consecutive import line)
  src = src.replace(
    /^((?:import [^\n]+\n)+)/m,
    (match) => match + importLine
  );

  // --- 2. Inject `const { colors } = useAppTheme();` into the component body ---
  // Find first `export default function` or `export default const` and inject after the opening {
  src = src.replace(
    /(export default function\s+\w+[^{]*\{)/,
    (match) => `${match}\n  const { colors } = useAppTheme();`
  );

  // --- 3. Replace hardcoded style colours ---
  // Container/screen background
  src = src.replace(BG_LIGHT, (_m, prefix, suffix) => `${prefix}' + colors.background + '${suffix}`);
  // Card background
  // Already subsumed by BG_LIGHT but some use #FFFFFF specifically for cards
  src = src.replace(BG_INPUT, (_m, prefix, suffix) => `${prefix}' + colors.inputBackground + '${suffix}`);
  // Main text colour
  src = src.replace(TEXT_MAIN, (_m, prefix, suffix) => `${prefix}' + colors.text + '${suffix}`);
  // Secondary text
  src = src.replace(TEXT_SEC, (_m, prefix, suffix) => `${prefix}' + colors.textSecondary + '${suffix}`);
  // Borders
  src = src.replace(BORDER_COL, (_m, prefix, suffix) => `${prefix}' + colors.border + '${suffix}`);

  writeFileSync(filePath, src, 'utf8');
  return true;
}

const files = walkFiles(SRC);
let changed = 0;
for (const f of files) {
  if (processFile(f)) {
    console.log('✓', relative(join(__dirname, '..'), f));
    changed++;
  }
}
console.log(`\nDone. Modified ${changed}/${files.length} files.`);
