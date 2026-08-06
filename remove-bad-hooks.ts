import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({ tsConfigFilePath: './tsconfig.json' });
const sourceFiles = project.getSourceFiles('src/**/*.tsx');
let updatedCount = 0;

for (const sourceFile of sourceFiles) {
  let changed = false;

  // Find all variable declarations that are `const { styles: styles } = useStyles(_stylesheet);`
  sourceFile.getDescendantsOfKind(SyntaxKind.VariableStatement).forEach(stmt => {
    if (stmt.getText().includes('const { styles: styles } = useStyles(_stylesheet);')) {
      const isHookViolation = stmt.getAncestors().some(anc => {
        return anc.getKind() === SyntaxKind.CallExpression && anc.getText().includes('.map(');
      });
      
      if (isHookViolation) {
        stmt.remove();
        changed = true;
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
