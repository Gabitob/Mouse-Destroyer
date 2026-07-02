const enemyTypes = [
  { src: 'image/inimigos/Boneco-Azul.gif', dinheiro: 15 },
  { src: 'image/inimigos/Creepy.gif', dinheiro: 20 },
  { src: 'image/inimigos/demon_skeleton.png', dinheiro: 20 },
  { src: 'image/inimigos/Emo.gif', dinheiro: 25 },
  { src: 'image/inimigos/Gato-Rosa.gif', dinheiro: 30 },
  { src: 'image/inimigos/Ghosst.gif', dinheiro: 40 },
  { src: 'image/inimigos/khorneBerzerker.png', dinheiro: 20 },
  { src: 'image/inimigos/Olho.gif', dinheiro: 50 },
  { src: 'image/inimigos/pisilohe10.png', dinheiro: 25 },
  { src: 'image/inimigos/skeleton_elite.png', dinheiro: 15 },
  { src: 'image/inimigos/SmileFace.png', dinheiro: 10 },
  { src: 'image/inimigos/SurpriseFace.png', dinheiro: 10 }
];

const centerBox = document.querySelector('.center-box');
const enemyLayer = document.querySelector('.enemy-layer');
const moneyBox = document.querySelector('.money-box');
const moneyDisplay = document.getElementById('money-display');
const musicToggleButton = document.getElementById('music-toggle');
const sfxToggleButton = document.getElementById('sfx-toggle');
const pulseUpgradeButton = document.getElementById('pulse-upgrade');
const enemyLimitUpgradeButton = document.getElementById('enemy-limit-upgrade');
const doubleMoneyUpgradeButton = document.getElementById('double-money-upgrade');
const explosionDurationUpgradeButton = document.getElementById('explosion-duration-upgrade');
const cigaretteUpgradeButton = document.getElementById('cigarette-upgrade');
const cigaretteChanceUpgradeButton = document.getElementById('cigarette-chance-upgrade');
const enemySize = 64;
const hitRadius = 90;
const hitMaskAlphaThreshold = 16;
const hitMaskCache = new Map();
const spawnDelayRange = [300, 800];
const enemyCountRange = [1, 3];
const speedRange = [30, 180];
let maxActiveEnemies = 5;
const pulseUpgradeCost = 200;
const enemyLimitUpgradeCost = 50;
const doubleMoneyUpgradeCost = 150;
const explosionDurationUpgradeCost = 100;
const cigaretteUpgradeCost = 300;
const cigaretteChanceUpgradeCost = 1000;
const upgradeCostIncrease = 200;
const shootSound = new Audio('sound/retro-laser.mp3');
shootSound.volume = 0.09;
const coinSound = new Audio('sound/drop-coin.mp3');
coinSound.volume = 0.12;
const levelUpSound = new Audio('sound/level-up.mp3');
levelUpSound.volume = 0.15;
const bgMusic = new Audio('sound/lofi-smooth-cut.mp3');
bgMusic.loop = true;
bgMusic.preload = 'auto';
bgMusic.volume = 0.06;
bgMusic.muted = false;
let cursorPosition = null;
let dinheiro = 0;
let isDoubleMoneyActive = false;
let pulseDelay = 3000;
let pulseTimer = null;
let bgMusicStarted = false;
let bgMusicEnabled = true;
let explosionDurationMultiplier = 1;
let isCigaretteActive = false;
let cigaretteChance = 0.3;
const activeProjectiles = new Set();

let sfxEnabled = true;
try { localStorage.setItem('sfxEnabled', 'true'); } catch (e) {}

function updateSfxState() {
  const muted = !sfxEnabled;
  try { shootSound.muted = muted; } catch (e) {}
  try { coinSound.muted = muted; } catch (e) {}
  try { levelUpSound.muted = muted; } catch (e) {}
  if (sfxToggleButton) {
    sfxToggleButton.classList.toggle('is-muted', muted);
    sfxToggleButton.setAttribute('aria-pressed', String(!muted));
    const icon = sfxToggleButton.querySelector('.music-toggle__icon');
    if (icon) icon.textContent = muted ? '🔇' : '🔊';
    const label = sfxToggleButton.querySelector('.music-toggle__label');
    if (label) label.textContent = muted ? 'Efeitos off' : 'Efeitos on';
  }
}

function toggleSfx() {
  sfxEnabled = !sfxEnabled;
  try { localStorage.setItem('sfxEnabled', String(sfxEnabled)); } catch (e) {}
  updateSfxState();
}

const explosionSpritePath = 'image/explosao/Explosion95CC0.png';
const explosionImage = new Image();
let explosionFrameWidth = 64;
let explosionFrameHeight = 64;
let explosionCols = 4;
let explosionRows = 4;
let explosionFrameCount = explosionCols * explosionRows;
let explosionLoaded = false;
const activeExplosions = new Set();
explosionImage.src = explosionSpritePath;
explosionImage.onload = () => {
  explosionLoaded = true;
  explosionCols = 4;
  explosionRows = 4;
  explosionFrameCount = explosionCols * explosionRows;
  explosionFrameWidth = Math.floor(explosionImage.naturalWidth / explosionCols) || explosionFrameWidth;
  explosionFrameHeight = Math.floor(explosionImage.naturalHeight / explosionRows) || explosionFrameHeight;
};

function createExplosion(x, y, options = {}) {
  const scale = options.scale || 1;
  const fps = options.fps || 30;
  const frameW = explosionFrameWidth * scale;
  const frameH = explosionFrameHeight * scale;
  const radius = Math.max(frameW, frameH) / 2;

  const el = document.createElement('div');
  el.className = 'explosion';
  el.style.position = 'absolute';
  el.style.width = `${frameW}px`;
  el.style.height = `${frameH}px`;
  el.style.pointerEvents = 'none';
  el.style.backgroundImage = `url('${explosionSpritePath}')`;
  el.style.backgroundRepeat = 'no-repeat';
  el.style.backgroundSize = `${explosionFrameWidth * explosionCols * scale}px ${explosionFrameHeight * explosionRows * scale}px`;
  el.style.transform = `translate(${x - frameW / 2}px, ${y - frameH / 2}px)`;
  enemyLayer.appendChild(el);

  const explosionData = { x, y, radius, el };
  activeExplosions.add(explosionData);

  let frame = 0;
  const frameDuration = (1000 / fps) * explosionDurationMultiplier;
  let last = performance.now();

  function step(now) {
    if (now - last >= frameDuration) {
      const col = frame % explosionCols;
      const row = Math.floor(frame / explosionCols);
      const posX = -(col * explosionFrameWidth * scale);
      const posY = -(row * explosionFrameHeight * scale);
      el.style.backgroundPosition = `${posX}px ${posY}px`;
      frame++;
      last = now;
    }
    if (frame < explosionFrameCount) {
      requestAnimationFrame(step);
    } else {
      el.remove();
      activeExplosions.delete(explosionData);
    }
  }

  requestAnimationFrame(step);
}

function createProjectile(x, y) {
  const el = document.createElement('img');
  el.src = 'image/projetil/Cigar.png';
  el.className = 'projectile';
  el.style.position = 'absolute';
  el.style.width = '32px';
  el.style.height = '32px';
  el.style.pointerEvents = 'none';
  el.style.transform = `translate(${x - 16}px, ${y - 16}px)`;
  enemyLayer.appendChild(el);

  const angle = Math.random() * Math.PI * 2;
  const speed = 300;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;

  const projectile = { x, y, vx, vy, el };
  activeProjectiles.add(projectile);

  return projectile;
}

function updateProjectiles(deltaTime) {
  const toRemove = [];

  for (const projectile of activeProjectiles) {
    projectile.x += projectile.vx * deltaTime;
    projectile.y += projectile.vy * deltaTime;
    projectile.el.style.transform = `translate(${projectile.x - 16}px, ${projectile.y - 16}px)`;

    const width = centerBox.clientWidth;
    const height = centerBox.clientHeight;

    if (projectile.x < -50 || projectile.x > width + 50 || projectile.y < -50 || projectile.y > height + 50) {
      toRemove.push(projectile);
      continue;
    }

    const enemies = Array.from(enemyLayer.querySelectorAll('.enemy'));
    for (const enemy of enemies) {
      const ex = Number(enemy.dataset.x) || 0;
      const ey = Number(enemy.dataset.y) || 0;
      const ew = enemy.clientWidth || enemySize;
      const eh = enemy.clientHeight || enemySize;

      if (projectile.x >= ex && projectile.x <= ex + ew && projectile.y >= ey && projectile.y <= ey + eh) {
        destroyEnemy(enemy);
        toRemove.push(projectile);
        break;
      }
    }
  }

  for (const projectile of toRemove) {
    projectile.el.remove();
    activeProjectiles.delete(projectile);
  }
}

bgMusic.addEventListener('ended', () => {
  if (bgMusicEnabled && !bgMusic.muted) {
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
  }
});

function updateMoneyDisplay() {
  if (!moneyDisplay) return;
  moneyDisplay.textContent = `Dinheiro: R$ ${dinheiro}`;
}

function updateMusicButton() {
  if (!musicToggleButton) return;
  const iconElement = musicToggleButton.querySelector('.music-toggle__icon');
  const isMuted = !bgMusicEnabled || bgMusic.muted;
  musicToggleButton.classList.toggle('is-muted', isMuted);
  musicToggleButton.setAttribute('aria-pressed', String(!isMuted));
  if (iconElement) {
    iconElement.textContent = isMuted ? '🔇' : '♪';
  }
  const labelElement = musicToggleButton.querySelector('.music-toggle__label');
  if (labelElement) {
    labelElement.textContent = isMuted ? 'Som off' : 'Som on';
  }
}

function addDinheiro(valor) {
  const totalValor = isDoubleMoneyActive ? valor * 2 : valor;
  dinheiro += totalValor;
  updateMoneyDisplay();
}

function canBuyUpgrade(cost) {
  return dinheiro >= cost;
}

function updateUpgradeCost(button) {
  if (!button) return;
  const currentCost = Number(button.dataset.cost) || 0;
  const newCost = currentCost + upgradeCostIncrease;
  const label = button.dataset.label || button.textContent.split(' - ')[0];
  button.dataset.cost = newCost;

  let speedIncrease = '';
  if (button.id === 'pulse-upgrade') {
    const currentPulsesPerSecond = 1000 / pulseDelay;
    const newPulseDelay = Math.max(500, pulseDelay - 1000);
    const newPulsesPerSecond = 1000 / newPulseDelay;
    const percentage = Math.round((newPulsesPerSecond - currentPulsesPerSecond) / currentPulsesPerSecond * 100);
    speedIncrease = ` (+${percentage}%)`;
  }

  if (button.id === 'explosion-duration-upgrade') {
    const percentage = Math.round(0.5 / explosionDurationMultiplier * 100);
    speedIncrease = ` (+${percentage}%)`;
  }

  button.textContent = `${label}${speedIncrease} - R$ ${newCost}`;
}

function startPulseTimer() {
  if (pulseTimer) {
    clearInterval(pulseTimer);
  }
  pulseTimer = setInterval(pulseCursor, pulseDelay);
}

function purchasePulseUpgrade() {
  if (!pulseUpgradeButton) return;
  const cost = Number(pulseUpgradeButton.dataset.cost) || pulseUpgradeCost;
  if (!canBuyUpgrade(cost)) {
    return;
  }
  dinheiro -= cost;
  updateMoneyDisplay();
  pulseDelay = Math.max(500, pulseDelay - 1000);
  startPulseTimer();
  try { levelUpSound.currentTime = 0; levelUpSound.play().catch(() => {}); } catch (e) {}
  updateUpgradeCost(pulseUpgradeButton);
  const newCost = Number(pulseUpgradeButton.dataset.cost) || 0;
  if (newCost > 600) {
    removeUpgradeButton(pulseUpgradeButton);
  }
}

function purchaseEnemyLimitUpgrade() {
  if (!enemyLimitUpgradeButton) return;
  const cost = Number(enemyLimitUpgradeButton.dataset.cost) || enemyLimitUpgradeCost;
  if (!canBuyUpgrade(cost)) {
    return;
  }
  dinheiro -= cost;
  updateMoneyDisplay();
  maxActiveEnemies += 5;
  try { levelUpSound.currentTime = 0; levelUpSound.play().catch(() => {}); } catch (e) {}
  updateUpgradeCost(enemyLimitUpgradeButton);
  const newCost = Number(enemyLimitUpgradeButton.dataset.cost) || 0;
  if (newCost > 450) {
    removeUpgradeButton(enemyLimitUpgradeButton);
  }
}

function purchaseDoubleMoneyUpgrade() {
  if (!doubleMoneyUpgradeButton) return;
  const cost = Number(doubleMoneyUpgradeButton.dataset.cost) || doubleMoneyUpgradeCost;
  if (!canBuyUpgrade(cost)) {
    return;
  }
  dinheiro -= cost;
  updateMoneyDisplay();
  isDoubleMoneyActive = true;
  try { levelUpSound.currentTime = 0; levelUpSound.play().catch(() => {}); } catch (e) {}
  removeUpgradeButton(doubleMoneyUpgradeButton);
}

function purchaseExplosionDurationUpgrade() {
  if (!explosionDurationUpgradeButton) return;
  const cost = Number(explosionDurationUpgradeButton.dataset.cost) || explosionDurationUpgradeCost;
  if (!canBuyUpgrade(cost)) {
    return;
  }
  dinheiro -= cost;
  updateMoneyDisplay();
  explosionDurationMultiplier += 0.5;
  try { levelUpSound.currentTime = 0; levelUpSound.play().catch(() => {}); } catch (e) {}
  updateUpgradeCost(explosionDurationUpgradeButton);
  const newCost = Number(explosionDurationUpgradeButton.dataset.cost) || 0;
  if (newCost > 400) {
    removeUpgradeButton(explosionDurationUpgradeButton);
  }
}

function purchaseCigaretteUpgrade() {
  if (!cigaretteUpgradeButton) return;
  const cost = Number(cigaretteUpgradeButton.dataset.cost) || cigaretteUpgradeCost;
  if (!canBuyUpgrade(cost)) {
    return;
  }
  dinheiro -= cost;
  updateMoneyDisplay();
  isCigaretteActive = true;
  try { levelUpSound.currentTime = 0; levelUpSound.play().catch(() => {}); } catch (e) {}
  removeUpgradeButton(cigaretteUpgradeButton);
  if (cigaretteChanceUpgradeButton) {
    cigaretteChanceUpgradeButton.style.display = '';
  }
}

function purchaseCigaretteChanceUpgrade() {
  if (!cigaretteChanceUpgradeButton) return;
  const cost = Number(cigaretteChanceUpgradeButton.dataset.cost) || cigaretteChanceUpgradeCost;
  if (!canBuyUpgrade(cost)) {
    return;
  }
  dinheiro -= cost;
  updateMoneyDisplay();
  cigaretteChance += 0.3;
  try { levelUpSound.currentTime = 0; levelUpSound.play().catch(() => {}); } catch (e) {}
  removeUpgradeButton(cigaretteChanceUpgradeButton);
}

function removeUpgradeButton(button) {
  if (!button) return;
  button.remove();
}

centerBox.addEventListener('mousemove', event => {
  cursorPosition = { x: event.offsetX, y: event.offsetY };
});

centerBox.addEventListener('mouseleave', () => {
  cursorPosition = null;
});

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function createHitMask(img) {
  if (!img || !img.naturalWidth || !img.naturalHeight) {
    return null;
  }

  const src = img.currentSrc || img.src;
  const cachedMask = hitMaskCache.get(src);
  if (cachedMask) {
    return cachedMask;
  }

  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.drawImage(img, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const mask = new Uint8Array(width * height);

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    mask[index / 4] = alpha > hitMaskAlphaThreshold ? 1 : 0;
  }

  const hitMask = { width, height, mask };
  hitMaskCache.set(src, hitMask);
  return hitMask;
}

function isPointInsideEnemy(enemy, cursorX, cursorY) {
  const hitMask = createHitMask(enemy);
  if (!hitMask) {
    const ex = Number(enemy.dataset.x);
    const ey = Number(enemy.dataset.y);
    const distance = Math.hypot(ex + enemySize / 2 - cursorX, ey + enemySize / 2 - cursorY);
    return distance <= hitRadius;
  }

  const localX = cursorX - Number(enemy.dataset.x);
  const localY = cursorY - Number(enemy.dataset.y);
  const width = enemy.clientWidth || enemySize;
  const height = enemy.clientHeight || enemySize;

  if (localX < 0 || localY < 0 || localX >= width || localY >= height) {
    return false;
  }

  const sampleX = Math.min(Math.max(Math.round((localX / width) * (hitMask.width - 1)), 0), hitMask.width - 1);
  const sampleY = Math.min(Math.max(Math.round((localY / height) * (hitMask.height - 1)), 0), hitMask.height - 1);
  const index = sampleY * hitMask.width + sampleX;
  return hitMask.mask[index] === 1;
}

function getRandomEdgePosition() {
  const edge = randomInt(0, 3);
  const width = centerBox.clientWidth;
  const height = centerBox.clientHeight;
  switch (edge) {
    case 0:
      return { x: -enemySize, y: randomBetween(0, height - enemySize) };
    case 1:
      return { x: width, y: randomBetween(0, height - enemySize) };
    case 2:
      return { x: randomBetween(0, width - enemySize), y: -enemySize };
    default:
      return { x: randomBetween(0, width - enemySize), y: height };
  }
}

function getRandomTargetPosition() {
  const width = centerBox.clientWidth;
  const height = centerBox.clientHeight;
  return {
    x: randomBetween(enemySize, width - enemySize),
    y: randomBetween(enemySize, height - enemySize)
  };
}

function getActiveEnemyCount() {
  return enemyLayer.querySelectorAll('.enemy').length;
}

function spawnEnemy() {
  if (getActiveEnemyCount() >= maxActiveEnemies) {
    return;
  }

  const enemyType = enemyTypes[randomInt(0, enemyTypes.length - 1)];
  const img = document.createElement('img');
  img.src = enemyType.src;
  img.dataset.dinheiro = enemyType.dinheiro;
  img.className = 'enemy';
  img.style.width = `${enemySize}px`;
  img.style.height = `${enemySize}px`;
  img.addEventListener('load', () => createHitMask(img));
  if (img.complete) {
    createHitMask(img);
  }
  const start = getRandomEdgePosition();
  img.dataset.x = start.x;
  img.dataset.y = start.y;
  img.style.transform = `translate(${start.x}px, ${start.y}px)`;
  enemyLayer.appendChild(img);

  const target = getRandomTargetPosition();
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const distance = Math.hypot(dx, dy);
  const speed = randomBetween(speedRange[0], speedRange[1]);
  const duration = Math.max(distance / speed, 0.01);
  const startTime = performance.now();

  function animate(time) {
    const elapsed = (time - startTime) / 1000;
    const progress = Math.min(elapsed / duration, 1);
    const x = start.x + dx * progress;
    const y = start.y + dy * progress;
    img.dataset.x = x;
    img.dataset.y = y;
    img.style.transform = `translate(${x}px, ${y}px)`;
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      const exit = getRandomEdgePosition();
      const exitDx = exit.x - target.x;
      const exitDy = exit.y - target.y;
      const exitDistance = Math.hypot(exitDx, exitDy);
      const exitDuration = Math.max(exitDistance / speed, 0.01);
      const exitStartTime = performance.now();

      function animateExit(time2) {
        const elapsedExit = (time2 - exitStartTime) / 1000;
        const progressExit = Math.min(elapsedExit / exitDuration, 1);
        const x2 = target.x + exitDx * progressExit;
        const y2 = target.y + exitDy * progressExit;
        img.dataset.x = x2;
        img.dataset.y = y2;
        img.style.transform = `translate(${x2}px, ${y2}px)`;
        if (progressExit < 1) {
          requestAnimationFrame(animateExit);
        } else {
          img.remove();
        }
      }
      requestAnimationFrame(animateExit);
    }
  }

  requestAnimationFrame(animate);
}

function checkExplosionCollision(enemy) {
  const ex = Number(enemy.dataset.x) || 0;
  const ey = Number(enemy.dataset.y) || 0;
  const ew = enemy.clientWidth || enemySize;
  const eh = enemy.clientHeight || enemySize;

  for (const explosion of activeExplosions) {
    const distance = Math.hypot((ex + ew / 2) - explosion.x, (ey + eh / 2) - explosion.y);
    if (distance < explosion.radius + hitRadius) {
      const hitMask = createHitMask(enemy);
      if (hitMask) {
        const checkPoints = [];
        const steps = 8;
        for (let i = 0; i < steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          checkPoints.push({
            x: explosion.x + Math.cos(angle) * explosion.radius * 0.7,
            y: explosion.y + Math.sin(angle) * explosion.radius * 0.7
          });
        }
        checkPoints.push({ x: explosion.x, y: explosion.y });

        for (const point of checkPoints) {
          const localX = point.x - ex;
          const localY = point.y - ey;

          if (localX >= 0 && localY >= 0 && localX < ew && localY < eh) {
            const sampleX = Math.min(Math.max(Math.round((localX / ew) * (hitMask.width - 1)), 0), hitMask.width - 1);
            const sampleY = Math.min(Math.max(Math.round((localY / eh) * (hitMask.height - 1)), 0), hitMask.height - 1);
            const index = sampleY * hitMask.width + sampleX;
            if (hitMask.mask[index] === 1) {
              return true;
            }
          }
        }
      } else {
        const distance = Math.hypot((ex + ew / 2) - explosion.x, (ey + eh / 2) - explosion.y);
        if (distance <= hitRadius) {
          return true;
        }
      }
    }
  }
  return false;
}

function destroyEnemy(enemy) {
  const valor = Number(enemy.dataset.dinheiro) || 0;
  addDinheiro(valor);
  const ex = Number(enemy.dataset.x) || 0;
  const ey = Number(enemy.dataset.y) || 0;
  const ew = enemy.clientWidth || enemySize;
  const eh = enemy.clientHeight || enemySize;
  try { createExplosion(ex + ew / 2, ey + eh / 2); } catch (e) {}

  if (isCigaretteActive && Math.random() < cigaretteChance) {
    createProjectile(ex + ew / 2, ey + eh / 2);
  }

  enemy.remove();
  try {
    coinSound.currentTime = 0;
    coinSound.play().catch(() => {});
  } catch (e) {}
  refillEnemies();
}

function hitEnemies() {
  if (!cursorPosition) return;

  const enemies = Array.from(enemyLayer.querySelectorAll('.enemy'));
  enemies.forEach(enemy => {
    if (isPointInsideEnemy(enemy, cursorPosition.x, cursorPosition.y)) {
      destroyEnemy(enemy);
    }
  });
}

function checkExplosionChainReaction() {
  if (activeExplosions.size === 0) {
    requestAnimationFrame(checkExplosionChainReaction);
    return;
  }

  const enemies = Array.from(enemyLayer.querySelectorAll('.enemy'));
  const enemiesToDestroy = [];

  enemies.forEach(enemy => {
    if (checkExplosionCollision(enemy)) {
      enemiesToDestroy.push(enemy);
    }
  });

  enemiesToDestroy.forEach(enemy => {
    destroyEnemy(enemy);
  });

  requestAnimationFrame(checkExplosionChainReaction);
}

let lastTime = performance.now();

function gameLoop(now) {
  const deltaTime = (now - lastTime) / 1000;
  lastTime = now;

  updateProjectiles(deltaTime);
  requestAnimationFrame(gameLoop);
}

function refillEnemies() {
  const active = getActiveEnemyCount();
  const needed = maxActiveEnemies - active;
  for (let i = 0; i < needed; i++) {
    setTimeout(() => {
      if (getActiveEnemyCount() < maxActiveEnemies) {
        spawnEnemy();
      }
    }, i * 120);
  }
}

function spawnWave() {
  refillEnemies();
  setTimeout(spawnWave, 500);
}

function pulseCursor() {
  centerBox.classList.add('pulse-cursor');
  shootSound.currentTime = 0;
  shootSound.play().catch(() => {});
  hitEnemies();
  setTimeout(() => centerBox.classList.remove('pulse-cursor'), 160);
}

function startBackgroundMusic(force = false) {
  if (!bgMusicEnabled) {
    updateMusicButton();
    return;
  }
  if (!bgMusicStarted || force) {
    bgMusicStarted = true;
    bgMusic.currentTime = 0;
    bgMusic.muted = false;
    bgMusic.play().catch(() => {});
  }
  updateMusicButton();
}

function toggleBackgroundMusic() {
  if (!musicToggleButton) return;
  if (bgMusicEnabled) {
    bgMusicEnabled = false;
    bgMusic.muted = true;
  } else {
    bgMusicEnabled = true;
    bgMusic.muted = false;
    startBackgroundMusic(true);
  }
  updateMusicButton();
}

if (pulseUpgradeButton) {
  pulseUpgradeButton.addEventListener('click', purchasePulseUpgrade);
}

if (enemyLimitUpgradeButton) {
  enemyLimitUpgradeButton.addEventListener('click', purchaseEnemyLimitUpgrade);
}

if (doubleMoneyUpgradeButton) {
  doubleMoneyUpgradeButton.addEventListener('click', purchaseDoubleMoneyUpgrade);
}

if (explosionDurationUpgradeButton) {
  explosionDurationUpgradeButton.addEventListener('click', purchaseExplosionDurationUpgrade);
}

if (cigaretteUpgradeButton) {
  cigaretteUpgradeButton.addEventListener('click', purchaseCigaretteUpgrade);
}

if (cigaretteChanceUpgradeButton) {
  cigaretteChanceUpgradeButton.addEventListener('click', purchaseCigaretteChanceUpgrade);
}

if (musicToggleButton) {
  musicToggleButton.addEventListener('click', toggleBackgroundMusic);
}
if (sfxToggleButton) {
  sfxToggleButton.addEventListener('click', toggleSfx);
}

document.addEventListener('pointerdown', () => startBackgroundMusic(true), { once: true });
document.addEventListener('keydown', () => startBackgroundMusic(true), { once: true });

window.addEventListener('load', () => {
  spawnWave();
  pulseCursor();
  startPulseTimer();
  startBackgroundMusic(true);
  updateMusicButton();
  updateSfxState();
  checkExplosionChainReaction();
  gameLoop(performance.now());
});
