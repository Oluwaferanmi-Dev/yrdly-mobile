const fs = require('fs');
const path = require('path');

const svgDir = path.join(__dirname, 'assets', 'svgs');
const outputFilePath = path.join(__dirname, 'src', 'components', 'SvgIcons.tsx');

const files = fs.readdirSync(svgDir).filter(f => f.endsWith('.svg'));

let output = `import React from 'react';\nimport Svg, { Path, G, Circle, Rect, Defs, ClipPath } from 'react-native-svg';\n\nexport interface SvgIconProps {\n  color?: string;\n  size?: number;\n}\n\n`;

files.forEach(file => {
  const content = fs.readFileSync(path.join(svgDir, file), 'utf8');
  const componentName = file.replace('.svg', '').split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('') + 'Icon';
  
  // Extract content inside <svg ...> ... </svg>
  const match = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  if (!match) return;
  
  let inner = match[1];
  
  // Replace standard attributes with camelCase
  inner = inner.replace(/fill-rule/g, 'fillRule');
  inner = inner.replace(/clip-rule/g, 'clipRule');
  inner = inner.replace(/stroke-width/g, 'strokeWidth');
  inner = inner.replace(/stroke-linecap/g, 'strokeLinecap');
  inner = inner.replace(/stroke-linejoin/g, 'strokeLinejoin');
  inner = inner.replace(/stroke-miterlimit/g, 'strokeMiterlimit');
  inner = inner.replace(/xml:space/g, 'xmlSpace');
  
  // Replace lowercase tags with capitalized ones
  inner = inner.replace(/<path/g, '<Path');
  inner = inner.replace(/<\/path>/g, '</Path>');
  inner = inner.replace(/<g/g, '<G');
  inner = inner.replace(/<\/g>/g, '</G>');
  inner = inner.replace(/<circle/g, '<Circle');
  inner = inner.replace(/<\/circle>/g, '</Circle>');
  inner = inner.replace(/<rect/g, '<Rect');
  inner = inner.replace(/<\/rect>/g, '</Rect>');
  inner = inner.replace(/<defs/g, '<Defs');
  inner = inner.replace(/<\/defs>/g, '</Defs>');
  inner = inner.replace(/<clipPath/g, '<ClipPath');
  inner = inner.replace(/<\/clipPath>/g, '</ClipPath>');
  
  // Find color values and replace with {color}
  // This uses a heuristic: if we see #000000 or #292D32, we replace it.
  inner = inner.replace(/fill="#[A-Fa-f0-9]+"/g, 'fill={color}');
  inner = inner.replace(/stroke="#[A-Fa-f0-9]+"/g, 'stroke={color}');
  
  // There may be some SVGs with <path d="..." /> that don't have fill/stroke explicitly on the path but on the <svg> tag.
  // We can just add fill={color} to paths that don't have stroke or fill if necessary, but typically adding it to the SVG is better.
  
  output += `export function ${componentName}({ color = '#000', size = 24 }: SvgIconProps) {\n`;
  output += `  return (\n`;
  output += `    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">\n`;
  // If the original svg had a different viewBox, we should probably keep it!
  const vbMatch = content.match(/viewBox="([^"]+)"/i);
  const viewBox = vbMatch ? vbMatch[1] : '0 0 24 24';
  
  // Replace the <Svg> tag above with the correct viewBox
  output = output.replace(/<Svg width=\{size\} height=\{size\} viewBox="0 0 24 24" fill="none">\n$/, `<Svg width={size} height={size} viewBox="${viewBox}" fill="none">\n`);
  
  output += `      ${inner.trim()}\n`;
  output += `    </Svg>\n  );\n}\n\n`;
});

fs.writeFileSync(outputFilePath, output);
console.log('Done generating SvgIcons.tsx');
