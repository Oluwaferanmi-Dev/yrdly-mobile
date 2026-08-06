const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');
let updatedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('_stylesheet.')) {
    content = content.replace(/_stylesheet\./g, 'stylesheet.');
    fs.writeFileSync(file, content);
    updatedCount++;
    console.log(`Updated ${file}`);
  }
}
console.log(`Finished updating ${updatedCount} files.`);
