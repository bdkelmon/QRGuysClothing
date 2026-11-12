'use strict';
const { handler, publicConfiguration } = require('../lib/backend');
const createHandler = (overrides = {}) => handler('GET', async ({ config }) => publicConfiguration(config), { ...overrides, admin: false });
module.exports = createHandler();
module.exports.createHandler = createHandler;
