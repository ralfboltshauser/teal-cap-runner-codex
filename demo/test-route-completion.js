const { chromium } = require("playwright");

const url = process.env.SPRITE_DEMO_URL || "http://127.0.0.1:8123/demo/";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__tealCapRunner?.player?.state === "idle");

  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => window.__tealCapRunner?.route?.hasParcel, { timeout: 5000 });

  await page.keyboard.down("Shift");
  await page.waitForFunction(() => window.__tealCapRunner?.route?.completed, { timeout: 12000 });
  await page.keyboard.up("Shift");
  await page.keyboard.up("ArrowRight");

  const completed = await page.evaluate(() => window.__tealCapRunner.route);
  await page.screenshot({ path: "../tmp/route-complete.png" });

  await page.keyboard.press("KeyR");
  await page.waitForFunction(() => !window.__tealCapRunner?.route?.completed && !window.__tealCapRunner?.route?.hasParcel);
  const reset = await page.evaluate(() => window.__tealCapRunner.route);

  console.log(JSON.stringify({ completed, reset, screenshot: "../tmp/route-complete.png" }, null, 2));
  await browser.close();

  if (!completed.completed || completed.completeTime <= 0 || reset.completed || reset.hasParcel) {
    process.exitCode = 1;
  }
})();
