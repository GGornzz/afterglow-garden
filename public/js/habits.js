
const $ = id => document.getElementById(id);

let allHabits = [];
let lastFocused = null;

const categoryIcons = {
    Education: '📚',
    Health: '💚',
    Productivity: '✨',
    Creativity: '🎨',
    Personal: '🌷'
};

async function api(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers: {
            ...(options.body
                ? { 'Content-Type': 'application/json' }
                : {}),
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
        window.location.replace('/');
        throw new Error('กรุณาเข้าสู่ระบบ');
    }

    if (!response.ok) {
        throw new Error(
            data.message || 'เกิดข้อผิดพลาดในการทำรายการ'
        );
    }

    return data;
}

function showMessage(message, isError = false) {
    const el = $('habitMessage');
    el.textContent = message;
    el.style.color = isError ? '#B04646' : '#4E8058';
}

function openModal(habit = null) {
    lastFocused = document.activeElement;

    $('habitForm').reset();
    $('habitId').value = '';

    $('modalTitle').textContent = habit
        ? 'Edit Habit'
        : 'Create New Habit';

    if (habit) {
        $('habitId').value = habit._id;
        $('habitTitle').value = habit.title;
        $('habitCategory').value = habit.category;
        $('habitDescription').value =
            habit.description || '';
    }

    $('habitModal').hidden = false;
    $('habitTitle').focus();
}

function closeModal() {
    $('habitModal').hidden = true;
    $('habitForm').reset();

    if (lastFocused?.focus) {
        lastFocused.focus();
    }
}

function createHabitCard(habit) {
    const card = document.createElement('article');
    card.className = 'habit-card';

    if (!habit.isActive) {
        card.classList.add('is-paused');
    }

    const top = document.createElement('div');
    top.className = 'habit-card-top';

    const icon = document.createElement('span');
    icon.className = 'habit-icon';
    icon.textContent =
        categoryIcons[habit.category] || '🌱';

    const status = document.createElement('span');
    status.className = habit.completedToday
        ? 'habit-status completed'
        : habit.isActive
            ? 'habit-status active'
            : 'habit-status paused';

    status.textContent = habit.completedToday
        ? '✓ Done Today'
        : habit.isActive
            ? 'Active'
            : 'Paused';

    top.append(icon, status);

    const title = document.createElement('h3');
    title.textContent = habit.title;

    const category = document.createElement('p');
    category.className = 'habit-category';
    category.textContent = habit.category + ' · Daily';

    const description = document.createElement('p');
    description.className = 'habit-description';
    description.textContent =
        habit.description ||
        'A little step toward your goal.';

    const completeBtn = document.createElement('button');
    completeBtn.type = 'button';
    completeBtn.className = 'complete-habit-btn';

    if (habit.completedToday) {
        completeBtn.textContent = '✓ Completed Today';
        completeBtn.disabled = true;
        completeBtn.classList.add('already-done');
    } else if (!habit.isActive) {
        completeBtn.textContent = 'Habit Paused';
        completeBtn.disabled = true;
    } else {
        completeBtn.textContent = '✓ Complete Today  ·  +20 XP';
        completeBtn.addEventListener('click', () => {
            completeHabit(habit, completeBtn);
        });
    }

    const actions = document.createElement('div');
    actions.className = 'habit-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'habit-action-btn';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
        openModal(habit);
    });

    const statusBtn = document.createElement('button');
    statusBtn.type = 'button';
    statusBtn.className = 'habit-action-btn';
    statusBtn.textContent = habit.isActive
        ? 'Pause'
        : 'Activate';

    statusBtn.addEventListener('click', () => {
        changeStatus(habit);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'habit-action-btn danger';
    deleteBtn.textContent = 'Archive';
    deleteBtn.addEventListener('click', () => {
        archiveHabit(habit);
    });

    actions.append(editBtn, statusBtn, deleteBtn);

    card.append(
        top,
        title,
        category,
        description,
        completeBtn,
        actions
    );

    return card;
}

function renderHabits() {
    const filter = $('habitFilter').value;

    const filtered = allHabits.filter(habit => {
        if (filter === 'active') return habit.isActive;
        if (filter === 'paused') return !habit.isActive;
        return true;
    });

    const grid = $('habitsGrid');
    grid.replaceChildren();

    filtered.forEach(habit => {
        grid.appendChild(createHabitCard(habit));
    });

    $('emptyHabits').hidden = filtered.length !== 0;
    $('totalHabits').textContent = allHabits.length;

    $('completedToday').textContent =
        allHabits.filter(h => h.completedToday).length;
}

async function loadRewards() {
    const data = await api('/api/auth/me');

    $('totalXP').textContent = data.user.xp;
    $('totalCoins').textContent = data.user.coins;
}

async function loadHabits() {
    try {
        const data = await api('/api/habits');
        allHabits = data.habits || [];

        renderHabits();
        await loadRewards();

        console.log('🌿 Habits loaded:', allHabits);
    } catch (error) {
        showMessage(error.message, true);
    }
}

// ====================================
// COMPLETE HABIT
// ====================================

async function completeHabit(habit, button) {
    if (habit.completedToday || !habit.isActive) {
        return;
    }

    button.disabled = true;
    button.textContent = 'Saving progress...';

    try {
        const data = await api(
            `/api/habits/${habit._id}/complete`,
            { method: 'POST' }
        );

        showMessage(
            `🌱 ${habit.title} สำเร็จ! ` +
            `ได้รับ +${data.reward.xp} XP ` +
            `และ +${data.reward.coins} Coins`
        );

        await loadHabits();

        console.log('Reward received:', data.reward);
    } catch (error) {
        showMessage(error.message, true);
        await loadHabits();
    }
}

// ====================================
// SAVE HABIT
// ====================================

async function saveHabit(event) {
    event.preventDefault();

    const id = $('habitId').value;

    const payload = {
        title: $('habitTitle').value.trim(),
        category: $('habitCategory').value,
        description: $('habitDescription').value.trim()
    };

    const button = $('saveHabitBtn');
    button.disabled = true;
    button.textContent = 'Saving...';

    try {
        await api(
            id ? `/api/habits/${id}` : '/api/habits',
            {
                method: id ? 'PUT' : 'POST',
                body: JSON.stringify(payload)
            }
        );

        closeModal();
        showMessage(
            id
                ? 'แก้ไขเป้าหมายสำเร็จ 🌿'
                : 'เพิ่มเป้าหมายใหม่สำเร็จ 🌱'
        );

        await loadHabits();
    } catch (error) {
        alert(error.message);
    } finally {
        button.disabled = false;
        button.textContent = 'Save Habit';
    }
}

async function changeStatus(habit) {
    try {
        await api(`/api/habits/${habit._id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
                isActive: !habit.isActive
            })
        });

        showMessage('อัปเดตสถานะสำเร็จ 🌿');
        await loadHabits();
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function archiveHabit(habit) {
    const confirmed = window.confirm(
        `ต้องการปิดใช้งาน "${habit.title}" หรือไม่?`
    );

    if (!confirmed) return;

    try {
        await api(`/api/habits/${habit._id}`, {
            method: 'DELETE'
        });

        showMessage(
            'ปิดใช้งานเป้าหมายแล้ว ประวัติยังคงอยู่'
        );

        await loadHabits();
    } catch (error) {
        showMessage(error.message, true);
    }
}

// ====================================
// PAGE INITIALIZATION
// ====================================

async function initializePage() {
    try {
        await api('/api/auth/me');
        $('habitsShell').hidden = false;
        await loadHabits();
    } catch (error) {
        console.error(error);
        showMessage(error.message, true);
    }
}

$('addHabitBtn').addEventListener('click', () => {
    openModal();
});

$('closeHabitModal').addEventListener(
    'click',
    closeModal
);

$('habitModal').addEventListener('click', event => {
    if (event.target === $('habitModal')) {
        closeModal();
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' &&
        !$('habitModal').hidden) {
        closeModal();
    }
});

$('habitForm').addEventListener('submit', saveHabit);

$('habitFilter').addEventListener(
    'change',
    renderHabits
);

initializePage();

console.log('🌿 AFTERGLOW STEP 7 Loaded');
