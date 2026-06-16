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
  await page.waitForFunction(() => document.querySelector("#state")?.textContent === "idle");

  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(550);
  await page.keyboard.press("Space");
  await page.waitForTimeout(850);
  await page.keyboard.press("KeyX");
  await page.waitForTimeout(160);
  await page.screenshot({ path: "../tmp/environment-demo-interactions.png" });

  const state = await page.$eval("#state", (el) => el.textContent);
  const velocity = await page.$eval("#velocity", (el) => el.textContent);
  console.log(JSON.stringify({ state, velocity, screenshot: "../tmp/environment-demo-interactions.png" }, null, 2));
  await browser.close();
})();
