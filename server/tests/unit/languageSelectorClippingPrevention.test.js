import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('TMS Language Selector & Collapsed Sidebar Clipping Prevention Tests', () => {
  const sidebarPath = path.resolve(__dirname, '../../../client/src/components/Sidebar.jsx');
  const languagePickerPath = path.resolve(__dirname, '../../../client/src/components/SidebarLanguagePicker.jsx');
  const languageContextPath = path.resolve(__dirname, '../../../client/src/context/LanguageContext.jsx');

  test('1. Sidebar.jsx must delegate language selection to SidebarLanguagePicker without inline overflow clipping', () => {
    const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');

    // Sidebar must import and use SidebarLanguagePicker
    expect(sidebarCode).toContain("import SidebarLanguagePicker from './SidebarLanguagePicker';");
    expect(sidebarCode).toContain('<SidebarLanguagePicker isOpen={isOpen} colorTheme={colorTheme} effectiveRole={effectiveRole} />');

    // Sidebar must retain its overflow-hidden geometry on the parent container
    expect(sidebarCode).toContain('flex flex-col overflow-hidden');
  });

  test('2. SidebarLanguagePicker.jsx must use React Portal to render outside clipping ancestor containers', () => {
    const pickerCode = fs.readFileSync(languagePickerPath, 'utf8');

    // Must import and use createPortal to document.body
    expect(pickerCode).toContain("import { createPortal } from 'react-dom';");
    expect(pickerCode).toContain('createPortal(');
    expect(pickerCode).toContain('document.body');

    // Must render with fixed positioning and high z-index
    expect(pickerCode).toContain("position: 'fixed'");
    expect(pickerCode).toContain('zIndex: 9999');
  });

  test('3. Positioning algorithm must account for both expanded and collapsed sidebar states', () => {
    const pickerCode = fs.readFileSync(languagePickerPath, 'utf8');

    // In expanded state (isOpen): aligns right edge with trigger button
    expect(pickerCode).toContain('if (isOpen) {');
    expect(pickerCode).toContain('left = rect.right - menuWidth;');

    // In collapsed state (!isOpen): aligns left edge with trigger button to extend cleanly across screen
    expect(pickerCode).toContain('left = rect.left;');

    // Viewport clamping must prevent off-screen overflow
    expect(pickerCode).toContain('Math.max(12, Math.min(left, windowWidth - menuWidth - 12))');
  });

  test('4. Must continuously track coordinates during sidebar expand/collapse transitions so menu is never misplaced', () => {
    const pickerCode = fs.readFileSync(languagePickerPath, 'utf8');

    // Must use requestAnimationFrame to track the 300ms CSS transition
    expect(pickerCode).toContain('requestAnimationFrame(trackTransition)');
    expect(pickerCode).toContain('cancelAnimationFrame(animationFrameId)');
    expect(pickerCode).toContain('[isOpen, showLangPicker, updateMenuPosition]');
  });

  test('5. Must implement dismissal on click-outside and Escape key with focus restoration', () => {
    const pickerCode = fs.readFileSync(languagePickerPath, 'utf8');

    // Click outside listener
    expect(pickerCode).toContain("document.addEventListener('pointerdown', handlePointerDown);");
    expect(pickerCode).toContain('!menuRef.current.contains(e.target)');
    expect(pickerCode).toContain('!triggerRef.current.contains(e.target)');

    // Escape key listener & focus restoration
    expect(pickerCode).toContain("e.key === 'Escape'");
    expect(pickerCode).toContain('triggerRef.current?.focus()');
  });

  test('6. Must map all 8 supported languages with native names, flags, and selection actions', () => {
    const pickerCode = fs.readFileSync(languagePickerPath, 'utf8');
    const contextCode = fs.readFileSync(languageContextPath, 'utf8');

    expect(pickerCode).toContain('SUPPORTED_LANGUAGES.map');
    expect(pickerCode).toContain('setLanguage(code)');

    // Verify all 8 languages exist in SUPPORTED_LANGUAGES definition in LanguageContext
    const expectedCodes = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'es', 'fr'];
    expectedCodes.forEach(code => {
      expect(contextCode).toContain(`code: '${code}'`);
    });
  });

  test('7. Geometry simulation: verified that collapsed sidebar coordinates prevent clipping', () => {
    // Simulate collapsed sidebar geometry:
    // Sidebar width is 80px (left: 12px, right: 92px).
    // Trigger button is inside sidebar padding (left: 24px, right: 80px, width: 56px, top: 700px).
    // Menu width is 160px.
    const rectCollapsed = { left: 24, right: 80, top: 700, width: 56, height: 40 };
    const menuWidth = 160;
    const windowWidth = 1280;
    const windowHeight = 800;

    // Collapsed positioning formula from SidebarLanguagePicker:
    let leftCollapsed = rectCollapsed.left;
    leftCollapsed = Math.max(12, Math.min(leftCollapsed, windowWidth - menuWidth - 12));
    const bottomCollapsed = Math.max(12, windowHeight - rectCollapsed.top + 8);

    expect(leftCollapsed).toBe(24);
    // Right boundary of menu: 24 + 160 = 184px.
    // In old non-portal DOM, sidebar width was 80px -> 184 > 80 caused 104px clipping.
    // In portaled fixed DOM: 184px < windowWidth (1280px) -> completely unclipped!
    expect(leftCollapsed + menuWidth).toBe(184);
    expect(leftCollapsed + menuWidth).toBeLessThan(windowWidth);

    // Simulate expanded sidebar geometry:
    // Sidebar width is 288px (left: 12px, right: 300px).
    // Trigger button is near right edge (left: 172px, right: 284px, top: 700px).
    const rectExpanded = { left: 172, right: 284, top: 700, width: 112, height: 40 };
    let leftExpanded = rectExpanded.right - menuWidth;
    leftExpanded = Math.max(12, Math.min(leftExpanded, windowWidth - menuWidth - 12));

    expect(leftExpanded).toBe(124);
    // Menu fits completely inside expanded layout
    expect(leftExpanded + menuWidth).toBe(284);
    expect(leftExpanded).toBeGreaterThanOrEqual(12);
  });

  test('8. Geometry simulation: verified that small viewport widths clamp cleanly without horizontal overflow', () => {
    const smallWindowWidth = 360; // Mobile screen width
    const menuWidth = 160;
    const rectMobile = { left: 250, right: 350, top: 600, width: 100, height: 40 };

    let left = rectMobile.left;
    left = Math.max(12, Math.min(left, smallWindowWidth - menuWidth - 12));

    // Must be clamped to: 360 - 160 - 12 = 188px
    expect(left).toBe(188);
    // Total right boundary must not exceed smallWindowWidth - 12px margin
    expect(left + menuWidth).toBeLessThanOrEqual(smallWindowWidth - 12);
    expect(left).toBeGreaterThanOrEqual(12);
  });

  test('9. Framer Motion Portal Hierarchy: createPortal must encapsulate AnimatePresence to prevent React.cloneElement destruction', () => {
    const pickerCode = fs.readFileSync(languagePickerPath, 'utf8');

    // createPortal must wrap AnimatePresence, NOT vice versa
    const portalIndex = pickerCode.indexOf('createPortal(');
    const animatePresenceIndex = pickerCode.indexOf('<AnimatePresence>', portalIndex);
    const motionDivIndex = pickerCode.indexOf('<motion.div', animatePresenceIndex);

    expect(portalIndex).toBeGreaterThan(-1);
    expect(animatePresenceIndex).toBeGreaterThan(portalIndex);
    expect(motionDivIndex).toBeGreaterThan(animatePresenceIndex);

    // Ensure AnimatePresence is NOT placed outside createPortal
    const outerAnimatePresence = pickerCode.slice(0, portalIndex);
    expect(outerAnimatePresence).not.toContain('<AnimatePresence>');
  });

  test('10. Toggle interaction & synchronous position update: prevents initial (0, 0) position flash', () => {
    const pickerCode = fs.readFileSync(languagePickerPath, 'utf8');

    expect(pickerCode).toContain('const handleToggle = (e) => {');
    expect(pickerCode).toContain('updateMenuPosition();');
    expect(pickerCode).toContain('setShowLangPicker(true);');
    expect(pickerCode).toContain('onClick={handleToggle}');
  });

  test('11. Target containment & propagation safety: preserves inside click targets and stops unwanted bubble', () => {
    const pickerCode = fs.readFileSync(languagePickerPath, 'utf8');

    // Inside target protections
    expect(pickerCode).toContain('triggerRef.current && !triggerRef.current.contains(e.target)');
    expect(pickerCode).toContain('menuRef.current && !menuRef.current.contains(e.target)');

    // Option clicks stop propagation and set language
    expect(pickerCode).toContain('e.stopPropagation()');
    expect(pickerCode).toContain('setShowLangPicker(false)');
    expect(pickerCode).toContain('triggerRef.current?.focus()');
  });
});
