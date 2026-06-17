const fs = require('fs');
const path = require('path');

const ICON_MAP = {
  // Common mappings
  'chevron-forward': 'chevron-right',
  'chevron-back': 'chevron-left',
  'arrow-back': 'arrow-left',
  'arrow-forward': 'arrow-right',
  'arrow-up': 'arrow-up',
  'arrow-down': 'arrow-down',
  'search': 'search',
  'search-outline': 'search',
  'add': 'plus',
  'add-outline': 'plus',
  'add-circle': 'plus-circle',
  'add-circle-outline': 'plus-circle',
  'close': 'x',
  'close-outline': 'x',
  'close-circle': 'x-circle',
  'close-circle-outline': 'x-circle',
  'trash-outline': 'trash-2',
  'trash': 'trash-2',
  'pencil': 'edit-2',
  'pencil-outline': 'edit-2',
  'create-outline': 'edit',
  'send': 'send',
  'send-outline': 'send',
  'share-social-outline': 'share',
  'share-outline': 'share',
  'share': 'share',
  'ellipsis-horizontal': 'more-horizontal',
  'ellipsis-vertical': 'more-vertical',
  'heart-outline': 'heart',
  'heart': 'heart',
  'chatbubble': 'message-circle',
  'chatbubble-outline': 'message-circle',
  'chatbubbles': 'message-square',
  'chatbubbles-outline': 'message-square',
  'paper-plane': 'send',
  'paper-plane-outline': 'send',
  'image': 'image',
  'image-outline': 'image',
  'images': 'image',
  'images-outline': 'image',
  'camera': 'camera',
  'camera-outline': 'camera',
  'videocam': 'video',
  'videocam-outline': 'video',
  'play': 'play',
  'play-circle-outline': 'play-circle',
  'home': 'home',
  'home-outline': 'home',
  'person': 'user',
  'person-outline': 'user',
  'people': 'users',
  'people-outline': 'users',
  'person-add-outline': 'user-plus',
  'notifications': 'bell',
  'notifications-outline': 'bell',
  'notifications-off-outline': 'bell-off',
  'settings': 'settings',
  'settings-outline': 'settings',
  'ticket': 'tag',
  'ticket-outline': 'tag',
  'cart': 'shopping-cart',
  'cart-outline': 'shopping-cart',
  'business-outline': 'briefcase',
  'storefront-outline': 'shopping-bag',
  'bag-handle-outline': 'shopping-bag',
  'receipt-outline': 'file-text',
  'wallet-outline': 'credit-card',
  'cash-outline': 'dollar-sign',
  'shield-checkmark-outline': 'shield',
  'shield-checkmark': 'shield',
  'warning-outline': 'alert-circle',
  'warning': 'alert-triangle',
  'calendar': 'calendar',
  'calendar-outline': 'calendar',
  'location': 'map-pin',
  'location-outline': 'map-pin',
  'map-outline': 'map',
  'time-outline': 'clock',
  'time': 'clock',
  'link-outline': 'link',
  'moon': 'moon',
  'sunny': 'sun',
  'checkmark': 'check',
  'checkmark-done': 'check-circle',
  'checkmark-circle': 'check-circle',
  'information-circle-outline': 'info',
  'lock-closed-outline': 'lock',
  'lock-closed': 'lock',
  'eye-outline': 'eye',
  'eye-off-outline': 'eye-off',
  'qr-code-outline': 'maximize',
  'qr-code': 'maximize',
  'newspaper-outline': 'list',
  'funnel-outline': 'filter',
  'mail-outline': 'mail',
  'mail-open-outline': 'mail',
  'logo-google': 'globe', // Google isn't standard in feather, using globe
  'business': 'briefcase',
  'options-outline': 'sliders',
  'chevron-down': 'chevron-down',
  'cube-outline': 'box',
  'cube': 'box',
  'star-outline': 'star',
  'star': 'star',
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let changedFiles = 0;

walkDir(path.join(__dirname, 'src'), (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace imports
  if (content.includes('import { Ionicons }')) {
    content = content.replace(
      /import\s+{\s*Ionicons\s*}\s+from\s+['"]@expo\/vector-icons['"];?/g,
      "import { Feather } from '@expo/vector-icons';"
    );
  }

  // Map literal name="..." or name={'...'}
  content = content.replace(/<Ionicons([^>]*?)name=(['"])(.*?)\2([^>]*?)\/?>/g, (match, beforeName, quote, iconName, afterName) => {
    let featherName = ICON_MAP[iconName] || 'circle';
    return `<Feather${beforeName}name="${featherName}"${afterName}/>`;
  });

  // Also replace component name only for dynamic names: <Ionicons name={...} /> -> <Feather name={...} />
  content = content.replace(/<Ionicons/g, '<Feather').replace(/<\/Ionicons>/g, '</Feather>');

  // Let's also do a raw string replace across the whole file for icon name literals inside expressions.
  // This is risky but since we're replacing the component, we MUST map the names inside ternary operators too.
  Object.keys(ICON_MAP).forEach(ionicon => {
    // Only replace exact matches surrounded by quotes inside {...} expressions or arrays
    const featherName = ICON_MAP[ionicon];
    const regex1 = new RegExp(`'${ionicon}'`, 'g');
    const regex2 = new RegExp(`"${ionicon}"`, 'g');
    
    // Quick heuristic: If there's an Ionicons import, there might be dynamic icon name strings.
    // Instead of replacing every string blindly, we only replace strings that match the dictionary exactly.
    // E.g. 'heart-outline' -> 'heart'
    content = content.replace(regex1, `'${featherName}'`);
    content = content.replace(regex2, `"${featherName}"`);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    changedFiles++;
    console.log(`Updated: ${filePath.replace(__dirname, '')}`);
  }
});

console.log(`\nCompleted. Updated ${changedFiles} files.`);
