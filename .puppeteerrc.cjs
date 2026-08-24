/**
 * Keep production/CI dependency installation lightweight and deterministic.
 * Browser installation is an explicit E2E step:
 *   npx puppeteer browsers install chrome
 */
module.exports = { skipDownload: true };
