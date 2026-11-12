'use strict';
const { handler, authenticate, HttpError } = require('../lib/backend');
const createHandler = (overrides = {}) => handler('POST', async ({ req, client }) => {
  const user = await authenticate(req, client);
  const code = req.body?.activation_code;
  if (typeof code !== 'string' || !/^QRG-[A-F0-9]{32}$/i.test(code.trim())) throw new HttpError(400, 'A valid activation code is required');
  // A public link ID is never sufficient proof of ownership.
  const claimed = await client.rpc('qrg_claim_apparel', { p_activation_code: code.trim().toUpperCase(), p_user_id: user.id });
  if (!claimed?.length) throw new HttpError(409, 'This code is unavailable or the purchase is not ready');
  return { success: true, claimed: claimed.map(row => row.link_id) };
}, overrides);
module.exports = createHandler();
module.exports.createHandler = createHandler;
