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
  routeWidth: 2400,
  cameraX: 0,
  cameraLead: 0,
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
  x: 86,
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
  coyoteTimer: 0,
  jumpBuffer: 0,
};

const route = {
  name: "Morning Rush",
  item: "teal ribbon",
  started: false,
  hasParcel: false,
  delivered: false,
  completed: false,
  roundDuration: Number(new URLSearchParams(window.location.search).get("duration") || 120),
  startTime: 0,
  completeTime: 0,
  bestScore: Number(localStorage.getItem("tealCapRunner.bestMorningRushScore") || 0),
  score: 0,
  deliveries: 0,
  combo: 0,
  bestCombo: 0,
  mistakes: 0,
  difficulty: 1,
  pickupX: 170,
  targetX: 2200,
  gateX: 760,
  brookX: 1260,
  gustX: 1650,
  awakenedFlowers: 0,
  softLanding: true,
  gateCleared: false,
  brookClean: true,
  shortcutHit: false,
  hint: "Pick up ribbons. Two-minute rush: chain clean deliveries.",
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
  world.routeWidth = Math.max(2200, Math.round(nextWidth * 3.15));
  world.groundY = Math.max(310, nextHeight - 112);
  route.targetX = world.routeWidth - 190;
  configureRouteObstacles();

  if (wasGrounded || player.y > world.groundY) {
    player.y = world.groundY;
    player.grounded = true;
    player.vy = 0;
  }
  player.x = clamp(player.x, 48, world.routeWidth - 48);
  layoutEnvironment();
  updateCamera(1 / 60, true);
  ctx.imageSmoothingEnabled = false;
}

function configureRouteObstacles() {
  const lap = route.deliveries;
  const d = route.difficulty;
  const drift = ((lap % 4) - 1.5) * 0.018;
  route.gateX = Math.round(world.routeWidth * clamp(0.32 + drift - d * 0.006, 0.26, 0.38));
  route.brookX = Math.round(world.routeWidth * clamp(0.54 - drift * 0.7, 0.48, 0.61));
  route.gustX = Math.round(world.routeWidth * clamp(0.73 + drift + d * 0.004, 0.66, 0.8));
}

function layoutEnvironment() {
  const flowerRatios = [0.14, 0.28, 0.43, 0.58, 0.74, 0.9];
  scene.flowers = flowerRatios.map((ratio, index) => ({
    x: Math.round(world.routeWidth * ratio),
    timer: scene.flowers[index]?.timer || 0,
    cooldown: scene.flowers[index]?.cooldown || 0,
    awake: scene.flowers[index]?.awake || false,
    dir: index % 2 === 0 ? 1 : -1,
  }));

  const grassCount = Math.max(16, Math.ceil(world.routeWidth / 135));
  const spacing = world.routeWidth / grassCount;
  scene.grasses = Array.from({ length: grassCount }, (_, index) => ({
    x: 34 + index * spacing,
    seed: index * 0.7,
  }));

  scene.props = [
    { x: route.pickupX, frame: 0, scale: 1.45, y: world.groundY },
    { x: route.targetX, frame: 1, scale: 1.34, y: world.groundY - 6 },
    { x: Math.round(world.routeWidth * 0.38), frame: 2, scale: 1.05, y: world.groundY },
    { x: Math.round(world.routeWidth * 0.72), frame: 3, scale: 1.05, y: world.groundY },
  ];

  scene.birds.forEach((bird, index) => {
    bird.x = clamp(bird.x, 80, world.routeWidth + 100);
    bird.y = index === 0 ? Math.max(72, world.height * 0.18) : Math.max(54, world.height * 0.13);
  });
}

window.addEventListener("resize", resizeCanvas);

window.addEventListener("keydown", (event) => {
  const code = event.code;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(code)) {
    event.preventDefault();
  }
  if (code === "KeyR") {
    resetRoute();
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
  const jumpPressed = hit("Space", "ArrowUp", "KeyW");

  if (!route.completed && !route.started && (Math.abs(player.vx) > 5 || inputX !== 0 || jumpPressed)) {
    route.started = true;
    route.startTime = sceneTime;
  }

  if (player.dashCooldown > 0) player.dashCooldown -= dt;
  if (player.skidTimer > 0) player.skidTimer -= dt;
  if (player.dustTimer > 0) player.dustTimer -= dt;
  if (player.jumpBuffer > 0) player.jumpBuffer -= dt;
  if (jumpPressed) player.jumpBuffer = 0.13;
  if (player.grounded) player.coyoteTimer = 0.11;
  else player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);

  if (!route.completed && hit("KeyX", "KeyJ") && player.dashCooldown <= 0) {
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
    const gateCrawl = canCrawlGate(crouch, inputX);
    const maxSpeed = gateCrawl ? 135 : sprint ? world.maxSprint : world.maxRun;
    const accel = player.grounded ? world.accel : world.airAccel;

    if (!route.completed && inputX && (!(crouch && player.grounded) || gateCrawl)) {
      const slideDirection = Math.sign(player.vx);
      const wasOpposing = player.grounded && Math.abs(player.vx) > 180 && slideDirection !== 0 && slideDirection !== inputX;
      player.vx += inputX * accel * dt;
      player.vx = clamp(player.vx, -maxSpeed, maxSpeed);
      if (wasOpposing) {
        player.facing = slideDirection;
        player.skidTimer = Math.max(player.skidTimer, 0.18);
        if (player.dustTimer <= 0) {
          spawnDust(player.x + slideDirection * 18, player.y - 3, -slideDirection);
          player.dustTimer = 0.05;
        }
      } else {
        player.facing = inputX;
      }
    } else if (player.grounded) {
      player.vx = approach(player.vx, 0, world.friction * dt);
    } else if (inputX !== 0) {
      player.facing = inputX;
    }

    if (!route.completed && player.jumpBuffer > 0 && player.coyoteTimer > 0 && !crouch) {
      player.vy = -world.jump;
      player.grounded = false;
      player.coyoteTimer = 0;
      player.jumpBuffer = 0;
      triggerNearbyFlowers();
    }
  }

  player.vy += world.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  applyRouteFeatures(crouch);

  if (player.y >= world.groundY) {
    player.y = world.groundY;
    player.vy = 0;
    player.grounded = true;
    if (!wasGrounded && impactVy > 380) {
      spawnLanding(player.x, player.y, impactVy);
      if (route.hasParcel && impactVy > 760) {
        route.softLanding = false;
      }
    }
  } else {
    player.grounded = false;
  }

  if (player.x < 48) {
    player.x = 48;
    player.vx = 0;
  }
  if (player.x > world.routeWidth - 48) {
    player.x = world.routeWidth - 48;
    player.vx = 0;
  }

  updateRoute();
  updateCamera(dt);
  updateEnvironment(dt);
  setState(manualPreviewState || chooseState());
  advanceAnimation(dt);
}

function updateRoute() {
  if (route.started && !route.completed && sceneTime - route.startTime >= route.roundDuration) {
    finishRound("Time up. Press R to rush again.");
    return;
  }

  if (!route.hasParcel && !route.delivered && Math.abs(player.x - route.pickupX) < 64 && Math.abs(player.y - world.groundY) < 90) {
    route.hasParcel = true;
    route.started = true;
    route.startTime = route.startTime || sceneTime;
    route.hint = "Deliver fast. Clean moves build combo.";
    spawnPollen(route.pickupX, world.groundY - 70);
    triggerNearbyFlowers();
  }

  if (route.hasParcel && !route.delivered && Math.abs(player.x - route.targetX) < 82 && Math.abs(player.y - world.groundY) < 110) {
    completeDelivery();
  }
}

function completeDelivery() {
  const clean = route.gateCleared && route.brookClean && route.softLanding;
  const gustBonus = route.shortcutHit ? 60 : 0;
  const flowerBonus = route.awakenedFlowers * 12;
  const comboBonus = clean ? route.combo * 35 : 0;
  const deliveryScore = 160 + flowerBonus + gustBonus + comboBonus + route.difficulty * 20;

  route.score += deliveryScore;
  route.deliveries += 1;
  route.combo = clean ? route.combo + 1 : 0;
  route.bestCombo = Math.max(route.bestCombo, route.combo);
  route.difficulty = clamp(1 + Math.floor(route.deliveries / 2), 1, 7);
  route.hint = clean ? `Clean drop +${deliveryScore}. Next order.` : `Drop +${deliveryScore}. Recover the combo.`;

  scene.flowers.forEach((flower) => {
    flower.awake = true;
    flower.timer = 0.5;
  });
  for (let i = 0; i < 9; i += 1) {
    spawnPollen(route.targetX + (Math.random() - 0.5) * 64, world.groundY - 72 - Math.random() * 40);
  }
  spawnDust(player.x, player.y, -player.facing);

  if (sceneTime - route.startTime >= route.roundDuration) {
    finishRound("Final delivery. Press R to rush again.");
  } else {
    startNextDelivery();
  }
}

function finishRound(hint) {
  route.completed = true;
  route.delivered = true;
  route.hasParcel = false;
  route.completeTime = Math.min(route.roundDuration, Math.max(0.01, sceneTime - route.startTime));
  route.hint = hint;
  player.vx = 0;
  player.vy = 0;
  player.dashTimer = 0;
  player.skidTimer = 0;
  route.bestScore = Math.max(route.bestScore, route.score);
  localStorage.setItem("tealCapRunner.bestMorningRushScore", String(route.bestScore));
}

function startNextDelivery() {
  resetPlayerForLap();
  route.hasParcel = false;
  route.delivered = false;
  resetLapFlags();
  configureRouteObstacles();
  layoutEnvironment();
  resetFlowers();
  scene.dustPuffs = [];
  scene.stones = [];
  updateCamera(1 / 60, true);
}

function applyRouteFeatures(crouch) {
  const gateLeft = route.gateX - 42;
  const gateBlockX = route.gateX - 4;
  const gateRight = route.gateX + 48;
  if (!route.completed && !route.gateCleared && player.grounded && player.x > gateLeft && player.x < gateRight) {
    if (crouch) {
      route.gateCleared = true;
      route.hint = route.hasParcel ? "Clean duck. Jump the brook ahead." : route.hint;
    } else if (player.vx > 0 && player.x > gateBlockX) {
      player.x = gateBlockX;
      player.vx = 0;
      player.skidTimer = 0.12;
      route.hint = "Duck here, then crawl under the windmill beam.";
      spawnDust(player.x + 14, player.y - 2, -1);
    }
  }

  const brookLeft = route.brookX - 62;
  const brookRight = route.brookX + 78;
  if (!route.completed && route.brookClean && player.x > brookLeft && player.x < brookRight && player.grounded) {
    if (Math.abs(player.vx) > 40) {
      player.vx *= 0.72;
      route.brookClean = false;
      route.softLanding = false;
      route.mistakes += 1;
      route.combo = 0;
      route.hint = "Brook splash. Jump earlier for a cleaner route.";
      if (sceneTime % 0.08 < 0.033) {
        spawnPollen(player.x, world.groundY - 18);
      }
    }
  }

  const gustLeft = route.gustX - 70;
  const gustRight = route.gustX + 90;
  if (!route.completed && player.x > gustLeft && player.x < gustRight && player.dashTimer > 0 && !route.shortcutHit) {
    route.shortcutHit = true;
    route.hint = "Dash gust! Ride the fast meadow line.";
    player.vx = Math.max(player.vx, world.dashSpeed * 1.12);
    for (let i = 0; i < 10; i += 1) {
      spawnPollen(route.gustX + (Math.random() - 0.5) * 90, world.groundY - 80 - Math.random() * 50);
    }
  }
}

function canCrawlGate(crouch, inputX) {
  return (
    crouch &&
    inputX !== 0 &&
    player.grounded &&
    !route.completed &&
    player.x > route.gateX - 64 &&
    player.x < route.gateX + 56
  );
}

function updateCamera(dt = 1 / 60, snap = false) {
  const velocityDirection = Math.sign(player.vx);
  const desiredLead = velocityDirection * Math.min(120, Math.abs(player.vx) * 0.22);
  world.cameraLead = snap
    ? desiredLead
    : approach(world.cameraLead, desiredLead, 360 * dt);
  const target = player.x - world.width * 0.38 + world.cameraLead;
  world.cameraX = clamp(target, 0, Math.max(0, world.routeWidth - world.width));
}

function worldToScreen(x) {
  return x - world.cameraX;
}

function resetRoute() {
  resetPlayerForLap();
  route.started = false;
  route.hasParcel = false;
  route.delivered = false;
  route.completed = false;
  route.startTime = 0;
  route.completeTime = 0;
  route.score = 0;
  route.deliveries = 0;
  route.combo = 0;
  route.bestCombo = 0;
  route.mistakes = 0;
  route.difficulty = 1;
  resetLapFlags();
  route.hint = "Pick up ribbons. Two-minute rush: chain clean deliveries.";
  scene.dustPuffs = [];
  scene.stones = [];
  scene.pollen = [];
  configureRouteObstacles();
  layoutEnvironment();
  resetFlowers();
  updateCamera(1 / 60, true);
}

function resetPlayerForLap() {
  player.x = 86;
  player.y = world.groundY;
  player.vx = 0;
  player.vy = 0;
  player.facing = 1;
  player.grounded = true;
  player.dashTimer = 0;
  player.dashCooldown = 0;
  player.skidTimer = 0;
  player.dustTimer = 0;
  player.coyoteTimer = 0;
  player.jumpBuffer = 0;
  world.cameraLead = 0;
}

function resetLapFlags() {
  route.awakenedFlowers = 0;
  route.softLanding = true;
  route.gateCleared = false;
  route.brookClean = true;
  route.shortcutHit = false;
}

function resetFlowers() {
  scene.flowers.forEach((flower) => {
    flower.awake = false;
    flower.timer = 0;
    flower.cooldown = 0;
  });
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
      if (!flower.awake) {
        flower.awake = true;
        route.awakenedFlowers += 1;
      }
      spawnPollen(flower.x, world.groundY - 46);
    }
  });

  scene.birds.forEach((bird) => {
    bird.x -= bird.speed * dt;
    if (bird.x < -110) {
      bird.x = world.cameraX + world.width + 120 + Math.random() * 160;
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
  if (route.completed) return "idle";
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
  if (route.completed) drawCompletionCard();
  window.__tealCapRunner = {
    player: {
      x: player.x,
      y: player.y,
      vx: player.vx,
      facing: player.facing,
      state: player.state,
      grounded: player.grounded,
    },
    route: {
      started: route.started,
      hasParcel: route.hasParcel,
      delivered: route.delivered,
      completed: route.completed,
      completeTime: route.completeTime,
      roundDuration: route.roundDuration,
      score: route.score,
      bestScore: route.bestScore,
      deliveries: route.deliveries,
      combo: route.combo,
      bestCombo: route.bestCombo,
      mistakes: route.mistakes,
      difficulty: route.difficulty,
      awakenedFlowers: route.awakenedFlowers,
      softLanding: route.softLanding,
      gateX: route.gateX,
      brookX: route.brookX,
      gustX: route.gustX,
      gateCleared: route.gateCleared,
      brookClean: route.brookClean,
      shortcutHit: route.shortcutHit,
    },
    cameraX: world.cameraX,
    cameraLead: world.cameraLead,
  };
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
  drawLandscapeDepth();
  drawBirds();
  drawGround();
  drawRouteFeatures();
  drawRouteObjects(false);
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

function drawLandscapeDepth() {
  const farBase = clamp(world.groundY - 445, world.height * 0.28, world.height * 0.56);
  const midBase = clamp(world.groundY - 340, world.height * 0.38, world.height * 0.68);
  const nearBase = clamp(world.groundY - 230, world.height * 0.48, world.height * 0.76);

  drawRidgeLayer(0.12, farBase, 58, 270, "#315f57", 0.44, 1.8);
  drawRidgeLayer(0.22, midBase, 46, 230, "#28534b", 0.34, 4.3);
  drawMeadowBand(0.34, nearBase, world.groundY - 130, "#24493d", 0.23, 128);
  drawMeadowBand(0.48, world.groundY - 174, world.groundY - 72, "#1e3d34", 0.20, 92);
  drawAtmosphericWash(farBase, world.groundY - 72);
}

function drawRidgeLayer(speed, baseY, height, spacing, color, alpha, phase) {
  const camera = world.cameraX * speed;
  const start = Math.floor(camera / spacing) * spacing - spacing;
  const end = camera + world.width + spacing * 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(start - camera, world.groundY - 58);
  for (let x = start; x <= end; x += spacing) {
    const peakX = x + spacing * 0.5;
    const peakY = baseY - height * (0.72 + Math.sin(x * 0.011 + phase) * 0.18);
    const valleyY = baseY + Math.sin(x * 0.007 + phase) * 14;
    ctx.lineTo(x - camera, valleyY);
    ctx.lineTo(peakX - camera, peakY);
    ctx.lineTo(x + spacing - camera, valleyY + Math.cos(x * 0.009 + phase) * 12);
  }
  ctx.lineTo(end - camera, world.groundY - 58);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMeadowBand(speed, topY, bottomY, color, alpha, spacing) {
  const camera = world.cameraX * speed;
  const start = Math.floor(camera / spacing) * spacing - spacing;
  const end = camera + world.width + spacing * 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(start - camera, bottomY);
  for (let x = start; x <= end; x += spacing) {
    const y = topY + Math.sin(x * 0.013) * 12 + Math.cos(x * 0.021) * 8;
    ctx.lineTo(x - camera, y);
  }
  ctx.lineTo(end - camera, bottomY);
  ctx.lineTo(start - camera, bottomY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawAtmosphericWash(topY, bottomY) {
  const haze = ctx.createLinearGradient(0, topY, 0, bottomY);
  haze.addColorStop(0, "rgba(147, 214, 200, 0.10)");
  haze.addColorStop(0.46, "rgba(111, 180, 164, 0.20)");
  haze.addColorStop(1, "rgba(65, 101, 82, 0.08)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, topY - 24, world.width, bottomY - topY + 64);
}

function drawBirds() {
  const cfg = environment.sprites.birdFlock;
  scene.birds.forEach((bird) => {
    const frame = Math.floor((sceneTime * cfg.fps + bird.phase) % cfg.frames);
    const bob = Math.sin(sceneTime * 1.7 + bird.phase) * 10;
    drawFrame(envSheets.birdFlock, cfg, frame, bird.x - world.cameraX * 0.25, bird.y + bob, bird.scale, false);
  });
}

function drawGround() {
  const cfg = environment.sprites.groundTiles;
  const image = envSheets.groundTiles;
  const tileScale = 1.45;
  const tw = cfg.cellWidth * tileScale;
  const th = cfg.cellHeight * tileScale;
  const start = Math.floor(world.cameraX / tw) * tw - tw;
  for (let x = start; x < world.cameraX + world.width + tw; x += tw) {
    const frame = Math.abs(Math.floor(x / tw)) % cfg.frames;
    drawFrame(image, cfg, frame, worldToScreen(x), world.groundY - 18, tileScale, false, "top-left");
  }
  ctx.fillStyle = "#3b2216";
  ctx.fillRect(0, world.groundY + th - 18, world.width, world.height - (world.groundY + th - 18));
}

function drawBackProps() {
  const cfg = environment.sprites.meadowProps;
  scene.props.forEach((prop) => {
    if (prop.frame === 0 || prop.frame === 1) {
      drawFrame(envSheets.meadowProps, cfg, prop.frame, worldToScreen(prop.x), prop.y, prop.scale, false, "bottom");
    }
  });
}

function drawRouteObjects(front) {
  const pickupVisible = !route.hasParcel && !route.delivered;
  if (!front && pickupVisible) {
    drawParcelStand(route.pickupX, "PICK UP", "#29b6b6");
  }
  if (!front) {
    drawParcelStand(route.targetX, route.delivered ? "DELIVERED" : "RIBBON", route.delivered ? "#f0b44b" : "#f4df9e");
  }
  if (front && route.hasParcel) {
    drawCarriedParcel();
  }
}

function drawRouteFeatures() {
  drawCrouchGate();
  drawBrook();
  drawDashGust();
}

function drawFeatureLabel(text, x, y, color) {
  ctx.fillStyle = "rgba(35, 24, 15, 0.76)";
  ctx.fillRect(Math.round(x - 28), Math.round(y - 15), 56, 18);
  ctx.fillStyle = color;
  ctx.font = "11px Courier New";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y - 2);
  ctx.textAlign = "left";
}

function drawCrouchGate() {
  const sx = worldToScreen(route.gateX);
  if (sx < -130 || sx > world.width + 130) return;
  const y = world.groundY;
  const color = route.gateCleared ? "#29b6b6" : "#f0b44b";

  ctx.fillStyle = "rgba(36, 24, 16, 0.30)";
  ctx.beginPath();
  ctx.ellipse(sx, y + 5, 66, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6f4528";
  ctx.fillRect(Math.round(sx - 58), Math.round(y - 74), 11, 76);
  ctx.fillRect(Math.round(sx + 47), Math.round(y - 74), 11, 76);
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(sx - 60), Math.round(y - 74), 120, 14);
  ctx.fillStyle = "rgba(255, 241, 207, 0.65)";
  ctx.fillRect(Math.round(sx - 48), Math.round(y - 69), 96, 3);
  drawFeatureLabel("DUCK", sx, y - 88, color);
}

function drawBrook() {
  const sx = worldToScreen(route.brookX);
  if (sx < -150 || sx > world.width + 150) return;
  const y = world.groundY + 5;
  const color = route.brookClean ? "#64d7e0" : "#f0b44b";

  ctx.fillStyle = "rgba(19, 64, 75, 0.82)";
  ctx.fillRect(Math.round(sx - 72), Math.round(y - 11), 152, 15);
  ctx.fillStyle = "rgba(100, 215, 224, 0.72)";
  for (let i = -58; i <= 58; i += 28) {
    ctx.fillRect(Math.round(sx + i), Math.round(y - 7 + Math.sin(sceneTime * 4 + i) * 2), 16, 3);
  }
  ctx.fillStyle = "rgba(255, 241, 207, 0.34)";
  ctx.fillRect(Math.round(sx - 86), Math.round(y - 15), 18, 6);
  ctx.fillRect(Math.round(sx + 74), Math.round(y - 15), 18, 6);
  drawFeatureLabel("JUMP", sx, world.groundY - 38, color);
}

function drawDashGust() {
  const sx = worldToScreen(route.gustX);
  if (sx < -160 || sx > world.width + 160) return;
  const y = world.groundY - 74;
  const color = route.shortcutHit ? "#29b6b6" : "#fff1cf";

  ctx.save();
  ctx.strokeStyle = route.shortcutHit ? "rgba(41, 182, 182, 0.78)" : "rgba(255, 241, 207, 0.55)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i += 1) {
    const phase = sceneTime * 36 + i * 28;
    ctx.beginPath();
    ctx.ellipse(sx + Math.sin(sceneTime * 3 + i) * 8, y + i * 12, 42 + (phase % 20), 14, -0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  drawFeatureLabel("DASH", sx, y - 32, color);
}

function drawParcelStand(x, label, color) {
  const sx = worldToScreen(x);
  if (sx < -120 || sx > world.width + 120) return;
  ctx.fillStyle = "rgba(36, 24, 16, 0.34)";
  ctx.beginPath();
  ctx.ellipse(sx, world.groundY + 4, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8f552e";
  ctx.fillRect(Math.round(sx - 28), Math.round(world.groundY - 54), 56, 10);
  ctx.fillRect(Math.round(sx - 6), Math.round(world.groundY - 54), 12, 52);
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(sx - 18), Math.round(world.groundY - 82), 36, 24);
  ctx.fillStyle = "#2b1b12";
  ctx.fillRect(Math.round(sx - 14), Math.round(world.groundY - 73), 28, 5);
  ctx.fillStyle = "#fff1cf";
  ctx.font = "10px Courier New";
  ctx.textAlign = "center";
  ctx.fillText(label, sx, world.groundY - 91);
  ctx.textAlign = "left";
}

function drawCarriedParcel() {
  const sx = worldToScreen(player.x);
  const y = player.y - 98 + Math.sin(sceneTime * 10) * 2;
  ctx.save();
  ctx.translate(Math.round(sx - player.facing * 24), Math.round(y));
  ctx.rotate(player.facing * -0.08);
  ctx.fillStyle = "#29b6b6";
  ctx.fillRect(-13, -11, 26, 20);
  ctx.fillStyle = "#fff1cf";
  ctx.fillRect(-10, -2, 20, 4);
  ctx.fillStyle = "#17454a";
  ctx.fillRect(-2, -11, 4, 20);
  ctx.restore();
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
    const sx = worldToScreen(grass.x);
    if (sx > -70 && sx < world.width + 70 && ((front && grass.x > player.x) || (!front && grass.x <= player.x))) {
      drawFrame(envSheets.grassSway, grassCfg, frame, sx, world.groundY + 2, scale, false, "bottom");
    }
  });

  scene.flowers.forEach((flower) => {
    const activeFrame = flower.timer > 0
      ? clamp(Math.floor((0.5 - flower.timer) * flowerCfg.fps), 0, flowerCfg.frames - 1)
      : 0;
    const sx = worldToScreen(flower.x);
    if (sx > -80 && sx < world.width + 80 && ((front && flower.x > player.x) || (!front && flower.x <= player.x))) {
      ctx.save();
      ctx.translate(sx, world.groundY + 1);
      ctx.scale(flower.dir, 1);
      if (flower.awake) {
        ctx.globalAlpha = 1;
      }
      drawFrame(envSheets.flowerBounce, flowerCfg, activeFrame, 0, 0, 1.25, false, "bottom");
      ctx.restore();
    }
  });

  scene.props.forEach((prop) => {
    const sx = worldToScreen(prop.x);
    if (sx > -100 && sx < world.width + 100 && prop.frame >= 2 && ((front && prop.x > player.x) || (!front && prop.x <= player.x))) {
      drawFrame(envSheets.meadowProps, propCfg, prop.frame, sx, prop.y, prop.scale, false, "bottom");
    }
  });
}

function drawForeground() {
  drawRouteObjects(true);
  drawParticles(true);
  drawGroundDecor(true);
  scene.pollen.forEach((pollen) => {
    const alpha = clamp(1 - pollen.t / pollen.life, 0, 1);
    ctx.fillStyle = `rgba(238, 197, 85, ${alpha})`;
    ctx.fillRect(Math.round(worldToScreen(pollen.x)), Math.round(pollen.y), 2, 2);
  });
}

function drawParticles(front) {
  if (!front) {
    scene.dustPuffs.forEach((dust) => {
      const cfg = environment.sprites.dustPuff;
      const frame = clamp(Math.floor((dust.t / dust.life) * cfg.frames), 0, cfg.frames - 1);
      drawFrame(envSheets.dustPuff, cfg, frame, worldToScreen(dust.x), dust.y, dust.scale, dust.facing < 0, "bottom");
    });
    return;
  }

  scene.stones.forEach((stone) => {
    const cfg = environment.sprites.stoneParticles;
    drawFrame(envSheets.stoneParticles, cfg, stone.frame, worldToScreen(stone.x), stone.y, stone.scale, false, "center");
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
  const screenX = worldToScreen(player.x);
  ctx.ellipse(screenX, world.groundY + 4, shadowW, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(Math.round(screenX), Math.round(player.y));
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
  ui.ground.textContent = route.hasParcel ? "parcel" : player.grounded ? "yes" : "no";

  [...ui.strip.children].forEach((button) => {
    button.classList.toggle("active", button.textContent === player.state);
  });

  const elapsed = route.started
    ? route.completed
      ? route.completeTime
      : sceneTime - route.startTime
    : 0;
  const remaining = route.started
    ? Math.max(0, route.roundDuration - elapsed)
    : route.roundDuration;
  const progress = clamp(player.x / route.targetX, 0, 1);
  const compact = world.width < 620;
  const hudX = compact ? 10 : 16;
  const hudY = compact ? Math.min(world.height - 214, 270) : 16;
  const hudW = compact ? Math.min(370, world.width - 20) : 438;
  const barW = compact ? hudW - 116 : 320;
  const hint = compact
    ? route.hasParcel
      ? "Deliver ribbon to windmill."
      : route.completed
        ? "Delivered. Press R."
        : "Pick up ribbon."
    : route.hint;
  ctx.fillStyle = "rgba(35, 24, 15, 0.76)";
  ctx.fillRect(hudX, hudY, hudW, 72);
  ctx.fillStyle = "#fff1cf";
  ctx.font = "16px Courier New";
  ctx.fillText(`${route.name.toUpperCase()}  ${player.state.toUpperCase()}  ${formatTime(remaining)}  ${route.score} pts`, hudX + 12, hudY + 22);
  ctx.font = "13px Courier New";
  ctx.fillStyle = "#f0dca6";
  ctx.fillText(hint, hudX + 12, hudY + 46);
  ctx.fillStyle = "rgba(255, 241, 207, 0.22)";
  ctx.fillRect(hudX + 12, hudY + 58, barW, 6);
  ctx.fillStyle = route.hasParcel || route.delivered ? "#29b6b6" : "#f0b44b";
  ctx.fillRect(hudX + 12, hudY + 58, Math.round(barW * progress), 6);
  ctx.fillStyle = "#fff1cf";
  ctx.fillText(`drop ${route.deliveries} x${route.combo + 1}`, hudX + barW + 24, hudY + 64);
}

function drawCompletionCard() {
  const w = Math.min(480, world.width - 32);
  const h = 258;
  const x = Math.round((world.width - w) / 2);
  const y = Math.round(Math.max(96, world.height * 0.18));
  const stamp = route.score >= 2600 ? "Courier Ace" : route.score >= 1600 ? "Swift Shift" : "Fresh Start";

  ctx.fillStyle = "rgba(21, 18, 13, 0.90)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255, 241, 207, 0.28)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

  ctx.fillStyle = "#29b6b6";
  ctx.font = "14px Courier New";
  ctx.fillText("ROUND COMPLETE", x + 26, y + 34);
  ctx.fillStyle = "#fff1cf";
  ctx.font = "30px Trebuchet MS";
  ctx.fillText("Morning Rush", x + 26, y + 70);

  ctx.font = "16px Courier New";
  ctx.fillStyle = "#f0dca6";
  ctx.fillText(`Score: ${route.score}   Best: ${route.bestScore}`, x + 28, y + 108);
  ctx.fillText(`Deliveries: ${route.deliveries}   Best combo: x${route.bestCombo + 1}`, x + 28, y + 136);
  ctx.fillText(`Mistakes: ${route.mistakes}   Difficulty: ${route.difficulty}`, x + 28, y + 164);
  ctx.fillText(`Time survived: ${formatTime(route.completeTime)}`, x + 28, y + 192);

  ctx.fillStyle = "#f0b44b";
  ctx.fillText(`Stamp: ${stamp}`, x + 28, y + 224);
  ctx.fillStyle = "#fff1cf";
  ctx.fillText("Press R to start another rush", x + 28, y + 244);
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
      if (!flower.awake) {
        flower.awake = true;
        route.awakenedFlowers += 1;
      }
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

function formatTime(seconds) {
  if (!seconds) return "--.--";
  return seconds.toFixed(2);
}

boot().catch((error) => {
  console.error(error);
  ui.state.textContent = "load-error";
});
