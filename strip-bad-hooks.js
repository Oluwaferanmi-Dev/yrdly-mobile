const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let count = 0;
walkDir('./src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Using regex to match it with any leading spaces
    const regex = /^[ \t]*const { styles: styles } = useStyles\(_stylesheet\);\r?\n?/gm;
    if (regex.test(content)) {
      const newContent = content.replace(regex, '');
      fs.writeFileSync(filePath, newContent);
      count++;
      console.log('Fixed:', filePath);
    }
  }
});
console.log('Total fixed:', count);
