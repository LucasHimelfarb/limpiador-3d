import * as THREE from 'three';

const ROOM = 16;
const HALF = ROOM / 2;
const GRID = 128;
const CELL = ROOM / GRID;
const PLAYER_RADIUS = 0.45;
const SPEED = 4.8;
const MOP_REACH = 0.95;
const MOP_RADIUS = 0.75;
const BUCKET_RANGE = 1.6;

const $ = (id) => document.getElementById(id);
const ui = {
  hud: $('hud'), hint: $('hint'), popups: $('popups'), overlay: $('overlay'),
  title: $('title'), message: $('message'), controls: $('controls'), startBtn: $('startBtn'),
  level: $('level'), score: $('score'), time: $('time'),
  cleanPct: $('cleanPct'), cleanBar: $('cleanBar'), goalMark: $('goalMark'),
  waterPct: $('waterPct'), waterBar: $('waterBar')
};

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1d2330');

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
const CAMERA_OFFSET = new THREE.Vector3(0, 11, 9.5);

scene.add(new THREE.HemisphereLight('#fff6e8', '#4a3b2c', 0.9));
const sun = new THREE.DirectionalLight('#ffffff', 1.6);
sun.position.set(-6, 14, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 });
sun.shadow.bias = -0.0005;
scene.add(sun);
const lamp = new THREE.PointLight('#ffd9a0', 18, 14, 2);
lamp.position.set(0, 5, 0);
scene.add(lamp);

function makeWoodTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  const planks = 8;
  const h = c.height / planks;
  for (let p = 0; p < planks; p++) {
    const offset = (p % 2) * 300 + Math.random() * 100;
    for (let x = -offset; x < c.width; x += 600) {
      const tone = 150 + Math.random() * 30;
      g.fillStyle = `rgb(${tone + 40}, ${tone - 5}, ${tone - 60})`;
      g.fillRect(x, p * h, 600, h);
      for (let l = 0; l < 14; l++) {
        g.strokeStyle = `rgba(90, 55, 25, ${0.05 + Math.random() * 0.08})`;
        g.lineWidth = 1 + Math.random() * 2;
        const y = p * h + Math.random() * h;
        g.beginPath();
        g.moveTo(x, y);
        g.bezierCurveTo(x + 200, y + Math.random() * 8 - 4, x + 400, y + Math.random() * 8 - 4, x + 600, y);
        g.stroke();
      }
      g.fillStyle = 'rgba(60, 35, 15, 0.6)';
      g.fillRect(x, p * h, 3, h);
    }
    g.fillStyle = 'rgba(60, 35, 15, 0.7)';
    g.fillRect(0, p * h, c.width, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(ROOM, ROOM),
  new THREE.MeshStandardMaterial({ map: makeWoodTexture(), roughness: 0.55 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const wallMat = new THREE.MeshStandardMaterial({ color: '#c9d6e3', roughness: 0.9 });
const trimMat = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.6 });
function addWall(w, h, d, x, y, z) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  wall.position.set(x, y, z);
  wall.receiveShadow = true;
  scene.add(wall);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.25, d + 0.06), trimMat);
  trim.position.set(x, 0.125, z);
  scene.add(trim);
}
addWall(ROOM + 0.6, 4, 0.3, 0, 2, -HALF - 0.15);
addWall(0.3, 4, ROOM, -HALF - 0.15, 2, 0);
addWall(0.3, 4, ROOM, HALF + 0.15, 2, 0);
addWall(ROOM + 0.6, 0.5, 0.3, 0, 0.25, HALF + 0.15);

const windowFrame = new THREE.Mesh(
  new THREE.PlaneGeometry(3.2, 1.8),
  new THREE.MeshStandardMaterial({ color: '#9fd3ff', emissive: '#6fb6f0', emissiveIntensity: 0.6 })
);
windowFrame.position.set(2.5, 2.4, -HALF + 0.01);
scene.add(windowFrame);

const obstacles = [];
function box(w, h, d, color, x, y, z, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function addObstacle(minX, maxX, minZ, maxZ) {
  obstacles.push({ minX, maxX, minZ, maxZ });
}

function buildFurniture() {
  box(3.4, 0.5, 5, '#7a5236', -6, 0.35, -5.3);
  box(3.2, 0.3, 4.6, '#eef2f7', -6, 0.75, -5.2);
  box(3.2, 0.32, 3.2, '#5b8fd6', -6, 0.92, -4.6);
  box(1.2, 0.25, 0.8, '#ffffff', -6.7, 1.05, -7.1);
  box(1.2, 0.25, 0.8, '#ffffff', -5.3, 1.05, -7.1);
  box(3.4, 1.4, 0.2, '#6a4630', -6, 0.9, -7.85);
  addObstacle(-7.7, -4.3, -7.9, -2.8);

  const tableTop = box(2.8, 0.12, 1.6, '#a0703f', 3, 1.0, 0.5);
  tableTop.castShadow = true;
  for (const [dx, dz] of [[-1.25, -0.65], [1.25, -0.65], [-1.25, 0.65], [1.25, 0.65]]) {
    box(0.12, 1.0, 0.12, '#6a4630', 3 + dx, 0.5, 0.5 + dz);
  }
  addObstacle(1.6, 4.4, -0.3, 1.3);

  box(4, 0.8, 1.4, '#c0574a', 4.5, 0.4, 6.9);
  box(4, 0.9, 0.35, '#a8473c', 4.5, 1.05, 7.5);
  box(0.35, 0.6, 1.4, '#a8473c', 2.6, 0.95, 6.9);
  box(0.35, 0.6, 1.4, '#a8473c', 6.4, 0.95, 6.9);
  addObstacle(2.4, 6.6, 6.1, 7.9);

  box(2.6, 3.2, 1, '#8a6a4f', 6.6, 1.6, -7.3);
  box(0.06, 2.8, 0.02, '#3d2a1c', 6.6, 1.6, -6.79);
  addObstacle(5.2, 7.9, -7.9, -6.7);

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.7, 16), new THREE.MeshStandardMaterial({ color: '#c46a3c' }));
  pot.position.set(-7.2, 0.35, 7.2);
  pot.castShadow = true;
  scene.add(pot);
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), new THREE.MeshStandardMaterial({ color: '#3f9b4f', flatShading: true }));
  leaves.position.set(-7.2, 1.25, 7.2);
  leaves.castShadow = true;
  scene.add(leaves);
  addObstacle(-7.7, -6.7, 6.7, 7.7);
}
buildFurniture();

const bucket = new THREE.Group();
const bucketBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.45, 0.35, 0.7, 24, 1, true),
  new THREE.MeshStandardMaterial({ color: '#2f7de1', side: THREE.DoubleSide, roughness: 0.4 })
);
bucketBody.position.y = 0.35;
bucketBody.castShadow = true;
bucket.add(bucketBody);
const bucketBottom = new THREE.Mesh(new THREE.CircleGeometry(0.35, 24), bucketBody.material);
bucketBottom.rotation.x = -Math.PI / 2;
bucketBottom.position.y = 0.01;
bucket.add(bucketBottom);
const bucketWater = new THREE.Mesh(
  new THREE.CircleGeometry(0.42, 24),
  new THREE.MeshStandardMaterial({ color: '#8fd3ff', transparent: true, opacity: 0.85, roughness: 0.1 })
);
bucketWater.rotation.x = -Math.PI / 2;
bucketWater.position.y = 0.58;
bucket.add(bucketWater);
const handle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 8, 24, Math.PI), new THREE.MeshStandardMaterial({ color: '#cccccc' }));
handle.position.y = 0.7;
bucket.add(handle);
const bucketRing = new THREE.Mesh(
  new THREE.RingGeometry(BUCKET_RANGE - 0.08, BUCKET_RANGE, 48),
  new THREE.MeshBasicMaterial({ color: '#7cc4ff', transparent: true, opacity: 0.35 })
);
bucketRing.rotation.x = -Math.PI / 2;
bucketRing.position.y = 0.02;
bucket.add(bucketRing);
bucket.position.set(-6.8, 0, 2.5);
scene.add(bucket);
addObstacle(-7.25, -6.35, 2.05, 2.95);

const dirt = new Float32Array(GRID * GRID);
const blocked = new Uint8Array(GRID * GRID);
const dirtPixels = new Uint8Array(GRID * GRID * 4);
const dirtTexture = new THREE.DataTexture(dirtPixels, GRID, GRID, THREE.RGBAFormat);
dirtTexture.magFilter = THREE.LinearFilter;
dirtTexture.minFilter = THREE.LinearFilter;
const dirtMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(ROOM, ROOM),
  new THREE.MeshStandardMaterial({
    color: '#4a3220', alphaMap: dirtTexture, transparent: true, depthWrite: false, roughness: 1,
    polygonOffset: true, polygonOffsetFactor: -1
  })
);
dirtMesh.rotation.x = -Math.PI / 2;
dirtMesh.position.y = 0.005;
dirtMesh.receiveShadow = true;
scene.add(dirtMesh);

const cellX = (i) => -HALF + (i + 0.5) * CELL;
const cellZ = (j) => HALF - (j + 0.5) * CELL;

for (let j = 0; j < GRID; j++) {
  for (let i = 0; i < GRID; i++) {
    const x = cellX(i), z = cellZ(j);
    for (const o of obstacles) {
      if (x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ) blocked[j * GRID + i] = 1;
    }
  }
}

let initialDirt = 1;
let currentDirt = 0;

function refreshDirtTexture() {
  for (let k = 0; k < dirt.length; k++) {
    const v = Math.min(255, dirt[k] * 235) | 0;
    const p = k * 4;
    dirtPixels[p] = dirtPixels[p + 1] = dirtPixels[p + 2] = dirtPixels[p + 3] = v;
  }
  dirtTexture.needsUpdate = true;
}

function generateDirt(level) {
  dirt.fill(0);
  const blobs = 26 + level * 8;
  for (let b = 0; b < blobs; b++) {
    const cx = Math.random() * GRID, cy = Math.random() * GRID;
    const r = 3 + Math.random() * (6 + level);
    const strength = 0.5 + Math.random() * 0.6;
    const stretch = 0.6 + Math.random() * 0.9;
    const ang = Math.random() * Math.PI;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const reach = Math.ceil(r * 1.6);
    for (let j = Math.max(0, (cy - reach) | 0); j < Math.min(GRID, cy + reach); j++) {
      for (let i = Math.max(0, (cx - reach) | 0); i < Math.min(GRID, cx + reach); i++) {
        const dx = i - cx, dy = j - cy;
        const u = (dx * ca + dy * sa) / stretch, v = -dx * sa + dy * ca;
        const d = Math.sqrt(u * u + v * v) / r;
        if (d < 1) {
          const k = j * GRID + i;
          const noise = 0.75 + Math.random() * 0.25;
          dirt[k] = Math.min(1, dirt[k] + strength * (1 - d * d) * noise);
        }
      }
    }
  }
  const crumbs = 120 + level * 40;
  for (let c = 0; c < crumbs; c++) {
    const k = ((Math.random() * GRID) | 0) * GRID + ((Math.random() * GRID) | 0);
    dirt[k] = Math.min(1, dirt[k] + 0.7);
  }
  currentDirt = 0;
  for (let k = 0; k < dirt.length; k++) {
    if (blocked[k]) dirt[k] = 0;
    if (dirt[k] < 0.04) dirt[k] = 0;
    currentDirt += dirt[k];
  }
  initialDirt = currentDirt;
  refreshDirtTexture();
}

function cleanAt(x, z, radius, power) {
  const ci = (x + HALF) / CELL - 0.5;
  const cj = (HALF - z) / CELL - 0.5;
  const rc = radius / CELL;
  let removed = 0;
  for (let j = Math.max(0, Math.floor(cj - rc)); j <= Math.min(GRID - 1, Math.ceil(cj + rc)); j++) {
    for (let i = Math.max(0, Math.floor(ci - rc)); i <= Math.min(GRID - 1, Math.ceil(ci + rc)); i++) {
      const dx = i - ci, dy = j - cj;
      const d = Math.sqrt(dx * dx + dy * dy) / rc;
      if (d >= 1) continue;
      const k = j * GRID + i;
      if (dirt[k] <= 0) continue;
      const amount = Math.min(dirt[k], power * (1 - d * d * 0.7));
      dirt[k] -= amount;
      if (dirt[k] < 0.02) {
        removed += dirt[k];
        dirt[k] = 0;
      }
      removed += amount;
      const p = k * 4;
      const v = Math.min(255, dirt[k] * 235) | 0;
      dirtPixels[p] = dirtPixels[p + 1] = dirtPixels[p + 2] = dirtPixels[p + 3] = v;
    }
  }
  if (removed > 0) {
    currentDirt = Math.max(0, currentDirt - removed);
    dirtTexture.needsUpdate = true;
  }
  return removed;
}

function buildCharacter() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const shirt = mat('#f2a33a'), pants = mat('#2f4b7c'), skin = mat('#f1c7a0'), cap = mat('#e04f5f');

  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.5, 4, 10), pants);
  legL.position.set(-0.16, 0.38, 0);
  const legR = legL.clone();
  legR.position.x = 0.16;
  body.add(legL, legR);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.55, 6, 16), shirt);
  torso.position.y = 1.15;
  body.add(torso);

  const apron = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.05), mat('#3aa874'));
  apron.position.set(0, 1.05, 0.31);
  body.add(apron);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), skin);
  head.position.y = 1.88;
  body.add(head);
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.31, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), cap);
  capTop.position.y = 1.93;
  body.add(capTop);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.28), cap);
  visor.position.set(0, 1.95, 0.3);
  body.add(visor);
  const eyeMat = mat('#1b1b1b');
  for (const ex of [-0.1, 0.1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
    eye.position.set(ex, 1.88, 0.27);
    body.add(eye);
  }

  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.45, 4, 10), shirt);
  armL.position.set(-0.36, 1.2, 0.25);
  armL.rotation.x = -1.0;
  const armR = armL.clone();
  armR.position.x = 0.36;
  body.add(armL, armR);

  const mopPivot = new THREE.Group();
  mopPivot.position.set(0, 1.25, 0.45);
  root.add(mopPivot);
  const stickLen = Math.hypot(1.2, MOP_REACH - 0.45);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, stickLen, 8), mat('#b98b5a'));
  const stickAngle = Math.atan2(MOP_REACH - 0.45, 1.2);
  stick.rotation.x = stickAngle;
  stick.position.set(0, -0.6, (MOP_REACH - 0.45) / 2);
  mopPivot.add(stick);
  const mopHeadMat = new THREE.MeshStandardMaterial({ color: '#e8e2d0', roughness: 0.95 });
  const mopHead = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.3), mopHeadMat);
  mopHead.position.set(0, -1.2, MOP_REACH - 0.45);
  mopHead.castShadow = true;
  mopPivot.add(mopHead);
  for (let s = 0; s < 13; s++) {
    const strand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), mopHeadMat);
    strand.position.set(-0.48 + s * 0.08, -1.23, MOP_REACH - 0.45);
    mopPivot.add(strand);
  }

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root, body, legL, legR, armL, armR, mopPivot, mopHeadMat };
}

const player = buildCharacter();
scene.add(player.root);

const bubbles = [];
const bubbleGeo = new THREE.SphereGeometry(0.06, 8, 6);
const bubbleMat = new THREE.MeshStandardMaterial({ color: '#dff4ff', transparent: true, opacity: 0.8, roughness: 0.1 });
function spawnBubble(x, z) {
  const m = new THREE.Mesh(bubbleGeo, bubbleMat);
  m.position.set(x + (Math.random() - 0.5) * 0.6, 0.05, z + (Math.random() - 0.5) * 0.6);
  m.userData = { vy: 0.6 + Math.random() * 0.8, life: 0.6 + Math.random() * 0.4 };
  m.scale.setScalar(0.5 + Math.random());
  scene.add(m);
  bubbles.push(m);
}
function updateBubbles(dt) {
  for (let b = bubbles.length - 1; b >= 0; b--) {
    const m = bubbles[b];
    m.userData.life -= dt;
    m.position.y += m.userData.vy * dt;
    if (m.userData.life <= 0) {
      scene.remove(m);
      bubbles.splice(b, 1);
    }
  }
}

const keys = new Set();
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.code === 'KeyP' && (state.mode === 'playing' || state.mode === 'paused')) togglePause();
  if (e.code === 'KeyE' && state.mode === 'playing') tryRefill();
  if ((e.code === 'Enter') && state.mode !== 'playing' && state.mode !== 'paused') ui.startBtn.click();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => {
  keys.clear();
  if (state.mode === 'playing') togglePause();
});

const state = {
  mode: 'menu',
  level: 1,
  score: 0,
  levelPoints: 0,
  pointBuffer: 0,
  time: 0,
  water: 1,
  heading: 0,
  walkPhase: 0,
  goalNotified: false,
  hintTimer: 0
};

const goalFor = (level) => Math.min(0.95, 0.8 + (level - 1) * 0.03);
const timeFor = (level) => 75 + level * 10;
const cleanRatio = () => 1 - currentDirt / initialDirt;

function startLevel() {
  generateDirt(state.level);
  state.time = timeFor(state.level);
  state.water = 1;
  state.levelPoints = 0;
  state.pointBuffer = 0;
  state.goalNotified = false;
  player.root.position.set(0, 0, 4);
  state.heading = Math.PI;
  player.root.rotation.y = state.heading;
  ui.goalMark.style.left = `${goalFor(state.level) * 100}%`;
  ui.overlay.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  showHint(`Nivel ${state.level}: limpiá al menos ${Math.round(goalFor(state.level) * 100)}% del piso`, 3);
  state.mode = 'playing';
}

function showOverlay(title, message, button, showControls = false) {
  ui.title.textContent = title;
  ui.message.textContent = message;
  ui.startBtn.textContent = button;
  ui.controls.classList.toggle('hidden', !showControls);
  ui.overlay.classList.remove('hidden');
}

function togglePause() {
  if (state.mode === 'playing') {
    state.mode = 'paused';
    showOverlay('Pausa', 'El trapeador te espera.', 'Seguir', true);
  } else if (state.mode === 'paused') {
    state.mode = 'playing';
    ui.overlay.classList.add('hidden');
  }
}

ui.startBtn.addEventListener('click', () => {
  if (state.mode === 'paused') return togglePause();
  if (state.mode === 'menu' || state.mode === 'gameOver') {
    state.level = 1;
    state.score = 0;
  } else if (state.mode === 'levelEnd') {
    state.level += 1;
  }
  startLevel();
});

function showHint(text, seconds) {
  ui.hint.textContent = text;
  ui.hint.classList.remove('hidden');
  state.hintTimer = seconds;
}

function popup(text, worldPos) {
  const v = worldPos.clone().project(camera);
  const el = document.createElement('div');
  el.className = 'popup';
  el.textContent = text;
  el.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
  el.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
  ui.popups.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function distToBucket() {
  return Math.hypot(player.root.position.x - bucket.position.x, player.root.position.z - bucket.position.z);
}

function tryRefill() {
  if (distToBucket() > BUCKET_RANGE + 0.3) {
    showHint('Acercate al balde azul para mojar el trapeador', 2);
    return;
  }
  if (state.water < 0.99) {
    state.water = 1;
    for (let b = 0; b < 12; b++) spawnBubble(bucket.position.x, bucket.position.z);
    showHint('¡Trapeador mojado!', 1.2);
  }
}

function addPoints(amount, at) {
  state.score += amount;
  state.levelPoints += amount;
  if (at) popup(`+${amount}`, at);
}

function finishLevel(perfect) {
  const ratio = cleanRatio();
  const timeBonus = Math.round(state.time) * 10;
  const perfectBonus = perfect ? 500 : 0;
  const pctBonus = Math.round(Math.max(0, ratio - goalFor(state.level)) * 2000);
  state.score += timeBonus + perfectBonus + pctBonus;
  state.mode = 'levelEnd';
  ui.hud.classList.add('hidden');
  ui.hint.classList.add('hidden');
  const lines = [
    `Piso limpio: ${Math.round(ratio * 100)}%`,
    `Puntos por limpiar: ${state.levelPoints}`,
    `Bonus por superar la meta: ${pctBonus}`,
    `Bonus de tiempo: ${timeBonus}`
  ];
  if (perfect) lines.push(`¡Piso impecable! +${perfectBonus}`);
  lines.push(`\nPuntaje total: ${state.score}`);
  showOverlay(perfect ? '¡Impecable!' : '¡Nivel superado!', lines.join('\n'), 'Siguiente nivel');
}

function gameOver() {
  state.mode = 'gameOver';
  ui.hud.classList.add('hidden');
  ui.hint.classList.add('hidden');
  const best = Math.max(state.score, Number(safeGet('limpiador-best') || 0));
  safeSet('limpiador-best', best);
  showOverlay(
    'Se acabó el tiempo',
    `Llegaste al ${Math.round(cleanRatio() * 100)}% y la meta era ${Math.round(goalFor(state.level) * 100)}%.\n\nNivel alcanzado: ${state.level}\nPuntaje final: ${state.score}\nMejor puntaje: ${best}`,
    'Jugar de nuevo'
  );
}

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, String(v)); } catch { } }

function resolveCollisions(pos) {
  const limit = HALF - PLAYER_RADIUS;
  pos.x = THREE.MathUtils.clamp(pos.x, -limit, limit);
  pos.z = THREE.MathUtils.clamp(pos.z, -limit, limit);
  for (const o of obstacles) {
    const cx = THREE.MathUtils.clamp(pos.x, o.minX, o.maxX);
    const cz = THREE.MathUtils.clamp(pos.z, o.minZ, o.maxZ);
    const dx = pos.x - cx, dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < PLAYER_RADIUS * PLAYER_RADIUS) {
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * PLAYER_RADIUS;
        pos.z = cz + (dz / d) * PLAYER_RADIUS;
      } else {
        const pushes = [
          [o.minX - PLAYER_RADIUS - pos.x, 0], [o.maxX + PLAYER_RADIUS - pos.x, 0],
          [0, o.minZ - PLAYER_RADIUS - pos.z], [0, o.maxZ + PLAYER_RADIUS - pos.z]
        ].sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
        pos.x += pushes[0][0];
        pos.z += pushes[0][1];
      }
    }
  }
}

const mopWorld = new THREE.Vector3();
const dryMop = new THREE.Color('#e8e2d0');
const wetMop = new THREE.Color('#9fb7c9');

function update(dt) {
  const input = new THREE.Vector2(
    (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0),
    (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
  );
  const moving = input.lengthSq() > 0;
  const scrubbing = keys.has('Space');
  const pos = player.root.position;

  if (moving) {
    input.normalize();
    const speed = SPEED * (scrubbing ? 0.6 : 1);
    pos.x += input.x * speed * dt;
    pos.z += input.y * speed * dt;
    resolveCollisions(pos);
    const target = Math.atan2(input.x, input.y);
    let diff = target - state.heading;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    state.heading += diff * Math.min(1, dt * 12);
    player.root.rotation.y = state.heading;
    state.walkPhase += dt * (scrubbing ? 8 : 11);
  } else {
    state.walkPhase += dt * (scrubbing ? 8 : 0);
  }

  const swing = moving ? Math.sin(state.walkPhase) : 0;
  player.legL.rotation.x = swing * 0.6;
  player.legR.rotation.x = -swing * 0.6;
  player.body.position.y = moving ? Math.abs(Math.sin(state.walkPhase)) * 0.06 : 0;
  const swish = scrubbing ? Math.sin(state.walkPhase * 1.6) * 0.45 : (moving ? Math.sin(state.walkPhase * 0.5) * 0.15 : 0);
  player.mopPivot.rotation.y = swish;
  player.armL.rotation.z = swish * 0.4;
  player.armR.rotation.z = swish * 0.4;
  player.mopHeadMat.color.copy(dryMop).lerp(wetMop, state.water);

  mopWorld.set(Math.sin(swish) * (MOP_REACH - 0.45) * 0.6, 0, MOP_REACH);
  mopWorld.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.heading).add(pos);

  if ((moving || scrubbing) && state.water > 0) {
    const power = (scrubbing ? 4.5 : 2.2) * dt * (0.35 + 0.65 * Math.min(1, state.water * 3));
    const removed = cleanAt(mopWorld.x, mopWorld.z, MOP_RADIUS, power);
    if (removed > 0) {
      state.water = Math.max(0, state.water - removed / (initialDirt / 2.8) - dt * 0.004);
      state.pointBuffer += (removed / initialDirt) * 1000;
      if (state.pointBuffer >= 10) {
        const pts = Math.floor(state.pointBuffer / 10) * 10;
        state.pointBuffer -= pts;
        addPoints(pts, mopWorld.clone().setY(0.4));
      }
      if (Math.random() < dt * 14) spawnBubble(mopWorld.x, mopWorld.z);
    }
  }

  if (state.water <= 0 && state.hintTimer <= 0) showHint('¡El trapeador está seco! Mojalo en el balde (E)', 2);
  else if (state.water > 0 && state.water < 0.15 && state.hintTimer <= 0) showHint('Queda poca agua: andá al balde', 1.5);

  bucketRing.material.opacity = distToBucket() < BUCKET_RANGE + 0.3 ? 0.8 : 0.3;

  const ratio = cleanRatio();
  if (!state.goalNotified && ratio >= goalFor(state.level)) {
    state.goalNotified = true;
    addPoints(100, pos.clone().setY(2.4));
    showHint('¡Meta alcanzada! Llegá al 99% para terminar con bonus de tiempo', 3);
  }

  state.time -= dt;
  if (ratio >= 0.99) return finishLevel(true);
  if (state.time <= 0) {
    state.time = 0;
    return ratio >= goalFor(state.level) ? finishLevel(false) : gameOver();
  }
}

function updateHud() {
  const ratio = cleanRatio();
  ui.level.textContent = state.level;
  ui.score.textContent = state.score;
  ui.time.textContent = Math.ceil(state.time);
  ui.time.style.color = state.time < 10 ? '#ff6b6b' : '';
  ui.cleanPct.textContent = `${Math.floor(ratio * 100)}%`;
  ui.cleanBar.style.width = `${ratio * 100}%`;
  ui.waterPct.textContent = `${Math.round(state.water * 100)}%`;
  ui.waterBar.style.width = `${state.water * 100}%`;
}

const camTarget = new THREE.Vector3();
function updateCamera(dt, snap = false) {
  const p = player.root.position;
  camTarget.set(p.x * 0.6, 0, p.z * 0.55);
  const desired = camTarget.clone().add(CAMERA_OFFSET);
  if (snap) camera.position.copy(desired);
  else camera.position.lerp(desired, Math.min(1, dt * 4));
  camera.lookAt(camera.position.x - CAMERA_OFFSET.x, 0, camera.position.z - CAMERA_OFFSET.z);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

generateDirt(1);
player.root.position.set(0, 0, 4);
player.root.rotation.y = Math.PI;
updateCamera(0, true);
showOverlay('Limpiador 3D', 'Dejá el piso del habitáculo impecable antes de que se acabe el tiempo. Cada mancha que limpiás suma puntos.', 'Jugar', true);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state.mode === 'playing') {
    update(dt);
    updateHud();
    if (state.hintTimer > 0) {
      state.hintTimer -= dt;
      if (state.hintTimer <= 0) ui.hint.classList.add('hidden');
    }
  } else if (state.mode === 'menu') {
    player.root.rotation.y += dt * 0.6;
  }
  updateBubbles(dt);
  bucketWater.position.y = 0.58 + Math.sin(clock.elapsedTime * 2) * 0.01;
  updateCamera(dt);
  renderer.render(scene, camera);
});

window.__game = { state, keys, cleanRatio, player: player.root, bucket };
