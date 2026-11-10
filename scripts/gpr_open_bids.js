// Pulls every OPEN event from the Georgia Procurement Registry (GPR) and
// writes the raw JSON to the path given as the first argument.
//
// GPR has no public API; the search page calls /gpr/eventSearch itself.
// We load the page in a headless browser and raise the page size so one
// request returns everything.
//
// Usage: node scripts/gpr_open_bids.js research/gpr-open-bids.json
// Needs: playwright, and network access to ssl.doas.state.ga.us
const { chromium } = require('playwright');
const fs = require('fs');

const out = process.argv[2] || 'gpr-open-bids.json';
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ userAgent: UA })).newPage();
  await page.route('**/gpr/eventSearch', (route) => {
    const body = route.request().postData().replace(/(^|&)length=\d+/, '$1length=5000');
    return route.continue({ postData: body });
  });
  const response = page.waitForResponse((r) => r.url().includes('/gpr/eventSearch'), {
    timeout: 60000,
  });
  await page.goto('https://ssl.doas.state.ga.us/gpr/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  const json = await (await response).json();
  if (json.data.length < json.recordsTotal) {
    throw new Error(`Got ${json.data.length} of ${json.recordsTotal} events; raise the page size`);
  }
  fs.writeFileSync(out, JSON.stringify(json));
  console.log(`${json.data.length} open events written to ${out}`);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
