/** Public-catalog boundary. No customer/QR payload records belong in this file. */
const STATES = ['draft', 'review', 'approved', 'retired'];
const AVAILABILITY = ['in_stock', 'out_of_stock', 'preorder'];
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasText = value => typeof value === 'string' && value.trim().length > 0;
const isHttps = value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
};

function shape(value, allowed, path, errors) {
  if (!isObject(value)) {
    errors.push(`${path}: expected an object`);
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`${path}.${key}: unrecognized field; private data is prohibited`);
  }
  return true;
}

function textFields(value, keys, path, required, errors) {
  for (const key of keys) {
    if ((required || value[key] !== undefined) && !hasText(value[key])) errors.push(`${path}.${key}: nonempty text required`);
  }
}

/** Validate draft shape, or require a complete publication-ready approved record. */
export function validateProduct(product, { forPublication = false } = {}) {
  const errors = [];
  if (!shape(product, ['id', 'revision', 'status', 'facts', 'copyDraft', 'evidence', 'approval'], 'product', errors)) return { valid: false, errors };
  textFields(product, ['id', 'revision'], 'product', true, errors);
  if (!STATES.includes(product.status)) errors.push('product.status: expected draft, review, approved, or retired');
  const complete = forPublication || product.status === 'approved';
  if (forPublication && product.status !== 'approved') errors.push('product.status: only approved products may be published');
  if (shape(product.facts, ['name', 'description', 'brand', 'url', 'images', 'price', 'availability', 'apparel', 'qr', 'shipping', 'returns'], 'product.facts', errors)) {
    const facts = product.facts;
    textFields(facts, ['name', 'description', 'brand', 'shipping', 'returns'], 'product.facts', complete, errors);
    if ((complete || facts.url !== undefined) && !isHttps(facts.url)) errors.push('product.facts.url: public HTTPS URL without credentials, query, or fragment required');
    if (complete || facts.price !== undefined) {
      if (shape(facts.price, ['amountMinor', 'currency'], 'product.facts.price', errors)) {
        if (!Number.isSafeInteger(facts.price.amountMinor) || facts.price.amountMinor < 0) errors.push('product.facts.price.amountMinor: nonnegative safe integer required');
        if (!/^[A-Z]{3}$/.test(facts.price.currency ?? '')) errors.push('product.facts.price.currency: uppercase three-letter currency code required');
      }
    }
    if ((complete || facts.availability !== undefined) && !AVAILABILITY.includes(facts.availability)) errors.push('product.facts.availability: expected in_stock, out_of_stock, or preorder');
    if (complete || facts.images !== undefined) {
      if (!Array.isArray(facts.images) || facts.images.length === 0) errors.push('product.facts.images: at least one image required');
      else facts.images.forEach((image, index) => {
        const path = `product.facts.images[${index}]`;
        if (shape(image, ['url', 'alt'], path, errors)) {
          if (!isHttps(image.url)) errors.push(`${path}.url: public HTTPS URL without credentials, query, or fragment required`);
          textFields(image, ['alt'], path, true, errors);
        }
      });
    }
    if (complete || facts.apparel !== undefined) {
      if (shape(facts.apparel, ['material', 'careInstructions', 'sizes', 'colors'], 'product.facts.apparel', errors)) {
        textFields(facts.apparel, ['material', 'careInstructions'], 'product.facts.apparel', complete, errors);
        for (const key of ['sizes', 'colors']) {
          if (complete || facts.apparel[key] !== undefined) {
            if (!Array.isArray(facts.apparel[key]) || !facts.apparel[key].length || !facts.apparel[key].every(hasText)) errors.push(`product.facts.apparel.${key}: nonempty text array required`);
          }
        }
      }
    }
    if (complete || facts.qr !== undefined) {
      if (shape(facts.qr, ['summary', 'activation', 'fees'], 'product.facts.qr', errors)) textFields(facts.qr, ['summary', 'activation', 'fees'], 'product.facts.qr', complete, errors);
    }
  }
  if (product.copyDraft !== undefined && shape(product.copyDraft, ['basedOnRevision', 'name', 'description'], 'product.copyDraft', errors)) {
    textFields(product.copyDraft, ['basedOnRevision'], 'product.copyDraft', true, errors);
    textFields(product.copyDraft, ['name', 'description'], 'product.copyDraft', false, errors);
    if (product.copyDraft.basedOnRevision !== product.revision) errors.push('product.copyDraft.basedOnRevision: stale proposal');
  }
  if (complete || product.evidence !== undefined) {
    if (!Array.isArray(product.evidence) || !product.evidence.length) errors.push('product.evidence: factual evidence required');
    else product.evidence.forEach((entry, index) => {
      const path = `product.evidence[${index}]`;
      if (shape(entry, ['field', 'reference'], path, errors)) textFields(entry, ['field', 'reference'], path, true, errors);
    });
  }
  if (complete || product.approval !== undefined) {
    if (shape(product.approval, ['revision', 'reviewer', 'approvedAt'], 'product.approval', errors)) {
      textFields(product.approval, ['revision', 'reviewer', 'approvedAt'], 'product.approval', true, errors);
      if (product.approval.revision !== product.revision) errors.push('product.approval.revision: approval does not cover current revision');
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(product.approval.approvedAt ?? '') || !Number.isFinite(Date.parse(product.approval.approvedAt))) errors.push('product.approval.approvedAt: ISO UTC timestamp required');
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateCatalog(catalog) {
  const errors = [];
  if (!shape(catalog, ['schemaVersion', 'revision', 'products'], 'catalog', errors)) return { valid: false, errors };
  if (catalog.schemaVersion !== 1) errors.push('catalog.schemaVersion: expected 1');
  textFields(catalog, ['revision'], 'catalog', true, errors);
  if (!Array.isArray(catalog.products)) errors.push('catalog.products: array required');
  else {
    const ids = new Set();
    catalog.products.forEach((product, index) => {
      errors.push(...validateProduct(product).errors.map(error => `catalog.products[${index}]: ${error}`));
      if (isObject(product)) {
        if (ids.has(product.id)) errors.push(`catalog.products[${index}].id: duplicate product ID`);
        ids.add(product.id);
      }
    });
  }
  return { valid: errors.length === 0, errors };
}

/** Fail closed; draft proposals, reviewer identity and evidence never leave this boundary. */
export function selectPublishableProducts(catalog) {
  const result = validateCatalog(catalog);
  if (!result.valid) throw new Error(`Invalid catalog:\n${result.errors.join('\n')}`);
  return catalog.products.filter(product => product.status === 'approved').map(product => {
    const result = validateProduct(product, { forPublication: true });
    if (!result.valid) throw new Error(result.errors.join('\n'));
    return { id: product.id, revision: product.revision, ...structuredClone(product.facts) };
  });
}
