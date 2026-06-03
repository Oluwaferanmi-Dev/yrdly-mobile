const fs = require('fs');
const path = require('path');

const iconMap = {
  'add': 'Plus',
  'arrow-back': 'ArrowLeft',
  'business': 'Briefcase',
  'business-outline': 'Briefcase',
  'calendar': 'Calendar',
  'calendar-outline': 'Calendar',
  'camera-outline': 'Camera',
  'cart': 'ShoppingCart',
  'cart-outline': 'ShoppingCart',
  'chatbubble': 'MessageCircle',
  'chatbubble-outline': 'MessageCircle',
  'chatbubbles': 'MessageSquare',
  'chatbubbles-outline': 'MessageSquare',
  'checkmark-circle': 'CheckCircle',
  'checkmark-done': 'CheckCheck',
  'chevron-forward': 'ChevronRight',
  'close': 'X',
  'heart': 'Heart',
  'home': 'Home',
  'location': 'MapPin',
  'location-outline': 'MapPin',
  'lock-closed': 'Lock',
  // 'logo-google' -> keep Ionicons
  'mail-outline': 'Mail',
  'map-outline': 'Map',
  'notifications': 'Bell',
  'notifications-off-outline': 'BellOff',
  'notifications-outline': 'Bell',
  'options-outline': 'SlidersHorizontal',
  'pencil': 'Pencil',
  'people': 'Users',
  'person': 'User',
  'qr-code': 'QrCode',
  'search': 'Search',
  'search-outline': 'Search',
  'send': 'Send',
  'settings-outline': 'Settings',
  'share-social-outline': 'Share2',
  'ticket-outline': 'Ticket',
  'time': 'Clock',
  'warning': 'AlertTriangle',
  'warning-outline': 'AlertTriangle'
};

const files = [
  'src/components/MarketplaceItemCard.tsx',
  'src/components/EventCard.tsx',
  'src/components/PostCard.tsx',
  'src/app/events/[id].tsx',
  'src/app/(auth)/forgot-password.tsx',
  'src/app/(auth)/login.tsx',
  'src/app/checkout/[id].tsx',
  'src/app/profile/[id].tsx',
  'src/app/tickets.tsx',
  'src/app/notifications.tsx',
  'src/app/map.tsx',
  'src/app/community.tsx',
  'src/app/chat/[id].tsx',
  'src/app/(tabs)/_layout.tsx',
  'src/app/marketplace/[id].tsx',
  'src/app/(tabs)/profile.tsx',
  'src/app/(tabs)/messages.tsx',
  'src/app/(tabs)/catalog.tsx',
  'src/app/(tabs)/create.tsx',
  'src/app/settings.tsx',
  'src/app/posts/[id].tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace <Ionicons ... /> with Lucide equivalent
  let usedLucideIcons = new Set();
  
  // Custom replacer function to avoid replacing logo-google
  const regex = /<Ionicons([^>]*?)name=(['"])(.*?)(['"])([^>]*?)\/?>/g;
  
  content = content.replace(regex, (match, before, q1, iconName, q2, after) => {
    // If it's a dynamic name, like name={showPassword ? 'eye-off-outline' : 'eye-outline'}
    // It won't match the simple regex anyway because of curly braces, 
    // wait, login.tsx has `<Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} ...`
    // Let's handle string literals only here, and handle dynamic manually later, or fix regex.
    return match;
  });
  
  // A better regex: find `<Ionicons ... />`
  // and parse it manually.
  let newContent = content;
  const tagRegex = /<Ionicons\s+([^>]*?)\/?>/g;
  
  newContent = newContent.replace(tagRegex, (match, propsStr) => {
    const nameMatch = propsStr.match(/name=(['"])(.*?)(['"])/);
    const dynamicNameMatch = propsStr.match(/name=\{([^}]*)\}/);
    
    let lucideIcon = null;
    let newPropsStr = propsStr;
    
    if (nameMatch) {
      const name = nameMatch[2];
      if (name === 'logo-google') return match; // Keep Ionicons
      
      lucideIcon = iconMap[name];
      if (lucideIcon) {
        newPropsStr = propsStr.replace(/name=(['"])(.*?)(['"])/, '');
      }
    } else if (dynamicNameMatch) {
      const expr = dynamicNameMatch[1];
      if (file.includes('login.tsx') && expr.includes('showPassword')) {
        lucideIcon = '{showPassword ? EyeOff : Eye}';
      }
    }

    if (lucideIcon) {
      if (lucideIcon.startsWith('{')) {
         usedLucideIcons.add('Eye');
         usedLucideIcons.add('EyeOff');
         return `<${lucideIcon.replace(/[{}]/g, '')} ${newPropsStr.trim()} />`; // Won't work if dynamic.
      } else {
         usedLucideIcons.add(lucideIcon);
         return `<${lucideIcon} ${newPropsStr.trim()} />`;
      }
    }
    return match; // fallback
  });

  // Handle the dynamic one manually
  if (file.includes('login.tsx')) {
    newContent = newContent.replace(
      /<Ionicons name=\{showPassword \? "eye-off-outline" : "eye-outline"\} size=\{20\} color="#9ca3af" \/>/g,
      '<Eye size={20} color="#9ca3af" />' // We will conditionally render the component
    );
    // actually, React component names can't be dynamic strings like that, we need conditional rendering:
    newContent = newContent.replace(
      /<Ionicons name=\{showPassword \? "eye-off-outline" : "eye-outline"\}([^>]*?)\/>/g,
      '{showPassword ? <EyeOff$1/> : <Eye$1/>}'
    );
    usedLucideIcons.add('Eye');
    usedLucideIcons.add('EyeOff');
  }

  // Import injection
  if (usedLucideIcons.size > 0) {
    const imports = Array.from(usedLucideIcons).join(', ');
    if (newContent.includes('import { Ionicons }')) {
      newContent = newContent.replace(
        /import\s+\{\s*Ionicons\s*\}\s+from\s+['"]@expo\/vector-icons['"];?/,
        (match) => {
          if (file.includes('login.tsx')) {
             return `${match}\nimport { ${imports} } from 'lucide-react-native';`;
          }
          return `import { ${imports} } from 'lucide-react-native';`;
        }
      );
    } else {
       newContent = `import { ${imports} } from 'lucide-react-native';\n` + newContent;
    }
  }

  // Final fix for dynamic eye icon size replacement which might leave empty gaps
  newContent = newContent.replace(/\s+\/>/g, ' />');

  fs.writeFileSync(filePath, newContent, 'utf8');
});

console.log('Done replacing icons');
