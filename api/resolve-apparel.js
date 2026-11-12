'use strict';
const { handler, identifier, HttpError } = require('../lib/backend');
const safeUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
};
const createHandler = (overrides = {}) => handler('GET', async ({ req, client }) => {
  const linkId = identifier(req.query?.linkId, 'QR identifier');
  const rows = await client.rpc('qrg_resolve_apparel', { p_link_id: linkId });
  const row = rows?.[0];
  if (!row) throw new HttpError(404, 'This QR content is not available');
  // Explicit projection: no owner, activation secret, history, or payment details.
  return { linkId, contentType: row.content_type, text: row.text_content || '',
    imageUrl: null, url: safeUrl(row.url), textFont: row.text_font,
    textColor: row.text_color, textSize: row.text_size,
    backgroundColor: row.settings?.apparel_background_color || '#0b0f23' };
}, overrides);
module.exports = createHandler();
module.exports.createHandler = createHandler;
