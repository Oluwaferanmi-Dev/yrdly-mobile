const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Check if file uses theme.colors in a stylesheet but StyleSheet.create isn't wrapped
  // Actually, let's just do a blanket fix for all files
  if (content.includes('StyleSheet.create') && (content.includes('theme.colors') || content.includes('theme.spacing'))) {
    
    // Replace StyleSheet.create({ with createStyleSheet(theme => ({
    // Using a safer regex that captures the body
    content = content.replace(/StyleSheet\.create\(([\s\S]*?)\);/g, (match, body) => {
       if (body.trim().startsWith('{') && body.trim().endsWith('}')) {
          return `createStyleSheet(theme => (${body}));`;
       }
       return match;
    });

    // 2. Add imports
    if (!content.includes("from 'react-native-unistyles'")) {
      content = `import { createStyleSheet, useStyles } from 'react-native-unistyles';\n` + content;
    } else {
      if (!content.includes('createStyleSheet')) {
        content = content.replace(/import \{([^}]*)\} from 'react-native-unistyles'/, (match, group) => {
          return `import { createStyleSheet, ${group.trim()} } from 'react-native-unistyles'`;
        });
      }
      if (!content.includes('useStyles')) {
        content = content.replace(/import \{([^}]*)\} from 'react-native-unistyles'/, (match, group) => {
          return `import { useStyles, ${group.trim()} } from 'react-native-unistyles'`;
        });
      }
    }

    // 3. Update component to use `useStyles`
    content = content.replace(/const styles = createStyleSheet/g, 'const stylesheet = createStyleSheet');
    content = content.replace(/const styles = StyleSheet.create/g, 'const stylesheet = createStyleSheet');
    
    // In components, we need to inject `const { styles, theme } = useStyles(stylesheet);`
    // Let's find the main exported component
    const functionRegex = /export\s+default\s+function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{/g;
    content = content.replace(functionRegex, (match) => {
       if (content.includes('useStyles(stylesheet)')) return match;
       return match + `\n  const { styles, theme } = useStyles(stylesheet);`;
    });

    const arrowRegex = /export\s+(?:const|let)\s+[A-Za-z0-9_]+\s*=\s*\([^)]*\)\s*=>\s*\{/g;
    content = content.replace(arrowRegex, (match) => {
       if (content.includes('useStyles(stylesheet)')) return match;
       return match + `\n  const { styles, theme } = useStyles(stylesheet);`;
    });
    
    const internalFuncRegex = /function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{/g;
    content = content.replace(internalFuncRegex, (match) => {
       if (match.includes('NotificationsHandler') || match.includes('AudioSettingsHandler')) return match; // skip known non-UI components
       if (content.includes('useStyles(stylesheet)')) return match;
       return match + `\n  const { styles, theme } = useStyles(stylesheet);`;
    });
  }

  // Also fix the unistyles breakpoints TS error:
  if (filePath.includes('unistyles.ts')) {
     if (!content.includes('export interface UnistylesBreakpoints')) {
        content = content.replace(/export interface UnistylesThemes extends AppThemes \{\}/, 
        `export interface UnistylesThemes extends AppThemes {}\n  export interface UnistylesBreakpoints extends typeof breakpoints {}`);
     }
  }

  // Check if we missed extracting `theme` where it is used inline
  if (content.includes('useStyles(') && content.includes('theme.colors') && !content.includes('theme } = useStyles') && !content.includes('theme} = useStyles') && !content.includes('theme) =>')) {
     content = content.replace(/const\s+\{\s*styles\s*\}\s*=\s*useStyles\(/, 'const { styles, theme } = useStyles(');
  }

  // In CommentItem.tsx: "Property 'TEXT_PRIMARY' does not exist on type ...colors"
  // It uses `colors.TEXT_PRIMARY` where `colors` is from `useTheme()` from old React Navigation theme.
  if (filePath.includes('CommentItem.tsx')) {
     if (content.includes('colors.TEXT_PRIMARY')) {
         content = content.replace(/colors\.TEXT_PRIMARY/g, 'theme.colors.TEXT_PRIMARY');
     }
     if (content.includes('colors.SURFACE')) {
         content = content.replace(/colors\.SURFACE/g, 'theme.colors.SURFACE');
     }
     if (content.includes('colors.DARK')) {
         content = content.replace(/colors\.DARK/g, 'theme.colors.DARK');
     }
     if (content.includes('colors.LABEL')) {
         content = content.replace(/colors\.LABEL/g, 'theme.colors.LABEL');
     }
     // Replace old useTheme with useAppTheme or useStyles if not present
     if (content.includes('colors.') && !content.includes('const { colors }')) {
         content = content.replace(/const \{ colors \} = useTheme\(\);/g, 'const { colors } = useAppTheme();');
     }
  }
  
  if (filePath.includes('PostCard.tsx')) {
     // PostCard has `theme` error
     if (content.includes('theme.colors') && !content.includes('useStyles(') && !content.includes('theme } = useStyles')) {
         content = content.replace(/export function PostCard\([^)]*\)\s*\{/, (match) => {
             return match + `\n  const { theme } = useStyles();`;
         });
     }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', filePath);
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (let file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

const basePath = '/Users/macbook/Development/projects/yrdly-mobile/src';
walk(path.join(basePath, 'app'));
walk(path.join(basePath, 'components'));
walk(path.join(basePath, 'theme'));

