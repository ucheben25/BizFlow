/**
 * BizBook Vercel Serverless Function Entrypoint
 * Forwards requests to the Express application without binding TCP ports.
 */

const app = require('../server/index');

module.exports = app;
