// ====== SEAYTEL DEEP - Three.js Underwater Effect ======

(function() {
    const container = document.getElementById('hero-canvas');
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    // ============ UNDERWATER ENVIRONMENT SHADER ============
    const underwaterVertexShader = `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = vec4(position.xy, 0.999, 1.0);
        }
    `;

    const underwaterFragmentShader = `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;

        varying vec2 vUv;
        varying vec3 vPosition;

        // Simplex noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i);
            vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);
            vec4 x = x_ * ns.x + ns.yyyy;
            vec4 y = y_ * ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
            p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        float fbm(vec3 p) {
            float value = 0.0;
            float amplitude = 0.5;
            float frequency = 1.0;
            for(int i = 0; i < 5; i++) {
                value += amplitude * snoise(p * frequency);
                amplitude *= 0.5;
                frequency *= 2.0;
            }
            return value;
        }

        // Caustics pattern
        float caustics(vec2 uv, float time) {
            vec2 p = uv * 6.0;
            float t = time * 0.3;
            float c = 0.0;
            for(float i = 1.0; i < 4.0; i++) {
                vec2 q = p * i;
                q.x += sin(q.y * 0.9 + t) * 0.4;
                q.y += cos(q.x * 0.8 + t * 0.7) * 0.4;
                float wave = sin(q.x + sin(q.y + t)) * cos(q.y + cos(q.x + t * 0.8));
                c += (1.0 / i) * abs(wave);
            }
            return c * 0.5;
        }

        // Light rays
        float lightRays(vec2 uv, float time) {
            float rays = 0.0;
            for(float i = 0.0; i < 5.0; i++) {
                float offset = i * 0.2 + 0.1;
                float x = uv.x + sin(time * 0.1 + i) * 0.1;
                float ray = smoothstep(0.02, 0.0, abs(x - offset - 0.1 * sin(uv.y * 2.0 + time * 0.2 + i)));
                ray *= (1.0 - uv.y) * 0.8;
                ray *= 0.15 + 0.1 * sin(time * 0.3 + i * 2.0);
                rays += ray;
            }
            return rays;
        }

        void main() {
            vec2 uv = vUv;
            vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);

            // Deep ocean gradient
            vec3 surfaceColor = vec3(0.02, 0.15, 0.25);
            vec3 midColor = vec3(0.01, 0.08, 0.18);
            vec3 deepColor = vec3(0.005, 0.02, 0.08);
            vec3 abyssColor = vec3(0.002, 0.008, 0.03);

            float depth = uv.y;
            vec3 baseColor;
            if(depth > 0.7) {
                baseColor = mix(midColor, surfaceColor, (depth - 0.7) / 0.3);
            } else if(depth > 0.3) {
                baseColor = mix(deepColor, midColor, (depth - 0.3) / 0.4);
            } else {
                baseColor = mix(abyssColor, deepColor, depth / 0.3);
            }

            // Animated water fog
            float fogNoise = fbm(vec3(uv * 3.0, uTime * 0.05)) * 0.5 + 0.5;
            float fogNoise2 = fbm(vec3(uv * 1.5 + 100.0, uTime * 0.03)) * 0.5 + 0.5;
            vec3 fogColor = vec3(0.02, 0.1, 0.15);
            baseColor = mix(baseColor, fogColor, fogNoise * fogNoise2 * 0.3);

            // Caustics from surface light
            float causticsIntensity = caustics(uv * aspect, uTime);
            causticsIntensity *= smoothstep(0.3, 0.9, uv.y);
            vec3 causticsColor = vec3(0.15, 0.4, 0.5) * causticsIntensity * 0.4;
            baseColor += causticsColor;

            // Light rays
            float rays = lightRays(uv, uTime);
            baseColor += vec3(0.1, 0.25, 0.3) * rays;

            // Color variation
            float colorNoise = snoise(vec3(uv * 5.0, uTime * 0.02));
            baseColor += vec3(0.0, 0.02, 0.03) * colorNoise;

            // Mouse-reactive light
            vec2 mouseUV = uMouse * 0.5 + 0.5;
            float mouseDist = length((uv - mouseUV) * aspect);
            float mouseLight = smoothstep(0.5, 0.0, mouseDist) * 0.15;
            baseColor += vec3(0.05, 0.15, 0.2) * mouseLight;

            // Edge fog
            float edgeFog = smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);
            edgeFog *= smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
            baseColor = mix(abyssColor, baseColor, edgeFog * 0.7 + 0.3);

            // Vignette
            float vignette = 1.0 - smoothstep(0.4, 1.2, length((uv - 0.5) * vec2(1.5, 1.0)));
            baseColor *= vignette * 0.7 + 0.3;

            gl_FragColor = vec4(baseColor, 1.0);
        }
    `;

    // Background quad
    const bgGeometry = new THREE.PlaneGeometry(2, 2);
    const bgMaterial = new THREE.ShaderMaterial({
        vertexShader: underwaterVertexShader,
        fragmentShader: underwaterFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(width, height) },
            uMouse: { value: new THREE.Vector2(0, 0) }
        },
        depthWrite: false,
        depthTest: false
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    const bgScene = new THREE.Scene();
    bgScene.add(bgMesh);
    const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // ============ BIOLUMINESCENT ORBS ============
    const orbCount = window.innerWidth < 768 ? 8 : 15;
    const orbs = [];

    const orbVertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const orbFragmentShader = `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uPulse;
        varying vec2 vUv;

        void main() {
            vec2 center = vUv - 0.5;
            float dist = length(center);
            float pulse = 0.8 + 0.2 * sin(uTime * 2.0 + uPulse);
            float core = smoothstep(0.15, 0.0, dist) * pulse;
            float innerGlow = smoothstep(0.4, 0.1, dist) * 0.6 * pulse;
            float outerGlow = smoothstep(0.5, 0.2, dist) * 0.3 * pulse;
            float alpha = core + innerGlow + outerGlow;
            vec3 color = uColor * (core * 2.0 + innerGlow * 1.5 + outerGlow);
            color += vec3(0.0, 0.1, 0.15) * outerGlow;
            gl_FragColor = vec4(color, alpha * 0.9);
        }
    `;

    for (let i = 0; i < orbCount; i++) {
        const size = Math.random() * 3 + 1.5;
        const geometry = new THREE.PlaneGeometry(size, size);
        const hue = 0.45 + Math.random() * 0.15;
        const color = new THREE.Color().setHSL(hue, 0.7, 0.5);

        const material = new THREE.ShaderMaterial({
            vertexShader: orbVertexShader,
            fragmentShader: orbFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: color },
                uPulse: { value: Math.random() * Math.PI * 2 }
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            (Math.random() - 0.5) * 60,
            (Math.random() - 0.5) * 35,
            (Math.random() - 0.5) * 20 - 5
        );

        mesh.userData = {
            baseX: mesh.position.x,
            baseY: mesh.position.y,
            phase: Math.random() * Math.PI * 2
        };

        orbs.push(mesh);
        scene.add(mesh);
    }

    // ============ PARTICLES (PLANKTON) ============
    const particleCount = window.innerWidth < 768 ? 800 : 1500;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 80;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 5;
        sizes[i] = Math.random() * 2 + 0.5;
        alphas[i] = Math.random();
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particleGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const particleVertexShader = `
        attribute float size;
        attribute float alpha;
        uniform float uTime;
        varying float vAlpha;

        void main() {
            vAlpha = alpha * (0.3 + 0.2 * sin(uTime + position.x * 0.5));
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (150.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    const particleFragmentShader = `
        varying float vAlpha;

        void main() {
            float dist = length(gl_PointCoord - 0.5);
            if(dist > 0.5) discard;
            float alpha = smoothstep(0.5, 0.0, dist) * vAlpha * 0.6;
            vec3 color = vec3(0.5, 0.8, 0.9);
            gl_FragColor = vec4(color, alpha);
        }
    `;

    const particleMaterial = new THREE.ShaderMaterial({
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // ============ 3D TEXT WITH UNDERWATER DISTORTION ============

    // Create main title texture
    const createTextTexture = (text, fontSize, fontWeight, glowColor) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = 2048;
        canvas.height = 512;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.font = `${fontWeight} ${fontSize}px "Inter", "Arial Black", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Multiple glow layers
        for (let i = 0; i < 15; i++) {
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 30 + i * 4;
            ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        }

        // Main text gradient
        const gradient = ctx.createLinearGradient(0, canvas.height * 0.3, 0, canvas.height * 0.7);
        gradient.addColorStop(0, '#a0ffff');
        gradient.addColorStop(0.3, '#60e8e8');
        gradient.addColorStop(0.5, '#40d0d0');
        gradient.addColorStop(0.7, '#30b8b8');
        gradient.addColorStop(1, '#208888');

        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 30;
        ctx.fillStyle = gradient;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        // Inner highlight
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-atop';
        const highlightGradient = ctx.createLinearGradient(0, canvas.height * 0.2, 0, canvas.height * 0.5);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlightGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    };

    // Create subtitle texture
    const createSubtitleTexture = (text, fontSize) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 2048;
        canvas.height = 128;

        ctx.font = `400 ${fontSize}px "JetBrains Mono", "Helvetica Neue", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = 'rgba(0, 180, 200, 0.6)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(120, 200, 210, 0.9)';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    };

    // Text vertex shader with underwater wave distortion
    const textVertexShader = `
        uniform float uTime;
        varying vec2 vUv;
        varying float vDistortion;

        void main() {
            vUv = uv;

            vec3 pos = position;

            // Underwater wave distortion
            float wave1 = sin(pos.x * 0.5 + uTime * 0.8) * 0.12;
            float wave2 = sin(pos.x * 0.3 - uTime * 0.5) * 0.08;
            float wave3 = cos(pos.y * 0.8 + uTime * 0.6) * 0.06;

            pos.y += wave1 + wave2;
            pos.x += wave3;
            pos.z += sin(pos.x * 0.2 + uTime * 0.4) * 0.2;

            vDistortion = wave1 + wave2;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `;

    // Text fragment shader with refraction
    const textFragmentShader = `
        uniform sampler2D uTexture;
        uniform float uTime;
        uniform float uOpacity;
        varying vec2 vUv;
        varying float vDistortion;

        void main() {
            // UV distortion for underwater refraction
            vec2 uv = vUv;
            uv.x += sin(vUv.y * 10.0 + uTime) * 0.003;
            uv.y += cos(vUv.x * 8.0 + uTime * 0.8) * 0.002;

            vec4 texColor = texture2D(uTexture, uv);

            // Color shift based on distortion
            texColor.rgb += vec3(0.0, 0.05, 0.08) * abs(vDistortion);

            texColor.a *= uOpacity;

            gl_FragColor = texColor;
        }
    `;

    // Main title
    const titleTexture = createTextTexture('SEYATEL', 220, '900', 'rgba(0, 200, 200, 0.8)');
    const titleGeometry = new THREE.PlaneGeometry(32, 8, 32, 8);
    const titleMaterial = new THREE.ShaderMaterial({
        vertexShader: textVertexShader,
        fragmentShader: textFragmentShader,
        uniforms: {
            uTexture: { value: titleTexture },
            uTime: { value: 0 },
            uOpacity: { value: 1.0 }
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    titleMesh.position.set(0, 0, 0);
    scene.add(titleMesh);

    // Top subtitle
    const topSubTexture = createSubtitleTexture('КРЕАТИВНЫЙ РАЗРАБОТЧИК', 48);
    const topSubGeometry = new THREE.PlaneGeometry(24, 1.5, 16, 4);
    const topSubMaterial = new THREE.ShaderMaterial({
        vertexShader: textVertexShader,
        fragmentShader: textFragmentShader,
        uniforms: {
            uTexture: { value: topSubTexture },
            uTime: { value: 0 },
            uOpacity: { value: 0.9 }
        },
        transparent: true,
        depthWrite: false
    });
    const topSubMesh = new THREE.Mesh(topSubGeometry, topSubMaterial);
    topSubMesh.position.set(0, 5.5, 0);
    scene.add(topSubMesh);

    // Bottom subtitle 1
    const bottomSub1Texture = createSubtitleTexture('Цифровой ремесленник на границе кода и искусства.', 36);
    const bottomSub1Geometry = new THREE.PlaneGeometry(28, 1.2, 16, 4);
    const bottomSub1Material = new THREE.ShaderMaterial({
        vertexShader: textVertexShader,
        fragmentShader: textFragmentShader,
        uniforms: {
            uTexture: { value: bottomSub1Texture },
            uTime: { value: 0 },
            uOpacity: { value: 0.7 }
        },
        transparent: true,
        depthWrite: false
    });
    const bottomSub1Mesh = new THREE.Mesh(bottomSub1Geometry, bottomSub1Material);
    bottomSub1Mesh.position.set(0, -5, 0);
    scene.add(bottomSub1Mesh);

    // Bottom subtitle 2
    const bottomSub2Texture = createSubtitleTexture('Создаю текучие визуальные опыты.', 36);
    const bottomSub2Geometry = new THREE.PlaneGeometry(22, 1.2, 16, 4);
    const bottomSub2Material = new THREE.ShaderMaterial({
        vertexShader: textVertexShader,
        fragmentShader: textFragmentShader,
        uniforms: {
            uTexture: { value: bottomSub2Texture },
            uTime: { value: 0 },
            uOpacity: { value: 0.7 }
        },
        transparent: true,
        depthWrite: false
    });
    const bottomSub2Mesh = new THREE.Mesh(bottomSub2Geometry, bottomSub2Material);
    bottomSub2Mesh.position.set(0, -6.8, 0);
    scene.add(bottomSub2Mesh);

    // ============ ANIMATION ============
    const clock = new THREE.Clock();
    let animationId;

    const animate = () => {
        animationId = requestAnimationFrame(animate);
        const time = clock.getElapsedTime();

        // Smooth mouse
        mouse.x += (mouse.targetX - mouse.x) * 0.05;
        mouse.y += (mouse.targetY - mouse.y) * 0.05;

        // Update background
        bgMaterial.uniforms.uTime.value = time;
        bgMaterial.uniforms.uMouse.value.set(mouse.x, mouse.y);

        // Update orbs
        orbs.forEach((orb) => {
            orb.material.uniforms.uTime.value = time;
            orb.position.x = orb.userData.baseX + Math.sin(time * 0.3 + orb.userData.phase) * 2;
            orb.position.y = orb.userData.baseY + Math.cos(time * 0.2 + orb.userData.phase) * 1.5;
            orb.lookAt(camera.position);
        });

        // Update particles
        particleMaterial.uniforms.uTime.value = time;
        const posArray = particleGeometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            posArray[i * 3 + 1] += 0.01 + Math.sin(time + i) * 0.003;
            posArray[i * 3] += Math.sin(time * 0.5 + i * 0.1) * 0.003;
            if (posArray[i * 3 + 1] > 25) {
                posArray[i * 3 + 1] = -25;
                posArray[i * 3] = (Math.random() - 0.5) * 80;
            }
        }
        particleGeometry.attributes.position.needsUpdate = true;

        // Update text
        titleMaterial.uniforms.uTime.value = time;
        topSubMaterial.uniforms.uTime.value = time;
        bottomSub1Material.uniforms.uTime.value = time;
        bottomSub2Material.uniforms.uTime.value = time;

        // Camera movement
        camera.position.x = mouse.x * 2;
        camera.position.y = mouse.y * 1.5;
        camera.lookAt(0, 0, 0);

        // Render
        renderer.autoClear = false;
        renderer.clear();
        renderer.render(bgScene, bgCamera);
        renderer.render(scene, camera);
    };

    animate();

    // Event handlers
    const handleMouseMove = (e) => {
        mouse.targetX = (e.clientX / width - 0.5) * 2;
        mouse.targetY = -(e.clientY / height - 0.5) * 2;
    };

    const handleResize = () => {
        width = container.clientWidth;
        height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        bgMaterial.uniforms.uResolution.value.set(width, height);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Cleanup function
    window.cleanupUnderwater = () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', handleResize);
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
        }
    };
})();
