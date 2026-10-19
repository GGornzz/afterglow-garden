
const shell = document.getElementById('dashboardShell');
const logoutBtn = document.getElementById('logoutBtn');

async function requestDashboard(url) {
    const response = await fetch(url, {
        credentials: 'same-origin',
        cache: 'no-store'
    });

    if (response.status === 401) {
        window.location.replace('/');
        throw new Error('กรุณาเข้าสู่ระบบ');
    }

    if (!response.ok) {
        throw new Error('ไม่สามารถโหลดข้อมูลได้');
    }

    return response.json();
}

function renderDashboard(data) {
    const user = data.user;
    const summary = data.summary;

    document.getElementById('welcomeTitle')
        .textContent = `Hello, ${user.username}! 🌱`;

    document.getElementById('userLevel')
        .textContent = user.level;

    document.getElementById('userXP')
        .textContent = user.xp;

    document.getElementById('userCoins')
        .textContent = user.coins;

    document.getElementById('dashboardDate')
        .textContent = data.today;

    document.getElementById('dashboardCompleted')
        .textContent = summary.completedToday;

    document.getElementById('dashboardStreak')
        .textContent = summary.currentStreak;

    document.getElementById('dashboardPlants')
        .textContent = summary.totalPlants;

    document.getElementById('dashboardHabits')
        .textContent = summary.activeHabits;

    document.getElementById('dashboardProgressPercent')
        .textContent = `${summary.todayRate}%`;

    document.getElementById('dashboardProgressFill')
        .style.width = `${summary.todayRate}%`;

    document.getElementById('dashboardProgressLabel')
        .textContent =
        `${summary.completedToday} / ` +
        `${summary.activeHabits} active habits completed`;
}

async function initializeDashboard() {
    try {
        const [auth, statistics] = await Promise.all([
            requestDashboard('/api/auth/me'),
            requestDashboard('/api/statistics')
        ]);

        renderDashboard(statistics);

        document.getElementById('userEmail')
            .textContent = auth.user.email;

        shell.hidden = false;

        console.log('🌿 Dashboard loaded:', statistics);
    } catch (error) {
        console.error('Dashboard error:', error);
        alert(error.message);
    }
}

logoutBtn.addEventListener('click', async () => {
    logoutBtn.disabled = true;
    logoutBtn.textContent = 'Logging out...';

    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error('ออกจากระบบไม่สำเร็จ');
        }

        window.location.replace('/');
    } catch (error) {
        alert(error.message);
        logoutBtn.disabled = false;
        logoutBtn.textContent = '↪ Logout';
    }
});

initializeDashboard();
