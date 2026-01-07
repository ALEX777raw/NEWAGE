/**
 * PRISMATIC CAUSTICS - Refractive shader background for hero section
 */

(function() {
    'use strict';

    const heroSection = document.getElementById('section-hero');
    if (!heroSection) return;

    // Create canvas container
    const canvasContainer = document.createElement('div');
    canvasContainer.id = 'prismatic-container';
    canvasContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 0;
        pointer-events: none;
    `;

    const canvas = document.createElement('canvas');
    canvas.id = 'prismatic-canvas';
    canvas.style.cssText = `
        width: 100%;
        height: 100%;
        display: block;
    `;
    canvasContainer.appendChild(canvas);
    heroSection.insertBefore(canvasContainer, heroSection.firstChild);

    const gl = canvas.getContext('webgl');
    if (!gl) {
        console.warn('WebGL not supported for prismatic effect');
        return;
    }

    let width, height;
    let mouseX = 0, mouseY = 0;
    let targetMouseX = 0, targetMouseY = 0;
    let animationId;

    // Vertex shader
    const vertexSrc = `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    // Fragment shader - prismatic caustics
    const fragmentSrc = `
        precision highp float;

        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;

        #define PI 3.14159265359

        vec3 palette(float t) {
            vec3 a = vec3(0.5, 0.5, 0.5);
            vec3 b = vec3(0.5, 0.5, 0.5);
            vec3 c = vec3(1.0, 1.0, 1.0);
            vec3 d = vec3(0.263, 0.416, 0.557);
            return a + b * cos(6.28318 * (c * t + d));
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
            vec2 m = (u_mouse.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);

            vec2 uv0 = uv;
            vec3 finalColor = vec3(0.0);

            // Interaction warp - mouse influence
            float dist = length(uv - m);
            uv += (uv - m) * exp(-dist * 4.0) * 0.2;

            for (float i = 0.0; i < 3.0; i++) {
                uv = fract(uv * 1.5) - 0.5;

                float d = length(uv) * exp(-length(uv0));

                vec3 col = palette(length(uv0) + i * 0.4 + u_time * 0.4);

                d = sin(d * 8.0 + u_time) / 8.0;
                d = abs(d);
                d = pow(0.01 / d, 1.2);

                finalColor += col * d;
            }

            // Vignette
            float vig = 1.0 - length(uv0 * 0.5);
            finalColor *= vig;

            // Darken overall to blend with site theme
            finalColor *= 0.7;

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;

    function createShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexSrc);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSrc);

    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return;
    }

    gl.useProgram(program);

    // Create fullscreen quad
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const mouseLocation = gl.getUniformLocation(program, "u_mouse");

    function resize() {
        const rect = heroSection.getBoundingClientRect();
        width = rect.width;
        height = rect.height;

        // Lower resolution on mobile for performance
        const isMobile = window.innerWidth < 768;
        const pixelRatio = isMobile ? 0.5 : Math.min(window.devicePixelRatio, 1.5);

        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resize);
    resize();

    // Mouse tracking
    window.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        if (e.clientY < rect.bottom && e.clientY > rect.top) {
            targetMouseX = e.clientX;
            targetMouseY = height - (e.clientY - rect.top);
        }
    });

    // Touch support
    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            const rect = heroSection.getBoundingClientRect();
            const touch = e.touches[0];
            if (touch.clientY < rect.bottom && touch.clientY > rect.top) {
                targetMouseX = touch.clientX;
                targetMouseY = height - (touch.clientY - rect.top);
            }
        }
    }, { passive: true });

    let lastTime = 0;
    const targetFPS = 30; // Limit FPS for performance
    const frameInterval = 1000 / targetFPS;

    function render(currentTime) {
        animationId = requestAnimationFrame(render);

        // FPS limiting
        const deltaTime = currentTime - lastTime;
        if (deltaTime < frameInterval) return;
        lastTime = currentTime - (deltaTime % frameInterval);

        const time = currentTime * 0.001;

        // Smooth mouse lerp
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        gl.uniform1f(timeLocation, time);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.uniform2f(mouseLocation, mouseX * (canvas.width / width), mouseY * (canvas.height / height));

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // Start animation
    animationId = requestAnimationFrame(render);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    });

})();
