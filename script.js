const lines = [
  'System ready. Mahmood 98 is loaded.',
  'Open My Computer to browse the desktop files.',
  'Use Start for programs, settings, restart, and shut down.'
];

document.body.classList.add('is-locked');

const bootScreen = document.querySelector('#bootScreen');
const bootPanel = document.querySelector('#bootPanel');
const loginPanel = document.querySelector('#loginPanel');
const progressBar = document.querySelector('#progressBar');
const loginForm = document.querySelector('#loginForm');
const passwordInput = document.querySelector('#passwordInput');
const loginError = document.querySelector('#loginError');
const windows = [...document.querySelectorAll('.window')];
const taskbarButtons = [...document.querySelectorAll('.taskbar a[data-open]')];
const startButton = document.querySelector('#startButton');
const startMenu = document.querySelector('#startMenu');
const powerDialog = document.querySelector('#powerDialog');
let soundsEnabled = true;
let activeWindowId = 'home';
let topZ = 10;

const audioContext = { value: null };
function getAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  audioContext.value ||= new AudioCtx();
  return audioContext.value;
}
function tone(frequency, duration, type = 'square', volume = 0.035, delay = 0) {
  if (!soundsEnabled) return;
  const context = getAudioContext();
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}
function playSound(kind) {
  if (kind === 'welcome') {
    tone(440, .18, 'sine', .025, 0);
    tone(554, .20, 'sine', .023, .18);
    tone(659, .26, 'triangle', .022, .40);
    tone(880, .34, 'sine', .018, .72);
  } else if (kind === 'open') {
    tone(784, .035, 'square', .014, 0);
  } else if (kind === 'close') {
    tone(330, .045, 'square', .014, 0);
  } else if (kind === 'max') {
    tone(587, .04, 'square', .014, 0);
    tone(740, .04, 'square', .012, .04);
  } else if (kind === 'error') {
    tone(185, .12, 'sawtooth', .02, 0);
    tone(147, .12, 'sawtooth', .018, .10);
  } else {
    tone(740, .018, 'square', .011, 0);
  }
}

let bootProgress = 0;
const bootTimer = setInterval(() => {
  bootProgress = Math.min(100, bootProgress + 10);
  progressBar.style.width = `${bootProgress}%`;
  if (bootProgress >= 100) {
    clearInterval(bootTimer);
    setTimeout(() => {
      bootPanel.hidden = true;
      loginPanel.hidden = false;
      passwordInput?.focus();
    }, 360);
  }
}, 150);

function updateTaskbar() {
  taskbarButtons.forEach((button) => {
    const id = button.dataset.open;
    const windowElement = document.getElementById(id);
    button.hidden = !windowElement?.classList.contains('is-open');
    button.classList.toggle('is-task-active', id === activeWindowId);
  });
}
function activateWindow(windowElement, silent = false) {
  if (!windowElement) return;
  windows.forEach((candidate) => candidate.classList.remove('is-active'));
  windowElement.classList.add('is-open', 'is-active');
  windowElement.classList.remove('is-minimized');
  windowElement.style.zIndex = String(++topZ);
  activeWindowId = windowElement.id;
  updateTaskbar();
  if (!silent) playSound('open');
}
function openWindow(id, options = {}) {
  startMenu.hidden = true;
  startButton?.classList.remove('is-open');
  const windowElement = document.getElementById(id);
  if (!windowElement) return;
  activateWindow(windowElement, options.silent);
}
function closeWindow(windowElement) {
  if (!windowElement) return;
  windowElement.classList.remove('is-open', 'is-active', 'is-maximized', 'is-minimized');
  windowElement.style.zIndex = '';
  playSound('close');
  const nextWindow = [...windows].reverse().find((candidate) => candidate.classList.contains('is-open'));
  if (nextWindow) activateWindow(nextWindow, true);
  else { activeWindowId = ''; updateTaskbar(); }
}
function minimizeWindow(windowElement) {
  if (!windowElement) return;
  windowElement.classList.add('is-minimized');
  windowElement.classList.remove('is-active');
  playSound('close');
  const nextWindow = windows.find((candidate) => candidate.classList.contains('is-open') && !candidate.classList.contains('is-minimized'));
  if (nextWindow) activateWindow(nextWindow, true);
  else activeWindowId = '';
  updateTaskbar();
}
function maximizeWindow(windowElement) {
  if (!windowElement) return;
  windowElement.classList.toggle('is-maximized');
  activateWindow(windowElement, true);
  playSound('max');
}


function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function makeWindowInteractive(windowElement) {
  const titlebar = windowElement.querySelector('.titlebar');
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';
  resizeHandle.title = 'Resize';
  windowElement.appendChild(resizeHandle);

  let dragState = null;
  titlebar?.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button') || windowElement.classList.contains('is-maximized')) return;
    activateWindow(windowElement, true);
    const rect = windowElement.getBoundingClientRect();
    windowElement.style.left = `${rect.left}px`;
    windowElement.style.top = `${rect.top}px`;
    windowElement.style.width = `${rect.width}px`;
    windowElement.style.position = 'fixed';
    dragState = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    titlebar.setPointerCapture(event.pointerId);
    windowElement.classList.add('is-dragging');
  });
  titlebar?.addEventListener('pointermove', (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const width = windowElement.offsetWidth;
    const height = windowElement.offsetHeight;
    const left = clamp(event.clientX - dragState.offsetX, -Math.round(width * 0.72), window.innerWidth - 80);
    const top = clamp(event.clientY - dragState.offsetY, -Math.round(height * 0.72), window.innerHeight - 42);
    windowElement.style.left = `${left}px`;
    windowElement.style.top = `${top}px`;
  });
  titlebar?.addEventListener('pointerup', (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    dragState = null;
    windowElement.classList.remove('is-dragging');
    titlebar.releasePointerCapture(event.pointerId);
  });

  let resizeState = null;
  resizeHandle.addEventListener('pointerdown', (event) => {
    activateWindow(windowElement, true);
    const rect = windowElement.getBoundingClientRect();
    windowElement.style.left = `${rect.left}px`;
    windowElement.style.top = `${rect.top}px`;
    windowElement.style.width = `${rect.width}px`;
    windowElement.style.height = `${rect.height}px`;
    windowElement.style.position = 'fixed';
    windowElement.classList.remove('is-maximized');
    resizeState = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startWidth: rect.width, startHeight: rect.height };
    resizeHandle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  resizeHandle.addEventListener('pointermove', (event) => {
    if (!resizeState || resizeState.pointerId !== event.pointerId) return;
    const nextWidth = clamp(resizeState.startWidth + event.clientX - resizeState.startX, 320, Math.max(420, window.innerWidth * 1.4));
    const nextHeight = clamp(resizeState.startHeight + event.clientY - resizeState.startY, 200, Math.max(300, window.innerHeight * 1.25));
    windowElement.style.width = `${nextWidth}px`;
    windowElement.style.height = `${nextHeight}px`;
  });
  resizeHandle.addEventListener('pointerup', (event) => {
    if (!resizeState || resizeState.pointerId !== event.pointerId) return;
    resizeState = null;
    resizeHandle.releasePointerCapture(event.pointerId);
  });
}
windows.forEach(makeWindowInteractive);

loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const password = passwordInput.value.trim().toLowerCase();
  if (password && password !== 'mahmood98' && password !== 'mahmood') {
    loginError.textContent = 'Wrong password. Try mahmood98.';
    playSound('error');
    return;
  }
  loginError.textContent = '';
  bootScreen.classList.add('is-fading');
  setTimeout(() => {
    bootScreen.classList.add('is-hidden');
    document.body.classList.remove('is-locked');
    document.body.classList.add('is-ready');
    openWindow('home', { silent: true });
    playSound('welcome');
  }, 420);
});

document.querySelectorAll('[data-open]').forEach((control) => {
  control.addEventListener('click', (event) => {
    event.preventDefault();
    openWindow(control.dataset.open);
  });
});

windows.forEach((windowElement) => {
  windowElement.addEventListener('pointerdown', () => activateWindow(windowElement, true));
  const buttons = windowElement.querySelectorAll('.window-actions button');
  buttons[0]?.addEventListener('click', (event) => { event.stopPropagation(); minimizeWindow(windowElement); });
  buttons[1]?.addEventListener('click', (event) => { event.stopPropagation(); maximizeWindow(windowElement); });
  buttons[2]?.addEventListener('click', (event) => { event.stopPropagation(); closeWindow(windowElement); });
});

document.querySelectorAll('.btn').forEach((control) => control.addEventListener('click', () => playSound('click')));

startButton?.addEventListener('click', () => {
  startMenu.hidden = !startMenu.hidden;
  startButton.classList.toggle('is-open', !startMenu.hidden);
  playSound('click');
});
document.addEventListener('click', (event) => {
  if (!startMenu || startMenu.hidden) return;
  if (!event.target.closest('#startMenu') && !event.target.closest('#startButton')) {
    startMenu.hidden = true;
    startButton?.classList.remove('is-open');
  }
});

document.querySelectorAll('[data-theme]').forEach((button) => {
  button.addEventListener('click', () => {
    document.body.classList.toggle('theme-forest', button.dataset.theme === 'forest');
    document.body.classList.toggle('theme-mountain', button.dataset.theme === 'mountain');
    playSound('max');
  });
});

document.querySelector('#soundToggle')?.addEventListener('click', () => {
  soundsEnabled = !soundsEnabled;
  document.querySelector('#soundToggle small').textContent = soundsEnabled ? 'Welcome sound and clicks are on' : 'System sounds are off';
  if (soundsEnabled) playSound('welcome');
});

document.querySelectorAll('.folder-pane button[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    document.querySelectorAll('.folder-pane button').forEach((item) => item.classList.toggle('is-selected', item === button));
    document.querySelectorAll('.file-card[data-category]').forEach((card) => {
      card.classList.toggle('is-hidden', filter !== 'all' && card.dataset.category !== filter);
    });
    playSound('click');
  });
});

function showPowerDialog() { powerDialog.hidden = false; playSound('open'); }
function hidePowerDialog() { powerDialog.hidden = true; playSound('close'); }
document.querySelector('#shutdownShortcut')?.addEventListener('click', showPowerDialog);
document.querySelector('#startShutdown')?.addEventListener('click', showPowerDialog);
document.querySelector('#cancelPowerButton')?.addEventListener('click', hidePowerDialog);
document.querySelector('#cancelPowerTop')?.addEventListener('click', hidePowerDialog);
document.querySelector('#turnOffButton')?.addEventListener('click', () => {
  playSound('close');
  setTimeout(() => document.body.classList.add('is-shutdown'), 260);
});
document.querySelector('#restartButton')?.addEventListener('click', () => {
  powerDialog.hidden = true;
  document.body.classList.remove('is-shutdown');
  windows.forEach((windowElement) => windowElement.classList.remove('is-open', 'is-active', 'is-maximized', 'is-minimized'));
  openWindow('home', { silent: true });
  playSound('welcome');
});


const imageViewer = document.querySelector('#imageViewer');
const imageViewerImg = document.querySelector('#imageViewerImg');
const imageViewerTitle = document.querySelector('#imageViewerTitle');
function openImageViewer(src, title = 'Picture') {
  imageViewerImg.src = src;
  imageViewerImg.alt = title;
  imageViewerTitle.textContent = title;
  imageViewer.hidden = false;
  playSound('open');
}
document.querySelectorAll('.media-thumb').forEach((button) => {
  button.addEventListener('click', () => openImageViewer(button.dataset.image, button.dataset.title));
});
document.querySelectorAll('.detail-gallery img, .cv-card-grid img, .hobby-card img').forEach((image) => {
  image.addEventListener('click', (event) => {
    event.stopPropagation();
    openImageViewer(image.getAttribute('src'), image.getAttribute('alt') || 'Picture');
  });
});
document.querySelector('#closeImageViewer')?.addEventListener('click', () => {
  imageViewer.hidden = true;
  imageViewerImg.removeAttribute('src');
  playSound('close');
});
imageViewer?.addEventListener('click', (event) => {
  if (event.target === imageViewer) {
    imageViewer.hidden = true;
    imageViewerImg.removeAttribute('src');
    playSound('close');
  }
});


function playJingle(kind) {
  const patterns = {
    1: [392, 523, 392, 659, 523],
    2: [262, 294, 330, 392, 330],
    3: [330, 330, 392, 330, 262],
    4: [440, 554, 659, 554, 880]
  };
  (patterns[kind] || patterns[1]).forEach((frequency, index) => tone(frequency, .09, index % 2 ? 'triangle' : 'square', .018, index * .095));
}
document.querySelectorAll('.preview-jingle').forEach((button) => {
  button.addEventListener('click', () => playJingle(button.dataset.jingle));
});
document.querySelectorAll('.online-meme').forEach((button) => {
  button.addEventListener('click', () => openImageViewer(button.dataset.image, 'Meme'));
});
document.querySelectorAll('.meme-grid img').forEach((image) => {
  image.addEventListener('click', () => openImageViewer(image.getAttribute('src'), image.getAttribute('alt') || 'Meme'));
});

const typedText = document.querySelector('#typedText');
let lineIndex = 0;
let charIndex = 0;
let deleting = false;
function typeLoop() {
  const line = lines[lineIndex];
  typedText.textContent = line.slice(0, charIndex) + (charIndex % 2 ? '▌' : '');
  if (!deleting && charIndex < line.length) charIndex += 1;
  else if (!deleting && charIndex >= line.length) deleting = true;
  else if (deleting && charIndex > 0) charIndex -= 1;
  else { deleting = false; lineIndex = (lineIndex + 1) % lines.length; }
  setTimeout(typeLoop, deleting ? 32 : charIndex === line.length ? 1300 : 58);
}
typeLoop();

const clock = document.querySelector('#clock');
function updateClock() {
  clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
updateClock();
setInterval(updateClock, 15000);
updateTaskbar();
