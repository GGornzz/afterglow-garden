
const $ = id => document.getElementById(id);

async function loadStatisticsAPI() {
    const response = await fetch('/api/statistics', {
        credentials: 'same-origin',
        cache: 'no-store'
    });

    if (response.status === 401) {
        window.location.replace('/');
        throw new Error('กรุณาเข้าสู่ระบบ');
    }

    if (!response.ok) {
        throw new Error('ไม่สามารถโหลดสถิติได้');
    }

    return response.json();
}

function renderWeeklyChart(days) {
    const chart = $('weeklyChart');
    chart.replaceChildren();

    // ให้ความสูงสูงสุดเท่ากับวันที่ทำได้มากที่สุด
    const maximum = Math.max(
        1,
        ...days.map(day => day.count)
    );

    days.forEach(day => {
        const column = document.createElement('div');
        column.className = 'weekly-chart-column';

        const number = document.createElement('span');
        number.className = 'weekly-chart-number';
        number.textContent = day.count;

        const track = document.createElement('div');
        track.className = 'weekly-chart-track';

        const bar = document.createElement('div');
        bar.className = 'weekly-chart-bar';

        const percent = day.count === 0
            ? 0
            : day.count / maximum * 100;

        bar.style.height = `${percent}%`;

        track.appendChild(bar);

        const label = document.createElement('span');
        label.className = 'weekly-chart-label';

        const [year, month, date] = day.date
            .split('-')
            .map(Number);

        const dayOfWeek = new Date(
            Date.UTC(year, month - 1, date)
        ).toLocaleDateString('en-US', {
            weekday: 'short',
            timeZone: 'UTC'
        });

        label.textContent = dayOfWeek;

        column.append(number, track, label);
        chart.appendChild(column);
    });

    chart.setAttribute(
        'aria-label',
        days.map(day =>
            `${day.date}: ${day.count} completions`
        ).join(', ')
    );
}

function renderStatistics(data) {
    const summary = data.summary;

    $('statCompletions').textContent =
        summary.totalCompletions;

    $('statStreak').textContent =
        summary.currentStreak;

    $('statBest').textContent =
        summary.bestStreak;

    $('statPlants').textContent =
        summary.totalPlants;

    $('statTotalHabits').textContent =
        summary.totalHabits;

    $('statActiveHabits').textContent =
        summary.activeHabits;

    $('statPausedHabits').textContent =
        summary.pausedHabits;

    $('todayPercent').textContent =
        `${summary.todayRate}%`;

    $('todayProgressFill').style.width =
        `${summary.todayRate}%`;

    $('todayProgressLabel').textContent =
        `${summary.completedToday} of ` +
        `${summary.activeHabits} active habits completed`;

    renderWeeklyChart(data.last7Days);
}

async function initializeStatistics() {
    try {
        const data = await loadStatisticsAPI();

        renderStatistics(data);
        $('statsShell').hidden = false;

        console.log('📊 Statistics loaded:', data);
    } catch (error) {
        console.error(error);
        $('statsMessage').textContent = error.message;
        alert('โหลดสถิติไม่สำเร็จ: ' + error.message);
    }
}

initializeStatistics();
