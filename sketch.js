/*
Week 5 — Example 5: Side-Scroller Platformer with JSON Levels + Modular Camera

Course: GBDA302 | Instructors: Dr. Karen Cochrane & David Han
Date: Feb. 12, 2026

Move: WASD/Arrows | Jump: Space

Learning goals:
- Build a side-scrolling platformer using modular game systems
- Load complete level definitions from external JSON (LevelLoader + levels.json)
- Separate responsibilities across classes (Player, Platform, Camera, World)
- Implement gravity, jumping, and collision with platforms
- Use a dedicated Camera2D class for smooth horizontal tracking
- Support multiple levels and easy tuning through data files
- Explore scalable project architecture for larger games
*/

const VIEW_W = 800;
const VIEW_H = 480;

let allLevelsData;
let levelIndex = 0;

let level;
let player;
let cam;

// ── Atmosphere ──────────────────────────────────────
const SKY_CYCLE = 120; // seconds for a full dawn→day→dusk→night cycle

// Sky colour keyframes in HSL: [hue, saturation%, lightness%]
const SKY_KEYS = [
  { top: [25, 70, 78],  bot: [35, 80, 88] },   // Dawn
  { top: [210, 50, 78], bot: [200, 30, 92] },   // Day
  { top: [275, 45, 28], bot: [15, 65, 65] },    // Dusk
  { top: [230, 50, 8],  bot: [225, 40, 15] },   // Night
];

// Parallax hill layers: far → near
const HILL_LAYERS = [
  { px: 0.05, baseY: 0.50, amp: 50, alpha: 0.12, freqs: [0.002, 0.005], seed: 0 },
  { px: 0.15, baseY: 0.62, amp: 38, alpha: 0.18, freqs: [0.004, 0.009], seed: 100 },
  { px: 0.30, baseY: 0.74, amp: 25, alpha: 0.28, freqs: [0.007, 0.014], seed: 200 },
];

let _sky; // cached sky colours for the current frame
// ─────────────────────────────────────────────────────

function preload() {
  allLevelsData = loadJSON("levels.json"); // levels.json beside index.html [web:122]
}

function setup() {
  createCanvas(VIEW_W, VIEW_H);
  textFont("sans-serif");
  textSize(14);

  cam = new Camera2D(width, height);
  loadLevel(levelIndex);
}

function loadLevel(i) {
  level = LevelLoader.fromLevelsJson(allLevelsData, i);

  player = new BlobPlayer();
  player.spawnFromLevel(level);

  cam.x = player.x - width / 2;
  cam.y = 0;
  cam.clampToWorld(level.w, level.h);
}

// ── Atmosphere helpers ──────────────────────────────

/** Interpolate hue along the shortest arc of the colour wheel. */
function lerpHue(a, b, t) {
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return ((a + d * t) % 360 + 360) % 360;
}

/** Compute the current sky top/bottom HSL values from the day cycle. */
function updateSkyColors() {
  const cycleT = ((millis() / 1000) / SKY_CYCLE) % 1.0;
  const n = SKY_KEYS.length;
  const seg = cycleT * n;
  const i = floor(seg) % n;
  const j = (i + 1) % n;
  const t = seg - floor(seg);
  const st = t * t * (3 - 2 * t); // smoothstep

  _sky = {
    topH: lerpHue(SKY_KEYS[i].top[0], SKY_KEYS[j].top[0], st),
    topS: lerp(SKY_KEYS[i].top[1], SKY_KEYS[j].top[1], st),
    topL: lerp(SKY_KEYS[i].top[2], SKY_KEYS[j].top[2], st),
    botH: lerpHue(SKY_KEYS[i].bot[0], SKY_KEYS[j].bot[0], st),
    botS: lerp(SKY_KEYS[i].bot[1], SKY_KEYS[j].bot[1], st),
    botL: lerp(SKY_KEYS[i].bot[2], SKY_KEYS[j].bot[2], st),
  };
}

/** Full-screen vertical gradient using the native canvas API. */
function drawSky() {
  const ctx = drawingContext;
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, `hsl(${_sky.topH}, ${_sky.topS}%, ${_sky.topL}%)`);
  grad.addColorStop(1, `hsl(${_sky.botH}, ${_sky.botS}%, ${_sky.botL}%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

/** Layered sine-wave hills that scroll slower than the camera. */
function drawParallax(camX) {
  push();
  colorMode(HSL, 360, 100, 100, 1.0);
  noStroke();

  for (const layer of HILL_LAYERS) {
    const offsetX = camX * layer.px;
    // Tint hills from the sky's bottom colour, darkened & desaturated
    const h = _sky.botH;
    const s = _sky.botS * 0.5;
    const l = max(_sky.botL * 0.4, 4);
    fill(h, s, l, layer.alpha);

    beginShape();
    vertex(0, VIEW_H);
    for (let sx = -4; sx <= VIEW_W + 4; sx += 4) {
      const wx = sx + offsetX + layer.seed;
      let y = VIEW_H * layer.baseY;
      for (const f of layer.freqs) {
        y += sin(wx * f) * layer.amp;
      }
      vertex(sx, y);
    }
    vertex(VIEW_W, VIEW_H);
    endShape(CLOSE);
  }

  pop();
}

// ── Main loop ───────────────────────────────────────

function draw() {
  // --- game state ---
  player.update(level);

  // Fall death → respawn
  if (player.y - player.r > level.deathY) {
    loadLevel(levelIndex);
    return;
  }

  // --- view state (data-driven smoothing) ---
  cam.followSideScrollerX(player.x, level.camLerp);
  cam.y = 0;
  cam.clampToWorld(level.w, level.h);

  // --- atmosphere (screen space) ---
  updateSkyColors();
  drawSky();
  drawParallax(cam.x);

  // --- world (camera space) ---
  cam.begin();
  level.drawWorld();
  player.draw(level.theme.blob);
  cam.end();

  // --- HUD ---
  push();
  fill(0, 0, 0, 80);
  noStroke();
  rect(0, 0, VIEW_W, 116);
  pop();

  fill(255);
  noStroke();
  text(level.name + " (Example 5)", 10, 18);
  text("A/D or ←/→ move • Space/W/↑ jump • Fall = respawn", 10, 36);
  text("camLerp(JSON): " + level.camLerp + "  world.w: " + level.w, 10, 54);
  text("cam: " + cam.x + ", " + cam.y, 10, 90);
  const p0 = level.platforms[0];
  text(`p0: x=${p0.x} y=${p0.y} w=${p0.w} h=${p0.h}`, 10, 108);

  text(
    "platforms: " +
      level.platforms.length +
      " start: " +
      level.start.x +
      "," +
      level.start.y,
    10,
    72,
  );
}

function keyPressed() {
  if (key === " " || key === "W" || key === "w" || keyCode === UP_ARROW) {
    player.tryJump();
  }
  if (key === "r" || key === "R") loadLevel(levelIndex);
}
