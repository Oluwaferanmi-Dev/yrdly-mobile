#!/usr/bin/env node
/**
 * apply-theme.mjs
 * Injects useAppTheme into every screen in src/app that doesn't already have it.
 * Only touches: import, hook call, and root container backgroundColor.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(__dirname, '..', 'src', 'app');
const CONTEXT_DIR = join(__dirname, '..', 'src', 'context');

// Compute relative import path from a file to ThemeContext
function getImportPath(fromFile) {
  const fromDir = dirname(fromFile);
  let rel = relative(fromDir, join(CONTEXT_DIR, 'ThemeContext')).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

// Recursively collect all .tsx files excluding _layout files
function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.tsx') && !entry.name.startsWith('_')) {
      files.push(full);
    }
  }
  return files;
}

function processFile(filePath) {
  let src = readFileSync(filePath, 'utf8');

  // Skip if already themed
  if (src.includes('useAppTheme')) return { changed: false };

  // Skip if no default export function (not a screen component)
  if (!src.includes('export default function')) return { changed: false };

  // Skip if no return JSX (no UI)
  if (!src.includes('return (')) return { changed: false };

  const importPath = getImportPath(filePath);

  // 1. Add import after the last existing import line
  const importStatement = `import { useAppTheme } from '${importPath}';\n`;
  // Insert before the first blank line after imports
  src = src.replace(/^(import [^\n]+\n)((?:import [^\n]+\n)*)(\n)/m, 
    (_, first, rest, nl) => first + rest + importStatement + nl
  );

  // 2. Inject `const { colors } = useAppTheme();` inside the component
  // Find the first const declaration or the opening of the default function body
  const hookLine = '  const { colors } = useAppTheme();\n';
  
  // Strategy: insert after first const/let/useState inside the component
  // Find the export default function line and inject after the opening {
  src = src.replace(
    /(export default function \w+[^{]*\{)\n/,
    (match) => match + hookLine
  );

  // 3. Apply backgroundColor to the root container view/safeAreaView
  // Pattern: the first `<SafeAreaView style={styles.container}` or `<View style={styles.container}`
  // We add an inline dynamic background
  src = src.replace(
    /(<(?:SafeAreaView|View)\s+style=\{styles\.container\})/,
    '<$1'.replace('<$1', '') + '<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}'
  );
  
  // More robust replacement for the root container
  src = src.replace(
    /<(SafeAreaView|View)(\s+style=\{styles\.container\})/,
    (_, tag, styleAttr) => `<${tag} style={[styles.container, { backgroundColor: colors.background }]}`
  );

  return { changed: true, src };
}

const files = walk(APP_DIR);
let modifiedCount = 0;
const results = [];

for (const file of files) {
  try {
    const result = processFile(file);
    if (result.changed && result.src) {
      writeFileSync(file, result.src, 'utf8');
      modifiedCount++;
      results.push('  ✓ ' + relative(join(__dirname, '..'), file));
    }
  } catch (e) {
    results.push('  ✗ ERROR ' + relative(join(__dirname, '..'), file) + ': ' + e.message);
  }
}

console.log(`\nTheme injection complete. Modified ${modifiedCount}/${files.length} files.\n`);
results.forEach(r => console.log(r));
