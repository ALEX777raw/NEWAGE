/**
 * ROCKET - Explosion, background transition, and rocket animation
 */

(function() {
    'use strict';

    const contactSection = document.getElementById('section-contact');
    if (!contactSection) return;

    let scene, camera, renderer;
    let rocket;
    let explosionParticles = [];
    let shockwaveRings = [];
    let rocketFireParticles = [];
    let rocketSmokeParticles = [];
    let scrollProgress = 0;
    let clock;
    let explosionTriggered = false;
    let explosionCenter = new THREE.Vector3(-75, 40, -85); // Where meteor ends
    let shakeIntensity = 0;

    // Textures
    let explosionTexture, smokeTexture, sparkTexture;

    // Create explosion texture
    function createExplosionTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.1, 'rgba(255, 255, 200, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 100, 50, 0.5)');
        gradient.addColorStop(0.7, 'rgba(255, 50, 20, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);

        return new THREE.CanvasTexture(canvas);
    }

    // Create smoke texture
    function createSmokeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(100, 100, 100, 0.6)');
        gradient.addColorStop(0.5, 'rgba(50, 50, 50, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);

        return new THREE.CanvasTexture(canvas);
    }

    // Explosion particle
    class ExplosionParticle {
        constructor(position, velocity, type = 'fire') {
            this.life = 1.0;
            this.type = type;

            if (type === 'fire') {
                this.decay = Math.random() * 0.008 + 0.005;
                this.size = Math.random() * 8 + 4;
            } else if (type === 'smoke') {
                this.decay = Math.random() * 0.004 + 0.002;
                this.size = Math.random() * 15 + 8;
            } else {
                this.decay = Math.random() * 0.015 + 0.01;
                this.size = Math.random() * 2 + 1;
            }

            const texture = type === 'smoke' ? smokeTexture : explosionTexture;
            const material = new THREE.SpriteMaterial({
                map: texture,
                blending: type === 'smoke' ? THREE.NormalBlending : THREE.AdditiveBlending,
                transparent: true,
                opacity: 1,
                depthWrite: false
            });

            this.sprite = new THREE.Sprite(material);
            this.sprite.scale.setScalar(this.size);
            this.sprite.position.copy(position);

            this.velocity = velocity.clone();
            this.originalSize = this.size;
            this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        }

        update(delta, time) {
            this.life -= this.decay;

            this.sprite.position.add(this.velocity.clone().multiplyScalar(delta * 60));

            // Slow down
            this.velocity.multiplyScalar(0.98);

            // Add some turbulence
            this.velocity.x += (Math.random() - 0.5) * 0.05;
            this.velocity.y += (Math.random() - 0.5) * 0.05;
            this.velocity.z += (Math.random() - 0.5) * 0.05;

            this.sprite.material.opacity = this.life * (this.type === 'smoke' ? 0.5 : 1);

            // Color transition for fire
            if (this.type === 'fire') {
                const color = this.sprite.material.color;
                if (this.life > 0.7) {
                    color.setRGB(1, 1, 0.9);
                } else if (this.life > 0.4) {
                    color.setRGB(1, 0.6, 0.2);
                } else {
                    color.setRGB(0.8, 0.2, 0.05);
                }
            }

            // Expand
            const scale = this.originalSize * (1 + (1 - this.life) * 2);
            this.sprite.scale.setScalar(scale);

            return this.life > 0;
        }

        dispose() {
            this.sprite.material.dispose();
        }
    }

    // Rocket engine fire particle
    class RocketFireParticle {
        constructor(position, velocity) {
            this.life = 1.0;
            this.decay = Math.random() * 0.08 + 0.05;

            const material = new THREE.SpriteMaterial({
                map: explosionTexture,
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 1,
                depthWrite: false
            });

            this.sprite = new THREE.Sprite(material);
            this.size = Math.random() * 3 + 2;
            this.sprite.scale.setScalar(this.size);
            this.sprite.position.copy(position);

            this.velocity = velocity.clone();
        }

        update(delta, time) {
            this.life -= this.decay;

            this.sprite.position.add(this.velocity.clone().multiplyScalar(delta * 60));
            this.velocity.multiplyScalar(0.95);

            // Add turbulence
            this.velocity.x += (Math.random() - 0.5) * 0.3;
            this.velocity.z += (Math.random() - 0.5) * 0.3;

            this.sprite.material.opacity = this.life;

            // Color transition: white -> yellow -> orange -> red
            const color = this.sprite.material.color;
            if (this.life > 0.7) {
                color.setRGB(1, 1, 0.9);
            } else if (this.life > 0.4) {
                color.setRGB(1, 0.7, 0.2);
            } else {
                color.setRGB(1, 0.3, 0.1);
            }

            this.sprite.scale.setScalar(this.size * (0.5 + this.life * 0.5));

            return this.life > 0;
        }

        dispose() {
            this.sprite.material.dispose();
        }
    }

    // Rocket smoke particle - longer lasting trail
    class RocketSmokeParticle {
        constructor(position, velocity) {
            this.life = 1.0;
            this.decay = Math.random() * 0.015 + 0.008; // Much slower decay than fire

            const material = new THREE.SpriteMaterial({
                map: smokeTexture,
                blending: THREE.NormalBlending,
                transparent: true,
                opacity: 0.6,
                depthWrite: false
            });

            this.sprite = new THREE.Sprite(material);
            this.size = Math.random() * 8 + 5;
            this.sprite.scale.setScalar(this.size);
            this.sprite.position.copy(position);

            this.velocity = velocity.clone();
            this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        }

        update(delta, time) {
            this.life -= this.decay;

            this.sprite.position.add(this.velocity.clone().multiplyScalar(delta * 60));
            this.velocity.multiplyScalar(0.97); // Slower deceleration

            // Add gentle turbulence
            this.velocity.x += (Math.random() - 0.5) * 0.15;
            this.velocity.z += (Math.random() - 0.5) * 0.15;
            this.velocity.y += Math.random() * 0.1; // Smoke rises slightly

            // Fade out smoothly
            this.sprite.material.opacity = this.life * 0.5;

            // Color: white/gray smoke
            const gray = 0.7 + this.life * 0.3;
            this.sprite.material.color.setRGB(gray, gray, gray);

            // Expand as it ages
            const scale = this.size * (1 + (1 - this.life) * 2.5);
            this.sprite.scale.setScalar(scale);

            return this.life > 0;
        }

        dispose() {
            this.sprite.material.dispose();
        }
    }

    // Shockwave ring
    class ShockwaveRing {
        constructor(position) {
            this.life = 1.0;
            this.decay = 0.015;

            const geometry = new THREE.RingGeometry(0.5, 2, 64);
            const material = new THREE.MeshBasicMaterial({
                color: 0xffaa00,
                transparent: true,
                opacity: 1,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });

            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.copy(position);
            this.mesh.lookAt(camera.position);
        }

        update(delta) {
            this.life -= this.decay;

            // Expand rapidly
            const scale = 1 + (1 - this.life) * 80;
            this.mesh.scale.setScalar(scale);

            this.mesh.material.opacity = this.life * 0.8;

            // Color shift from white to orange to transparent
            const color = this.mesh.material.color;
            if (this.life > 0.7) {
                color.setRGB(1, 1, 0.9);
            } else if (this.life > 0.3) {
                color.setRGB(1, 0.6, 0.2);
            } else {
                color.setRGB(1, 0.3, 0.1);
            }

            return this.life > 0;
        }

        dispose() {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }

    function init() {
        explosionTexture = createExplosionTexture();
        smokeTexture = createSmokeTexture();

        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 30;

        renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.domElement.style.position = 'fixed';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100vw';
        renderer.domElement.style.height = '100vh';
        renderer.domElement.style.zIndex = '16';
        renderer.domElement.style.pointerEvents = 'none';
        renderer.domElement.style.opacity = '0';
        renderer.domElement.id = 'rocket-canvas';
        document.body.appendChild(renderer.domElement);

        // Lights - bright enough to see the rocket
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(5, 10, 7);
        scene.add(directionalLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 1);
        backLight.position.set(-5, -10, -7);
        scene.add(backLight);

        // Spotlight following rocket
        const rocketSpotlight = new THREE.SpotLight(0xffffff, 3);
        rocketSpotlight.position.set(0, 30, 30);
        rocketSpotlight.angle = Math.PI / 4;
        scene.add(rocketSpotlight);
        scene.add(rocketSpotlight.target);
        window.rocketSpotlight = rocketSpotlight;

        // Explosion light
        const explosionLight = new THREE.PointLight(0xff6600, 0, 100);
        explosionLight.position.copy(explosionCenter);
        scene.add(explosionLight);
        window.explosionLight = explosionLight;

        clock = new THREE.Clock();

        loadRocket();
        createFlyingWords();
        createTelegramButton();

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);

        animate();
    }

    function loadRocket() {
        const loader = new THREE.GLTFLoader();
        loader.load('rocket 3d model.glb', (gltf) => {
            rocket = gltf.scene;
            rocket.scale.setScalar(12); // BIGGER rocket

            // Apply nice material - bright and visible
            rocket.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0xffffff,
                        roughness: 0.2,
                        metalness: 0.8,
                        emissive: 0x222222,
                        emissiveIntensity: 0.3
                    });
                }
            });

            // Start above screen
            rocket.position.set(0, 80, 0);
            rocket.rotation.x = Math.PI; // Point downward
            rocket.visible = false;

            scene.add(rocket);
            console.log('Rocket loaded');
        },
        undefined,
        (error) => {
            console.error('Error loading rocket:', error);
            createFallbackRocket();
        });
    }

    function createFallbackRocket() {
        // Simple rocket shape
        const bodyGeom = new THREE.CylinderGeometry(1, 1.2, 6, 16);
        const noseGeom = new THREE.ConeGeometry(1, 2, 16);
        const finGeom = new THREE.BoxGeometry(0.2, 2, 1.5);

        const material = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            roughness: 0.3,
            metalness: 0.7
        });

        rocket = new THREE.Group();

        const body = new THREE.Mesh(bodyGeom, material);
        rocket.add(body);

        const nose = new THREE.Mesh(noseGeom, material);
        nose.position.y = 4;
        rocket.add(nose);

        // Fins
        for (let i = 0; i < 4; i++) {
            const fin = new THREE.Mesh(finGeom, material);
            fin.position.y = -2;
            fin.position.x = Math.cos(i * Math.PI / 2) * 1.3;
            fin.position.z = Math.sin(i * Math.PI / 2) * 1.3;
            fin.rotation.y = i * Math.PI / 2;
            rocket.add(fin);
        }

        rocket.scale.setScalar(5); // Bigger fallback
        rocket.position.set(0, 80, 0);
        rocket.rotation.x = Math.PI;
        rocket.visible = false;

        scene.add(rocket);
    }

    function createExplosion() {
        if (explosionTriggered) return;
        explosionTriggered = true;

        const center = explosionCenter.clone();

        // Create massive explosion
        for (let i = 0; i < 200; i++) {
            const angle1 = Math.random() * Math.PI * 2;
            const angle2 = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;

            const velocity = new THREE.Vector3(
                Math.sin(angle1) * Math.cos(angle2) * speed,
                Math.sin(angle2) * speed,
                Math.cos(angle1) * Math.cos(angle2) * speed
            );

            const particle = new ExplosionParticle(center.clone(), velocity, 'fire');
            explosionParticles.push(particle);
            scene.add(particle.sprite);
        }

        // Smoke particles
        for (let i = 0; i < 80; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.5
            );

            const particle = new ExplosionParticle(center.clone().add(offset), velocity, 'smoke');
            explosionParticles.push(particle);
            scene.add(particle.sprite);
        }

        // Shockwave rings
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const ring = new ShockwaveRing(center.clone());
                shockwaveRings.push(ring);
                scene.add(ring.mesh);
            }, i * 100);
        }

        // Flash the explosion light
        if (window.explosionLight) {
            window.explosionLight.intensity = 50;
        }
    }

    function onScroll() {
        const rect = contactSection.getBoundingClientRect();
        const sectionHeight = contactSection.offsetHeight - window.innerHeight;

        if (rect.top < window.innerHeight && rect.bottom > 0) {
            const scrolled = -rect.top;
            scrollProgress = Math.max(0, Math.min(1, scrolled / sectionHeight));

            // PHASE TIMING (after meteor 0.55-0.65):
            // 0.65: Explosion triggers (when meteor ends)
            // 0.65 - 0.70: Background transition to white
            // 0.65 - 1.00: Rocket flies down (35% = 700vh!)

            // Explosion triggers at 0.65 (when meteor ends)
            if (scrollProgress > 0.65 && !explosionTriggered) {
                createExplosion();
            }

            // Show canvas during explosion and rocket (SMOOTH fade in)
            if (scrollProgress > 0.65) {
                const fadeProgress = Math.min((scrollProgress - 0.65) / 0.03, 1);
                const fadeIn = easeOutCubic(fadeProgress);
                renderer.domElement.style.opacity = fadeIn.toString();
            }

            // Background transition to white (0.65 - 0.90) - GRAPHITE DIFFUSION EFFECT
            if (scrollProgress > 0.65) {
                const bgProgress = Math.min((scrollProgress - 0.65) / 0.25, 1); // 25% of scroll

                // Speed effect for stars - increases as rocket flies (GRADUAL)
                let speedEffect = 0;
                if (scrollProgress > 0.70) {
                    // Use easing for smoother increase
                    const speedProgress = Math.min((scrollProgress - 0.70) / 0.15, 1);
                    speedEffect = easeOutCubic(speedProgress);
                }

                // Dispatch event for cosmic.js to handle star color transition AND speed effect
                window.dispatchEvent(new CustomEvent('backgroundTransition', {
                    detail: { progress: bgProgress, speedEffect: speedEffect, isScrolling: true }
                }));

                document.body.style.setProperty('--cosmic-bg-transition', bgProgress);

                // GRAPHITE DIFFUSION EFFECT - expanding circle with smudge (SMOOTH)
                const diffusionLayer = document.getElementById('diffusion-layer');
                if (diffusionLayer) {
                    // Circle expands from 0% to 150% with SMOOTH easing
                    const easedBgProgress = easeOutCubic(bgProgress);
                    const circleSize = easedBgProgress * 150;
                    diffusionLayer.style.clipPath = `circle(${circleSize}% at 50% 50%)`;

                    // Dynamic smudge filter - strongest in middle of transition (bell curve)
                    const bellCurve = Math.sin(bgProgress * Math.PI); // Smooth 0->1->0
                    const filterScale = 60 * bellCurve;
                    const smudgeFilter = document.querySelector('#graphite-smudge feDisplacementMap');
                    if (smudgeFilter) {
                        smudgeFilter.setAttribute('scale', Math.max(0, filterScale));
                    }
                }
            } else {
                // Reset diffusion layer when not in transition
                const diffusionLayer = document.getElementById('diffusion-layer');
                if (diffusionLayer) {
                    diffusionLayer.style.clipPath = 'circle(0% at 50% 50%)';
                }
            }

            // ROCKET ANIMATION (0.65 - 1.00 = 35% of scroll = 700vh!)
            // Phases within rocketProgress (0-1):
            // 0.00-0.15: Rocket enters from FAR ABOVE (camera fixed, watching approach)
            // 0.15-0.37: Flies through "КАЧЕСТВО"
            // 0.37-0.59: Flies through "СКОРОСТЬ"
            // 0.59-0.80: Flies through "НАДЕЖНОСТЬ"
            // 0.80-0.95: Rocket accelerates down
            // 0.95-1.00: Rocket exits, button appears

            if (scrollProgress > 0.65 && rocket) {
                rocket.visible = true;
                hideTelegramButton();

                const rocketProgress = Math.min((scrollProgress - 0.65) / 0.35, 1);

                // Smooth fire intensity
                shakeIntensity = rocketProgress * 0.5;

                // ROCKET PATH - enters from TOP EDGE, flies to middle, then through words
                // Entry phase (0-0.20): fly from top boundary to center
                // Middle phase (0.20-0.80): fly through words
                // Exit phase (0.80-1.0): fly out the bottom

                let rocketX, rocketY, rocketZ;

                if (rocketProgress < 0.15) {
                    // ENTRY - rocket flies in from FAR ABOVE, camera stays fixed looking at center
                    const entryEase = easeOutQuart(rocketProgress / 0.15);

                    // Rocket starts WAY above (Y=300) and far back (Z=-100), flies into view
                    rocketX = 0;
                    rocketY = 300 - entryEase * 260; // 300 -> 40 (enters from way above)
                    rocketZ = -100 + entryEase * 115; // -100 -> 15 (approaches camera)

                    // Camera position - blend from fixed to following at the end of entry
                    const camBlend = Math.pow(entryEase, 3); // Mostly fixed, then quickly blend
                    const fixedCamY = 60;
                    const fixedCamZ = 50;
                    const followCamY = rocketY + 35;
                    const followCamZ = rocketZ + 40;

                    camera.position.x = 0;
                    camera.position.y = fixedCamY + (followCamY - fixedCamY) * camBlend;
                    camera.position.z = fixedCamZ + (followCamZ - fixedCamZ) * camBlend;

                    // Camera look target - blend from looking up to following rocket
                    const lookY = 90 - entryEase * 70; // 90 -> 20
                    camera.lookAt(0, lookY, 0);

                } else if (rocketProgress < 0.80) {
                    // MIDDLE - fly through words smoothly
                    const middleProgress = (rocketProgress - 0.15) / 0.65;
                    const middleEase = easeInOutCubic(middleProgress);

                    rocketX = Math.sin(middleProgress * Math.PI * 0.3) * 5; // Gentle wave
                    rocketY = 40 - middleEase * 180; // 40 -> -140
                    rocketZ = 15;

                    // Camera follows rocket smoothly
                    camera.position.x = rocketX * 0.15;
                    camera.position.y = rocketY + 35;
                    camera.position.z = rocketZ + 40;

                    camera.lookAt(rocketX, rocketY - 20, rocketZ);

                } else {
                    // EXIT - fly out the bottom with background transition to BLACK
                    const exitProgress = (rocketProgress - 0.80) / 0.20;
                    const exitEase = easeInQuad(exitProgress);

                    rocketX = Math.sin(0.80 * Math.PI * 0.3) * 5 * (1 - exitEase);
                    rocketY = -140 - exitEase * 150; // -140 -> -290 (faster exit)
                    rocketZ = 15 - exitEase * 50;

                    // Camera continues following but slows down
                    camera.position.x = rocketX * 0.15;
                    camera.position.y = rocketY + 35 + exitEase * 50; // Camera stays higher
                    camera.position.z = rocketZ + 40;

                    camera.lookAt(rocketX, rocketY - 20, rocketZ);

                    // TRANSITION TO BLACK during exit phase
                    // Diffusion layer fades out (white -> transparent)
                    const diffusionLayer = document.getElementById('diffusion-layer');
                    if (diffusionLayer) {
                        const fadeOutEase = easeOutCubic(exitProgress);
                        diffusionLayer.style.opacity = (1 - fadeOutEase).toString();
                    }

                    // Black overlay fades in
                    const blackProgress = easeOutCubic(exitProgress);
                    updateFinalOverlay(blackProgress);

                    // Fade out 3D canvas as black overlay appears
                    if (exitProgress > 0.6) {
                        const canvasFade = 1 - ((exitProgress - 0.6) / 0.4);
                        renderer.domElement.style.opacity = Math.max(0, canvasFade).toString();
                    }
                }

                rocket.position.set(rocketX, rocketY, rocketZ);

                // Rocket pointing down
                rocket.rotation.x = Math.PI * 0.92;
                rocket.rotation.y = 0;
                rocket.rotation.z = 0;

                // Update words
                updateFlyingWords(rocketProgress);

                // GRADUAL speed effect - starts after entry phase (0.15)
                let targetSpeedEffect = 0;
                if (rocketProgress > 0.15 && rocketProgress < 0.80) {
                    // Gradual increase during main flight
                    const speedProgress = (rocketProgress - 0.15) / 0.65;
                    targetSpeedEffect = speedProgress * 0.6; // 0 -> 0.6
                } else if (rocketProgress >= 0.80) {
                    // Max speed during exit, then fade to 0
                    const exitProgress = (rocketProgress - 0.80) / 0.20;
                    if (exitProgress < 0.5) {
                        targetSpeedEffect = 0.6 + exitProgress * 0.4; // 0.6 -> 0.8
                    } else {
                        // Fade out speed effect as we transition to black
                        targetSpeedEffect = 0.8 * (1 - (exitProgress - 0.5) * 2); // 0.8 -> 0
                    }
                }

                window.dispatchEvent(new CustomEvent('backgroundTransition', {
                    detail: { progress: 1, speedEffect: targetSpeedEffect, isScrolling: true }
                }));

                // Show button when rocket almost fully exits
                if (rocketProgress > 0.92) {
                    showTelegramButton();
                } else {
                    hideTelegramButton();
                }

            } else if (rocket) {
                rocket.visible = false;
                shakeIntensity = 0;
                // Reset camera
                camera.position.set(0, 0, 30);
                camera.lookAt(0, 0, 0);

                // Hide words and button when not in rocket section
                hideFlyingWords();
                hideTelegramButton();

                // Reset overlays when scrolling back before rocket section
                updateFinalOverlay(0);
                const diffusionLayer = document.getElementById('diffusion-layer');
                if (diffusionLayer) {
                    diffusionLayer.style.opacity = '1';
                }
            }
        } else if (rect.top >= window.innerHeight) {
            // Reset when scrolling back up
            scrollProgress = 0;
            explosionTriggered = false;
            renderer.domElement.style.opacity = '0';

            // Clear particles
            explosionParticles.forEach(p => {
                scene.remove(p.sprite);
                p.dispose();
            });
            explosionParticles = [];

            shockwaveRings.forEach(r => {
                scene.remove(r.mesh);
                r.dispose();
            });
            shockwaveRings = [];

            // Clear rocket fire particles
            rocketFireParticles.forEach(p => {
                scene.remove(p.sprite);
                p.dispose();
            });
            rocketFireParticles = [];

            // Clear rocket smoke particles
            rocketSmokeParticles.forEach(p => {
                scene.remove(p.sprite);
                p.dispose();
            });
            rocketSmokeParticles = [];

            if (rocket) rocket.visible = false;

            // Reset camera
            camera.position.set(0, 0, 30);
            camera.lookAt(0, 0, 0);

            // Hide button and reset words
            hideTelegramButton();
            resetFlyingWords();

            // Reset black overlay and diffusion layer
            updateFinalOverlay(0);
            const diffusionLayer = document.getElementById('diffusion-layer');
            if (diffusionLayer) {
                diffusionLayer.style.opacity = '1';
            }

            window.dispatchEvent(new CustomEvent('backgroundTransition', {
                detail: { progress: 0, speedEffect: 0, isScrolling: false }
            }));
        }
    }

    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // Update explosion particles
        for (let i = explosionParticles.length - 1; i >= 0; i--) {
            if (!explosionParticles[i].update(delta, time)) {
                scene.remove(explosionParticles[i].sprite);
                explosionParticles[i].dispose();
                explosionParticles.splice(i, 1);
            }
        }

        // Update shockwave rings
        for (let i = shockwaveRings.length - 1; i >= 0; i--) {
            if (!shockwaveRings[i].update(delta)) {
                scene.remove(shockwaveRings[i].mesh);
                shockwaveRings[i].dispose();
                shockwaveRings.splice(i, 1);
            }
        }

        // Fade explosion light
        if (window.explosionLight && window.explosionLight.intensity > 0) {
            window.explosionLight.intensity *= 0.95;
        }

        // Rocket spotlight tracking
        if (rocket && rocket.visible && window.rocketSpotlight) {
            window.rocketSpotlight.target.position.copy(rocket.position);
            window.rocketSpotlight.position.set(
                rocket.position.x,
                rocket.position.y + 20,
                rocket.position.z + 20
            );

            // Create rocket engine fire
            createRocketFire();

            // No camera shake - smooth flight
        }

        // Update rocket fire particles
        for (let i = rocketFireParticles.length - 1; i >= 0; i--) {
            if (!rocketFireParticles[i].update(delta, time)) {
                scene.remove(rocketFireParticles[i].sprite);
                rocketFireParticles[i].dispose();
                rocketFireParticles.splice(i, 1);
            }
        }

        // Update rocket smoke particles
        for (let i = rocketSmokeParticles.length - 1; i >= 0; i--) {
            if (!rocketSmokeParticles[i].update(delta, time)) {
                scene.remove(rocketSmokeParticles[i].sprite);
                rocketSmokeParticles[i].dispose();
                rocketSmokeParticles.splice(i, 1);
            }
        }

        renderer.render(scene, camera);
    }

    function createRocketFire() {
        if (!rocket || !rocket.visible) return;

        // Fire comes from bottom of rocket (opposite to direction of travel)
        const rocketPos = rocket.position.clone();

        // Create LOTS of fire particles for intense effect
        const particleCount = 8 + Math.floor(shakeIntensity * 5); // More particles as speed increases

        for (let i = 0; i < particleCount; i++) {
            // Main engine fire - concentrated
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                10 + Math.random() * 5, // Behind rocket (it's going down)
                (Math.random() - 0.5) * 3
            );

            // Fire shoots upward with spread based on intensity
            const spread = 0.5 + shakeIntensity * 0.5;
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * spread,
                Math.random() * 3 + 2 + shakeIntensity * 2, // Faster fire at higher speed
                (Math.random() - 0.5) * spread
            );

            const particle = new RocketFireParticle(rocketPos.clone().add(offset), velocity);
            // Make particles bigger based on intensity
            particle.size = (Math.random() * 4 + 3) * (1 + shakeIntensity * 0.5);
            particle.sprite.scale.setScalar(particle.size);
            rocketFireParticles.push(particle);
            scene.add(particle.sprite);
        }

        // Add some extra bright core particles
        for (let i = 0; i < 3; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 1,
                8,
                (Math.random() - 0.5) * 1
            );
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 2 + 1,
                (Math.random() - 0.5) * 0.2
            );

            const particle = new RocketFireParticle(rocketPos.clone().add(offset), velocity);
            particle.size = Math.random() * 6 + 4; // Bigger core particles
            particle.sprite.scale.setScalar(particle.size);
            particle.sprite.material.color.setRGB(1, 1, 1); // White hot core
            rocketFireParticles.push(particle);
            scene.add(particle.sprite);
        }

        // Create smoke trail - less frequent than fire, but longer lasting
        const smokeCount = 3 + Math.floor(shakeIntensity * 3);
        for (let i = 0; i < smokeCount; i++) {
            // Smoke spawns further behind the rocket
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                15 + Math.random() * 10, // Further behind than fire
                (Math.random() - 0.5) * 6
            );

            // Smoke drifts upward and outward slowly
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.8,
                Math.random() * 1.5 + 0.5, // Slower upward movement
                (Math.random() - 0.5) * 0.8
            );

            const smoke = new RocketSmokeParticle(rocketPos.clone().add(offset), velocity);
            rocketSmokeParticles.push(smoke);
            scene.add(smoke.sprite);
        }
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function easeInQuad(t) {
        return t * t;
    }

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    // 3D Flying words with disintegration effect - SCROLL ONLY
    let flyingWords = []; // Array of word objects, each containing char sprites
    const wordTexts = ['КАЧЕСТВО', 'СКОРОСТЬ', 'НАДЕЖНОСТЬ'];

    function createCharTexture(char) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 256;

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 200px Arial Black, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, 128, 128);

        return new THREE.CanvasTexture(canvas);
    }

    function createFlyingWords() {
        // Y positions for each word along rocket's path - spaced out more
        const yPositions = [30, -50, -130];
        // X offset: alternating left and right from center
        const xOffsets = [-25, 25, -25]; // left, right, left

        wordTexts.forEach((text, wordIndex) => {
            const wordGroup = {
                chars: [],
                baseY: yPositions[wordIndex],
                baseXOffset: xOffsets[wordIndex],
                wordIndex: wordIndex,
                text: text
            };

            const chars = text.split('');
            const charWidth = 12; // BIGGER spacing between characters
            const totalWidth = (chars.length - 1) * charWidth;
            const startX = xOffsets[wordIndex] - totalWidth / 2;

            chars.forEach((char, charIndex) => {
                const texture = createCharTexture(char);
                const material = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0
                });

                const sprite = new THREE.Sprite(material);
                sprite.scale.set(15, 15, 1); // MUCH BIGGER

                const baseX = startX + charIndex * charWidth;
                sprite.position.set(baseX, yPositions[wordIndex], 8);

                sprite.userData = {
                    baseX: baseX,
                    baseY: yPositions[wordIndex],
                    baseZ: 8,
                    charIndex: charIndex,
                    wordIndex: wordIndex,
                    totalChars: chars.length
                };

                scene.add(sprite);
                wordGroup.chars.push(sprite);
            });

            flyingWords.push(wordGroup);
        });
    }

    function updateFlyingWords(rocketProgress) {
        // Use HTML-based flying words with SVG wind displacement filter
        const container = document.getElementById('flying-words-container');
        const words = [
            document.getElementById('word-1'),
            document.getElementById('word-2'),
            document.getElementById('word-3')
        ];

        if (!container || !words[0]) return;

        // Show container during rocket flight
        if (rocketProgress > 0.10 && rocketProgress < 0.85) {
            container.style.opacity = '1';
            container.style.visibility = 'visible';
        } else {
            container.style.opacity = '0';
            container.style.visibility = 'hidden';
        }

        // Update each word's opacity based on rocket progress
        words.forEach((word, wordIndex) => {
            if (!word) return;

            // Word phases - words appear AFTER rocket entry (0.15)
            // Available range: 0.15 - 0.80 = 0.65 total, ~0.22 per word
            const wordStartProgress = 0.15 + wordIndex * 0.22;
            const wordDuration = 0.22;

            // Check if word is in active range
            if (rocketProgress >= wordStartProgress - 0.05 && rocketProgress <= wordStartProgress + wordDuration + 0.05) {
                // Local progress (0 to 1 during word's time)
                const localProgress = Math.max(0, Math.min(1, (rocketProgress - wordStartProgress) / wordDuration));

                // Smooth fade in/out
                let opacity = 1;
                if (localProgress < 0.2) {
                    // Smooth fade in
                    const fadeProgress = localProgress / 0.2;
                    opacity = easeOutCubic(fadeProgress);
                } else if (localProgress > 0.8) {
                    // Smooth fade out
                    const fadeProgress = (localProgress - 0.8) / 0.2;
                    opacity = 1 - easeInQuad(fadeProgress);
                }

                word.style.opacity = opacity.toString();
            } else {
                // Word not in active range
                word.style.opacity = '0';
            }
        });
    }

    function hideFlyingWords() {
        // Hide HTML flying words
        const container = document.getElementById('flying-words-container');
        if (container) {
            container.style.opacity = '0';
            container.style.visibility = 'hidden';
        }
        const words = document.querySelectorAll('.flying-word');
        words.forEach(word => {
            word.style.opacity = '0';
        });

        // Also hide Three.js words (legacy)
        flyingWords.forEach(wordGroup => {
            wordGroup.chars.forEach(char => {
                char.material.opacity = 0;
            });
        });
    }

    // Reset words to initial state
    function resetFlyingWords() {
        // Reset HTML flying words
        hideFlyingWords();

        // Reset Three.js words (legacy)
        flyingWords.forEach(wordGroup => {
            wordGroup.chars.forEach(char => {
                const userData = char.userData;
                char.position.x = userData.baseX;
                char.position.y = userData.baseY;
                char.position.z = userData.baseZ;
                char.material.opacity = 0;
                char.material.rotation = 0;
                char.scale.set(15, 15, 1); // Reset to base scale
            });
        });
    }

    // Lusion-style button elements
    let finalBtnWrapper = null;
    let finalBlackOverlay = null;
    let viscousBlob = null;
    let lusionBtn = null;
    let blobX = 0, blobY = 0;
    let targetBlobX = 0, targetBlobY = 0;

    // Viscous background elements
    let moltenContainer = null;
    let grainOverlay = null;
    let mouseBlob = null;
    let mouseBlobX = 0, mouseBlobY = 0;
    let targetMouseBlobX = 0, targetMouseBlobY = 0;

    function createTelegramButton() {
        // Get existing HTML elements instead of creating new ones
        finalBtnWrapper = document.getElementById('final-btn-wrapper');
        finalBlackOverlay = document.getElementById('final-black-overlay');
        viscousBlob = document.getElementById('viscous-blob');
        lusionBtn = document.getElementById('final-btn');

        // Viscous background elements
        moltenContainer = document.getElementById('molten-bg');
        grainOverlay = document.getElementById('grain-overlay');
        mouseBlob = document.getElementById('mouse-blob');

        // Mouse tracking for background blob
        if (mouseBlob) {
            window.addEventListener('mousemove', (e) => {
                targetMouseBlobX = e.clientX;
                targetMouseBlobY = e.clientY;
            });
            animateMouseBlob();
        }

        if (lusionBtn && viscousBlob) {
            // Mouse tracking for viscous blob
            lusionBtn.addEventListener('mousemove', (e) => {
                const rect = lusionBtn.getBoundingClientRect();
                targetBlobX = e.clientX - rect.left;
                targetBlobY = e.clientY - rect.top;
            });

            lusionBtn.addEventListener('mouseenter', () => {
                viscousBlob.style.opacity = '1';
            });

            lusionBtn.addEventListener('mouseleave', () => {
                viscousBlob.style.opacity = '0';
            });

            // Parallax tilt effect on button
            lusionBtn.addEventListener('mousemove', (e) => {
                const rect = lusionBtn.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const rotateX = (mouseY - centerY) / centerY * -5;
                const rotateY = (mouseX - centerX) / centerX * 5;

                lusionBtn.style.transform = `scale(1.02) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });

            lusionBtn.addEventListener('mouseleave', () => {
                lusionBtn.style.transform = 'scale(1) perspective(1000px) rotateX(0deg) rotateY(0deg)';
            });

            // Animate blob smoothly
            animateBlob();
        }
    }

    function animateBlob() {
        if (!viscousBlob) return;

        // Smooth lerp for blob position
        blobX += (targetBlobX - blobX) * 0.15;
        blobY += (targetBlobY - blobY) * 0.15;

        viscousBlob.style.left = blobX + 'px';
        viscousBlob.style.top = blobY + 'px';

        requestAnimationFrame(animateBlob);
    }

    function animateMouseBlob() {
        if (!mouseBlob) return;

        // Smooth lag for the molten blob interaction
        mouseBlobX += (targetMouseBlobX - mouseBlobX) * 0.05;
        mouseBlobY += (targetMouseBlobY - mouseBlobY) * 0.05;

        mouseBlob.style.left = (mouseBlobX - 200) + 'px';
        mouseBlob.style.top = (mouseBlobY - 200) + 'px';

        requestAnimationFrame(animateMouseBlob);
    }

    function showTelegramButton() {
        if (finalBtnWrapper) {
            finalBtnWrapper.classList.add('visible');
        }
        // Show viscous background
        if (moltenContainer) {
            moltenContainer.classList.add('visible');
        }
        if (grainOverlay) {
            grainOverlay.classList.add('visible');
        }
    }

    function hideTelegramButton() {
        if (finalBtnWrapper) {
            finalBtnWrapper.classList.remove('visible');
        }
        // Hide viscous background
        if (moltenContainer) {
            moltenContainer.classList.remove('visible');
        }
        if (grainOverlay) {
            grainOverlay.classList.remove('visible');
        }
    }

    // Control final black overlay for ending sequence
    function updateFinalOverlay(progress) {
        if (finalBlackOverlay) {
            // progress: 0 = transparent, 1 = fully black
            finalBlackOverlay.style.opacity = progress.toString();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
