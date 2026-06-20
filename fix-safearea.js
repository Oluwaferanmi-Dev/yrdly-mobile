const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walkDir('/Users/macbook/Development/projects/yrdly-mobile/src/app');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('SafeAreaView') && content.includes("'react-native'")) {
    // Check if SafeAreaView is imported from react-native
    const rnImportRegex = /import\s+{[^}]*SafeAreaView[^}]*}\s+from\s+['"]react-native['"];?/;
    const match = content.match(rnImportRegex);
    
    if (match) {
      console.log('Fixing:', file);
      // Remove SafeAreaView from react-native import
      let newImport = match[0].replace(/,\s*SafeAreaView/, '').replace(/SafeAreaView\s*,?\s*/, '');
      if (newImport.includes('import { }') || newImport.includes('import {}')) {
        content = content.replace(match[0], ''); // remove completely
      } else {
        content = content.replace(match[0], newImport);
      }
      
      // Add SafeAreaView to react-native-safe-area-context
      const rnSacImportRegex = /import\s+{[^}]*}\s+from\s+['"]react-native-safe-area-context['"];?/;
      const sacMatch = content.match(rnSacImportRegex);
      if (sacMatch) {
        let newSacImport = sacMatch[0].replace('{', '{ SafeAreaView, ');
        content = content.replace(sacMatch[0], newSacImport);
      } else {
        // Add new import after react-native import
        const newSacImport = `import { SafeAreaView } from 'react-native-safe-area-context';\n`;
        content = content.replace(/(import.*react-native['"];?\n)/, `$1${newSacImport}`);
      }
      
      fs.writeFileSync(file, content);
    }
  }
});
