
/* =========================================
   AFTERGLOW GARDEN 2.0
   STEP 20.2 — MY HABITS UPGRADE
   ========================================= */

(() => {
    const $ = id => document.getElementById(id);

    const grid = $('habitsGrid');
    const summary = document.querySelector('.habit-summary');

    if (!grid || !summary) return;

    // =====================================
    // 1. DAILY PROGRESS COMPONENT
    // =====================================

    const progressSection = document.createElement('section');
    progressSection.className = 'habits-v2-progress';

    const heading = document.createElement('div');
    heading.className = 'habits-v2-progress-heading';

    const headingText = document.createElement('div');

    const eyebrow = document.createElement('span');
    eyebrow.className = 'habits-v2-eyebrow';
    eyebrow.textContent = 'YOUR DAILY JOURNEY';

    const title = document.createElement('h2');
    title.textContent = "Today's Progress 🌱";

    const subtitle = document.createElement('p');
    subtitle.id = 'habitsV2Subtitle';
    subtitle.textContent = 'Every small step counts.';

    headingText.append(eyebrow, title, subtitle);

    const percent = document.createElement('strong');
    percent.id = 'habitsV2Percent';
    percent.className = 'habits-v2-percent';
    percent.textContent = '0%';

    heading.append(headingText, percent);

    const track = document.createElement('div');
    track.className = 'habits-v2-progress-track';

    const fill = document.createElement('div');
    fill.id = 'habitsV2Fill';
    fill.className = 'habits-v2-progress-fill';

    track.appendChild(fill);

    const footer = document.createElement('div');
    footer.className = 'habits-v2-progress-footer';

    const count = document.createElement('span');
    count.id = 'habitsV2Count';
    count.textContent = '0 of 0 habits completed';

    const encouragement = document.createElement('span');
    encouragement.id = 'habitsV2Encouragement';
    encouragement.textContent = 'Keep growing 🌿';

    footer.append(count, encouragement);

    progressSection.append(heading, track, footer);

    // วางหลังการ์ดสถิติเดิม
    summary.insertAdjacentElement('afterend', progressSection);

    // =====================================
    // 2. RENDER PROGRESS FROM HABIT DATA
    // =====================================

    function refreshHabitsV2(habits = []) {
        // นับเฉพาะ Habit ที่เปิดใช้งาน
        const active = habits.filter(h => h.isActive);

        const completed = active.filter(
            h => h.completedToday
        ).length;

        const total = active.length;

        const progress = total > 0
            ? Math.round(completed / total * 100)
            : 0;

        $('habitsV2Percent').textContent = `${progress}%`;
        $('habitsV2Fill').style.width = `${progress}%`;

        $('habitsV2Count').textContent =
            `${completed} of ${total} active habits completed`;

        if (total === 0) {
            $('habitsV2Subtitle').textContent =
                'Create your first habit to start growing.';

            $('habitsV2Encouragement').textContent =
                '🌱 Your journey begins here';
        } else if (progress === 100) {
            $('habitsV2Subtitle').textContent =
                'Amazing! All your active habits are complete.';

            $('habitsV2Encouragement').textContent =
                '🏆 Perfect day!';
        } else if (progress >= 50) {
            $('habitsV2Subtitle').textContent =
                'You are making wonderful progress today.';

            $('habitsV2Encouragement').textContent =
                '✨ Almost there!';
        } else {
            $('habitsV2Subtitle').textContent =
                'A little progress today creates growth tomorrow.';

            $('habitsV2Encouragement').textContent =
                '🌿 Keep growing!';
        }

        // เพิ่มสถานะตกแต่งให้การ์ดที่ Complete แล้ว
        grid.querySelectorAll('.habit-card')
            .forEach(card => {
                const isDone = card.querySelector(
                    '.complete-habit-btn.already-done'
                );

                card.classList.toggle(
                    'habit-card-v2-done',
                    Boolean(isDone)
                );
            });
    }

    // =====================================
    // 3. COMPLETION CELEBRATION
    // =====================================

    function celebrateHabitV2(habitTitle, earnedXP, earnedCoins) {
        const old = document.getElementById('habitV2Celebration');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'habitV2Celebration';
        overlay.className = 'habits-v2-celebration';

        const panel = document.createElement('div');
        panel.className = 'habits-v2-celebration-panel';

        const trophy = document.createElement('div');
        trophy.className = 'habits-v2-trophy';
        trophy.textContent = '🌟';

        const title = document.createElement('h2');
        title.textContent = 'Habit Complete!';

        const description = document.createElement('p');
        description.textContent =
            `You completed "${habitTitle}" today!`;

        const rewards = document.createElement('strong');
        rewards.textContent =
            `✨ +${earnedXP} XP   🪙 +${earnedCoins} Coins`;

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'habits-v2-celebration-close';
        close.textContent = 'Keep Growing 🌿';

        function dismiss() {
            overlay.remove();
        }

        close.addEventListener('click', dismiss);

        panel.append(trophy, title, description, rewards, close);
        overlay.appendChild(panel);

        const colors = [
            '#8FAF91', '#D9B66F',
            '#F1B5A8', '#A9D2DB'
        ];

        // ลดการเคลื่อนไหวหากผู้ใช้ตั้งค่าไว้
        const reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        if (!reducedMotion) {
            for (let i = 0; i < 28; i++) {
                const confetti = document.createElement('span');
                confetti.className = 'habits-v2-confetti';

                confetti.style.left = `${(i * 37) % 100}%`;
                confetti.style.background = colors[i % colors.length];
                confetti.style.animationDelay = `${(i % 7) * 0.1}s`;
                confetti.style.animationDuration =
                    `${2 + (i % 4) * 0.3}s`;

                overlay.appendChild(confetti);
            }
        }

        document.body.appendChild(overlay);
        close.focus();

        // คลิกพื้นหลังเพื่อปิด
        overlay.addEventListener('click', event => {
            if (event.target === overlay) dismiss();
        });

        // ปิดด้วย ESC
        const onKeydown = event => {
            if (event.key === 'Escape') {
                dismiss();
            }
        };

        document.addEventListener('keydown', onKeydown);

        const observer = new MutationObserver(() => {
            if (!overlay.isConnected) {
                document.removeEventListener('keydown', onKeydown);
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true
        });
    }

    // เปิดให้ habits.js เดิมเรียกใช้งาน
    window.refreshHabitsV2 = refreshHabitsV2;
    window.celebrateHabitV2 = celebrateHabitV2;

    console.log('🌱 AFTERGLOW Habits 2.0 Loaded');
})();
