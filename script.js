const enemyTypes = [
  { src: 'image/inimigos/Boneco-Azul.gif', dinheiro: 18 },
  { src: 'image/inimigos/Creepy.gif', dinheiro: 20 },
  { src: 'image/inimigos/demon_skeleton.png', dinheiro: 28 },
  { src: 'image/inimigos/Emo.gif', dinheiro: 22 },
  { src: 'image/inimigos/Gato-Rosa.gif', dinheiro: 16 },
  { src: 'image/inimigos/Ghosst.gif', dinheiro: 24 },
  { src: 'image/inimigos/khorneBerzerker.png', dinheiro: 30 },
  { src: 'image/inimigos/Olho.gif', dinheiro: 14 },
  { src: 'image/inimigos/pisilohe10.png', dinheiro: 26 },
  { src: 'image/inimigos/skeleton_elite.png', dinheiro: 32 },
  { src: 'image/inimigos/SmileFace.png', dinheiro: 12 },
  { src: 'image/inimigos/SurpriseFace.png', dinheiro: 15 }
];

const centerBox = document.querySelector('.center-box');
const enemyLayer = document.querySelector('.enemy-layer');
const moneyBox = document.querySelector('.money-box');
const moneyDisplay = document.getElementById('money-display');
const musicToggleButton = document.getElementById('music-toggle');
const pulseUpgradeButton = document.getElementById('pulse-upgrade');
const enemyLimitUpgradeButton = document.getElementById('enemy-limit-upgrade');
const doubleMoneyUpgradeButton = document.getElementById('double-money-upgrade');
const enemySize = 64;
const hitRadius = 90;
const spawnDelayRange = [300, 800];
const enemyCountRange = [1, 3];
const speedRange = [30, 180];
let maxActiveEnemies = 5;
const pulseUpgradeCost = 200;
const enemyLimitUpgradeCost = 50;
const doubleMoneyUpgradeCost = 150;
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
  button.textContent = `${label} - R$ ${newCost}`;
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

function hitEnemies() {
  if (!cursorPosition) return;

  const enemies = Array.from(enemyLayer.querySelectorAll('.enemy'));
  enemies.forEach(enemy => {
    const ex = Number(enemy.dataset.x);
    const ey = Number(enemy.dataset.y);
    const distance = Math.hypot(ex + enemySize / 2 - cursorPosition.x, ey + enemySize / 2 - cursorPosition.y);
    if (distance <= hitRadius) {
      const valor = Number(enemy.dataset.dinheiro) || 0;
      addDinheiro(valor);
      enemy.remove();
      try {
        coinSound.currentTime = 0;
        coinSound.play().catch(() => {});
      } catch (e) {}
      refillEnemies();
    }
  });
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

if (musicToggleButton) {
  musicToggleButton.addEventListener('click', toggleBackgroundMusic);
}

document.addEventListener('pointerdown', () => startBackgroundMusic(true), { once: true });
document.addEventListener('keydown', () => startBackgroundMusic(true), { once: true });

window.addEventListener('load', () => {
  spawnWave();
  pulseCursor();
  startPulseTimer();
  startBackgroundMusic(true);
  updateMusicButton();
});
