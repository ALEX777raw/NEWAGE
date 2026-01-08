// Main site interactions
const displacementMap = document.getElementById('displacement-map');
const contentBlocks = document.querySelectorAll('.content-block');
const layers = document.querySelectorAll('.pulp-layer');
const glow = document.getElementById('glow');
const coordVal = document.getElementById('coord-val');
const stateVal = document.getElementById('state-val');
const velocityVal = document.getElementById('velocity-val');

let currentScroll = window.pageYOffset;
let lastScroll = currentScroll;
let velocity = 0;

// Create fiber decorations (reduced on mobile)
const fiberCount = window.innerWidth < 768 ? 5 : 15;
document.querySelectorAll('section').forEach(section => {
    for (let i = 0; i < fiberCount; i++) {
        const fiber = document.createElement('div');
        fiber.className = 'fiber-block';
        fiber.style.top = Math.random() * 100 + '%';
        fiber.style.left = Math.random() * 100 + '%';
        fiber.style.transform = `rotate(${Math.random() * 360}deg)`;
        fiber.style.width = (Math.random() * 150 + 50) + 'px';
        section.appendChild(fiber);
    }
});

function smoothScroll() {
    currentScroll = window.pageYOffset;
    velocity = currentScroll - lastScroll;
    lastScroll = currentScroll;

    // Elastic Distortion based on scroll velocity
    const distortionScale = Math.min(Math.abs(velocity) * 2, 100);
    displacementMap.setAttribute('scale', distortionScale);

    // Parallax and skew on content blocks (except contact-content)
    contentBlocks.forEach(block => {
        if (block.classList.contains('contact-content')) return;
        const speed = parseFloat(block.getAttribute('data-speed')) || 0;
        const yPos = -(currentScroll * speed);
        const skewVal = velocity * 0.08;
        const rotation = velocity * 0.03;

        block.style.transform = `translate3d(0, ${yPos}px, 0) skewY(${skewVal}deg) rotateX(${rotation}deg)`;
    });

    // Update UI
    velocityVal.innerText = Math.abs(velocity).toFixed(2);

    if (Math.abs(velocity) > 2) {
        document.body.classList.add('is-scrolling');
        stateVal.innerText = 'ДВИЖЕНИЕ_ВОЛНЫ';
        stateVal.style.color = 'var(--pulp-accent)';
    } else {
        document.body.classList.remove('is-scrolling');
        stateVal.innerText = 'СТАТИЧЕСКИЙ_БАЛАНС';
        stateVal.style.color = 'inherit';
    }

    requestAnimationFrame(smoothScroll);
}

requestAnimationFrame(smoothScroll);

// Mouse interaction - parallax on text layers
window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 40;
    const y = (e.clientY / window.innerHeight - 0.5) * 40;

    glow.style.opacity = '0.15';
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';

    coordVal.innerText = `${e.clientX.toFixed(0)} // ${e.clientY.toFixed(0)}`;

    // Parallax Superposition on text layers
    layers.forEach((layer, index) => {
        const depth = (index % 3 + 1) * 0.5;
        const moveX = x * depth;
        const moveY = y * depth;
        layer.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
});

window.addEventListener('mouseleave', () => {
    glow.style.opacity = '0';
    layers.forEach((layer) => {
        layer.style.transform = `translate(0, 0)`;
    });
    stateVal.innerText = 'СТАТИЧЕСКИЙ_БАЛАНС';
    stateVal.style.color = 'inherit';
});

// Click pulse
window.addEventListener('mousedown', () => {
    displacementMap.setAttribute('scale', '50');
    layers.forEach((layer, index) => {
        if (index % 3 === 1) {
            layer.style.transform = `translate(20px, -20px) scale(1.05)`;
            layer.style.opacity = '0.8';
        }
    });
});

window.addEventListener('mouseup', () => {
    displacementMap.setAttribute('scale', '0');
    layers.forEach((layer, index) => {
        if (index % 3 === 1) {
            layer.style.opacity = '0.3';
        }
    });
});

// Portfolio Deep Dive Scroll Effect
const portfolioContainer = document.getElementById('portfolio-container');
const portfolioSticky = document.getElementById('portfolio-sticky');
const portfolioTitle = document.getElementById('portfolio-title');
const slides = document.querySelectorAll('.slide');
const progressDots = document.querySelectorAll('.progress-dot');
const depthVal = document.getElementById('depth-val');
const totalSlides = slides.length;

function updatePortfolio() {
    const containerRect = portfolioContainer.getBoundingClientRect();
    const containerTop = -containerRect.top;
    const containerHeight = portfolioContainer.offsetHeight - window.innerHeight;

    const scrollProgress = Math.max(0, Math.min(1, containerTop / containerHeight));

    if (depthVal) {
        depthVal.innerText = (scrollProgress * 100).toFixed(2);
    }

    if (scrollProgress > 0.05) {
        portfolioTitle.classList.add('hidden');
    } else {
        portfolioTitle.classList.remove('hidden');
    }

    const slideProgress = Math.max(0, (scrollProgress - 0.05) / 0.95);
    const activeSlideIndex = Math.min(
        Math.floor(slideProgress * totalSlides),
        totalSlides - 1
    );

    slides.forEach((slide, index) => {
        slide.classList.remove('active', 'passed');

        if (index === activeSlideIndex && scrollProgress > 0.05) {
            slide.classList.add('active');
        } else if (index < activeSlideIndex) {
            slide.classList.add('passed');
        }
    });

    progressDots.forEach((dot, index) => {
        dot.classList.remove('active');
        if (index === activeSlideIndex && scrollProgress > 0.05) {
            dot.classList.add('active');
        }
    });
}

window.addEventListener('scroll', updatePortfolio);
updatePortfolio();

// Riso Text Reveal Effect
const risoContainer = document.getElementById('riso-container');
const risoTexts = [
    document.getElementById('riso-1'),
    document.getElementById('riso-2'),
    document.getElementById('riso-3'),
    document.getElementById('riso-4')
];
const flashLayer = document.getElementById('flash');
let risoState = 0;

function initRisoText() {
    risoTexts.forEach(textEl => {
        const text = textEl.textContent;
        textEl.innerHTML = '';
        text.split('').forEach((char, i) => {
            const charSpan = document.createElement('span');
            charSpan.className = 'char';
            charSpan.textContent = char === ' ' ? '\u00A0' : char;
            const delay = (i * 0.06) + (Math.random() * 0.15);
            charSpan.style.animationDelay = `${delay}s`;
            textEl.appendChild(charSpan);
        });
    });
}

initRisoText();

function updateRiso() {
    const containerRect = risoContainer.getBoundingClientRect();
    const containerTop = -containerRect.top;
    const containerHeight = risoContainer.offsetHeight - window.innerHeight;

    const scrollProgress = Math.max(0, Math.min(1, containerTop / containerHeight));
    const activeIndex = Math.min(Math.floor(scrollProgress * 4.2), 3);

    if (activeIndex !== risoState && containerTop > 0 && scrollProgress < 1) {
        flashLayer.animate([
            { opacity: 0 },
            { opacity: 0.8 },
            { opacity: 0 }
        ], { duration: 200 });

        risoTexts.forEach((text, i) => {
            if (i !== activeIndex) {
                text.classList.remove('active');
                text.querySelectorAll('.char').forEach(char => {
                    char.style.animation = 'none';
                    char.offsetHeight;
                    char.style.animation = null;
                });
            }
        });

        risoTexts[activeIndex].classList.add('active');
        risoState = activeIndex;
    }
}

window.addEventListener('scroll', updateRiso);

// Hydro Bubbles for MEDUZIA slide
function createBubbles() {
    const bubbleField = document.getElementById('bubbleField');
    if (!bubbleField) return;

    // Reduced bubbles on mobile for performance
    const isMobile = window.innerWidth < 768;
    const bubbleCount = isMobile ? 15 : 40;

    for (let i = 0; i < bubbleCount; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';

        const size = Math.random() * 40 + 5;
        const left = Math.random() * 100;
        const duration = Math.random() * 15 + 10;
        const delay = Math.random() * 20;
        const opacity = Math.random() * 0.4 + 0.1;
        const blur = Math.floor(Math.random() * 4);

        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${left}%`;
        bubble.style.setProperty('--duration', `${duration}s`);
        bubble.style.setProperty('--opacity', opacity);
        bubble.style.animationDelay = `-${delay}s`;
        bubble.style.filter = `blur(${blur}px)`;

        bubbleField.appendChild(bubble);
    }
}

createBubbles();

// Mars Particles for ORBITAL slide
function createMarsParticles() {
    const canvas = document.getElementById('marsCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    // Reduced particles on mobile for performance
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 60 : 180;

    function resize() {
        const container = canvas.parentElement;
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    class MarsParticle {
        constructor() {
            this.init();
        }

        init() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2 + 0.5;
            this.baseSize = this.size;
            this.color = Math.random() > 0.5 ? '#e24329' : '#ff9d6e';
            this.opacity = Math.random() * 0.5 + 0.2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.opacity;
            ctx.fill();

            if (this.size > 2) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.color;
            } else {
                ctx.shadowBlur = 0;
            }
        }
    }

    for (let i = 0; i < particleCount; i++) {
        particles.push(new MarsParticle());
    }

    function animateMars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let grad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.8
        );
        grad.addColorStop(0, '#2d0f0a');
        grad.addColorStop(1, '#0f0504');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        ctx.globalAlpha = 1;
        requestAnimationFrame(animateMars);
    }

    animateMars();
}

createMarsParticles();

// Matrix Filaments for GEOCYPH slide
function createMatrixFilaments() {
    const canvas = document.getElementById('filamentCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let width, height;

    function resize() {
        const container = canvas.parentElement;
        width = canvas.width = container.offsetWidth;
        height = canvas.height = container.offsetHeight;
        initParticles();
    }

    class FilamentParticle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 1.5 + 0.5;
            this.baseX = this.x;
            this.baseY = this.y;
            this.density = (Math.random() * 30) + 1;
        }

        draw() {
            ctx.fillStyle = '#00ff66';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
        }

        update() {
            this.x += Math.sin(Date.now() * 0.001 + this.baseX) * 0.2;
            this.y += Math.cos(Date.now() * 0.001 + this.baseY) * 0.2;
        }
    }

    function initParticles() {
        particles = [];
        // Reduced density on mobile for performance
        const isMobile = width < 768;
        const divisor = isMobile ? 25000 : 12000;
        const numberOfParticles = Math.min((width * height) / divisor, isMobile ? 80 : 200);
        for (let i = 0; i < numberOfParticles; i++) {
            particles.push(new FilamentParticle());
        }
    }

    function connect() {
        // Reduced connection distance on mobile for performance
        const maxDistance = width < 768 ? 80 : 150;
        for (let a = 0; a < particles.length; a++) {
            for (let b = a; b < particles.length; b++) {
                let dx = particles[a].x - particles[b].x;
                let dy = particles[a].y - particles[b].y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < maxDistance) {
                    let opacityValue = 1 - (distance / maxDistance);
                    ctx.strokeStyle = `rgba(0, 255, 102, ${opacityValue * 0.3})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.quadraticCurveTo(
                        (particles[a].x + particles[b].x) / 2 + (Math.random() * 2),
                        (particles[a].y + particles[b].y) / 2 + (Math.random() * 2),
                        particles[b].x,
                        particles[b].y
                    );
                    ctx.stroke();
                }
            }
        }
    }

    function animateMatrix() {
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
        }
        connect();
        requestAnimationFrame(animateMatrix);
    }

    window.addEventListener('resize', resize);
    resize();
    animateMatrix();
}

createMatrixFilaments();

// Observer Lens Iris Tracking for PROTOCOL slide
function initIrisTracking() {
    const iris = document.getElementById('protocolIris');
    if (!iris) return;

    const slide = iris.closest('.slide');

    slide.addEventListener('mousemove', (e) => {
        const rect = slide.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const deltaX = (mouseX - centerX) / centerX;
        const deltaY = (mouseY - centerY) / centerY;

        const maxMove = 15;
        const moveX = deltaX * maxMove;
        const moveY = deltaY * maxMove;

        iris.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });

    slide.addEventListener('mouseleave', () => {
        iris.style.transform = 'translate(0, 0)';
    });
}

initIrisTracking();

// Blueprint Parallax for ЛЕКМАН slide
function initBlueprintParallax() {
    const canvas = document.getElementById('blueprintCanvas');
    if (!canvas) return;

    const grid = canvas.querySelector('.blueprint-grid');
    const circle = canvas.querySelector('.blueprint-circle');
    const slide = canvas.closest('.slide');

    slide.addEventListener('mousemove', (e) => {
        const rect = slide.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        if (grid) {
            grid.style.transform = `translate(${x * -10}px, ${y * -10}px)`;
        }
        if (circle) {
            const currentRotation = circle.style.transform.match(/rotate\(([^)]+)\)/);
            circle.style.transform = `translate(calc(-50% + ${x * 20}px), calc(-50% + ${y * 20}px)) rotate(${currentRotation ? currentRotation[1] : '0deg'})`;
        }
    });

    slide.addEventListener('mouseleave', () => {
        if (grid) {
            grid.style.transform = 'translate(0, 0)';
        }
    });
}

initBlueprintParallax();

// ====== ABYSSAL UI - Underwater Effects ======

// Create floating bubbles
function createBubbles() {
    const bubbleContainer = document.getElementById('heroBubbles');
    if (!bubbleContainer) return;

    const bubbleCount = window.innerWidth < 768 ? 20 : 40;

    for (let i = 0; i < bubbleCount; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';

        const size = Math.random() * 8 + 3;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${Math.random() * 100}%`;
        bubble.style.animationDuration = `${Math.random() * 12 + 6}s`;
        bubble.style.animationDelay = `${Math.random() * 10}s`;

        bubbleContainer.appendChild(bubble);
    }
}

// Underwater parallax effect
function initAbyssalParallax() {
    const heroSection = document.getElementById('section-hero');
    const distortContainer = document.getElementById('heroDistort');
    const heroTitle = document.querySelector('.hero-title-abyssal');

    if (!heroSection || !distortContainer) return;

    heroSection.addEventListener('mousemove', (e) => {
        const x = (window.innerWidth / 2 - e.clientX) / 40;
        const y = (window.innerHeight / 2 - e.clientY) / 40;

        distortContainer.style.transform = `translate(${x}px, ${y}px)`;

        if (heroTitle) {
            heroTitle.style.textShadow = `${x * -2}px ${y * -2}px 80px rgba(79, 249, 255, 0.5)`;
        }
    });

    heroSection.addEventListener('mouseleave', () => {
        distortContainer.style.transform = 'translate(0, 0)';
        if (heroTitle) {
            heroTitle.style.textShadow = '0 0 80px rgba(79, 249, 255, 0.5)';
        }
    });
}

// Depth counter animation
function initDepthCounter() {
    const depthEl = document.getElementById('depth-val');
    const pressureEl = document.getElementById('pressure-val');

    if (!depthEl) return;

    let depth = 10984;
    let pressure = 15750;

    setInterval(() => {
        depth += (Math.random() * 4 - 2);
        depthEl.innerText = `${depth.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})} M`;

        if (pressureEl) {
            pressure += (Math.random() * 2 - 1);
            pressureEl.innerText = `${pressure.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})} PSI`;
        }
    }, 150);
}

// Initialize all abyssal effects
createBubbles();
initAbyssalParallax();
initDepthCounter();
