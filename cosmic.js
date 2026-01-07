/**
 * COSMIC CONTACT - Bioluminescent particle text effect
 */

(function() {
    'use strict';

    const section = document.getElementById('section-contact');
    const container = document.getElementById('cosmos-container');
    const glow = document.getElementById('glow');
    if (!section || !container) return;

    const TEXT = 'КОНТАКТЫ';

    const config = {
        particleCount: 15000,
        spacing: 3,
        mouseRadius: 150,
        returnSpeed: 0.08,
        friction: 0.92,
        drift: 0.015
    };

    let canvas, ctx;
    let width, height;
    let particles = [];
    let stars = [];
    let textPixels = [];
    let cosmosPositions = [];
    let scrollProgress = 0;
    let mouse = { x: -1000, y: -1000 };
    let bgTransitionProgress = 0; // 0 = black bg/white stars, 1 = white bg/black stars
    let rocketSpeedEffect = 0; // 0 = no speed, 1 = max speed (stars stretch)
    let targetSpeedEffect = 0; // Target value for smooth interpolation
    let isScrolling = false; // Track if user is currently scrolling
    let scrollTimeout = null; // Timeout for detecting scroll stop
    let lastScrollTime = 0; // Track last scroll time

    class Particle {
        constructor(originX, originY, index) {
            this.originX = originX;
            this.originY = originY;
            this.index = index;

            // Start scattered
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = 0;
            this.vy = 0;

            this.size = Math.random() * 2.5 + 1;
            this.color = this.getBioColor();
            this.alpha = Math.random() * 0.5 + 0.3;

            // Explosion direction - fly beyond screen edges
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.max(width, height) * 0.8 + Math.random() * 500;
            this.starX = this.originX + Math.cos(angle) * distance;
            this.starY = this.originY + Math.sin(angle) * distance;
            this.starSize = Math.random() * 2.5 + 0.5;
            this.twinkleOffset = Math.random() * Math.PI * 2;
            this.twinkleSpeed = Math.random() * 3 + 1;

            // Animation parameters for floating effect
            this.floatOffsetX = Math.random() * Math.PI * 2;
            this.floatOffsetY = Math.random() * Math.PI * 2;
            this.floatSpeedX = Math.random() * 0.3 + 0.1;
            this.floatSpeedY = Math.random() * 0.3 + 0.1;
            this.floatAmplitude = Math.random() * 15 + 5;
        }

        getBioColor() {
            const colors = ['#00f2ff', '#0072ff', '#ffffff', '#7000ff'];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        update(time) {
            let targetX, targetY;

            if (scrollProgress < 0.08) {
                // Phase 1: Gather to text (SHORTENED)
                const gatherProgress = Math.min(scrollProgress / 0.08, 1);
                const ease = easeOutCubic(gatherProgress);

                const scatterX = (this.index * 7) % width;
                const scatterY = (this.index * 13) % height;

                targetX = scatterX + (this.originX - scatterX) * ease;
                targetY = scatterY + (this.originY - scatterY) * ease;

            } else if (scrollProgress < 0.18) {
                // Phase 2: Text with mouse interaction (SHORTENED from 0.5 to 0.18)
                targetX = this.originX;
                targetY = this.originY;

            } else if (scrollProgress < 0.28) {
                // Phase 3: Explosion - particles fly outward
                const explodeProgress = (scrollProgress - 0.18) / 0.10;
                const ease = easeOutCubic(explodeProgress);

                // Direct position - fly to random positions
                this.x = this.originX + (this.starX - this.originX) * ease;
                this.y = this.originY + (this.starY - this.originY) * ease;

                // Keep bright during explosion
                this.alpha = 0.8;
                return;

            } else if (scrollProgress < 0.40) {
                // Phase 4: Particles fade out
                const fadeProgress = (scrollProgress - 0.28) / 0.12;

                this.x = this.starX;
                this.y = this.starY;

                // Fade to invisible
                this.alpha = 0.8 * (1 - fadeProgress);
                return;

            } else {
                // Phase 5: Particles invisible, only stars visible
                this.alpha = 0;
                return;
            }

            // Mouse interaction (only in text phase)
            if (scrollProgress >= 0.08 && scrollProgress < 0.18) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < config.mouseRadius) {
                    const angle = Math.atan2(dy, dx);
                    const force = (config.mouseRadius - dist) / config.mouseRadius;
                    this.vx -= Math.cos(angle) * force * 8;
                    this.vy -= Math.sin(angle) * force * 8;
                    this.alpha = 1;
                }
            }

            // Move toward target
            this.vx += (targetX - this.x) * config.returnSpeed;
            this.vy += (targetY - this.y) * config.returnSpeed;

            // Add drift
            this.vx += (Math.random() - 0.5) * config.drift;
            this.vy += (Math.random() - 0.5) * config.drift;

            // Apply friction
            this.vx *= config.friction;
            this.vy *= config.friction;

            this.x += this.vx;
            this.y += this.vy;

            // Alpha management
            if (scrollProgress >= 0.15 && scrollProgress < 0.5) {
                this.alpha += (0.6 - this.alpha) * 0.02;
            } else if (scrollProgress >= 0.7) {
                // Twinkling stars effect
                const twinkle = Math.sin(time * this.twinkleSpeed + this.twinkleOffset) * 0.4 + 0.6;
                this.alpha += (twinkle - this.alpha) * 0.1;
            } else {
                this.alpha += (0.5 - this.alpha) * 0.02;
            }
        }

        draw() {
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // White cosmic stars - alive and moving
    class Star {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.baseX = this.x;
            this.baseY = this.y;
            this.size = Math.random() * 2.5 + 0.5;
            this.alpha = 0;
            this.targetAlpha = Math.random() * 0.8 + 0.2;
            this.twinkleOffset = Math.random() * Math.PI * 2;
            this.twinkleSpeed = Math.random() * 4 + 1;
            this.color = '#ffffff';

            // Movement parameters
            this.driftX = (Math.random() - 0.5) * 0.3;
            this.driftY = (Math.random() - 0.5) * 0.3;
            this.floatAmplitude = Math.random() * 20 + 5;
            this.floatSpeedX = Math.random() * 0.5 + 0.2;
            this.floatSpeedY = Math.random() * 0.5 + 0.2;
            this.floatOffsetX = Math.random() * Math.PI * 2;
            this.floatOffsetY = Math.random() * Math.PI * 2;

            // Shooting star chance
            this.isShooting = Math.random() > 0.995;
            this.shootAngle = Math.random() * Math.PI * 2;
            this.shootSpeed = Math.random() * 8 + 4;
            this.shootTimer = 0;
            this.shootDelay = Math.random() * 20 + 10;

            // Star colors - more variety
            const colorRoll = Math.random();
            if (colorRoll > 0.92) {
                this.color = '#aaddff'; // Blue
            } else if (colorRoll > 0.85) {
                this.color = '#ffffdd'; // Yellow
            } else if (colorRoll > 0.8) {
                this.color = '#ffdddd'; // Red tint
            }
        }

        update(time) {
            // Fade in when particles start fading (0.35+)
            if (scrollProgress > 0.35) {
                const fadeProgress = Math.min((scrollProgress - 0.35) / 0.15, 1);
                const twinkle = Math.sin(time * this.twinkleSpeed + this.twinkleOffset) * 0.4 + 0.6;
                this.alpha = this.targetAlpha * fadeProgress * twinkle;

                // Speed effect - stars rush upward when rocket is flying
                // Use threshold to avoid jitter at very low values
                if (rocketSpeedEffect > 0.01) {
                    // Move stars upward based on speed effect (rocket flying down = stars go up)
                    const speed = rocketSpeedEffect * 20; // Proportional to effect
                    this.y -= speed;

                    // Slight horizontal drift for dynamic feel
                    this.x += (Math.random() - 0.5) * rocketSpeedEffect * 2;

                    // IMPORTANT: Update base positions to current so there's no jump when stopping
                    this.baseX = this.x;
                    this.baseY = this.y;

                    // When star goes off top of screen, respawn at bottom
                    if (this.y < -50) {
                        this.y = height + Math.random() * 100;
                        this.x = Math.random() * width;
                        this.baseX = this.x;
                        this.baseY = this.y;
                        // Randomize appearance for variety
                        this.size = Math.random() * 3 + 0.5;
                        this.targetAlpha = Math.random() * 0.9 + 0.3;
                    }

                    // Keep stars visible
                    this.alpha = this.targetAlpha * twinkle;
                } else {
                    // Normal floating movement when no/minimal speed effect
                    const floatX = Math.sin(time * this.floatSpeedX + this.floatOffsetX) * this.floatAmplitude;
                    const floatY = Math.cos(time * this.floatSpeedY + this.floatOffsetY) * this.floatAmplitude;

                    // Smoothly blend from current position using base + float
                    const targetX = this.baseX + floatX;
                    const targetY = this.baseY + floatY;

                    // Gentle lerp to target position (no sudden jumps)
                    this.x += (targetX - this.x) * 0.02;
                    this.y += (targetY - this.y) * 0.02;

                    // Wrap around screen and update base
                    if (this.x < -10) { this.x = width + 10; this.baseX = this.x; }
                    if (this.x > width + 10) { this.x = -10; this.baseX = this.x; }
                    if (this.y < -10) { this.y = height + 10; this.baseY = this.y; }
                    if (this.y > height + 10) { this.y = -10; this.baseY = this.y; }

                    // Shooting star animation
                    if (this.isShooting) {
                        this.shootTimer += 0.016;
                        if (this.shootTimer > this.shootDelay) {
                            this.x += Math.cos(this.shootAngle) * this.shootSpeed;
                            this.y += Math.sin(this.shootAngle) * this.shootSpeed;
                            this.baseX = this.x;
                            this.baseY = this.y;
                            this.alpha = 1;
                            this.size = 3;

                            if (this.x < -50 || this.x > width + 50 || this.y < -50 || this.y > height + 50) {
                                this.shootTimer = 0;
                                this.baseX = Math.random() * width;
                                this.baseY = Math.random() * height;
                                this.x = this.baseX;
                                this.y = this.baseY;
                                this.shootAngle = Math.random() * Math.PI * 2;
                                this.shootDelay = Math.random() * 20 + 10;
                                this.size = Math.random() * 2.5 + 0.5;
                            }
                        }
                    }
                }
            } else {
                this.alpha *= 0.9;
            }
        }

        draw() {
            if (this.alpha < 0.01) return;
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

            // Glow effect for brighter stars
            if (this.alpha > 0.5 && this.size > 1.5) {
                ctx.globalAlpha = this.alpha * 0.3;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        drawWithTransition(transitionProgress, speedEffect = 0) {
            if (this.alpha < 0.01) return;
            ctx.globalAlpha = this.alpha;

            // Transition star color from white/colored to black
            if (transitionProgress > 0) {
                const brightness = Math.floor(255 * (1 - transitionProgress));
                ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
            } else {
                ctx.fillStyle = this.color;
            }

            // Speed effect - stars stretch vertically when rocket flies
            // Only show stretch when speed is significant (> 0.05)
            if (speedEffect > 0.05) {
                // Smooth stretch length based on speed
                const stretchLength = speedEffect * 40; // Proportional stretch

                // Draw elongated star (motion blur effect)
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - stretchLength);
                ctx.lineTo(this.x + this.size, this.y);
                ctx.lineTo(this.x, this.y + this.size * 0.5);
                ctx.lineTo(this.x - this.size, this.y);
                ctx.closePath();
                ctx.fill();

                // Add trail line only when speed is higher
                if (speedEffect > 0.2) {
                    ctx.globalAlpha = this.alpha * 0.4 * speedEffect;
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(this.x, this.y - stretchLength * 1.2);
                    ctx.lineWidth = this.size * 0.4;
                    ctx.strokeStyle = ctx.fillStyle;
                    ctx.stroke();
                }
            } else {
                // Normal circle star
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();

                // Glow effect (only when not transitioning and not moving)
                if (transitionProgress < 0.3 && this.alpha > 0.5 && this.size > 1.5) {
                    ctx.globalAlpha = this.alpha * 0.3 * (1 - transitionProgress * 3);
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function getTextPixels() {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // Use fixed canvas size for consistent text rendering
        const canvasWidth = 1600;
        const canvasHeight = 400;
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;

        const fontSize = 200;
        tempCtx.font = `bold ${fontSize}px "Arial Black", Arial, sans-serif`;
        tempCtx.fillStyle = 'white';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        tempCtx.fillText(TEXT, canvasWidth / 2, canvasHeight / 2);

        const imageData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight).data;
        const pixels = [];

        // Calculate offset to center text on screen
        const offsetX = (width - canvasWidth) / 2;
        const offsetY = (height - canvasHeight) / 2;

        // Sample pixels from the text canvas
        for (let y = 0; y < canvasHeight; y += config.spacing) {
            for (let x = 0; x < canvasWidth; x += config.spacing) {
                const index = (y * canvasWidth + x) * 4;
                if (imageData[index + 3] > 128) {
                    // Add offset to center on screen
                    pixels.push({
                        x: x + offsetX,
                        y: y + offsetY
                    });
                }
            }
        }
        return pixels;
    }

    function init() {
        canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.zIndex = '10';
        canvas.style.pointerEvents = 'none';
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');

        resize();
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        textPixels = getTextPixels();
        particles = [];
        stars = [];

        // Create many white cosmic stars
        for (let i = 0; i < 800; i++) {
            stars.push(new Star());
        }

        if (textPixels.length === 0) return;

        // Create exactly particleCount particles, distributed across ALL text pixels
        for (let i = 0; i < config.particleCount; i++) {
            // Cycle through all text pixels
            const pixelIndex = i % textPixels.length;
            const pixel = textPixels[pixelIndex];

            // Random offset for better coverage with spacing
            const offsetX = (Math.random() - 0.5) * 8;
            const offsetY = (Math.random() - 0.5) * 8;

            particles.push(new Particle(
                pixel.x + offsetX,
                pixel.y + offsetY,
                i
            ));
        }
    }

    function animate() {
        requestAnimationFrame(animate);

        const time = performance.now() * 0.001;
        const currentTime = performance.now();

        // Detect if scrolling has stopped (150ms threshold)
        if (currentTime - lastScrollTime > 150) {
            isScrolling = false;
        }

        // Smooth interpolation for speed effect
        // If not scrolling, gradually reduce to 0
        // If scrolling, gradually approach target
        const lerpSpeed = isScrolling ? 0.06 : 0.02; // Smooth when scrolling, very slow fade out
        const actualTarget = isScrolling ? targetSpeedEffect : 0;
        rocketSpeedEffect += (actualTarget - rocketSpeedEffect) * lerpSpeed;

        // Clamp very small values to 0 (but only when fading out)
        if (!isScrolling && Math.abs(rocketSpeedEffect) < 0.005) {
            rocketSpeedEffect = 0;
        }

        // Background color transition (black to white)
        const bgBrightness = Math.floor(bgTransitionProgress * 255);
        ctx.fillStyle = `rgba(${bgBrightness}, ${bgBrightness}, ${bgBrightness}, 0.12)`;
        ctx.fillRect(0, 0, width, height);

        // Full clear when transitioning to white for cleaner look
        if (bgTransitionProgress > 0.5) {
            ctx.fillStyle = `rgb(${bgBrightness}, ${bgBrightness}, ${bgBrightness})`;
            ctx.fillRect(0, 0, width, height);
        }

        // Draw background stars first
        stars.forEach(s => {
            s.update(time);
            s.drawWithTransition(bgTransitionProgress, rocketSpeedEffect);
        });

        // Draw particles
        particles.forEach(p => {
            p.update(time);
            p.draw();
        });

        ctx.globalAlpha = 1;
    }

    function onScroll() {
        const rect = section.getBoundingClientRect();
        const sectionHeight = section.offsetHeight - window.innerHeight;

        // Track scroll activity
        lastScrollTime = performance.now();
        isScrolling = true;

        if (rect.top < window.innerHeight && rect.bottom > 0) {
            const scrolled = -rect.top;
            scrollProgress = Math.max(0, Math.min(1, scrolled / sectionHeight));

            // Canvas opacity
            if (canvas) {
                const fadeStart = 0.08;
                const fadeEnd = 0.15;
                const opacity = Math.max(0, Math.min((scrollProgress - fadeStart) / (fadeEnd - fadeStart), 1));
                canvas.style.opacity = opacity;
            }

            // Hide glow in cosmos section
            if (glow && scrollProgress > 0.1) {
                glow.style.visibility = 'hidden';
            } else if (glow) {
                glow.style.visibility = 'visible';
            }
        } else {
            // Hide canvas when not in contact section
            if (canvas) {
                canvas.style.opacity = '0';
            }
            scrollProgress = 0;
            if (glow) glow.style.visibility = 'visible';
        }
    }

    function onMouseMove(e) {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    }

    function onMouseLeave() {
        mouse.x = -1000;
        mouse.y = -1000;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', () => {
        resize();
    });

    // Listen for background transition from rocket.js
    window.addEventListener('backgroundTransition', (e) => {
        bgTransitionProgress = e.detail.progress;
        targetSpeedEffect = e.detail.speedEffect || 0;

        // Update scroll tracking from rocket.js
        if (e.detail.isScrolling !== undefined) {
            isScrolling = e.detail.isScrolling;
            if (isScrolling) {
                lastScrollTime = performance.now();
            }
        }
    });

    init();
    onScroll();
    animate();

})();
