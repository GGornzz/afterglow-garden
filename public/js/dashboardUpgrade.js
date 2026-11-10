
/* ========================================
   AFTERGLOW GARDEN 2.0
   STEP 20.1 — DASHBOARD UPGRADE
   ======================================== */

(() => {
    const dashboard = document.querySelector(
        '.dashboard-content'
    );

    if (!dashboard) return;

    const $ = id => document.getElementById(id);

    function make(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;
    }

    function addLink(parent, text, href, className) {
        const link = make('a', className, text);
        link.href = href;
        parent.appendChild(link);
        return link;
    }

    // =====================================
    // CREATE NEW DASHBOARD COMPONENTS
    // =====================================

    const upgrade = make('div', 'dashboard-v2');
    upgrade.id = 'dashboardV2';

    // WELCOME BANNER

    const hero = make('section', 'dashboard-v2-hero');

    const heroText = make('div', 'dashboard-v2-hero-text');

    heroText.append(
        make('span', 'dashboard-v2-eyebrow',
            'WELCOME TO YOUR GARDEN'),
        make('h2', '', 'Your growth starts here 🌿'),
        make('p', 'dashboard-v2-greeting',
            'Every little step makes your garden bloom.')
    );

    const heroActions = make(
        'div',
        'dashboard-v2-hero-actions'
    );

    addLink(
        heroActions,
        '✓ My Habits',
        '/habits.html',
        'dashboard-v2-button'
    );

    addLink(
        heroActions,
        '🌳 Visit Garden',
        '/garden.html',
        'dashboard-v2-button secondary'
    );

    heroText.appendChild(heroActions);

    const artwork = make('div', 'dashboard-v2-artwork');

    artwork.setAttribute('aria-hidden', 'true');

    const artworkSun = make(
        'div',
        'dashboard-v2-sun'
    );

    const artworkGround = make(
        'div',
        'dashboard-v2-ground'
    );

    const artworkTree = make(
        'div',
        'dashboard-v2-tree'
    );

    const trunk = make('div', 'dashboard-v2-trunk');
    const crown1 = make(
        'div',
        'dashboard-v2-crown crown-one'
    );
    const crown2 = make(
        'div',
        'dashboard-v2-crown crown-two'
    );
    const crown3 = make(
        'div',
        'dashboard-v2-crown crown-three'
    );

    artworkTree.append(
        trunk,
        crown1,
        crown2,
        crown3
    );

    artwork.append(
        artworkSun,
        artworkGround,
        artworkTree
    );

    hero.append(heroText, artwork);

    // =====================================
    // LEVEL PROGRESS
    // =====================================

    const levelCard = make(
        'section',
        'dashboard-v2-level-card'
    );

    const levelTop = make(
        'div',
        'dashboard-v2-level-top'
    );

    const levelInfo = make('div');

    levelInfo.append(
        make('span', 'dashboard-v2-eyebrow',
            'YOUR GROWTH LEVEL'),
        make('h3', '', 'Level 1')
    );

    levelInfo.querySelector('h3').id = 'v2Level';

    const levelXP = make(
        'strong',
        'dashboard-v2-xp',
        '0 / 100 XP'
    );

    levelXP.id = 'v2XP';

    levelTop.append(levelInfo, levelXP);

    const progressTrack = make(
        'div',
        'dashboard-v2-progress-track'
    );

    const progressFill = make(
        'div',
        'dashboard-v2-progress-fill'
    );

    progressFill.id = 'v2XPFill';

    progressTrack.appendChild(progressFill);

    const levelHint = make(
        'p',
        'dashboard-v2-level-hint',
        'Complete your habits to earn more XP.'
    );

    levelHint.id = 'v2LevelHint';

    levelCard.append(
        levelTop,
        progressTrack,
        levelHint
    );

    // =====================================
    // QUICK ACTIONS
    // =====================================

    const quickSection = make(
        'section',
        'dashboard-v2-quick-section'
    );

    quickSection.append(
        make('h3', '', 'Quick Actions')
    );

    const quickGrid = make(
        'div',
        'dashboard-v2-quick-grid'
    );

    const quickActions = [
        {
            icon: '📚',
            title: 'My Habits',
            desc: 'Complete daily goals',
            href: '/habits.html'
        },
        {
            icon: '🌳',
            title: 'My Garden',
            desc: 'Watch your plants grow',
            href: '/garden.html'
        },
        {
            icon: '🏆',
            title: 'Quests',
            desc: 'Claim your rewards',
            href: '/quests.html'
        },
        {
            icon: '🛍️',
            title: 'Garden Shop',
            desc: 'Decorate your world',
            href: '/shop.html'
        }
    ];

    quickActions.forEach(action => {
        const card = make(
            'a',
            'dashboard-v2-quick-card'
        );

        card.href = action.href;

        card.append(
            make('span', 'dashboard-v2-quick-icon',
                action.icon),
            make('strong', '', action.title),
            make('small', '', action.desc)
        );

        quickGrid.appendChild(card);
    });

    quickSection.appendChild(quickGrid);

    // =====================================
    // WEEKLY PROGRESS
    // =====================================

    const weeklySection = make(
        'section',
        'dashboard-v2-weekly-section'
    );

    const weeklyHead = make(
        'div',
        'dashboard-v2-weekly-head'
    );

    const weeklyTitle = make('div');

    weeklyTitle.append(
        make('h3', '', 'This Week’s Growth'),
        make('p', '',
            'Your activity over the last 7 days')
    );

    addLink(
        weeklyHead,
        'View Statistics →',
        '/statistics.html',
        'dashboard-v2-weekly-link'
    );

    weeklyHead.prepend(weeklyTitle);

    const weeklyChart = make(
        'div',
        'dashboard-v2-weekly-chart'
    );

    weeklyChart.id = 'v2WeeklyChart';

    weeklySection.append(
        weeklyHead,
        weeklyChart
    );

    upgrade.append(
        hero,
        levelCard,
        quickSection,
        weeklySection
    );

    // แทรกหลังส่วนหัว Dashboard เดิม
    const heading =
        dashboard.querySelector('header');

    if (heading) {
        heading.insertAdjacentElement(
            'afterend',
            upgrade
        );
    } else {
        dashboard.prepend(upgrade);
    }

    // =====================================
    // RENDER DATA
    // =====================================

    function renderWeekly(days) {
        weeklyChart.replaceChildren();

        const maxValue = Math.max(
            1,
            ...days.map(day => day.count)
        );

        days.forEach(day => {
            const column = make(
                'div',
                'dashboard-v2-weekly-column'
            );

            const count = make(
                'span',
                'dashboard-v2-weekly-count',
                String(day.count)
            );

            const barArea = make(
                'div',
                'dashboard-v2-weekly-bar-area'
            );

            const bar = make(
                'div',
                'dashboard-v2-weekly-bar'
            );

            bar.style.height =
                `${(day.count / maxValue) * 100}%`;

            barArea.appendChild(bar);

            const [year, month, date] =
                day.date.split('-').map(Number);

            const dayName = new Date(
                Date.UTC(year, month - 1, date)
            ).toLocaleDateString('en-US', {
                weekday: 'short',
                timeZone: 'UTC'
            });

            const label = make(
                'span',
                'dashboard-v2-weekly-day',
                dayName
            );

            column.append(count, barArea, label);
            weeklyChart.appendChild(column);
        });
    }

    function renderDashboardV2(data) {
        const user = data.user;
        const summary = data.summary;

        const xp = user.xp || 0;
        const level = Math.floor(xp / 100) + 1;
        const currentXP = xp % 100;
        const remainingXP = 100 - currentXP;

        hero.querySelector('.dashboard-v2-greeting')
            .textContent =
            `Welcome back, ${user.username}! ` +
            `You've completed ${summary.completedToday} ` +
            `habit(s) today. Keep growing!`;

        $('v2Level').textContent =
            `Level ${level} 🌱`;

        $('v2XP').textContent =
            `${currentXP} / 100 XP`;

        $('v2XPFill').style.width =
            `${currentXP}%`;

        $('v2LevelHint').textContent =
            `${remainingXP} XP until Level ${level + 1}`;

        renderWeekly(data.last7Days || []);
    }

    async function loadDashboardV2() {
        try {
            const response = await fetch(
                '/api/statistics',
                {
                    credentials: 'same-origin',
                    cache: 'no-store'
                }
            );

            if (response.status === 401) {
                window.location.replace('/');
                return;
            }

            if (!response.ok) {
                throw new Error('โหลดข้อมูล Dashboard ไม่สำเร็จ');
            }

            const data = await response.json();

            renderDashboardV2(data);

            console.log(
                '🌿 Dashboard 2.0 loaded',
                data
            );
        } catch (error) {
            console.error(error);

            $('v2LevelHint').textContent =
                'ไม่สามารถโหลดข้อมูลความก้าวหน้าได้';
        }
    }

    loadDashboardV2();
})();
