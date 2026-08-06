import { Project, SyntaxKind, VariableDeclarationKind } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: './tsconfig.json',
});

const sourceFiles = project.getSourceFiles('src/**/*.tsx');
let updatedCount = 0;

for (const sourceFile of sourceFiles) {
  let changed = false;

  // 1. Rename module-level `stylesheet` to `_stylesheet`
  const stylesheetVar = sourceFile.getVariableDeclaration('stylesheet');
  if (stylesheetVar) {
    const initializer = stylesheetVar.getInitializer();
    if (initializer && initializer.getText().includes('createStyleSheet')) {
      stylesheetVar.rename('_stylesheet');
      changed = true;
    }
  }

  // 2. Update the `useStyles` destructured assignment
  sourceFile.getFunctions().forEach(func => {
    // Check if the function has `const { styles: styles } = useStyles(_stylesheet);`
    const varStatement = func.getVariableStatement(stmt => stmt.getText().includes('useStyles'));
    if (varStatement) {
      const decl = varStatement.getDeclarations()[0];
      if (decl) {
        varStatement.replaceWithText('const { styles: stylesheet, theme } = useStyles(_stylesheet);');
        changed = true;
      }
    }
  });

  // Also check arrow functions that might be exported as components
  sourceFile.getVariableDeclarations().forEach(varDecl => {
    const initializer = varDecl.getInitializer();
    if (initializer && (initializer.getKind() === SyntaxKind.ArrowFunction)) {
       const func = initializer;
       // Check if there is a variable statement inside
       const block = func.getFirstChildByKind(SyntaxKind.Block);
       if (block) {
         const varStatement = block.getVariableStatement(stmt => stmt.getText().includes('useStyles'));
         if (varStatement) {
           varStatement.replaceWithText('const { styles: stylesheet, theme } = useStyles(_stylesheet);');
           changed = true;
         }
       }
    }
  });

  if (changed) {
    sourceFile.saveSync();
    updatedCount++;
    console.log(`Updated ${sourceFile.getFilePath()}`);
  }
}

console.log(`Finished updating ${updatedCount} files.`);
