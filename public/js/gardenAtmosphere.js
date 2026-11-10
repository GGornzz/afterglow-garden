
/* ====================================
   AFTERGLOW GARDEN 2.0 — STEP 19
   Garden Animation & Atmosphere
   ==================================== */

(() => {
    const scene = document.getElementById('gardenScene');

    if (!scene) return;

    // ป้องกันการเพิ่มเอฟเฟกต์ซ้ำ
    if (document.getElementById('gardenAtmosphere')) {
        return;
    }

    const atmosphere = document.createElement('div');
    atmosphere.id = 'gardenAtmosphere';
    atmosphere.className = 'garden-atmosphere';
    atmosphere.setAttribute('aria-hidden', 'true');

    // ใช้ DOM สร้างองค์ประกอบ เพื่อไม่ให้กระทบต้นไม้
    function createEffect(className, styles = {}) {
        const element = document.createElement('span');
        element.className = className;

        for (const [property, value] of Object.entries(styles)) {
            element.style.setProperty(property, value);
        }

        atmosphere.appendChild(element);
        return element;
    }

    // ===========================
    // 1. SUNLIGHT
    // ===========================

    createEffect('atmosphere-sun');

    // ===========================
    // 2. MOVING CLOUDS
    // ===========================

    [
        { y: '9%', delay: '-8s', duration: '35s' },
        { y: '23%', delay: '-23s', duration: '48s' },
        { y: '5%', delay: '-30s', duration: '57s' }
    ].forEach(cloud => {
        createEffect('atmosphere-cloud', {
            '--cloud-y': cloud.y,
            '--cloud-delay': cloud.delay,
            '--cloud-duration': cloud.duration
        });
    });

    // ===========================
    // 3. BUTTERFLIES
    // ===========================

    const butterflies = [
        { x: '12%', y: '49%', delay: '-1s', duration: '14s' },
        { x: '64%', y: '56%', delay: '-7s', duration: '18s' },
        { x: '30%', y: '70%', delay: '-11s', duration: '20s' }
    ];

    butterflies.forEach(butterfly => {
        const wrapper = createEffect('atmosphere-butterfly', {
            '--butterfly-x': butterfly.x,
            '--butterfly-y': butterfly.y,
            '--butterfly-delay': butterfly.delay,
            '--butterfly-duration': butterfly.duration
        });

        const wings = document.createElement('span');
        wings.className = 'butterfly-wings';
        wings.textContent = '🦋';

        wrapper.appendChild(wings);
    });

    // ===========================
    // 4. FLOATING LEAVES
    // ===========================

    for (let i = 0; i < 8; i++) {
        const x = 8 + ((i * 17) % 84);
        const y = 45 + ((i * 11) % 44);

        createEffect('atmosphere-leaf', {
            '--leaf-x': `${x}%`,
            '--leaf-y': `${y}%`,
            '--leaf-delay': `${i * -2.4}s`,
            '--leaf-duration': `${9 + (i % 4) * 2}s`
        });
    }

    // ===========================
    // 5. SPARKLES
    // ===========================

    for (let i = 0; i < 12; i++) {
        const x = 6 + ((i * 23) % 88);
        const y = 45 + ((i * 13) % 46);

        createEffect('atmosphere-sparkle', {
            '--sparkle-x': `${x}%`,
            '--sparkle-y': `${y}%`,
            '--sparkle-delay': `${i * -0.7}s`
        });
    }

    scene.appendChild(atmosphere);
    // ติดตั้งบรรยากาศสวนกลับอัตโนมัติ
    // หากระบบ Garden วาดฉากใหม่
    const sceneObserver = new MutationObserver(() => {
        if (!scene.contains(atmosphere)) {
            scene.appendChild(atmosphere);
        }
    });

    sceneObserver.observe(scene, {
        childList: true
    });
    // ===========================
    // 6. ANIMATION CONTROL
    // ===========================

    const controls = document.createElement('div');
    controls.className = 'garden-atmosphere-controls';

    const status = document.createElement('span');
    status.className = 'garden-atmosphere-status';
    status.textContent = '✨ Garden Atmosphere';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'garden-atmosphere-toggle';
    toggle.setAttribute(
        'aria-label',
        'Toggle garden animations'
    );

    const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    );

    // เคารพการตั้งค่าลดภาพเคลื่อนไหวของระบบ
    let animationEnabled = !prefersReducedMotion.matches;

    function updateAnimation() {
        scene.classList.toggle(
            'atmosphere-paused',
            !animationEnabled
        );

        toggle.textContent = animationEnabled
            ? '⏸ Pause Animation'
            : '▶ Play Animation';

        toggle.setAttribute(
            'aria-pressed',
            String(animationEnabled)
        );
    }

    toggle.addEventListener('click', () => {
        animationEnabled = !animationEnabled;
        updateAnimation();
    });

    controls.append(status, toggle);

    // วางปุ่มควบคุมต่อจากฉากสวน
    scene.insertAdjacentElement('afterend', controls);

    updateAnimation();

    console.log(
        '🦋 AFTERGLOW Garden Atmosphere Loaded'
    );
})();
