import fs from 'fs';
import path from 'path';

function fixDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      fixDir(full);
    } else if (full.endsWith('.js')) {
      let content = fs.readFileSync(full, 'utf8');

      content = content.replace(/(from\s+['"](\.\.?[^'"]+))(['"])/g, (match, p1, p2, p3) => {
        const targetPath = path.resolve(dir, p2);
        try {
          if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
            return `from '${p2}/index.js'`;
          }
        } catch (e) {}
        if (!p2.endsWith('.js')) {
          return `from '${p2}.js'`;
        }
        return match;
      });

      fs.writeFileSync(full, content, 'utf8');
    }
  }
}

const targetDir = path.resolve('src/modules/lease-engine/core');
fixDir(targetDir);
console.log('Successfully updated directory index ESM import paths in core/.');
