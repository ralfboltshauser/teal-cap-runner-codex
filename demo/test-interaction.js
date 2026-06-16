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
  await page.waitForTimeout(900);
  const moving = await page.$eval("#state", (el) => el.textContent);
  const velocity = await page.$eval("#velocity", (el) => el.textContent);

  await page.keyboard.down("Shift");
  await page.waitForTimeout(900);
  const sprint = await page.$eval("#state", (el) => el.textContent);

  await page.keyboard.up("Shift");
  await page.keyboard.press("Space");
  await page.waitForTimeout(220);
  const jump = await page.$eval("#state", (el) => el.textContent);

  await page.keyboard.press("KeyX");
  await page.waitForTimeout(80);
  const dash = await page.$eval("#state", (el) => el.textContent);
  await page.screenshot({ path: "../tmp/demo-interaction.png" });
  await browser.close();

  const result = { moving, velocity, sprint, jump, dash };
  const ok = moving === "run" && sprint === "sprint" && jump === "jump" && dash === "dash";
  console.log(JSON.stringify(result, null, 2));

  if (!ok) {
    process.exitCode = 1;
  }
})();
