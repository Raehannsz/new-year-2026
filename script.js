/**
 * ==========================================
 * New Year 2026 - Fireworks Engine
 * Minimalist Anime Theme + Theme Switcher
 * Realistic Sound Effects & Full Interactivity
 * ==========================================
 */

// ==========================================
// Canvas Setup
// ==========================================

const canvas = document.getElementById('fireworksCanvas');
const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

// Theme Palettes
const THEMES = {
    anime: {
        name: 'Anime',
        colors: ['#ffb7c5', '#ffd1dc', '#b4d7ff', '#ffd700', '#e6e6fa', '#98fb98', '#fffacd', '#ffcba4'],
        bgColor: 'rgba(15, 12, 41, 0.12)',
        bgGradient: 'linear-gradient(180deg, #0f0c29 0%, #1a1a3e 25%, #24243e 50%, #302b63 75%, #0f0c29 100%)'
    },
    cyberpunk: {
        name: 'Cyberpunk',
        colors: ['#ff00ff', '#00ffff', '#bf00ff', '#0080ff', '#ffff00', '#00ff88', '#ff0080', '#8080ff'],
        bgColor: 'rgba(5, 5, 16, 0.12)',
        bgGradient: 'linear-gradient(180deg, #0a0020 0%, #150030 25%, #0a0a2a 50%, #050515 100%)'
    },
    warm: {
        name: 'Festival',
        colors: ['#ff6b35', '#f7c59f', '#efa00b', '#d62828', '#fcbf49', '#ff9770', '#ffd166', '#ff8fa3'],
        bgColor: 'rgba(20, 10, 5, 0.12)',
        bgGradient: 'linear-gradient(180deg, #1a0a00 0%, #2d1810 25%, #1f1010 50%, #0f0505 100%)'
    },
    nature: {
        name: 'Nature',
        colors: ['#a8dadc', '#457b9d', '#90be6d', '#f4a261', '#e9c46a', '#2a9d8f', '#b5e48c', '#76c893'],
        bgColor: 'rgba(10, 20, 15, 0.12)',
        bgGradient: 'linear-gradient(180deg, #0a1510 0%, #102015 25%, #0f1a12 50%, #050a08 100%)'
    }
};

let currentTheme = 'anime';

// Device detection
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
const isLowEnd = isMobile || navigator.hardwareConcurrency <= 4;

// More festive configuration!
const CONFIG = {
    particleCount: isLowEnd ? 35 : 55,      // MORE particles!
    gravity: 0.04,
    friction: 0.975,
    sparkleCount: isLowEnd ? 20 : 35,
    autoFireworkInterval: isLowEnd ? 2500 : 1800,  // Faster auto-launch
    maxFireworks: isLowEnd ? 4 : 6,          // More concurrent!
    maxParticles: isLowEnd ? 200 : 350,      // More particles allowed
    particleDecay: 0.018,
    trailParticles: isLowEnd ? 2 : 4,        // Trail particles
};

// Arrays
let fireworks = [];
let particles = [];
let sparkles = [];

// State
let animationId = null;
let lastTime = 0;
let frameCount = 0;
let canvasWidth = 0;
let canvasHeight = 0;
let dpr = 1;

// ==========================================
// Realistic Sound System (Web Audio API)
// ==========================================

let audioCtx = null;
let soundEnabled = true;
let masterGain = null;

function initAudio() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.5;
        masterGain.connect(audioCtx.destination);
    } catch (e) {
        console.log('Web Audio not supported');
        soundEnabled = false;
    }
}

// Realistic launch sound - whoosh/whistle rising
function playLaunchSound() {
    if (!soundEnabled || !audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    try {
        const now = audioCtx.currentTime;

        // Whoosh noise
        const noiseLength = 0.5;
        const bufferSize = audioCtx.sampleRate * noiseLength;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            data[i] = (Math.random() * 2 - 1) * Math.pow(t, 0.5) * (1 - t);
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        // Bandpass filter for whistle
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.4);
        filter.Q.value = 5;

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + noiseLength);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        noise.start(now);

        // Add whistle tone
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35);

        const oscGain = audioCtx.createGain();
        oscGain.gain.setValueAtTime(0.05, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(oscGain);
        oscGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.4);
    } catch (e) { }
}

// Realistic explosion - layered boom + crackle
function playExplosionSound() {
    if (!soundEnabled || !audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    try {
        const now = audioCtx.currentTime;

        // 1. Deep boom
        const boomLength = 0.4;
        const boomBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * boomLength, audioCtx.sampleRate);
        const boomData = boomBuffer.getChannelData(0);

        for (let i = 0; i < boomData.length; i++) {
            const t = i / boomData.length;
            boomData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.5);
        }

        const boom = audioCtx.createBufferSource();
        boom.buffer = boomBuffer;

        const boomFilter = audioCtx.createBiquadFilter();
        boomFilter.type = 'lowpass';
        boomFilter.frequency.value = 200;

        const boomGain = audioCtx.createGain();
        boomGain.gain.setValueAtTime(0.4, now);
        boomGain.gain.exponentialRampToValueAtTime(0.01, now + boomLength);

        boom.connect(boomFilter);
        boomFilter.connect(boomGain);
        boomGain.connect(masterGain);
        boom.start(now);

        // 2. Mid-range pop
        const popLength = 0.25;
        const popBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * popLength, audioCtx.sampleRate);
        const popData = popBuffer.getChannelData(0);

        for (let i = 0; i < popData.length; i++) {
            const t = i / popData.length;
            popData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2);
        }

        const pop = audioCtx.createBufferSource();
        pop.buffer = popBuffer;

        const popFilter = audioCtx.createBiquadFilter();
        popFilter.type = 'bandpass';
        popFilter.frequency.value = 800;
        popFilter.Q.value = 1;

        const popGain = audioCtx.createGain();
        popGain.gain.setValueAtTime(0.25, now);
        popGain.gain.exponentialRampToValueAtTime(0.01, now + popLength);

        pop.connect(popFilter);
        popFilter.connect(popGain);
        popGain.connect(masterGain);
        pop.start(now);

        // 3. High crackle
        const crackleLength = 0.6;
        const crackleBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * crackleLength, audioCtx.sampleRate);
        const crackleData = crackleBuffer.getChannelData(0);

        for (let i = 0; i < crackleData.length; i++) {
            const t = i / crackleData.length;
            // Sporadic crackles
            if (Math.random() < 0.03) {
                crackleData[i] = (Math.random() * 2 - 1) * (1 - t) * 0.5;
            } else {
                crackleData[i] = (Math.random() * 2 - 1) * 0.05 * (1 - t);
            }
        }

        const crackle = audioCtx.createBufferSource();
        crackle.buffer = crackleBuffer;

        const crackleFilter = audioCtx.createBiquadFilter();
        crackleFilter.type = 'highpass';
        crackleFilter.frequency.value = 2000;

        const crackleGain = audioCtx.createGain();
        crackleGain.gain.setValueAtTime(0.2, now + 0.05);
        crackleGain.gain.exponentialRampToValueAtTime(0.01, now + crackleLength);

        crackle.connect(crackleFilter);
        crackleFilter.connect(crackleGain);
        crackleGain.connect(masterGain);
        crackle.start(now + 0.03);

    } catch (e) { }
}

// Sparkle sound - multiple tiny pops
function playSparkleSound() {
    if (!soundEnabled || !audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    try {
        const now = audioCtx.currentTime;

        // Quick high-pitched ting
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 1500 + Math.random() * 1000;

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.1);
    } catch (e) { }
}

// ==========================================
// UI Controls
// ==========================================

function createControls() {
    // Container
    const controls = document.createElement('div');
    controls.style.cssText = `
        position: fixed;
        top: 15px;
        right: 15px;
        z-index: 100;
        display: flex;
        gap: 10px;
    `;

    // Sound toggle
    const soundBtn = document.createElement('button');
    soundBtn.className = 'control-btn';
    soundBtn.innerHTML = '🔊';
    soundBtn.setAttribute('aria-label', 'Toggle sound');
    soundBtn.onclick = (e) => {
        e.stopPropagation();
        soundEnabled = !soundEnabled;
        soundBtn.innerHTML = soundEnabled ? '🔊' : '🔇';
        if (soundEnabled && !audioCtx) initAudio();
    };

    // Theme toggle
    const themeBtn = document.createElement('button');
    themeBtn.className = 'control-btn';
    themeBtn.innerHTML = '🎨';
    themeBtn.setAttribute('aria-label', 'Change theme');
    themeBtn.onclick = (e) => {
        e.stopPropagation();
        cycleTheme();
    };

    controls.appendChild(soundBtn);
    controls.appendChild(themeBtn);
    document.body.appendChild(controls);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .control-btn {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 50%;
            width: 45px;
            height: 45px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 1.2rem;
            transition: transform 0.2s, background 0.2s;
        }
        .control-btn:hover {
            transform: scale(1.1);
            background: rgba(255,255,255,0.2);
        }
        .control-btn:active {
            transform: scale(0.95);
        }
        .theme-toast {
            position: fixed;
            top: 70px;
            right: 15px;
            background: rgba(255,255,255,0.15);
            backdrop-filter: blur(10px);
            padding: 10px 20px;
            border-radius: 20px;
            color: white;
            font-size: 0.85rem;
            z-index: 101;
            animation: fadeInOut 2s ease forwards;
        }
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-10px); }
            15% { opacity: 1; transform: translateY(0); }
            85% { opacity: 1; }
            100% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

function cycleTheme() {
    const themes = Object.keys(THEMES);
    const idx = themes.indexOf(currentTheme);
    currentTheme = themes[(idx + 1) % themes.length];

    // Apply background
    document.body.style.background = THEMES[currentTheme].bgGradient;

    // Show toast
    const toast = document.createElement('div');
    toast.className = 'theme-toast';
    toast.textContent = `Theme: ${THEMES[currentTheme].name}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ==========================================
// Utility Functions
// ==========================================

const random = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => (Math.random() * (max - min) + min) | 0;
const getRandomColor = () => THEMES[currentTheme].colors[randomInt(0, THEMES[currentTheme].colors.length)];

// Pre-compute all RGB values
const RGB = {};
Object.values(THEMES).forEach(t => {
    t.colors.forEach(hex => {
        if (!RGB[hex]) {
            RGB[hex] = {
                r: parseInt(hex.slice(1, 3), 16),
                g: parseInt(hex.slice(3, 5), 16),
                b: parseInt(hex.slice(5, 7), 16)
            };
        }
    });
});
RGB['#ffffff'] = { r: 255, g: 255, b: 255 };

const toRgba = (hex, a) => {
    const c = RGB[hex] || RGB['#ffffff'];
    return `rgba(${c.r},${c.g},${c.b},${a})`;
};

const resizeCanvas = () => {
    dpr = Math.min(window.devicePixelRatio || 1, isLowEnd ? 1 : 1.5);
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

// ==========================================
// Sparkle Class
// ==========================================

class Sparkle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = random(0, canvasWidth);
        this.y = random(0, canvasHeight * 0.8);
        this.size = random(0.5, 2);
        this.alpha = random(0.2, 0.7);
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

// ==========================================
// Trail Particle (for launch effect)
// ==========================================

class TrailParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.alpha = 0.8;
        this.size = random(1, 2.5);
        this.decay = 0.04;
    }

    update() {
        this.alpha -= this.decay;
    }

    draw() {
        if (this.alpha <= 0) return;
        ctx.fillStyle = toRgba(this.color, this.alpha);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    isDead() {
        return this.alpha <= 0;
    }
}

// ==========================================
// Firework Class (More festive!)
// ==========================================

class Firework {
    constructor(startX, startY, targetX, targetY) {
        this.x = startX;
        this.y = startY;
        this.targetY = targetY;
        this.targetX = targetX;
        this.color = getRandomColor();
        this.secondaryColor = getRandomColor();

        const angle = Math.atan2(targetY - startY, targetX - startX);
        const speed = random(12, 16);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.exploded = false;
        this.trailTimer = 0;

        playLaunchSound();
    }

    update() {
        // Leave trail particles
        this.trailTimer++;
        if (this.trailTimer % 2 === 0) {
            particles.push(new TrailParticle(this.x, this.y, this.color));
        }

        this.x += this.vx;
        this.y += this.vy;
        this.vy += CONFIG.gravity;

        if (this.vy >= 0 || this.y <= this.targetY) {
            this.explode();
        }
    }

    draw() {
        // Glow effect
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    explode() {
        this.exploded = true;
        playExplosionSound();

        const available = CONFIG.maxParticles - particles.length;
        if (available <= 10) return;

        const count = Math.min(CONFIG.particleCount, available);
        const x = this.x;
        const y = this.y;

        // Main explosion ring
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + random(-0.1, 0.1);
            const speed = random(2, 5);
            const color = i % 3 === 0 ? this.secondaryColor : this.color;
            particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color));
        }

        // Inner burst
        const innerCount = Math.floor(count * 0.4);
        for (let i = 0; i < innerCount; i++) {
            const angle = random(0, Math.PI * 2);
            const speed = random(0.5, 2.5);
            particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#ffffff'));
        }

        // Sparkle effects
        setTimeout(() => playSparkleSound(), 50);
        setTimeout(() => playSparkleSound(), 120);
    }
}

// ==========================================
// Particle Class (Enhanced)
// ==========================================

class Particle {
    constructor(x, y, vx, vy, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.alpha = 1;
        this.decay = random(CONFIG.particleDecay, CONFIG.particleDecay + 0.01);
        this.size = random(1.5, 3.5);
        this.sparkle = Math.random() > 0.7;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += CONFIG.gravity;
        this.vx *= CONFIG.friction;
        this.vy *= CONFIG.friction;
        this.alpha -= this.decay;

        // Sparkle effect
        if (this.sparkle && Math.random() > 0.9) {
            this.alpha = Math.min(1, this.alpha + 0.1);
        }
    }

    draw() {
        if (this.alpha <= 0.02) return;

        const size = this.size * Math.max(0.3, this.alpha);

        ctx.save();
        if (this.sparkle) {
            ctx.shadowBlur = 5;
            ctx.shadowColor = this.color;
        }
        ctx.fillStyle = toRgba(this.color, this.alpha);
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.alpha <= 0.02;
    }
}

// ==========================================
// Initialization
// ==========================================

function init() {
    resizeCanvas();
    createControls();

    sparkles = [];
    for (let i = 0; i < CONFIG.sparkleCount; i++) {
        sparkles.push(new Sparkle());
    }

    lastTime = performance.now();
    animate();

    setInterval(autoLaunchFirework, CONFIG.autoFireworkInterval);

    // Initial burst
    setTimeout(() => {
        launchRandomFirework();
        setTimeout(() => launchRandomFirework(), 300);
    }, 500);
}

// ==========================================
// Launch Functions
// ==========================================

function launchFirework(targetX, targetY) {
    if (fireworks.length >= CONFIG.maxFireworks) return;

    const startX = random(canvasWidth * 0.15, canvasWidth * 0.85);
    const startY = canvasHeight + 10;
    fireworks.push(new Firework(startX, startY, targetX, targetY));
}

function launchRandomFirework() {
    const targetX = random(canvasWidth * 0.1, canvasWidth * 0.9);
    const targetY = random(canvasHeight * 0.1, canvasHeight * 0.4);
    launchFirework(targetX, targetY);
}

function autoLaunchFirework() {
    if (particles.length < CONFIG.maxParticles * 0.6) {
        launchRandomFirework();
        // Sometimes double launch for more festivity
        if (Math.random() > 0.6) {
            setTimeout(() => launchRandomFirework(), 200);
        }
    }
}

// ==========================================
// Animation Loop
// ==========================================

function animate(currentTime = 0) {
    animationId = requestAnimationFrame(animate);

    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    if (deltaTime > 100) return;

    frameCount++;
    if (isLowEnd && frameCount % 2 !== 0) return;

    // Clear with theme color
    ctx.fillStyle = THEMES[currentTheme].bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Sparkles
    for (let i = 0; i < sparkles.length; i++) {
        sparkles[i].update();
        sparkles[i].draw();
    }

    // Fireworks
    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].draw();
        if (fireworks[i].exploded) {
            fireworks.splice(i, 1);
        }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.isDead()) {
            particles[i] = particles[particles.length - 1];
            particles.pop();
        }
    }
}

// ==========================================
// Interactivity - Each click = 1 firework!
// ==========================================

let lastClick = 0;
const CLICK_THROTTLE = 80; // Faster response

function handleClick(e) {
    e.preventDefault();

    // Initialize audio on first interaction
    if (!audioCtx) initAudio();

    const now = performance.now();
    if (now - lastClick < CLICK_THROTTLE) return;
    lastClick = now;

    let x, y;
    if (e.touches) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
    } else {
        x = e.clientX;
        y = e.clientY;
    }

    // Each click = 1 firework, no limit check (just max queue)
    const targetY = Math.min(y * 0.7, canvasHeight * 0.45);

    // Force launch even if at max (replace oldest)
    if (fireworks.length >= CONFIG.maxFireworks) {
        fireworks.shift();
    }

    const startX = random(canvasWidth * 0.2, canvasWidth * 0.8);
    fireworks.push(new Firework(startX, canvasHeight + 10, x, targetY));
}

// Swipe support for multi-firework
let touchStart = { x: 0, y: 0, time: 0 };

function handleTouchStart(e) {
    if (!audioCtx) initAudio();
    touchStart.x = e.touches[0].clientX;
    touchStart.y = e.touches[0].clientY;
    touchStart.time = performance.now();
}

function handleTouchEnd(e) {
    const now = performance.now();
    if (now - lastClick < CLICK_THROTTLE) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = now - touchStart.time;

    if (dist > 60 && duration < 500) {
        // Swipe = multiple fireworks
        lastClick = now;
        const steps = Math.min(4, Math.ceil(dist / 60));
        for (let i = 0; i <= steps; i++) {
            const px = touchStart.x + (dx / steps) * i;
            const py = touchStart.y + (dy / steps) * i;
            setTimeout(() => {
                const targetY = Math.min(py * 0.65, canvasHeight * 0.4);
                if (fireworks.length >= CONFIG.maxFireworks) fireworks.shift();
                fireworks.push(new Firework(random(canvasWidth * 0.2, canvasWidth * 0.8), canvasHeight + 10, px, targetY));
            }, i * 80);
        }
    } else {
        // Normal tap
        handleClick(e);
    }
}

// Event listeners
document.addEventListener('click', handleClick);
document.addEventListener('touchstart', handleTouchStart, { passive: false });
document.addEventListener('touchend', handleTouchEnd, { passive: false });

// Resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        resizeCanvas();
        sparkles.forEach(s => s.reset());
    }, 150);
});

// ==========================================
// Countdown Timer
// ==========================================

const countdownEls = {};

function cacheElements() {
    countdownEls.container = document.getElementById('countdownContainer');
    countdownEls.days = document.getElementById('days');
    countdownEls.hours = document.getElementById('hours');
    countdownEls.minutes = document.getElementById('minutes');
    countdownEls.seconds = document.getElementById('seconds');
}

function updateCountdown() {
    const target = new Date('January 1, 2026 00:00:00').getTime();
    const diff = target - Date.now();

    if (diff < 0) {
        if (countdownEls.container) {
            countdownEls.container.innerHTML = `
                <h2 class="countdown-title" style="color: #ffb7c5;">
                    🎆 Happy New Year 2026! 🎆
                </h2>
            `;
        }
        // BIG celebration!
        for (let i = 0; i < 10; i++) {
            setTimeout(() => launchRandomFirework(), i * 150);
        }
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

// ==========================================
// Visibility API
// ==========================================

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        particles = [];
        fireworks = [];
    } else {
        if (!animationId) {
            lastTime = performance.now();
            animate();
        }
    }
});

// ==========================================
// Initialize
// ==========================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        cacheElements();
        init();
        updateCountdown();
        setInterval(updateCountdown, 1000);
    });
} else {
    cacheElements();
    init();
    updateCountdown();
    setInterval(updateCountdown, 1000);
}
