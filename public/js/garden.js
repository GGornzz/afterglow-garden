
const $ = id => document.getElementById(id);

let gardenPlants = [];
let previousFocus = null;

async function gardenAPI(url, options = {}) {
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
            data.message || 'เกิดข้อผิดพลาด'
        );
    }

    return data;
}

function showGardenMessage(message, error = false) {
    const element = $('gardenMessage');

    element.textContent = message;
    element.style.color = error
        ? '#B04646'
        : '#487A54';
}

function plantEmoji(plant) {
    if (plant.stage === 1) return '🌰';
    if (plant.stage === 2) return '🌱';
    if (plant.stage === 3) return '🌿';

    return plant.matureEmoji || '🌳';
}

function makeText(tag, className, value) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    element.textContent = value;

    return element;
}

function renderGardenScene() {
    const scene = $('gardenScene');
    scene.replaceChildren();

    $('gardenEmpty').hidden = gardenPlants.length > 0;

    if (gardenPlants.length === 0) {
        scene.appendChild(
            makeText(
                'div',
                'garden-placeholder',
                '🌱 Your little garden begins here.'
            )
        );
        return;
    }

    gardenPlants.forEach(plant => {
        const plot = document.createElement('div');
        plot.className = 'garden-plot';

        const emoji = makeText(
            'div',
            'garden-scene-plant',
            plantEmoji(plant)
        );

        const label = makeText(
            'div',
            'garden-scene-label',
            plant.plantName
        );

        const stage = makeText(
            'div',
            'garden-scene-stage',
            plant.stageName
        );

        plot.append(emoji, label, stage);
        scene.appendChild(plot);
    });
}

function createPlantCard(plant) {
    const card = document.createElement('article');
    card.className = 'garden-plant-card';

    const picture = makeText(
        'div',
        'garden-plant-picture',
        plantEmoji(plant)
    );

    const name = makeText(
        'h3',
        '',
        plant.plantName
    );

    const habit = makeText(
        'p',
        'garden-habit-name',
        `Habit: ${plant.habitTitle}`
    );

    const status = makeText(
        'span',
        'garden-stage-badge',
        `Stage ${plant.stage} · ${plant.stageName}`
    );

    const progressText = makeText(
        'p',
        'garden-progress-text',
        `${plant.completedDays} completed days · ` +
        `${plant.growthPoints} growth points`
    );

    const progressTrack = document.createElement('div');
    progressTrack.className = 'garden-progress-track';

    const progressFill = document.createElement('div');
    progressFill.className = 'garden-progress-fill';

    progressFill.style.width =
        `${Math.min(100, plant.completedDays / 5 * 100)}%`;

    progressTrack.appendChild(progressFill);

    const next = makeText(
        'p',
        'garden-next-stage',
        plant.nextTarget === null
            ? '🌸 Fully grown!'
            : `อีก ${plant.nextTarget - plant.completedDays} ` +
            'วันที่ทำสำเร็จเพื่อเติบโตขั้นถัดไป'
    );

    card.append(
        picture,
        name,
        habit,
        status,
        progressText,
        progressTrack,
        next
    );

    return card;
}

function renderGardenCards() {
    const grid = $('plantsGrid');
    grid.replaceChildren();

    gardenPlants.forEach(plant => {
        grid.appendChild(createPlantCard(plant));
    });
}

function updateGardenStats() {
    $('totalPlants').textContent =
        gardenPlants.length;

    $('maturePlants').textContent =
        gardenPlants.filter(
            plant => plant.stage === 4
        ).length;

    $('totalGrowth').textContent =
        gardenPlants.reduce(
            (sum, plant) => sum + plant.growthPoints,
            0
        );
}

async function loadGarden() {
    try {
        const data = await gardenAPI('/api/garden');

        gardenPlants = data.plants || [];

        renderGardenScene();
        renderGardenCards();
        updateGardenStats();

        console.log('🌿 Garden loaded:', gardenPlants);
    } catch (error) {
        showGardenMessage(error.message, true);
    }
}

async function openPlantModal() {
    previousFocus = document.activeElement;

    try {
        const data = await gardenAPI(
            '/api/garden/available-habits'
        );

        const select = $('selectHabit');
        select.replaceChildren();

        if (!data.habits.length) {
            showGardenMessage(
                'ยังไม่มี Habit ที่พร้อมปลูกต้นไม้ ' +
                'ลองเพิ่ม Habit ใหม่ในหน้า My Habits ก่อน'
            );
            return;
        }

        data.habits.forEach(habit => {
            const option = document.createElement('option');

            option.value = habit._id;
            option.textContent =
                `${habit.title} (${habit.category})`;

            select.appendChild(option);
        });

        $('plantForm').reset();
        $('plantModal').hidden = false;

        $('selectHabit').focus();
    } catch (error) {
        showGardenMessage(error.message, true);
    }
}

function closePlantModal() {
    $('plantModal').hidden = true;

    if (previousFocus?.focus) {
        previousFocus.focus();
    }
}

async function savePlant(event) {
    event.preventDefault();

    const button = $('savePlantBtn');
    button.disabled = true;
    button.textContent = 'Planting...';

    try {
        await gardenAPI('/api/garden/plants', {
            method: 'POST',
            body: JSON.stringify({
                habitId: $('selectHabit').value,
                plantType: $('selectPlant').value
            })
        });

        closePlantModal();

        showGardenMessage(
            '🌱 ปลูกต้นไม้สำเร็จ! ' +
            'ทำ Habit ต่อไปเพื่อให้ต้นไม้เติบโต'
        );

        await loadGarden();
    } catch (error) {
        showGardenMessage(error.message, true);
        closePlantModal();
    } finally {
        button.disabled = false;
        button.textContent = '🌱 Plant My Seed';
    }
}

async function initializeGarden() {
    try {
        await gardenAPI('/api/auth/me');

        $('gardenShell').hidden = false;

        await loadGarden();
        await loadDecorations();
    } catch (error) {
        console.error('Garden error:', error);
    }
}

// EVENTS

$('plantSeedBtn').addEventListener(
    'click',
    openPlantModal
);

$('closePlantModal').addEventListener(
    'click',
    closePlantModal
);

$('plantModal').addEventListener(
    'click',
    event => {
        if (event.target === $('plantModal')) {
            closePlantModal();
        }
    }
);

document.addEventListener('keydown', event => {
    if (
        event.key === 'Escape' &&
        !$('plantModal').hidden
    ) {
        closePlantModal();
    }
});

$('plantForm').addEventListener(
    'submit',
    savePlant
);

initializeGarden();

console.log('🌱 AFTERGLOW Garden Loaded');

// =======================================
// STEP 12 — GARDEN DECORATION SYSTEM
// =======================================

let decorations = [];
let decorationInventory = [];
let selectedDecorItem = null;
let totalDecorSlots = 8;
let decorBusy = false;

function decorText(tag, className, value) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = value;
    return element;
}

function showDecorMessage(text, isError = false) {
    const element = $('decorMessage');
    element.textContent = text;
    element.style.color = isError
        ? '#B04646'
        : '#4D8057';
}

function renderDecorInventory() {
    const container = $('decorInventory');
    container.replaceChildren();

    const available = decorationInventory.filter(
        item => item.quantity > 0
    );

    if (!available.length) {
        container.appendChild(
            decorText(
                'p',
                'decor-empty-message',
                'ยังไม่มีไอเทมใน Inventory ลองซื้อของที่ Garden Shop'
            )
        );

        selectedDecorItem = null;
    }

    if (
        selectedDecorItem &&
        !available.some(item => item.id === selectedDecorItem)
    ) {
        selectedDecorItem = null;
    }

    available.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'decor-inventory-item';

        if (selectedDecorItem === item.id) {
            button.classList.add('selected');
        }

        button.disabled = decorBusy;

        const icon = decorText(
            'span',
            'decor-item-icon',
            item.icon
        );

        const name = decorText(
            'span',
            'decor-item-name',
            item.name
        );

        const quantity = decorText(
            'span',
            'decor-item-quantity',
            `×${item.quantity}`
        );

        button.append(icon, name, quantity);

        button.addEventListener('click', () => {
            selectedDecorItem = item.id;
            renderDecorInventory();
            renderDecorSlots();
        });

        container.appendChild(button);
    });

    const selected = available.find(
        item => item.id === selectedDecorItem
    );

    $('decorSelected').textContent = selected
        ? `Selected: ${selected.icon} ${selected.name}`
        : 'ยังไม่ได้เลือกไอเทม';
}

function renderDecorSlots() {
    const container = $('decorSlots');
    container.replaceChildren();

    for (let slot = 0; slot < totalDecorSlots; slot++) {
        const decoration = decorations.find(
            item => item.slot === slot
        );

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'decoration-slot';
        button.disabled = decorBusy;

        const icon = decorText(
            'span',
            'decoration-slot-icon',
            decoration ? decoration.icon : '+'
        );

        const label = decorText(
            'span',
            'decoration-slot-label',
            decoration ? decoration.name : `Slot ${slot + 1}`
        );

        button.append(icon, label);

        if (decoration) {
            button.classList.add('occupied');
            button.title = `เก็บ ${decoration.name} คืน Inventory`;

            button.addEventListener('click', () => {
                removeDecoration(decoration);
            });
        } else {
            button.title = selectedDecorItem
                ? 'คลิกเพื่อวางของตกแต่ง'
                : 'เลือกไอเทมจาก Inventory ก่อน';

            button.addEventListener('click', () => {
                placeDecoration(slot);
            });
        }

        container.appendChild(button);
    }

    $('decorSlotCount').textContent =
        `${decorations.length} / ${totalDecorSlots} placed`;
}

async function loadDecorations() {
    try {
        const data = await gardenAPI('/api/decor');

        decorations = data.decorations || [];
        decorationInventory = data.inventory || [];
        totalDecorSlots = data.totalSlots || 8;

        renderDecorInventory();
        renderDecorSlots();

        console.log('Garden decorations:', decorations);
    } catch (error) {
        showDecorMessage(error.message, true);
    }
}

async function placeDecoration(slot) {
    if (decorBusy) return;

    if (!selectedDecorItem) {
        showDecorMessage(
            'กรุณาเลือกของตกแต่งจาก Inventory ก่อน'
        );
        return;
    }

    const item = decorationInventory.find(
        product => product.id === selectedDecorItem
    );

    if (!item || item.quantity < 1) {
        showDecorMessage(
            'ไอเทมนี้ไม่มีใน Inventory แล้ว',
            true
        );
        await loadDecorations();
        return;
    }

    decorBusy = true;
    renderDecorInventory();
    renderDecorSlots();

    try {
        const data = await gardenAPI(
            '/api/decor/place',
            {
                method: 'POST',
                body: JSON.stringify({
                    itemId: selectedDecorItem,
                    slot
                })
            }
        );

        showDecorMessage(data.message);
    } catch (error) {
        showDecorMessage(error.message, true);
    } finally {
        decorBusy = false;
        await loadDecorations();
    }
}

async function removeDecoration(decoration) {
    if (decorBusy) return;

    const confirmed = window.confirm(
        `เก็บ ${decoration.name} คืน Inventory ใช่หรือไม่?`
    );

    if (!confirmed) return;

    decorBusy = true;
    renderDecorInventory();
    renderDecorSlots();

    try {
        const data = await gardenAPI(
            `/api/decor/${decoration.placementId}`,
            { method: 'DELETE' }
        );

        showDecorMessage(data.message);
    } catch (error) {
        showDecorMessage(error.message, true);
    } finally {
        decorBusy = false;
        await loadDecorations();
    }
}

console.log('🪴 AFTERGLOW Decoration System Loaded');
