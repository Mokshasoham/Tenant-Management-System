import fs from 'fs';
import path from 'path';

function getFiles(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      getFiles(full, files);
    } else if (full.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const allJsFiles = getFiles('./src');
let errors = 0;

for (const file of allJsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const importRegex = /from\s+['"](\.\.?\/.*?)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const resolvedPath = path.resolve(path.dirname(file), importPath);
    const dir = path.dirname(resolvedPath);
    const base = path.basename(resolvedPath);
    if (fs.existsSync(dir)) {
      const actualFiles = fs.readdirSync(dir);
      if (!actualFiles.includes(base)) {
        console.error('CASE MISMATCH in file:', file);
        console.error('  Imported:', importPath);
        console.error('  Resolved base:', base);
        console.error('  Actual matching file:', actualFiles.find(f => f.toLowerCase() === base.toLowerCase()));
        errors++;
      }
    } else {
      console.error('DIR NOT FOUND:', dir, 'from', file);
      errors++;
    }
  }
}

console.log('--- VERIFICATION COMPLETE. TOTAL CASE ERRORS FOUND:', errors, '---');
