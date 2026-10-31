import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const zip = new JSZip();
const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'midade-final.zip');

const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', '.cache', 'dev-dist']);
const EXCLUDE_FILES = new Set(['midade-final.zip', 'bun.lock', '.DS_Store']);

function addDirectoryToZip(dirPath, zipFolder) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        const subFolder = zipFolder.folder(entry.name);
        addDirectoryToZip(fullPath, subFolder);
      }
    } else if (entry.isFile()) {
      if (!EXCLUDE_FILES.has(entry.name) && !entry.name.endsWith('.zip')) {
        const content = fs.readFileSync(fullPath);
        zipFolder.file(entry.name, content);
      }
    }
  }
}

async function createPackage() {
  console.log('Packaging MIDADE clean production codebase into ZIP...');
  addDirectoryToZip(ROOT, zip);

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  fs.writeFileSync(OUT_FILE, buffer);
  console.log(`Success! Package created at: ${OUT_FILE} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

createPackage().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
