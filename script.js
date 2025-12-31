/**
 * New Year 2026 - Fireworks Engine
 * Mobile-Optimized with Theme Switcher
 */

const canvas = document.getElementById('fireworksCanvas');
const ctx = canvas.getContext('2d', { alpha: true });

// Themes
const THEMES = {
    anime: {
        name: 'Anime',
        colors: ['#ffb7c5', '#ffd1dc', '#b4d7ff', '#ffd700', '#e6e6fa', '#98fb98', '#fffacd', '#ffcba4'],
        bgColor: 'rgba(15, 12, 41, 0.12)',
        bg: 'linear-gradient(180deg, #0f0c29 0%, #1a1a3e 25%, #24243e 50%, #302b63 75%, #0f0c29 100%)'
    },
    cyberpunk: {
        name: 'Cyberpunk',
        colors: ['#ff00ff', '#00ffff', '#bf00ff', '#0080ff', '#ffff00', '#00ff88', '#ff0080', '#8080ff'],
        bgColor: 'rgba(5, 5, 16, 0.12)',
        bg: 'linear-gradient(180deg, #0a0020 0%, #150030 25%, #0a0a2a 50%, #050515 100%)'
    },
    warm: {
        name: 'Festival',
        colors: ['#ff6b35', '#f7c59f', '#efa00b', '#d62828', '#fcbf49', '#ff9770', '#ffd166', '#ff8fa3'],
        bgColor: 'rgba(20, 10, 5, 0.12)',
        bg: 'linear-gradient(180deg, #1a0a00 0%, #2d1810 25%, #1f1010 50%, #0f0505 100%)'
    },
    nature: {
        name: 'Nature',
        colors: ['#a8dadc', '#457b9d', '#90be6d', '#f4a261', '#e9c46a', '#2a9d8f', '#b5e48c', '#76c893'],
        bgColor: 'rgba(10, 20, 15, 0.12)',
        bg: 'linear-gradient(180deg, #0a1510 0%, #102015 25%, #0f1a12 50%, #050a08 100%)'
    }
};

let currentTheme = 'anime';
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;

const CONFIG = {
    particleCount: isMobile ? 30 : 50,
    gravity: 0.04,
    friction: 0.975,
    sparkleCount: isMobile ? 15 : 30,
    autoFireworkInterval: isMobile ? 2800 : 2000,
    maxFireworks: isMobile ? 3 : 5,
    maxParticles: isMobile ? 180 : 300,
    particleDecay: 0.02,
};

let fireworks = [];
let particles = [];
let sparkles = [];
let animationId = null;
let lastTime = 0;
let canvasWidth = 0;
let canvasHeight = 0;

// Audio
let audioCtx = null;
let soundEnabled = true;
let masterGain = null;

function initAudio() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.4;
        masterGain.connect(audioCtx.destination);
    } catch (e) {
        soundEnabled = false;
    }
}

function playLaunch() {
    if (!soundEnabled || !audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    try {
        const now = audioCtx.currentTime;
        const len = 0.4;
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * len, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / data.length;
            data[i] = (Math.random() * 2 - 1) * Math.pow(t, 0.5) * (1 - t);
        }
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(1800, now + 0.35);
        filter.Q.value = 4;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + len);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        src.start(now);
    } catch (e) { }
}

function playBoom() {
    if (!soundEnabled || !audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    try {
        const now = audioCtx.currentTime;
        // Boom
        const boomLen = 0.35;
        const boomBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * boomLen, audioCtx.sampleRate);
        const boomData = boomBuf.getChannelData(0);
        for (let i = 0; i < boomData.length; i++) {
            boomData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / boomData.length, 1.5);
        }
        const boom = audioCtx.createBufferSource();
        boom.buffer = boomBuf;
        const boomFilter = audioCtx.createBiquadFilter();
        boomFilter.type = 'lowpass';
        boomFilter.frequency.value = 250;
        const boomGain = audioCtx.createGain();
        boomGain.gain.setValueAtTime(0.35, now);
        boomGain.gain.exponentialRampToValueAtTime(0.01, now + boomLen);
        boom.connect(boomFilter);
        boomFilter.connect(boomGain);
        boomGain.connect(masterGain);
        boom.start(now);
        // Crackle
        const crackLen = 0.5;
        const crackBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * crackLen, audioCtx.sampleRate);
        const crackData = crackBuf.getChannelData(0);
        for (let i = 0; i < crackData.length; i++) {
            const t = i / crackData.length;
            crackData[i] = Math.random() < 0.04 ? (Math.random() * 2 - 1) * (1 - t) * 0.4 : (Math.random() * 2 - 1) * 0.03 * (1 - t);
        }
        const crack = audioCtx.createBufferSource();
        crack.buffer = crackBuf;
        const crackFilter = audioCtx.createBiquadFilter();
        crackFilter.type = 'highpass';
        crackFilter.frequency.value = 1500;
        const crackGain = audioCtx.createGain();
        crackGain.gain.setValueAtTime(0.15, now + 0.03);
        crackGain.gain.exponentialRampToValueAtTime(0.01, now + crackLen);
        crack.connect(crackFilter);
        crackFilter.connect(crackGain);
        crackGain.connect(masterGain);
        crack.start(now + 0.02);
    } catch (e) { }
}

// UI Controls
function createControls() {
    const controls = document.createElement('div');
    controls.className = 'controls';

    const soundBtn = document.createElement('button');
    soundBtn.className = 'control-btn';
    soundBtn.id = 'soundBtn';
    soundBtn.innerHTML = 'S';
    soundBtn.setAttribute('aria-label', 'Toggle sound');

    const themeBtn = document.createElement('button');
    themeBtn.className = 'control-btn';
    themeBtn.id = 'themeBtn';
    themeBtn.innerHTML = 'T';
    themeBtn.setAttribute('aria-label', 'Change theme');

    controls.appendChild(soundBtn);
    controls.appendChild(themeBtn);
    document.body.appendChild(controls);

    // Use both click and touchend for mobile
    function toggleSound(e) {
        e.preventDefault();
        e.stopPropagation();
        soundEnabled = !soundEnabled;
        soundBtn.innerHTML = soundEnabled ? 'S' : 'X';
        soundBtn.style.opacity = soundEnabled ? '1' : '0.5';
        if (soundEnabled && !audioCtx) initAudio();
    }

    function toggleTheme(e) {
        e.preventDefault();
        e.stopPropagation();
        const themes = Object.keys(THEMES);
        const idx = themes.indexOf(currentTheme);
        currentTheme = themes[(idx + 1) % themes.length];
        document.body.style.background = THEMES[currentTheme].bg;
        showToast('Theme: ' + THEMES[currentTheme].name);
    }

    soundBtn.addEventListener('click', toggleSound);
    soundBtn.addEventListener('touchend', toggleSound);
    themeBtn.addEventListener('click', toggleTheme);
    themeBtn.addEventListener('touchend', toggleTheme);
}

function showToast(msg) {
    const existing = document.querySelector('.theme-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'theme-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// Utils
const random = (a, b) => Math.random() * (b - a) + a;
const getColor = () => THEMES[currentTheme].colors[Math.floor(Math.random() * THEMES[currentTheme].colors.length)];

const RGB = {};
Object.values(THEMES).forEach(t => {
    t.colors.forEach(hex => {
        if (!RGB[hex]) RGB[hex] = { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) };
    });
});
RGB['#ffffff'] = { r: 255, g: 255, b: 255 };

const rgba = (hex, a) => { const c = RGB[hex] || RGB['#ffffff']; return `rgba(${c.r},${c.g},${c.b},${a})`; };

function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.5);
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// Sparkle
class Sparkle {
    constructor() { this.reset(); }
    reset() {
        this.x = random(0, canvasWidth);
        this.y = random(0, canvasHeight * 0.8);
        this.size = random(0.5, 1.5);
        this.alpha = random(0.2, 0.6);
        this.speed = random(0.01, 0.02);
        this.dir = Math.random() > 0.5 ? 1 : -1;
    }
    update() {
        this.alpha += this.speed * this.dir;
        if (this.alpha >= 0.8 || this.alpha <= 0.1) this.dir *= -1;
    }
    draw() {
        ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Firework
class Firework {
    constructor(sx, sy, tx, ty) {
        this.x = sx; this.y = sy;
        this.tx = tx; this.ty = ty;
        this.color = getColor();
        this.color2 = getColor();
        const angle = Math.atan2(ty - sy, tx - sx);
        const speed = random(12, 15);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.exploded = false;
        this.trail = 0;
        playLaunch();
    }
    update() {
        this.trail++;
        if (this.trail % 3 === 0) particles.push(new Trail(this.x, this.y, this.color));
        this.x += this.vx;
        this.y += this.vy;
        this.vy += CONFIG.gravity;
        if (this.vy >= 0 || this.y <= this.ty) this.explode();
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    explode() {
        this.exploded = true;
        playBoom();
        const avail = CONFIG.maxParticles - particles.length;
        if (avail < 10) return;
        const count = Math.min(CONFIG.particleCount, avail);
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + random(-0.1, 0.1);
            const speed = random(2, 5);
            const color = i % 3 === 0 ? this.color2 : this.color;
            particles.push(new Particle(this.x, this.y, Math.cos(angle) * speed, Math.sin(angle) * speed, color));
        }
        for (let i = 0; i < 8; i++) {
            const angle = random(0, Math.PI * 2);
            particles.push(new Particle(this.x, this.y, Math.cos(angle) * random(0.5, 2), Math.sin(angle) * random(0.5, 2), '#ffffff'));
        }
    }
}

// Trail
class Trail {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.color = color;
        this.alpha = 0.6;
        this.size = random(1, 2);
    }
    update() { this.alpha -= 0.05; }
    draw() {
        if (this.alpha <= 0) return;
        ctx.fillStyle = rgba(this.color, this.alpha);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
    isDead() { return this.alpha <= 0; }
}

// Particle
class Particle {
    constructor(x, y, vx, vy, color) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.color = color;
        this.alpha = 1;
        this.decay = random(CONFIG.particleDecay, CONFIG.particleDecay + 0.01);
        this.size = random(1.5, 3);
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += CONFIG.gravity;
        this.vx *= CONFIG.friction;
        this.vy *= CONFIG.friction;
        this.alpha -= this.decay;
    }
    draw() {
        if (this.alpha <= 0.02) return;
        ctx.fillStyle = rgba(this.color, this.alpha);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.alpha, 0, Math.PI * 2);
        ctx.fill();
    }
    isDead() { return this.alpha <= 0.02; }
}

// Init
function init() {
    resize();
    createControls();
    sparkles = [];
    for (let i = 0; i < CONFIG.sparkleCount; i++) sparkles.push(new Sparkle());
    lastTime = performance.now();
    animate();
    setInterval(autoLaunch, CONFIG.autoFireworkInterval);
    setTimeout(() => launch(random(canvasWidth * 0.2, canvasWidth * 0.8), canvasHeight * 0.3), 500);
}

function launch(tx, ty) {
    if (fireworks.length >= CONFIG.maxFireworks) fireworks.shift();
    fireworks.push(new Firework(random(canvasWidth * 0.2, canvasWidth * 0.8), canvasHeight + 10, tx, ty));
}

function autoLaunch() {
    if (particles.length < CONFIG.maxParticles * 0.6) {
        launch(random(canvasWidth * 0.1, canvasWidth * 0.9), random(canvasHeight * 0.1, canvasHeight * 0.4));
        if (Math.random() > 0.6) setTimeout(() => launch(random(canvasWidth * 0.1, canvasWidth * 0.9), random(canvasHeight * 0.1, canvasHeight * 0.4)), 200);
    }
}

function animate(now = 0) {
    animationId = requestAnimationFrame(animate);
    const dt = now - lastTime;
    lastTime = now;
    if (dt > 100) return;

    ctx.fillStyle = THEMES[currentTheme].bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    for (let s of sparkles) { s.update(); s.draw(); }

    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].draw();
        if (fireworks[i].exploded) fireworks.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].isDead()) {
            particles[i] = particles[particles.length - 1];
            particles.pop();
        }
    }
}

// Interaction - fixed for mobile
let lastTap = 0;

function handleTap(e) {
    e.preventDefault();
    if (!audioCtx) initAudio();

    const now = Date.now();
    if (now - lastTap < 100) return;
    lastTap = now;

    let x, y;
    if (e.changedTouches && e.changedTouches.length > 0) {
        x = e.changedTouches[0].clientX;
        y = e.changedTouches[0].clientY;
    } else if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
    } else {
        x = e.clientX;
        y = e.clientY;
    }

    const ty = Math.min(y * 0.7, canvasHeight * 0.45);
    launch(x, ty);
}

// Event listeners on body, not document
document.body.addEventListener('click', handleTap);
document.body.addEventListener('touchstart', (e) => { if (!audioCtx) initAudio(); }, { passive: true });
document.body.addEventListener('touchend', handleTap, { passive: false });

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); sparkles.forEach(s => s.reset()); }, 150);
});

// Countdown
const countdownEls = {};
function cacheEls() {
    countdownEls.container = document.getElementById('countdownContainer');
    countdownEls.days = document.getElementById('days');
    countdownEls.hours = document.getElementById('hours');
    countdownEls.minutes = document.getElementById('minutes');
    countdownEls.seconds = document.getElementById('seconds');
}

function updateCountdown() {
    const diff = new Date('January 1, 2026 00:00:00').getTime() - Date.now();
    if (diff < 0) {
        if (countdownEls.container) countdownEls.container.innerHTML = '<h2 class="countdown-title">Happy New Year 2026!</h2>';
        for (let i = 0; i < 8; i++) setTimeout(() => autoLaunch(), i * 150);
        return;
    }
    const d = (diff / 86400000) | 0;
    const h = ((diff % 86400000) / 3600000) | 0;
    const m = ((diff % 3600000) / 60000) | 0;
    const s = ((diff % 60000) / 1000) | 0;
    if (countdownEls.days) countdownEls.days.textContent = d < 10 ? '0' + d : d;
    if (countdownEls.hours) countdownEls.hours.textContent = h < 10 ? '0' + h : h;
    if (countdownEls.minutes) countdownEls.minutes.textContent = m < 10 ? '0' + m : m;
    if (countdownEls.seconds) countdownEls.seconds.textContent = s < 10 ? '0' + s : s;
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(animationId); animationId = null; particles = []; fireworks = []; }
    else if (!animationId) { lastTime = performance.now(); animate(); }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { cacheEls(); init(); updateCountdown(); setInterval(updateCountdown, 1000); });
} else {
    cacheEls(); init(); updateCountdown(); setInterval(updateCountdown, 1000);
}
