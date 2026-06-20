const fs = require('fs');

const files = [
  '/Users/macbook/Development/projects/yrdly-mobile/src/app/transactions/[id]/dispute.tsx',
  '/Users/macbook/Development/projects/yrdly-mobile/src/app/chat/[id].tsx',
  '/Users/macbook/Development/projects/yrdly-mobile/src/app/settings/index.tsx',
  '/Users/macbook/Development/projects/yrdly-mobile/src/app/(tabs)/create.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/console\.error\("ImagePicker error:"/g, 'console.log("ImagePicker error:"');
    fs.writeFileSync(file, content);
  }
});
