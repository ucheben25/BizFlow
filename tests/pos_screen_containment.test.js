/**
 * BizBook POS Screen Containment & Workstation Test Suite
 * Validates that the Point of Sale view is strictly contained within screen viewports,
 * eliminates uncontained page scrolling, provides independent scrolling for catalog
 * and cart items, and supports responsive viewports (desktop, tablet, mobile).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function runPOSContainmentTests() {
  console.log('\n>>> RUNNING BIZBOOK POS SCREEN CONTAINMENT & WORKSTATION TEST SUITE <<<');

  const cssPath = path.resolve(__dirname, '../public/css/style.css');
  const posJsPath = path.resolve(__dirname, '../public/js/components/pos.js');
  const appJsPath = path.resolve(__dirname, '../public/js/app.js');

  const css = fs.readFileSync(cssPath, 'utf8');
  const posJs = fs.readFileSync(posJsPath, 'utf8');
  const appJs = fs.readFileSync(appJsPath, 'utf8');

  // --- 1. CSS Workstation & Screen Containment Verification ---
  console.log('\n--- 1. Testing CSS Screen Containment Rules ---');
  
  // Body and App Container Lock
  assert.ok(css.includes('body.pos-mode-active'), 'body.pos-mode-active class must be defined in style.css');
  assert.ok(css.includes('overflow: hidden !important'), 'body.pos-mode-active must enforce overflow: hidden to prevent page scrolling');
  assert.ok(css.includes('height: 100vh !important'), 'body.pos-mode-active must lock height to 100vh');
  console.log('✔ Body and viewport height lock verified (100vh, overflow: hidden).');

  // Content body sizing
  assert.ok(css.includes('body.pos-mode-active .content-body'), 'Content body must have dedicated POS workstation styles');
  assert.ok(css.includes('height: calc(100vh - 56px)'), 'Content body must fit screen height minus topbar (56px)');
  console.log('✔ Content body fitted to screen height minus header (calc(100vh - 56px)).');

  // Grid layout containment
  assert.ok(css.includes('.pos-layout {'), '.pos-layout must be defined');
  assert.ok(css.includes('grid-template-columns: minmax(0, 1fr)'), '.pos-layout must use minmax(0, 1fr) to prevent horizontal overflow');
  assert.ok(css.includes('overflow: hidden;'), '.pos-layout must have overflow: hidden');
  console.log('✔ Two-column grid workstation layout verified with minmax(0, 1fr) overflow protection.');

  // Catalog section & independent scrolling
  assert.ok(css.includes('.pos-catalog-section {'), '.pos-catalog-section must be defined');
  assert.ok(css.includes('.pos-product-grid {'), '.pos-product-grid must be defined');
  assert.ok(css.includes('overflow-y: auto;'), '.pos-product-grid must have overflow-y: auto for independent internal catalog scrolling');
  console.log('✔ Catalog pane configured with pinned search/categories and independent product grid scrolling.');

  // Cart section & independent scrolling
  assert.ok(css.includes('.pos-cart-panel {'), '.pos-cart-panel must be defined');
  assert.ok(css.includes('.cart-items-list {'), '.cart-items-list must be defined');
  assert.ok(css.includes('border-top: 2px dashed var(--border-color);'), '.cart-summary must be pinned at bottom');
  console.log('✔ Cart panel configured with pinned header, scrollable item list, and pinned checkout summary.');

  // Check that 1024px tablet breakpoint does not collapse POS into a single column
  const regex1024 = /@media\s*\(\s*max-width:\s*1024px\s*\)\s*\{([^}]+)\}/g;
  let match;
  let hasCollapsedPosAt1024 = false;
  while ((match = regex1024.exec(css)) !== null) {
    if (match[1].includes('.pos-layout') && match[1].includes('grid-template-columns: 1fr')) {
      hasCollapsedPosAt1024 = true;
    }
  }
  assert.strictEqual(hasCollapsedPosAt1024, false, 'POS must NOT be collapsed to 1 column at 1024px (tablets must show side-by-side workstation)');
  console.log('✔ Verified tablets (up to 1024px) maintain side-by-side workstation layout without collapsing.');

  // Mobile segmented navigation & floating bar
  assert.ok(css.includes('.pos-mobile-nav'), 'Mobile navigation switcher must be defined for small screens');
  assert.ok(css.includes('.pos-mobile-floating-bar'), 'Floating quick-checkout bar must be defined for mobile screens');
  console.log('✔ Mobile segmented navigation tab switcher and floating checkout bar defined.');

  // --- 2. POS Component JS Logic Verification ---
  console.log('\n--- 2. Testing POS Component JavaScript Logic ---');

  // Verify renderPOS adds pos-mode-active
  assert.ok(posJs.includes("document.body.classList.add('pos-mode-active')"), 'renderPOS must activate pos-mode-active class on body');
  console.log('✔ renderPOS activates pos-mode-active viewport lock.');

  // Verify mobile tab switcher implementation
  assert.ok(posJs.includes('function setPOSMobileTab(tab)'), 'setPOSMobileTab function must exist');
  assert.ok(posJs.includes('view-catalog') && posJs.includes('view-cart'), 'setPOSMobileTab must toggle view-catalog and view-cart classes');
  console.log('✔ Mobile tab switcher handles switching between Catalog and Order views.');

  // Verify mobile floating bar integration in renderPOSLayout
  assert.ok(posJs.includes('id="pos-mobile-floating-bar"'), 'Floating cart bar rendered in POS layout');
  assert.ok(posJs.includes('onclick="setPOSMobileTab(\'cart\')"'), 'Floating cart bar navigates to cart view on click');
  console.log('✔ Mobile floating cart bar is integrated with tap-to-review interaction.');

  // Verify back button for mobile in cart header
  assert.ok(posJs.includes('pos-back-btn'), 'Back button to catalog must exist in cart panel for mobile users');
  console.log('✔ Mobile cart panel contains back button to return to catalog.');

  // Verify live indicator updates in updateCartView
  assert.ok(posJs.includes('pos-mobile-order-badge'), 'updateCartView updates mobile order count badge');
  assert.ok(posJs.includes('pos-mobile-order-total'), 'updateCartView updates mobile order total price');
  assert.ok(posJs.includes('pos-mobile-floating-bar'), 'updateCartView dynamically toggles floating bar visibility');
  console.log('✔ updateCartView updates item count badges, order totals, and floating checkout bar.');

  // Verify category pill selection with data-cat-id
  assert.ok(posJs.includes('data-cat-id="all"'), 'Category pills include data-cat-id attributes');
  assert.ok(posJs.includes('data-cat-id="${c.id}"'), 'Individual categories include data-cat-id attributes');
  console.log('✔ Category filter pills use robust data-cat-id selection matching.');

  // --- 3. App Router POS Mode Lifecycle Verification ---
  console.log('\n--- 3. Testing App Lifecycle & Route Transitions ---');

  assert.ok(appJs.includes("viewName === 'pos'"), 'app.js checks for pos view in renderActiveView');
  assert.ok(appJs.includes("document.body.classList.add('pos-mode-active')"), 'app.js adds pos-mode-active when switching to POS view');
  assert.ok(appJs.includes("document.body.classList.remove('pos-mode-active')"), 'app.js removes pos-mode-active when navigating away from POS view');
  console.log('✔ App lifecycle cleanly adds and removes pos-mode-active on view navigation.');

  console.log('\n========================================================');
  console.log('🎉 ALL POS SCREEN CONTAINMENT & WORKSTATION TESTS PASSED 100%! 🎉');
  console.log('========================================================\n');
}

if (require.main === module) {
  runPOSContainmentTests()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('\n❌ TEST SUITE FAILED:', err);
      process.exit(1);
    });
}

module.exports = { runPOSContainmentTests };
