import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = '/home/user/trust-box-screenshots';

mkdirSync(OUTPUT_DIR, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function takeScreenshot(page, name) {
  const path = join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`✅ Saved: ${name}.png`);
}

const HEADLESS_SHELL = '/home/user/.cache/puppeteer/chrome-headless-shell/linux-148.0.7778.97/chrome-headless-shell-linux64/chrome-headless-shell';

(async () => {
  console.log('🚀 Launching headless browser...');
  const browser = await puppeteer.launch({
    executablePath: HEADLESS_SHELL,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=390,844'],
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');

  // Helper to wait and capture
  async function capture(url, name, waitForChange = false) {
    console.log(`\n📸 Capturing: ${name}`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(4000);
    
    // Check if trust box exists
    const hasTrustBox = await page.evaluate(() => {
      const boxes = document.querySelectorAll('.trust-box-new');
      return boxes.length > 0;
    });
    console.log(`  Trust box found: ${hasTrustBox}`);
    
    await takeScreenshot(page, `${name}-1`);
    
    if (waitForChange) {
      console.log('  Waiting for sentence change...');
      await sleep(10000);
      await takeScreenshot(page, `${name}-2`);
    }
    
    return hasTrustBox;
  }

  // 1. Home page
  await capture(BASE_URL, 'home-trust', true);

  // 2. Courses - Height tab
  console.log('\n📸 Capturing: height-trust');
  await page.goto(`${BASE_URL}/courses`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(3000);
  
  // Try clicking height tab
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const btn of btns) {
      if (btn.textContent.includes('رشد قد') || btn.textContent.includes('Height')) {
        btn.click();
        return;
      }
    }
  });
  await sleep(3000);
  
  const hasHeightBox = await page.evaluate(() => document.querySelectorAll('.trust-box-new').length > 0);
  console.log(`  Trust box on height tab: ${hasHeightBox}`);
  await takeScreenshot(page, 'height-trust-1');
  await sleep(10000);
  await takeScreenshot(page, 'height-trust-2');

  // 3. Courses - Appetite tab
  console.log('\n📸 Capturing: appetite-trust');
  await page.goto(`${BASE_URL}/courses`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(3000);
  
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const btn of btns) {
      if (btn.textContent.includes('اشتهایی') || btn.textContent.includes('Appetite')) {
        btn.click();
        return;
      }
    }
  });
  await sleep(3000);
  
  const hasAppetiteBox = await page.evaluate(() => document.querySelectorAll('.trust-box-new').length > 0);
  console.log(`  Trust box on appetite tab: ${hasAppetiteBox}`);
  await takeScreenshot(page, 'appetite-trust-1');
  await sleep(10000);
  await takeScreenshot(page, 'appetite-trust-2');

  // 4. Courses - Mind tab
  console.log('\n📸 Capturing: mind-trust');
  await page.goto(`${BASE_URL}/courses`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(3000);
  
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const btn of btns) {
      if (btn.textContent.includes('هوش') || btn.textContent.includes('Intelligence') || btn.textContent.includes('Mind')) {
        btn.click();
        return;
      }
    }
  });
  await sleep(3000);
  
  const hasMindBox = await page.evaluate(() => document.querySelectorAll('.trust-box-new').length > 0);
  console.log(`  Trust box on mind tab: ${hasMindBox}`);
  await takeScreenshot(page, 'mind-trust-1');
  await sleep(10000);
  await takeScreenshot(page, 'mind-trust-2');

  await browser.close();
  console.log('\n✅ All done!');
})();
