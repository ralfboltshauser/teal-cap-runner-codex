const { chromium } = require("playwright");

const baseUrl = process.env.SPRITE_DEMO_URL || "http://127.0.0.1:8123/demo/";
const url = new URL(baseUrl);
url.searchParams.set("duration", "28");

async function completeDelivery(page) {
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("Shift");
  await page.waitForFunction(
    () => (
      window.__tealCapRunner.player.x > window.__tealCapRunner.route.gateX - 10 &&
      Math.abs(window.__tealCapRunner.player.vx) < 4 &&
      !window.__tealCapRunner.route.gateCleared
    ),
    { timeout: 7000 }
  );
  await page.keyboard.down("ArrowDown");
  await page.waitForFunction(
    () => window.__tealCapRunner.player.x > window.__tealCapRunner.route.gateX + 52,
    { timeout: 3000 }
  );
  await page.keyboard.up("ArrowDown");

  await page.waitForFunction(
    () => window.__tealCapRunner.player.x > window.__tealCapRunner.route.brookX - 170,
    { timeout: 6000 }
  );
  await page.keyboard.press("Space");

  await page.waitForFunction(
    () => window.__tealCapRunner.player.x > window.__tealCapRunner.route.gustX - 150,
    { timeout: 6000 }
  );
  await page.keyboard.press("KeyX");
  const before = await page.evaluate(() => window.__tealCapRunner.route.deliveries);
  await page.waitForFunction(
    (count) => window.__tealCapRunner.route.deliveries > count,
    before,
    { timeout: 8000 }
  );
  await page.keyboard.up("Shift");
  await page.keyboard.up("ArrowRight");
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto(url.toString(), { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__tealCapRunner?.player?.state === "idle");

  await completeDelivery(page);
  await page.waitForFunction(() => !window.__tealCapRunner.route.hasParcel && !window.__tealCapRunner.route.completed);
  await completeDelivery(page);

  const loop = await page.evaluate(() => window.__tealCapRunner.route);
  await page.screenshot({ path: "../tmp/rush-loop-two-deliveries.png" });
  await browser.close();

  console.log(JSON.stringify({ loop, screenshot: "../tmp/rush-loop-two-deliveries.png" }, null, 2));

  if (loop.deliveries < 2 || loop.score <= 500 || loop.difficulty < 2 || loop.completed) {
    process.exitCode = 1;
  }
})();
