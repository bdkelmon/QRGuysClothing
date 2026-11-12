import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCatalog, validateProduct, selectPublishableProducts } from '../catalog/validate.mjs';

// Synthetic test-only fixture. This is not a launch product or business claim.
function fixture() {
  return {
    id: 'test-only', revision: 'test-r1', status: 'approved',
    facts: {
      name: 'Test garment', description: 'Synthetic test fixture', brand: 'Test brand',
      url: 'https://example.invalid/products/test-only',
      images: [{ url: 'https://example.invalid/test.png', alt: 'Test garment' }],
      price: { amountMinor: 1234, currency: 'USD' }, availability: 'in_stock',
      apparel: { material: 'Test material', careInstructions: 'Test instructions', sizes: ['Test size'], colors: ['Test color'] },
      qr: { summary: 'Test feature', activation: 'Test activation', fees: 'Test fee terms' },
      shipping: 'Test shipping', returns: 'Test returns',
    },
    evidence: [{ field: 'facts', reference: 'Synthetic test specification' }],
    approval: { revision: 'test-r1', reviewer: 'test-reviewer', approvedAt: '2026-11-12T12:00:00Z' },
  };
}
const catalog = products => ({ schemaVersion: 1, revision: 'test-catalog-r1', products });

test('committed catalog is empty and publishes no invented products', async () => {
  const source = JSON.parse(await readFile(new URL('../catalog/products.json', import.meta.url), 'utf8'));
  assert.equal(validateCatalog(source).valid, true);
  assert.deepEqual(source.products, []);
  assert.deepEqual(selectPublishableProducts(source), []);
});

test('incomplete drafts are allowed but cannot publish', () => {
  const draft = { id: 'draft', revision: '1', status: 'draft', facts: {} };
  assert.equal(validateProduct(draft).valid, true);
  assert.equal(validateProduct(draft, { forPublication: true }).valid, false);
  assert.deepEqual(selectPublishableProducts(catalog([draft])), []);
});

test('approved product requires the public facts and factual approval', () => {
  for (const field of ['name', 'description', 'brand', 'url', 'images', 'price', 'availability', 'apparel', 'qr', 'shipping', 'returns']) {
    const product = fixture();
    delete product.facts[field];
    assert.equal(validateProduct(product).valid, false, field);
  }
  for (const field of ['evidence', 'approval']) {
    const product = fixture();
    delete product[field];
    assert.throws(() => selectPublishableProducts(catalog([product])), /Invalid catalog/);
  }
});

test('rejects fractional, negative, unsafe, and string money amounts', () => {
  for (const amount of [12.34, -1, Number.MAX_SAFE_INTEGER + 1, '1234', NaN]) {
    const product = fixture();
    product.facts.price.amountMinor = amount;
    assert.equal(validateProduct(product).valid, false);
  }
});

test('rejects stale approval and stale copy proposals', () => {
  const product = fixture();
  product.revision = 'test-r2';
  assert.equal(validateProduct(product).valid, false);
  product.approval.revision = 'test-r2';
  product.copyDraft = { basedOnRevision: 'test-r1', description: 'Old proposal' };
  assert.equal(validateProduct(product).valid, false);
});

test('rejects unrecognized fields at public/private boundary', () => {
  for (const inject of [
    product => { product.customerId = 'private'; },
    product => { product.facts.qr.destination = 'private'; },
    product => { product.facts.images[0].accessToken = 'private'; },
    product => { product.facts.price.stripeSecret = 'private'; },
    product => { product.facts.apparel.owner = 'private'; },
  ]) {
    const product = fixture();
    inject(product);
    assert.throws(() => selectPublishableProducts(catalog([product])), /private data is prohibited/);
  }
});

test('rejects credential-bearing, signed, and non-HTTPS public links', () => {
  for (const url of ['https://user:password@example.invalid/product', 'https://example.invalid/product?token=secret', 'http://example.invalid/product', 'javascript:alert(1)']) {
    const product = fixture();
    product.facts.url = url;
    assert.equal(validateProduct(product).valid, false);
  }
});

test('public output excludes approval, evidence, draft copy; repeated selection is stable', () => {
  const product = fixture();
  product.copyDraft = { basedOnRevision: 'test-r1', description: 'Unapproved proposed description' };
  const source = catalog([product]);
  const selected = selectPublishableProducts(source);
  assert.equal(selected[0].description, product.facts.description);
  for (const field of ['approval', 'evidence', 'copyDraft', 'status']) assert.equal(field in selected[0], false);
  assert.deepEqual(selectPublishableProducts(source), selected);
  selected[0].price.amountMinor = 9999;
  assert.equal(product.facts.price.amountMinor, 1234);
});

test('rejects duplicate IDs and malformed catalog roots', () => {
  assert.equal(validateCatalog(catalog([fixture(), fixture()])).valid, false);
  for (const value of [null, [], {}, { schemaVersion: 1, revision: '1', products: [null] }]) {
    assert.equal(validateCatalog(value).valid, false);
  }
});
