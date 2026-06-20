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
  if (content.includes("behavior={Platform.OS === 'ios' ? 'padding' : undefined}")) {
    console.log('Fixing KeyboardAvoidingView in:', file);
    content = content.replace(
      "behavior={Platform.OS === 'ios' ? 'padding' : undefined}",
      "behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}\n        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}"
    );
    fs.writeFileSync(file, content);
  }
});
