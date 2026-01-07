/**
 * METEOR - Ultra realistic meteor with fire, sparks and glow
 */

(function() {
    'use strict';

    const section = document.getElementById('section-contact');
    if (!section) return;

    let scene, camera, renderer, composer;
    let meteor;
    let fireParticles = [];
    let coreFlames = [];
    let sparks = [];
    let embers = [];
    let scrollProgress = 0;
    let clock;
    let fireLight, coreLight, ambientFireLight;

    // Textures
    let fireTexture, glowTexture, sparkTexture;

    // Create soft fire texture with better gradient
    function createFireTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.1, 'rgba(255, 255, 200, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 220, 100, 0.9)');
        gradient.addColorStop(0.35, 'rgba(255, 150, 50, 0.7)');
        gradient.addColorStop(0.5, 'rgba(255, 80, 20, 0.5)');
        gradient.addColorStop(0.7, 'rgba(200, 30, 0, 0.3)');
        gradient.addColorStop(0.85, 'rgba(100, 10, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);

        return new THREE.CanvasTexture(canvas);
    }

    // Create bright glow texture
    function createGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(255, 200, 100, 0.8)');
        gradient.addColorStop(0.3, 'rgba(255, 100, 50, 0.4)');
        gradient.addColorStop(0.6, 'rgba(255, 50, 20, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);

        return new THREE.CanvasTexture(canvas);
    }

    // Create spark texture
    function createSparkTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 150, 0.8)');
        gradient.addColorStop(0.6, 'rgba(255, 200, 50, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        return new THREE.CanvasTexture(canvas);
    }

    // Main fire particle - the intense flames
    class FlameParticle {
        constructor(position, velocity, type = 'outer') {
            this.life = 1.0;
            this.type = type;

            // Different decay rates for different flame types
            if (type === 'core') {
                this.decay = Math.random() * 0.02 + 0.015;
                this.size = Math.random() * 2.5 + 2;
            } else if (type === 'middle') {
                this.decay = Math.random() * 0.025 + 0.02;
                this.size = Math.random() * 2 + 1.5;
            } else {
                this.decay = Math.random() * 0.03 + 0.025;
                this.size = Math.random() * 1.5 + 0.8;
            }

            const material = new THREE.SpriteMaterial({
                map: fireTexture,
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 1,
                depthWrite: false
            });

            this.sprite = new THREE.Sprite(material);
            this.sprite.scale.setScalar(this.size);
            this.sprite.position.copy(position);

            this.velocity = velocity.clone();
            this.originalSize = this.size;
            this.turbulence = Math.random() * 0.2;
            this.flickerSpeed = Math.random() * 20 + 10;
            this.flickerOffset = Math.random() * Math.PI * 2;
        }

        update(delta, time) {
            this.life -= this.decay;

            // Movement with turbulence
            this.sprite.position.add(this.velocity.clone().multiplyScalar(delta * 60));

            // Add turbulent motion
            this.velocity.x += (Math.random() - 0.5) * this.turbulence;
            this.velocity.y += (Math.random() - 0.5) * this.turbulence * 0.5;
            this.velocity.z += (Math.random() - 0.5) * this.turbulence;

            // Slow down
            this.velocity.multiplyScalar(0.97);

            // Flickering effect
            const flicker = 0.7 + Math.sin(time * this.flickerSpeed + this.flickerOffset) * 0.3;

            // Opacity based on life and flicker
            this.sprite.material.opacity = this.life * flicker * (this.type === 'core' ? 1 : 0.85);

            // Color transition based on life
            const color = this.sprite.material.color;
            if (this.life > 0.8) {
                color.setRGB(1, 1, 0.9); // White-yellow
            } else if (this.life > 0.6) {
                color.setRGB(1, 0.85, 0.3); // Bright yellow
            } else if (this.life > 0.4) {
                color.setRGB(1, 0.5, 0.1); // Orange
            } else if (this.life > 0.2) {
                color.setRGB(0.9, 0.2, 0.05); // Red-orange
            } else {
                color.setRGB(0.5, 0.1, 0.02); // Dark red
            }

            // Size pulsing
            const pulse = 1 + Math.sin(time * 15 + this.flickerOffset) * 0.15;
            this.sprite.scale.setScalar(this.originalSize * this.life * pulse);

            return this.life > 0;
        }

        dispose() {
            this.sprite.material.dispose();
        }
    }

    // Bright spark particles
    class Spark {
        constructor(position, velocity) {
            this.life = 1.0;
            this.decay = Math.random() * 0.04 + 0.03;

            const material = new THREE.SpriteMaterial({
                map: sparkTexture,
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 1,
                depthWrite: false
            });

            this.sprite = new THREE.Sprite(material);
            this.size = Math.random() * 0.4 + 0.2;
            this.sprite.scale.setScalar(this.size);
            this.sprite.position.copy(position);

            this.velocity = velocity.clone();
            this.gravity = -0.015;
            this.trail = [];
            this.maxTrailLength = 5;
        }

        update(delta, time) {
            this.life -= this.decay;

            // Store previous position for trail
            if (this.trail.length >= this.maxTrailLength) {
                this.trail.shift();
            }
            this.trail.push(this.sprite.position.clone());

            // Apply gravity
            this.velocity.y += this.gravity;

            // Movement
            this.sprite.position.add(this.velocity.clone().multiplyScalar(delta * 60));

            // Opacity
            this.sprite.material.opacity = this.life;

            // Color from white to orange to red
            const color = this.sprite.material.color;
            if (this.life > 0.7) {
                color.setRGB(1, 1, 0.8);
            } else if (this.life > 0.4) {
                color.setRGB(1, 0.7, 0.2);
            } else {
                color.setRGB(1, 0.3, 0.1);
            }

            // Shrink
            this.sprite.scale.setScalar(this.size * this.life);

            return this.life > 0;
        }

        dispose() {
            this.sprite.material.dispose();
        }
    }

    // Glowing embers that float away
    class Ember {
        constructor(position, velocity) {
            this.life = 1.0;
            this.decay = Math.random() * 0.015 + 0.008;

            const material = new THREE.SpriteMaterial({
                map: glowTexture,
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.6,
                depthWrite: false,
                color: new THREE.Color(0xff6600)
            });

            this.sprite = new THREE.Sprite(material);
            this.size = Math.random() * 0.8 + 0.3;
            this.sprite.scale.setScalar(this.size);
            this.sprite.position.copy(position);

            this.velocity = velocity.clone();
            this.wobbleSpeed = Math.random() * 5 + 2;
            this.wobbleAmount = Math.random() * 0.1 + 0.05;
            this.wobbleOffset = Math.random() * Math.PI * 2;
        }

        update(delta, time) {
            this.life -= this.decay;

            // Wobbling movement
            const wobble = Math.sin(time * this.wobbleSpeed + this.wobbleOffset) * this.wobbleAmount;
            this.velocity.x += wobble;
            this.velocity.y += wobble * 0.5;

            this.sprite.position.add(this.velocity.clone().multiplyScalar(delta * 60));
            this.velocity.multiplyScalar(0.99);

            // Pulsing glow
            const pulse = 0.4 + Math.sin(time * 8 + this.wobbleOffset) * 0.2;
            this.sprite.material.opacity = this.life * pulse;

            // Color shift
            const hue = 0.08 - this.life * 0.05; // Orange to red
            this.sprite.material.color.setHSL(hue, 1, 0.5);

            this.sprite.scale.setScalar(this.size * (0.5 + this.life * 0.5));

            return this.life > 0;
        }

        dispose() {
            this.sprite.material.dispose();
        }
    }

    // Atmosphere glow around meteor
    class AtmosphereGlow {
        constructor() {
            const geometry = new THREE.SphereGeometry(6, 32, 32);
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    intensity: { value: 1.0 }
                },
                vertexShader: `
                    varying vec3 vNormal;
                    varying vec3 vPosition;
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        vPosition = position;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform float intensity;
                    varying vec3 vNormal;
                    varying vec3 vPosition;

                    void main() {
                        float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
                        rim = pow(rim, 2.0);

                        // Flickering
                        float flicker = 0.8 + sin(time * 10.0) * 0.1 + sin(time * 23.0) * 0.1;

                        // Color gradient from center (white) to edge (orange/red)
                        vec3 innerColor = vec3(1.0, 0.9, 0.7);
                        vec3 outerColor = vec3(1.0, 0.3, 0.05);
                        vec3 color = mix(innerColor, outerColor, rim);

                        float alpha = rim * intensity * flicker * 0.6;
                        gl_FragColor = vec4(color, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide,
                depthWrite: false
            });

            this.mesh = new THREE.Mesh(geometry, material);
        }

        update(time, position) {
            this.mesh.material.uniforms.time.value = time;
            this.mesh.position.copy(position);
        }
    }

    let atmosphereGlow;

    function init() {
        // Create textures
        fireTexture = createFireTexture();
        glowTexture = createGlowTexture();
        sparkTexture = createSparkTexture();

        // Scene
        scene = new THREE.Scene();

        // Camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 30;

        // Renderer
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
        renderer.domElement.style.zIndex = '15';
        renderer.domElement.style.pointerEvents = 'none';
        renderer.domElement.style.opacity = '0';
        renderer.domElement.id = 'meteor-canvas';
        document.body.appendChild(renderer.domElement);

        // Multiple lights for realistic fire illumination
        const ambientLight = new THREE.AmbientLight(0x111111, 0.5);
        scene.add(ambientLight);

        // Core white-hot light
        coreLight = new THREE.PointLight(0xffffcc, 8, 30);
        scene.add(coreLight);

        // Main fire light
        fireLight = new THREE.PointLight(0xff6600, 6, 40);
        scene.add(fireLight);

        // Ambient fire glow
        ambientFireLight = new THREE.PointLight(0xff3300, 4, 60);
        scene.add(ambientFireLight);

        // Atmosphere glow
        atmosphereGlow = new AtmosphereGlow();
        scene.add(atmosphereGlow.mesh);

        clock = new THREE.Clock();

        // Load meteor model
        loadMeteor();

        // Events
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);

        animate();
    }

    function loadMeteor() {
        const loader = new THREE.GLTFLoader();
        loader.load('rock 3d model (1).glb', (gltf) => {
            meteor = gltf.scene;
            meteor.scale.setScalar(3);

            // Apply hot glowing rock material
            meteor.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x1a1a1a,
                        roughness: 0.6,
                        metalness: 0.4,
                        emissive: 0xff2200,
                        emissiveIntensity: 1.2
                    });
                }
            });

            meteor.position.set(80, 30, -100);
            meteor.visible = false;

            scene.add(meteor);
            console.log('Meteor loaded');
        },
        undefined,
        (error) => {
            console.error('Error loading meteor:', error);
            createFallbackMeteor();
        });
    }

    function createFallbackMeteor() {
        const geometry = new THREE.IcosahedronGeometry(2.5, 2);

        // Deform for rocky appearance
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            const noise = (Math.random() - 0.5) * 0.6;
            positions.setXYZ(i, x + noise, y + noise, z + noise);
        }
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.6,
            metalness: 0.4,
            emissive: 0xff2200,
            emissiveIntensity: 1.2
        });

        meteor = new THREE.Mesh(geometry, material);
        meteor.position.set(80, 30, -100);
        meteor.visible = false;
        scene.add(meteor);
    }

    function createFireTrail(time) {
        if (!meteor || !meteor.visible) return;

        const meteorPos = meteor.position.clone();
        const trailDir = new THREE.Vector3(1, 0.2, -0.3).normalize();

        // CORE FLAMES - white hot center
        for (let i = 0; i < 8; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );

            const velocity = trailDir.clone().multiplyScalar(Math.random() * 0.4 + 0.3);
            velocity.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.15,
                (Math.random() - 0.5) * 0.15,
                (Math.random() - 0.5) * 0.15
            ));

            const particle = new FlameParticle(meteorPos.clone().add(offset), velocity, 'core');
            fireParticles.push(particle);
            scene.add(particle.sprite);
        }

        // MIDDLE FLAMES - yellow-orange
        for (let i = 0; i < 12; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4
            );

            const velocity = trailDir.clone().multiplyScalar(Math.random() * 0.5 + 0.35);
            velocity.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.25,
                (Math.random() - 0.5) * 0.25,
                (Math.random() - 0.5) * 0.25
            ));

            const particle = new FlameParticle(meteorPos.clone().add(offset), velocity, 'middle');
            fireParticles.push(particle);
            scene.add(particle.sprite);
        }

        // OUTER FLAMES - orange-red
        for (let i = 0; i < 15; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 6
            );

            const velocity = trailDir.clone().multiplyScalar(Math.random() * 0.6 + 0.4);
            velocity.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.35,
                (Math.random() - 0.5) * 0.35,
                (Math.random() - 0.5) * 0.35
            ));

            const particle = new FlameParticle(meteorPos.clone().add(offset), velocity, 'outer');
            fireParticles.push(particle);
            scene.add(particle.sprite);
        }

        // BRIGHT SPARKS - flying off
        if (Math.random() > 0.3) {
            for (let i = 0; i < 8; i++) {
                const sparkVel = new THREE.Vector3(
                    (Math.random() - 0.5) * 1.2,
                    (Math.random() - 0.3) * 0.8,
                    (Math.random() - 0.5) * 1.2
                );
                sparkVel.add(trailDir.clone().multiplyScalar(0.5));

                const spark = new Spark(meteorPos.clone(), sparkVel);
                sparks.push(spark);
                scene.add(spark.sprite);
            }
        }

        // GLOWING EMBERS - floating away slowly
        if (Math.random() > 0.5) {
            for (let i = 0; i < 4; i++) {
                const emberOffset = trailDir.clone().multiplyScalar(3 + Math.random() * 2);
                const emberVel = trailDir.clone().multiplyScalar(0.15);
                emberVel.add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.1,
                    Math.random() * 0.05,
                    (Math.random() - 0.5) * 0.1
                ));

                const ember = new Ember(meteorPos.clone().add(emberOffset), emberVel);
                embers.push(ember);
                scene.add(ember.sprite);
            }
        }
    }

    function updateParticles(delta, time) {
        // Update flames
        for (let i = fireParticles.length - 1; i >= 0; i--) {
            if (!fireParticles[i].update(delta, time)) {
                scene.remove(fireParticles[i].sprite);
                fireParticles[i].dispose();
                fireParticles.splice(i, 1);
            }
        }

        // Update sparks
        for (let i = sparks.length - 1; i >= 0; i--) {
            if (!sparks[i].update(delta, time)) {
                scene.remove(sparks[i].sprite);
                sparks[i].dispose();
                sparks.splice(i, 1);
            }
        }

        // Update embers
        for (let i = embers.length - 1; i >= 0; i--) {
            if (!embers[i].update(delta, time)) {
                scene.remove(embers[i].sprite);
                embers[i].dispose();
                embers.splice(i, 1);
            }
        }
    }

    function onScroll() {
        const rect = section.getBoundingClientRect();
        const sectionHeight = section.offsetHeight - window.innerHeight;

        if (rect.top < window.innerHeight && rect.bottom > 0) {
            const scrolled = -rect.top;
            scrollProgress = Math.max(0, Math.min(1, scrolled / sectionHeight));

            // Meteor appears at 0.55, ends at 0.65 (shorter cosmos, more rocket time)
            if (scrollProgress > 0.55 && scrollProgress < 0.67) {
                // Smooth fade in
                const fadeIn = Math.min((scrollProgress - 0.55) / 0.03, 1);
                // Fade out at the end
                const fadeOut = scrollProgress > 0.63 ? Math.max(0, 1 - (scrollProgress - 0.63) / 0.03) : 1;
                renderer.domElement.style.opacity = (fadeIn * fadeOut).toString();
                if (meteor) meteor.visible = true;
                atmosphereGlow.mesh.visible = true;
            } else {
                renderer.domElement.style.opacity = '0';
                if (meteor) meteor.visible = false;
                atmosphereGlow.mesh.visible = false;
            }
        } else {
            scrollProgress = 0;
            renderer.domElement.style.opacity = '0';
            if (meteor) meteor.visible = false;
            atmosphereGlow.mesh.visible = false;
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

        if (meteor && meteor.visible) {
            // Phase calculation: 0.55 - 0.65 = 0.10 total (shorter cosmos, more rocket time)
            // Phase 1: 0.55-0.58 (0.03) - Emerge from bottom-right edge
            // Phase 2: 0.58-0.62 (0.04) - Slow-mo approach to camera center
            // Phase 3: 0.62-0.65 (0.03) - Fly away into the distance

            const meteorStart = 0.55;
            const phase1End = 0.58;
            const phase2End = 0.62;
            const phase3End = 0.65;

            if (scrollProgress >= meteorStart && scrollProgress < phase3End) {

                if (scrollProgress < phase1End) {
                    // PHASE 1: Emerge from bottom-right corner (Telegram side)
                    const progress = (scrollProgress - meteorStart) / (phase1End - meteorStart);
                    const eased = easeOutCubic(progress);

                    // Start completely off-screen bottom-right, emerge diagonally
                    meteor.position.x = 60 - eased * 30;  // 60 -> 30 (from far right)
                    meteor.position.y = -40 + eased * 25; // -40 -> -15 (from below screen)
                    meteor.position.z = -80 + eased * 50; // -80 -> -30 (coming closer)

                } else if (scrollProgress < phase2End) {
                    // PHASE 2: Slow-motion dramatic approach to camera
                    const progress = (scrollProgress - phase1End) / (phase2End - phase1End);

                    // Use easeOutQuint - starts fast, slows dramatically at the end
                    const eased = easeOutQuint(progress);

                    // Approach EXTREMELY close to camera (camera is at z=30)
                    meteor.position.x = 30 - eased * 27;  // 30 -> 3
                    meteor.position.y = -15 + eased * 14; // -15 -> -1
                    meteor.position.z = -30 + eased * 55; // -30 -> 25 (only 5 units from camera!)

                    // COMPLETE STOP of rotation - freeze in place
                    // Set target rotation - face toward Telegram (bottom-right)
                    const targetRotX = 0.6;   // Tilt down toward bottom
                    const targetRotY = -0.8;  // Rotate to face right side
                    const targetRotZ = -0.2;  // Slight tilt

                    // Extremely strong lerp - almost instant lock
                    const lerpFactor = 0.3;
                    meteor.rotation.x = meteor.rotation.x + (targetRotX - meteor.rotation.x) * lerpFactor;
                    meteor.rotation.y = meteor.rotation.y + (targetRotY - meteor.rotation.y) * lerpFactor;
                    meteor.rotation.z = meteor.rotation.z + (targetRotZ - meteor.rotation.z) * lerpFactor;

                } else {
                    // PHASE 3: Accelerate and fly away into the distance (top-left)
                    const progress = (scrollProgress - phase2End) / (phase3End - phase2End);
                    const eased = easeInQuart(progress); // Accelerating away

                    // Start from Phase 2 end position: x=3, y=-1, z=25
                    meteor.position.x = 3 - eased * 78;   // 3 -> -75 (fly to left)
                    meteor.position.y = -1 + eased * 41;  // -1 -> 40 (fly upward)
                    meteor.position.z = 25 - eased * 110; // 25 -> -85 (fly into distance)
                }

                // Rotation only in phase 1 and phase 3
                // Phase 2 has its own locked rotation logic above
                if (scrollProgress < phase1End) {
                    // Phase 1: Normal rotation while emerging
                    meteor.rotation.x += delta * 1.5 * 1.5;
                    meteor.rotation.y += delta * 1.5 * 2.0;
                    meteor.rotation.z += delta * 1.5 * 1.2;
                } else if (scrollProgress >= phase2End) {
                    // Phase 3: Fast rotation when flying away
                    meteor.rotation.x += delta * 3.0 * 1.5;
                    meteor.rotation.y += delta * 3.0 * 2.0;
                    meteor.rotation.z += delta * 3.0 * 1.2;
                }
                // Phase 2: No additional rotation - handled above with smooth interpolation

                // Update lights with flickering
                const flicker1 = 0.8 + Math.sin(time * 15) * 0.2;
                const flicker2 = 0.85 + Math.sin(time * 23) * 0.15;
                const flicker3 = 0.9 + Math.sin(time * 31) * 0.1;

                // Light intensity increases as meteor gets closer
                const closeness = Math.max(0, (meteor.position.z + 30) / 45);
                const intensityMult = 1 + closeness * 0.5;

                coreLight.position.copy(meteor.position);
                coreLight.intensity = 8 * flicker1 * intensityMult;

                fireLight.position.copy(meteor.position);
                fireLight.position.x += 2;
                fireLight.intensity = 6 * flicker2 * intensityMult;

                ambientFireLight.position.copy(meteor.position);
                ambientFireLight.position.x += 5;
                ambientFireLight.intensity = 4 * flicker3 * intensityMult;

                // Update atmosphere glow - scale with closeness
                atmosphereGlow.update(time, meteor.position);
                atmosphereGlow.mesh.scale.setScalar(1 + closeness * 0.3);

                // Create fire trail - more particles when closer
                const particleMult = 1 + closeness;
                for (let i = 0; i < Math.ceil(particleMult); i++) {
                    createFireTrail(time);
                }

                // Pulsing meteor emission - stronger when close
                if (meteor.traverse) {
                    meteor.traverse((child) => {
                        if (child.isMesh && child.material.emissiveIntensity !== undefined) {
                            child.material.emissiveIntensity = (1.0 + closeness * 0.5) + Math.sin(time * 10) * 0.3;
                        }
                    });
                }
            }
        }

        updateParticles(delta, time);
        renderer.render(scene, camera);
    }

    function easeInOutSine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    function easeOutQuint(t) {
        return 1 - Math.pow(1 - t, 5);
    }

    function easeInQuart(t) {
        return t * t * t * t;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
