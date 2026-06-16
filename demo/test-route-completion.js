const { chromium } = require("playwright");

const baseUrl = process.env.SPRITE_DEMO_URL || "http://127.0.0.1:8123/demo/";
const url = new URL(baseUrl);
url.searchParams.set("duration", "12");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto(url.toString(), { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__tealCapRunner?.player?.state === "idle");

  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => window.__tealCapRunner?.route?.hasParcel, { timeout: 5000 });

  await page.keyboard.down("Shift");
  await page.waitForFunction(
    () => (
      window.__tealCapRunner.player.x > window.__tealCapRunner.route.gateX - 10 &&
      Math.abs(window.__tealCapRunner.player.vx) < 4 &&
      !window.__tealCapRunner.route.gateCleared
    ),
    { timeout: 6000 }
  );
  const blockedAtGate = await page.evaluate(() => window.__tealCapRunner);
  await page.keyboard.down("ArrowDown");
  await page.waitForFunction(() => window.__tealCapRunner.route.gateCleared, { timeout: 2500 });
  await page.waitForFunction(
    () => window.__tealCapRunner.player.x > window.__tealCapRunner.route.gateX + 52,
    { timeout: 2500 }
  );
  const crawledThroughGate = await page.evaluate(() => window.__tealCapRunner);
  await page.keyboard.up("ArrowDown");

  await page.waitForFunction(
    () => window.__tealCapRunner.player.x > window.__tealCapRunner.route.brookX - 170,
    { timeout: 5000 }
  );
  await page.keyboard.press("Space");

  await page.waitForFunction(
    () => window.__tealCapRunner.player.x > window.__tealCapRunner.route.gustX - 150,
    { timeout: 5000 }
  );
  await page.keyboard.press("KeyX");

  await page.waitForFunction(() => window.__tealCapRunner?.route?.completed, { timeout: 12000 });
  await page.keyboard.up("Shift");
  await page.keyboard.up("ArrowRight");

  const completed = await page.evaluate(() => window.__tealCapRunner.route);
  await page.screenshot({ path: "../tmp/route-complete.png" });

  await page.keyboard.press("KeyR");
  await page.waitForFunction(() => !window.__tealCapRunner?.route?.completed && !window.__tealCapRunner?.route?.hasParcel);
  const reset = await page.evaluate(() => window.__tealCapRunner.route);

  console.log(JSON.stringify({ blockedAtGate, crawledThroughGate, completed, reset, screenshot: "../tmp/route-complete.png" }, null, 2));
  await browser.close();

  if (
    blockedAtGate.player.x < blockedAtGate.route.gateX - 12 ||
    crawledThroughGate.player.x < crawledThroughGate.route.gateX + 52 ||
    !completed.completed ||
    completed.completeTime <= 0 ||
    completed.deliveries < 1 ||
    completed.score <= 0 ||
    !crawledThroughGate.route.gateCleared ||
    reset.completed ||
    reset.hasParcel ||
    reset.deliveries !== 0 ||
    reset.score !== 0 ||
    reset.gateCleared ||
    !reset.brookClean ||
    reset.shortcutHit
  ) {
    process.exitCode = 1;
  }
})();
