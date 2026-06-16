const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const ui = {
  state: document.querySelector("#state"),
  frame: document.querySelector("#frame"),
  velocity: document.querySelector("#velocity"),
  ground: document.querySelector("#ground"),
  strip: document.querySelector("#strip"),
};

const keys = new Set();
const pressed = new Set();

const world = {
  width: canvas.width,
  height: canvas.height,
  groundY: 430,
  gravity: 1850,
  accel: 2300,
  airAccel: 1350,
  friction: 2100,
  maxRun: 310,
  maxSprint: 440,
  jump: 690,
  dashSpeed: 720,
  dashTime: 0.14,
  dashCooldown: 0.34,
};

const player = {
  x: 180,
  y: world.groundY,
  vx: 0,
  vy: 0,
  facing: 1,
  grounded: true,
  state: "idle",
  lastState: "idle",
  frame: 0,
  frameTime: 0,
  dashTimer: 0,
  dashCooldown: 0,
  skidTimer: 0,
  dustTimer: 0,
};

let plan;
let environment;
let sheets = {};
let envSheets = {};
let manualPreviewState = null;
let last = performance.now();
let sceneTime = 0;

const scene = {
  flowers: [],
  grasses: [],
  props: [],
  birds: [
    { x: 980, y: 118, speed: 24, phase: 0.1, scale: 1.25 },
    { x: 520, y: 88, speed: 18, phase: 2.7, scale: 0.95 },
  ],
  dustPuffs: [],
  stones: [],
  pollen: [],
};

function resizeCanvas() {
  const nextWidth = Math.max(360, Math.floor(window.innerWidth));
  const nextHeight = Math.max(420, Math.floor(window.innerHeight));
  const wasGrounded = player.grounded;

  canvas.width = nextWidth;
  canvas.height = nextHeight;
  world.width = nextWidth;
  world.height = nextHeight;
  world.groundY = Math.max(310, nextHeight - 112);

  if (wasGrounded || player.y > world.groundY) {
    player.y = world.groundY;
    player.grounded = true;
    player.vy = 0;
  }
  player.x = clamp(player.x, 48, world.width - 48);
  layoutEnvironment();
  ctx.imageSmoothingEnabled = false;
}

function layoutEnvironment() {
  const flowerRatios = [0.14, 0.31, 0.52, 0.72, 0.9];
  scene.flowers = flowerRatios.map((ratio, index) => ({
    x: Math.round(world.width * ratio),
    timer: scene.flowers[index]?.timer || 0,
    cooldown: scene.flowers[index]?.cooldown || 0,
    dir: index % 2 === 0 ? 1 : -1,
  }));

  const grassCount = Math.max(8, Math.ceil(world.width / 135));
  const spacing = world.width / grassCount;
  scene.grasses = Array.from({ length: grassCount }, (_, index) => ({
    x: 34 + index * spacing,
    seed: index * 0.7,
  }));

  scene.props = [
    { x: Math.round(world.width * 0.09), frame: 0, scale: 1.45, y: world.groundY },
    { x: Math.round(world.width * 0.64), frame: 1, scale: 1.2, y: world.groundY - 6 },
    { x: Math.round(world.width * 0.45), frame: 2, scale: 1.05, y: world.groundY },
    { x: Math.round(world.width * 0.82), frame: 3, scale: 1.05, y: world.groundY },
  ];

  scene.birds.forEach((bird, index) => {
    bird.x = clamp(bird.x, 80, world.width + 100);
    bird.y = index === 0 ? Math.max(72, world.height * 0.18) : Math.max(54, world.height * 0.13);
  });
}

window.addEventListener("resize", resizeCanvas);

window.addEventListener("keydown", (event) => {
  const code = event.code;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(code)) {
    event.preventDefault();
  }
  if (!keys.has(code)) pressed.add(code);
  keys.add(code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

function down(...codes) {
  return codes.some((code) => keys.has(code));
}

function hit(...codes) {
  return codes.some((code) => pressed.has(code));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function boot() {
  const [planResponse, envResponse] = await Promise.all([
    fetch("../animation-plan.json"),
    fetch("../environment-manifest.json"),
  ]);
  plan = await planResponse.json();
  environment = await envResponse.json();

  const characterLoads = Object.entries(plan.states).map(async ([name, state]) => {
    sheets[name] = await loadImage(`../${state.file}`);
  });
  const environmentLoads = Object.entries(environment.sprites).map(async ([name, sprite]) => {
    envSheets[name] = await loadImage(`../${sprite.file}`);
  });
  await Promise.all([...characterLoads, ...environmentLoads]);

  Object.keys(plan.states).forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.addEventListener("pointerdown", () => {
      manualPreviewState = manualPreviewState === name ? null : name;
      setState(manualPreviewState || chooseState());
    });
    ui.strip.append(button);
  });

  resizeCanvas();
  requestAnimationFrame(tick);
}

function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  sceneTime += dt;

  update(dt);
  draw();
  pressed.clear();
  requestAnimationFrame(tick);
}

function update(dt) {
  const left = down("ArrowLeft", "KeyA");
  const right = down("ArrowRight", "KeyD");
  const crouch = down("ArrowDown", "KeyS");
  const sprint = down("ShiftLeft", "ShiftRight");
  const inputX = Number(right) - Number(left);
  const wasGrounded = player.grounded;
  const impactVy = player.vy;

  if (inputX !== 0) player.facing = inputX;
  if (player.dashCooldown > 0) player.dashCooldown -= dt;
  if (player.skidTimer > 0) player.skidTimer -= dt;
  if (player.dustTimer > 0) player.dustTimer -= dt;

  if (hit("KeyX", "KeyJ") && player.dashCooldown <= 0) {
    player.dashTimer = world.dashTime;
    player.dashCooldown = world.dashCooldown;
    player.vx = player.facing * world.dashSpeed;
    player.vy *= 0.35;
    spawnDust(player.x - player.facing * 26, player.y - 7, -player.facing);
  }

  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
    if (player.dustTimer <= 0) {
      spawnDust(player.x - player.facing * 34, player.y - 6, -player.facing);
      player.dustTimer = 0.05;
    }
  } else {
    const maxSpeed = sprint ? world.maxSprint : world.maxRun;
    const accel = player.grounded ? world.accel : world.airAccel;

    if (inputX && !(crouch && player.grounded)) {
      const wasOpposing = player.grounded && Math.abs(player.vx) > 180 && Math.sign(player.vx) !== inputX;
      player.vx += inputX * accel * dt;
      player.vx = clamp(player.vx, -maxSpeed, maxSpeed);
      if (wasOpposing) {
        player.skidTimer = 0.18;
        spawnDust(player.x + player.facing * 18, player.y - 3, -player.facing);
      }
    } else if (player.grounded) {
      player.vx = approach(player.vx, 0, world.friction * dt);
    }

    if (hit("Space", "ArrowUp", "KeyW") && player.grounded && !crouch) {
      player.vy = -world.jump;
      player.grounded = false;
      triggerNearbyFlowers();
    }
  }

  player.vy += world.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  if (player.y >= world.groundY) {
    player.y = world.groundY;
    player.vy = 0;
    player.grounded = true;
    if (!wasGrounded && impactVy > 380) {
      spawnLanding(player.x, player.y, impactVy);
    }
  } else {
    player.grounded = false;
  }

  if (player.x < 48) {
    player.x = 48;
    player.vx = 0;
  }
  if (player.x > world.width - 48) {
    player.x = world.width - 48;
    player.vx = 0;
  }

  updateEnvironment(dt);
  setState(manualPreviewState || chooseState());
  advanceAnimation(dt);
}

function updateEnvironment(dt) {
  scene.flowers.forEach((flower) => {
    if (flower.cooldown > 0) flower.cooldown -= dt;
    if (flower.timer > 0) flower.timer = Math.max(0, flower.timer - dt);
    const near = Math.abs(player.x - flower.x) < 52;
    const moving = Math.abs(player.vx) > 45 || !player.grounded;
    if (near && moving && flower.cooldown <= 0) {
      flower.timer = 0.5;
      flower.cooldown = 0.85;
      flower.dir = player.x < flower.x ? 1 : -1;
      spawnPollen(flower.x, world.groundY - 46);
    }
  });

  scene.birds.forEach((bird) => {
    bird.x -= bird.speed * dt;
    if (bird.x < -110) {
      bird.x = world.width + 120 + Math.random() * 160;
      bird.y = 78 + Math.random() * 84;
      bird.speed = 16 + Math.random() * 18;
      bird.phase = Math.random() * Math.PI * 2;
    }
  });

  scene.dustPuffs = scene.dustPuffs.filter((dust) => {
    dust.t += dt;
    dust.x += dust.vx * dt;
    return dust.t < dust.life;
  });

  scene.stones = scene.stones.filter((stone) => {
    stone.t += dt;
    stone.vy += 780 * dt;
    stone.x += stone.vx * dt;
    stone.y += stone.vy * dt;
    return stone.t < stone.life && stone.y < world.groundY + 26;
  });

  scene.pollen = scene.pollen.filter((pollen) => {
    pollen.t += dt;
    pollen.x += pollen.vx * dt;
    pollen.y += pollen.vy * dt;
    pollen.vy -= 5 * dt;
    return pollen.t < pollen.life;
  });
}

function chooseState() {
  const speed = Math.abs(player.vx);
  if (player.dashTimer > 0) return "dash";
  if (player.grounded && down("ArrowDown", "KeyS")) return "crouch";
  if (!player.grounded) return "jump";
  if (player.skidTimer > 0 && speed > 120) return "skid";
  if (down("ShiftLeft", "ShiftRight") && speed > 260) return "sprint";
  if (speed > 135) return "run";
  if (speed > 12) return "walk";
  return "idle";
}

function setState(state) {
  if (player.state === state) return;
  player.lastState = player.state;
  player.state = state;
  player.frame = 0;
  player.frameTime = 0;
}

function advanceAnimation(dt) {
  const state = plan.states[player.state];
  if (player.state === "jump") {
    if (player.vy < -360) player.frame = 1;
    else if (player.vy < -80) player.frame = 2;
    else if (player.vy < 180) player.frame = 3;
    else player.frame = 4;
    return;
  }

  const speedBoost = player.state === "run" || player.state === "sprint"
    ? clamp(Math.abs(player.vx) / world.maxSprint, 0.75, 1.25)
    : 1;
  player.frameTime += dt * speedBoost;

  const frameRect = state.frameRects[player.frame];
  if (player.frameTime < frameRect.durationMs / 1000) return;
  player.frameTime = 0;

  if (player.frame < state.frames - 1) {
    player.frame += 1;
  } else if (state.loop) {
    player.frame = 0;
  }
}

function draw() {
  ctx.imageSmoothingEnabled = false;
  drawWorld();
  drawPlayer();
  drawForeground();
  drawHud();
}

function drawWorld() {
  const w = world.width;
  const h = world.height;
  ctx.clearRect(0, 0, w, h);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#93d6c8");
  sky.addColorStop(0.46, "#6fb4a4");
  sky.addColorStop(0.78, "#496c55");
  sky.addColorStop(1, "#251a12");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  drawSunHaze();
  drawFrame(envSheets.hills, environment.sprites.hills, 0, 0, 198, 1, false);
  drawBirds();
  drawDistantMeadowShapes();
  drawGround();
  drawBackProps();
  drawGroundDecor(false);
  drawParticles(false);
}

function drawSunHaze() {
  const glow = ctx.createRadialGradient(190, 104, 20, 190, 104, 320);
  glow.addColorStop(0, "rgba(255, 231, 159, 0.38)");
  glow.addColorStop(0.4, "rgba(255, 207, 122, 0.13)");
  glow.addColorStop(1, "rgba(255, 207, 122, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, world.width, world.height);
}

function drawDistantMeadowShapes() {
  ctx.fillStyle = "rgba(37, 78, 67, 0.46)";
  for (let x = -50; x < world.width + 90; x += 124) {
    ctx.fillRect(x, 314 + ((x / 124) % 2) * 12, 74, 116);
  }
  ctx.fillStyle = "rgba(22, 59, 54, 0.34)";
  for (let x = 30; x < world.width + 120; x += 168) {
    ctx.fillRect(x, 348, 34, 82);
    ctx.beginPath();
    ctx.moveTo(x - 24, 350);
    ctx.lineTo(x + 17, 304);
    ctx.lineTo(x + 58, 350);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBirds() {
  const cfg = environment.sprites.birdFlock;
  scene.birds.forEach((bird) => {
    const frame = Math.floor((sceneTime * cfg.fps + bird.phase) % cfg.frames);
    const bob = Math.sin(sceneTime * 1.7 + bird.phase) * 10;
    drawFrame(envSheets.birdFlock, cfg, frame, bird.x, bird.y + bob, bird.scale, false);
  });
}

function drawGround() {
  const cfg = environment.sprites.groundTiles;
  const image = envSheets.groundTiles;
  const tileScale = 1.45;
  const tw = cfg.cellWidth * tileScale;
  const th = cfg.cellHeight * tileScale;
  for (let x = -8; x < world.width + tw; x += tw) {
    const frame = Math.abs(Math.floor(x / tw)) % cfg.frames;
    drawFrame(image, cfg, frame, x, world.groundY - 18, tileScale, false, "top-left");
  }
  ctx.fillStyle = "#3b2216";
  ctx.fillRect(0, world.groundY + th - 18, world.width, world.height - (world.groundY + th - 18));
}

function drawBackProps() {
  const cfg = environment.sprites.meadowProps;
  scene.props.forEach((prop) => {
    if (prop.frame === 0 || prop.frame === 1) {
      drawFrame(envSheets.meadowProps, cfg, prop.frame, prop.x, prop.y, prop.scale, false, "bottom");
    }
  });
}

function drawGroundDecor(front) {
  const flowerCfg = environment.sprites.flowerBounce;
  const grassCfg = environment.sprites.grassSway;
  const propCfg = environment.sprites.meadowProps;

  scene.grasses.forEach((grass) => {
    const distance = Math.abs(player.x - grass.x);
    const force = distance < 58 ? Math.sign(grass.x - player.x) * 0.18 : 0;
    const frame = Math.floor((sceneTime * grassCfg.fps + grass.seed + force) % grassCfg.frames);
    const scale = 1.25 + (front ? 0.1 : 0);
    if ((front && grass.x > player.x) || (!front && grass.x <= player.x)) {
      drawFrame(envSheets.grassSway, grassCfg, frame, grass.x, world.groundY + 2, scale, false, "bottom");
    }
  });

  scene.flowers.forEach((flower) => {
    const activeFrame = flower.timer > 0
      ? clamp(Math.floor((0.5 - flower.timer) * flowerCfg.fps), 0, flowerCfg.frames - 1)
      : 0;
    if ((front && flower.x > player.x) || (!front && flower.x <= player.x)) {
      ctx.save();
      ctx.translate(flower.x, world.groundY + 1);
      ctx.scale(flower.dir, 1);
      drawFrame(envSheets.flowerBounce, flowerCfg, activeFrame, 0, 0, 1.25, false, "bottom");
      ctx.restore();
    }
  });

  scene.props.forEach((prop) => {
    if (prop.frame >= 2 && ((front && prop.x > player.x) || (!front && prop.x <= player.x))) {
      drawFrame(envSheets.meadowProps, propCfg, prop.frame, prop.x, prop.y, prop.scale, false, "bottom");
    }
  });
}

function drawForeground() {
  drawParticles(true);
  drawGroundDecor(true);
  scene.pollen.forEach((pollen) => {
    const alpha = clamp(1 - pollen.t / pollen.life, 0, 1);
    ctx.fillStyle = `rgba(238, 197, 85, ${alpha})`;
    ctx.fillRect(Math.round(pollen.x), Math.round(pollen.y), 2, 2);
  });
}

function drawParticles(front) {
  if (!front) {
    scene.dustPuffs.forEach((dust) => {
      const cfg = environment.sprites.dustPuff;
      const frame = clamp(Math.floor((dust.t / dust.life) * cfg.frames), 0, cfg.frames - 1);
      drawFrame(envSheets.dustPuff, cfg, frame, dust.x, dust.y, dust.scale, dust.facing < 0, "bottom");
    });
    return;
  }

  scene.stones.forEach((stone) => {
    const cfg = environment.sprites.stoneParticles;
    drawFrame(envSheets.stoneParticles, cfg, stone.frame, stone.x, stone.y, stone.scale, false, "center");
  });
}

function drawPlayer() {
  const state = plan.states[player.state];
  const image = sheets[player.state];
  const rect = state.frameRects[player.frame] || state.frameRects[0];
  const targetH = player.state === "crouch" ? 96 : 124;
  const scale = targetH / rect.h;
  const drawW = Math.round(rect.w * scale);
  const drawH = Math.round(rect.h * scale);
  const shadowW = Math.max(26, drawW * 0.42);

  ctx.fillStyle = "rgba(47, 30, 20, 0.30)";
  ctx.beginPath();
  ctx.ellipse(player.x, world.groundY + 4, shadowW, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(Math.round(player.x), Math.round(player.y));
  ctx.scale(player.facing, 1);
  ctx.drawImage(
    image,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    -Math.round(drawW / 2),
    -drawH,
    drawW,
    drawH
  );
  ctx.restore();
}

function drawHud() {
  ui.state.textContent = player.state;
  ui.frame.textContent = String(player.frame + 1);
  ui.velocity.textContent = `${Math.round(player.vx)}, ${Math.round(player.vy)}`;
  ui.ground.textContent = player.grounded ? "yes" : "no";

  [...ui.strip.children].forEach((button) => {
    button.classList.toggle("active", button.textContent === player.state);
  });

  ctx.fillStyle = "rgba(35, 24, 15, 0.70)";
  ctx.fillRect(16, 16, 306, 34);
  ctx.fillStyle = "#fff1cf";
  ctx.font = "16px Courier New";
  ctx.fillText(`${environment.theme.toUpperCase()}  ${player.state.toUpperCase()}  F${player.frame + 1}`, 28, 38);
}

function drawFrame(image, cfg, frame, x, y, scale = 1, flip = false, anchor = "center") {
  const sx = (frame % cfg.frames) * cfg.cellWidth;
  const sw = cfg.cellWidth;
  const sh = cfg.cellHeight;
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);
  let dx = Math.round(x - dw / 2);
  let dy = Math.round(y - dh / 2);
  if (anchor === "bottom") {
    dy = Math.round(y - dh);
  } else if (anchor === "top-left") {
    dx = Math.round(x);
    dy = Math.round(y);
  }

  ctx.save();
  if (flip) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(image, sx, 0, sw, sh, 0, 0, dw, dh);
  } else {
    ctx.drawImage(image, sx, 0, sw, sh, dx, dy, dw, dh);
  }
  ctx.restore();
}

function spawnDust(x, y, facing) {
  scene.dustPuffs.push({
    x,
    y,
    facing,
    vx: -facing * (18 + Math.random() * 20),
    t: 0,
    life: 0.36,
    scale: 0.82 + Math.random() * 0.22,
  });
}

function spawnLanding(x, y, impactVy) {
  spawnDust(x, y + 1, player.facing);
  const count = clamp(Math.floor(impactVy / 160), 3, 7);
  for (let i = 0; i < count; i += 1) {
    const dir = i % 2 === 0 ? -1 : 1;
    scene.stones.push({
      x: x + dir * (8 + i * 2),
      y: y - 4,
      vx: dir * (75 + Math.random() * 80),
      vy: -(130 + Math.random() * 150),
      t: 0,
      life: 0.62 + Math.random() * 0.2,
      frame: Math.floor(Math.random() * environment.sprites.stoneParticles.frames),
      scale: 0.8 + Math.random() * 0.45,
    });
  }
  triggerNearbyFlowers();
}

function triggerNearbyFlowers() {
  scene.flowers.forEach((flower) => {
    if (Math.abs(player.x - flower.x) < 76) {
      flower.timer = 0.5;
      flower.cooldown = 0.85;
      flower.dir = player.x < flower.x ? 1 : -1;
      spawnPollen(flower.x, world.groundY - 46);
    }
  });
}

function spawnPollen(x, y) {
  for (let i = 0; i < 7; i += 1) {
    scene.pollen.push({
      x: x + (Math.random() - 0.5) * 26,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 16,
      vy: -(10 + Math.random() * 22),
      t: 0,
      life: 0.7 + Math.random() * 0.45,
    });
  }
}

function approach(value, target, amount) {
  if (value < target) return Math.min(value + amount, target);
  if (value > target) return Math.max(value - amount, target);
  return target;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

boot().catch((error) => {
  console.error(error);
  ui.state.textContent = "load-error";
});
