import re

files = [
    "src/app/(admin)/create-alert.tsx",
    "src/app/(admin)/disputes/index.tsx",
    "src/app/(admin)/disputes/[id].tsx",
    "src/app/(admin)/requests.tsx",
    "src/app/create-alert.tsx"
]

mapping = {
    'text': 'TEXT_PRIMARY',
    'textSecondary': 'TEXT_SECONDARY',
    'textMuted': 'MUTED',
    'background': 'DARK',
    'card': 'SURFACE_ALT',
    'border': 'GLASS_BORDER',
    'borderLight': 'GLASS_BORDER',
    'tint': 'G',
    'inputBackground': 'SURFACE'
}

for filepath in files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        continue

    # Replacements
    for old, new in mapping.items():
        pattern = r'(?<!theme\.)(?<!theme\?\.)\bcolors\.' + old + r'\b'
        content = re.sub(pattern, f'theme.colors.{new}', content)

    # Remove colors destructure
    content = re.sub(r'const\s*\{\s*colors\s*\}\s*=\s*useAppTheme\(\);?\n?', '', content)
    content = re.sub(r'const\s*\{\s*colors\s*,\s*([^}]+)\}\s*=\s*useAppTheme\(\);?', r'const { \1} = useAppTheme();', content)
    content = re.sub(r'const\s*\{\s*([^,]+),\s*colors\s*\}\s*=\s*useAppTheme\(\);?', r'const { \1 } = useAppTheme();', content)
    content = re.sub(r'const\s*\{\s*([^,]+),\s*colors\s*,\s*([^}]+)\}\s*=\s*useAppTheme\(\);?', r'const { \1, \2} = useAppTheme();', content)

    # If useAppTheme is only in the import statement, remove it
    matches = re.findall(r'\buseAppTheme\b', content)
    if len(matches) == 1:
        content = re.sub(r'import\s+\{\s*useAppTheme\s*\}\s+from\s+[\'\"][^\'\"]+[\'\"];?\n?', '', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
