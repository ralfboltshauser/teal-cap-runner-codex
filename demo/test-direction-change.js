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
  await page.keyboard.down("Shift");
  await page.waitForFunction(() => window.__tealCapRunner.player.vx > 380, { timeout: 5000 });

  await page.keyboard.up("ArrowRight");
  await page.keyboard.down("ArrowLeft");
  await page.waitForFunction(() => window.__tealCapRunner.player.state === "skid", { timeout: 1500 });
  const skid = await page.evaluate(() => window.__tealCapRunner.player);
  await page.screenshot({ path: "../tmp/direction-change-skid.png" });

  await page.waitForFunction(
    () => window.__tealCapRunner.player.vx < 40 && window.__tealCapRunner.player.facing === -1,
    { timeout: 4000 }
  );
  const turned = await page.evaluate(() => window.__tealCapRunner.player);

  await page.keyboard.up("Shift");
  await page.keyboard.up("ArrowLeft");
  await browser.close();

  const ok = skid.vx > 120 && skid.facing === 1 && skid.state === "skid" && turned.facing === -1;
  console.log(JSON.stringify({ skid, turned, screenshot: "../tmp/direction-change-skid.png" }, null, 2));

  if (!ok) {
    process.exitCode = 1;
  }
})();
