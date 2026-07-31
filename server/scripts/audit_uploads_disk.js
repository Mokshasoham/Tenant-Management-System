import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsPath = path.resolve(__dirname, '..', 'uploads');

console.log('Scanning uploads directory at:', uploadsPath);

function scanDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) {
    console.log(`Directory does not exist: ${dir}`);
    return results;
  }
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results.push(...scanDir(fullPath));
    } else {
      results.push({
        path: fullPath,
        relativePath: path.relative(uploadsPath, fullPath).replace(/\\/g, '/'),
        size: stat.size
      });
    }
  });
  return results;
}

const files = scanDir(uploadsPath);
console.log(`Found ${files.length} physical files on disk:`);
files.forEach(f => {
  console.log(`- Path: /uploads/${f.relativePath} (${f.size} bytes)`);
});
