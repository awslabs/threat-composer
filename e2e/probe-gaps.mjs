// TEMPORARY selector probe for the top-tier gaps. Delete after use.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';
const CARD = 'div[class*="awsui_root_"][class*="awsui_variant-default"]';
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));

const log = (...a) => console.log(...a);

// ---- seed a threat + mitigation + assumption ----
await page.goto(BASE + '/workspaces/default/threats', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.getByRole('button', { name: 'Add new threat' }).click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: 'threat source', exact: true }).click();
await page.getByPlaceholder('Enter threat source').fill('external actor');
await page.getByRole('button', { name: 'threat action', exact: true }).click();
await page.getByPlaceholder('Enter threat action').fill('poison the cache');
await page.getByRole('button', { name: 'impacted assets', exact: true }).click();
await page.getByPlaceholder('Select an existing asset or enter new asset').fill('cache tier');
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
// set priority High + STRIDE Tampering via Metadata
const meta = page.getByRole('button', { name: /^Metadata$/ }).first();
await meta.click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Select Priority' }).click();
await page.getByRole('option', { name: 'High', exact: true }).click();
await page.waitForTimeout(300);
log('=== METADATA AREA CONTROLS ===');
log(
  JSON.stringify(
    await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label,[class*="awsui_label"]'))
        .map((l) => (l.innerText || '').trim())
        .filter(Boolean);
      const btns = Array.from(document.querySelectorAll('button'))
        .map((b) => (b.innerText || '').trim() || b.getAttribute('aria-label'))
        .filter(Boolean);
      return { labels: [...new Set(labels)].slice(-14), btns: [...new Set(btns)].slice(-16) };
    }),
    null,
    1,
  ),
);

// STRIDE control
log('--- STRIDE control discovery ---');
log(
  JSON.stringify(
    await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('[class*="awsui_label"]').forEach((l) => {
        const t = (l.innerText || '').trim();
        if (/STRIDE|Priority|Status|Comments/i.test(t)) {
          const field = l.closest('[class*="awsui_root"]');
          const trigger = field?.querySelector('button,[role="button"]');
          out.push({ label: t, triggerText: (trigger?.innerText || '').trim(), triggerAria: trigger?.getAttribute('aria-label') });
        }
      });
      return out;
    }),
    null,
    1,
  ),
);

// Comments (should appear now Metadata is expanded)
log('contenteditable count (Comments editor?): ' + (await page.locator('[contenteditable="true"]').count()));

await page.getByRole('button', { name: /^(Add to list|Add to workspace .+)$/ }).click();
await page.waitForTimeout(1500);
log('threats h1: ' + (await page.locator('h1').first().innerText()));

// ---- STATUS BADGE on the card ----
log('\n=== STATUS BADGE ON CARD ===');
const card1 = page.locator(CARD).filter({ has: page.getByRole('heading', { name: /^Threat 1/ }) }).first();
log(
  'card heading text: ' + JSON.stringify((await card1.getByRole('heading').first().innerText()).replace(/\n/g, ' | ')),
);
const badgeBtns = await card1.evaluate((el) =>
  Array.from(el.querySelectorAll('button')).map((b, i) => ({
    i,
    text: (b.innerText || '').trim(),
    aria: b.getAttribute('aria-label'),
  })),
);
log('card buttons: ' + JSON.stringify(badgeBtns));

// click the Identified badge
const identified = card1.getByRole('button', { name: 'Identified', exact: true });
log('Identified badge count: ' + (await identified.count()));
await identified.first().click();
await page.waitForTimeout(700);
log(
  'after badge click, selects in card: ' +
    JSON.stringify(
      await card1.evaluate((el) =>
        Array.from(el.querySelectorAll('button,[role="button"]')).map((b) => (b.innerText || '').trim()).filter(Boolean),
      ),
    ),
);
const opts = await page.getByRole('option').allInnerTexts().catch(() => []);
log('open options: ' + JSON.stringify(opts));
if (opts.length) {
  await page.getByRole('option', { name: 'Resolved', exact: true }).click();
  await page.waitForTimeout(900);
  log('card heading after set Resolved: ' + JSON.stringify((await card1.getByRole('heading').first().innerText()).replace(/\n/g, ' | ')));
}

// ---- TAGS ----
log('\n=== TAGS ===');
const tagInput = card1.getByPlaceholder('Add tag');
log('tag input count: ' + (await tagInput.count()));
await tagInput.fill('pci');
await tagInput.press('Enter');
await page.waitForTimeout(900);
log('after add, card text has pci: ' + (await card1.innerText()).includes('pci'));
log(
  'dismiss buttons: ' +
    JSON.stringify(
      await card1.evaluate((el) =>
        Array.from(el.querySelectorAll('button')).map((b) => b.getAttribute('aria-label')).filter((a) => a && /Remove/.test(a)),
      ),
    ),
);

// ---- FILTERS ----
log('\n=== FILTERS ===');
for (const ph of ['Filtered by priority', 'Filtered by STRIDE', 'Filtered by tags', 'Filtered by status', 'Filtered by impacted goal']) {
  log(`${ph}: count=${await page.getByRole('button', { name: ph }).count()}`);
}
log('AssetSelector placeholder guess "Filtered by Assets": ' + (await page.getByRole('button', { name: 'Filtered by Assets' }).count()));
await page.getByRole('button', { name: 'Filtered by priority' }).click();
await page.waitForTimeout(400);
log('priority filter options: ' + JSON.stringify(await page.getByRole('option').allInnerTexts()));
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Filtered by status' }).click();
await page.waitForTimeout(400);
log('status filter options: ' + JSON.stringify(await page.getByRole('option').allInnerTexts()));
await page.keyboard.press('Escape');

// ---- SORT BY ----
log('\n=== SORT BY ===');
log('Sort by label present: ' + (await page.getByText('Sort by', { exact: true }).count()));
const sortSel = page.getByRole('button', { name: 'Id' });
log('sort select trigger (name=Id) count: ' + (await sortSel.count()));
log('radio Ascending count: ' + (await page.getByRole('radio', { name: 'Ascending' }).count()));

// ---- THEME TOGGLE ----
log('\n=== THEME TOGGLE ===');
log(
  JSON.stringify(
    await page.evaluate(() => {
      const boxes = Array.from(document.querySelectorAll('input[type="checkbox"]')).map((c) => ({
        id: c.id,
        aria: c.getAttribute('aria-label'),
        checked: c.checked,
      }));
      return { boxes, htmlClass: document.documentElement.className, bodyData: document.body.dataset };
    }),
    null,
    1,
  ),
);

await browser.close();
log('\npageerrors: ' + JSON.stringify(errs));
