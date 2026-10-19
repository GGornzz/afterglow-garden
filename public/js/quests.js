
const $ = id => document.getElementById(id);

let allQuests = [];

async function questAPI(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'same-origin',
        cache: 'no-store',
        ...options
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
        window.location.replace('/');
        throw new Error('กรุณาเข้าสู่ระบบ');
    }

    if (!response.ok) {
        throw new Error(
            data.message || 'เกิดข้อผิดพลาด'
        );
    }

    return data;
}

function showMessage(message, isError = false) {
    const element = $('questMessage');

    element.textContent = message;
    element.style.color = isError
        ? '#B04646'
        : '#487A54';
}

function makeText(tag, className, value) {
    const element = document.createElement(tag);

    element.className = className;
    element.textContent = value;

    return element;
}

function createQuestCard(quest) {
    const card = document.createElement('article');

    card.className = 'quest-card';

    if (quest.claimed) {
        card.classList.add('quest-claimed');
    }

    const top = document.createElement('div');
    top.className = 'quest-card-top';

    const icon = makeText(
        'span',
        'quest-icon',
        quest.icon
    );

    let statusText = 'In Progress';

    if (quest.claimed) {
        statusText = 'Reward Claimed';
    } else if (quest.completed) {
        statusText = 'Ready to Claim';
    }

    const status = makeText(
        'span',
        'quest-status',
        statusText
    );

    if (quest.claimed) {
        status.classList.add('claimed');
    } else if (quest.completed) {
        status.classList.add('ready');
    }

    top.append(icon, status);

    const title = makeText(
        'h3',
        '',
        quest.title
    );

    const description = makeText(
        'p',
        'quest-description',
        quest.description
    );

    const progressHeader = document.createElement('div');
    progressHeader.className = 'quest-progress-header';

    progressHeader.append(
        makeText('span', '', 'Your Progress'),
        makeText(
            'strong',
            '',
            `${quest.progress} / ${quest.target}`
        )
    );

    const track = document.createElement('div');
    track.className = 'quest-progress-track';

    const fill = document.createElement('div');
    fill.className = 'quest-progress-fill';

    fill.style.width = `${Math.min(
        100,
        quest.progress / quest.target * 100
    )
        }%`;

    track.appendChild(fill);

    const rewards = makeText(
        'p',
        'quest-rewards',
        `✨ +${quest.rewardXP} XP  ·  🪙 +${quest.rewardCoins} Coins`
    );

    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'quest-claim-btn';

    if (quest.claimed) {
        button.textContent = '✓ Reward Claimed';
        button.disabled = true;
        button.classList.add('claimed');
    } else if (quest.canClaim) {
        button.textContent = '✦ Claim Reward';

        button.addEventListener('click', () => {
            claimQuest(quest.id, button);
        });
    } else {
        button.textContent = '🔒 Keep Growing';
        button.disabled = true;
    }

    card.append(
        top,
        title,
        description,
        progressHeader,
        track,
        rewards,
        button
    );

    return card;
}

function renderQuests() {
    const dailyGrid = $('dailyQuestGrid');
    const achievementGrid = $('achievementGrid');

    dailyGrid.replaceChildren();
    achievementGrid.replaceChildren();

    allQuests.forEach(quest => {
        const card = createQuestCard(quest);

        if (quest.type === 'daily') {
            dailyGrid.appendChild(card);
        } else {
            achievementGrid.appendChild(card);
        }
    });
}

function updateStats(user) {
    $('questLevel').textContent = user.level;
    $('questXP').textContent = user.xp;
    $('questCoins').textContent = user.coins;
}

async function loadQuests() {
    try {
        const data = await questAPI('/api/quests');

        allQuests = data.quests || [];

        $('questDate').textContent = data.date;

        updateStats(data.user);
        renderQuests();

        console.log('Quests loaded:', allQuests);
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function claimQuest(id, button) {
    button.disabled = true;
    button.textContent = 'Claiming...';

    try {
        const data = await questAPI(
            `/api/quests/${id}/claim`,
            { method: 'POST' }
        );

        showMessage(
            `🏆 รับรางวัลสำเร็จ! ` +
            `+${data.reward.xp} XP และ ` +
            `+${data.reward.coins} Coins`
        );

        await loadQuests();

    } catch (error) {
        showMessage(error.message, true);

        // โหลดสถานะใหม่ เผื่อเคลมสำเร็จแล้ว
        // แต่การเชื่อมต่อมีปัญหาขณะรับผลลัพธ์
        await loadQuests();
    }
}

async function initializeQuests() {
    try {
        await questAPI('/api/auth/me');

        $('questsShell').hidden = false;

        await loadQuests();
    } catch (error) {
        console.error('Quest initialization:', error);
    }
}

initializeQuests();

console.log('🏆 AFTERGLOW STEP 10 Loaded');
