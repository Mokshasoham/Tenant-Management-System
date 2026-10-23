import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('TMS UI Artifact Prevention & Google Places Autocomplete Lifecycle Tests', () => {
  const globalCssPath = path.resolve(__dirname, '../../../client/src/styles/global.css');
  const propertyModalPath = path.resolve(__dirname, '../../../client/src/components/PropertyModal.jsx');
  const propertiesPagePath = path.resolve(__dirname, '../../../client/src/pages/PropertiesPage.jsx');

  test('1. global.css must contain strict CSS overrides suppressing orphan .pac-container borders and empty containers', () => {
    const css = fs.readFileSync(globalCssPath, 'utf8');

    // Must reset top border and box-shadow completely
    expect(css).toContain('.pac-container {');
    expect(css).toContain('border-top: none !important;');
    expect(css).toContain('box-shadow: none !important;');

    // Must strictly hide empty or itemless pac-containers
    expect(css).toContain('.pac-container:empty');
    expect(css).toContain('.pac-container:not(:has(.pac-item))');
    expect(css).toContain('display: none !important;');
    expect(css).toContain('visibility: hidden !important;');
    expect(css).toContain('height: 0 !important;');
  });

  test('2. PropertyModal.jsx must implement active tab and unmount cleanup for .pac-container DOM elements', () => {
    const code = fs.readFileSync(propertyModalPath, 'utf8');

    // Must contain purge effect for .pac-container
    expect(code).toContain("const containers = document.querySelectorAll('.pac-container');");
    expect(code).toContain("el.style.display = 'none';");
    expect(code).toContain('el.remove();');

    // Must purge when activeTab is not location
    expect(code).toContain("if (activeTab !== 'location')");

    // Must purge on modal close
    expect(code).toContain('const handleClose = () => {');
  });

  test('3. PropertyModal backdrop must use bleed margin and hardware backface visibility to prevent compositing edge seams', () => {
    const code = fs.readFileSync(propertyModalPath, 'utf8');

    // Backdrop should use -inset-2 or similar bleed margin rather than exact inset-0 to prevent subpixel edge lines
    expect(code).toContain('fixed -inset-2');
    expect(code).toContain("backfaceVisibility: 'hidden'");
  });

  test('4. PropertiesPage.jsx must clean up orphaned .pac-container nodes on modal close and save', () => {
    const code = fs.readFileSync(propertiesPagePath, 'utf8');

    // Both onClose and onSave handlers must sweep .pac-container
    expect(code).toContain("const pacContainers = document.querySelectorAll('.pac-container');");
    expect(code).toContain('pacContainers.forEach(el => { el.style.display = \'none\'; el.remove(); });');
  });
});
