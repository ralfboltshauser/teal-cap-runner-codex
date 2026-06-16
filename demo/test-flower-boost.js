const { chromium } = require("playwright");

const baseUrl = process.env.SPRITE_DEMO_URL || "http://127.0.0.1:8123/demo/";
const url = new URL(baseUrl);
url.searchParams.set("duration", "24");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto(url.toString(), { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__tealCapRunner?.player?.state === "idle");
  const flowerX = await page.evaluate(() => window.__tealCapRunner.flowers.find((flower) => flower.x > 220)?.x);

  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => window.__tealCapRunner?.route?.hasParcel, { timeout: 5000 });
  await page.keyboard.down("Shift");
  await page.waitForFunction((x) => window.__tealCapRunner.player.x > x - 92, flowerX, { timeout: 5000 });
  const before = await page.evaluate(() => ({
    vx: window.__tealCapRunner.player.vx,
    score: window.__tealCapRunner.route.score,
  }));
  await page.keyboard.press("KeyX");
  await page.waitForFunction(() => window.__tealCapRunner.flowers.some((flower) => flower.boosted), { timeout: 1500 });
  await page.waitForTimeout(80);
  const after = await page.evaluate(() => ({
    player: window.__tealCapRunner.player,
    route: window.__tealCapRunner.route,
    boosted: window.__tealCapRunner.flowers.filter((flower) => flower.boosted).length,
  }));
  await page.screenshot({ path: "../tmp/flower-boost.png" });
  await page.keyboard.up("Shift");
  await page.keyboard.up("ArrowRight");
  await browser.close();

  console.log(JSON.stringify({ before, after, screenshot: "../tmp/flower-boost.png" }, null, 2));

  if (after.boosted < 1 || after.player.flowerBoostTimer <= 0 || after.player.vx < 760 || after.route.score <= before.score) {
    process.exitCode = 1;
  }
})();
