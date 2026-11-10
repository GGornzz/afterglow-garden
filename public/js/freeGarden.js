
(() => {
    const scene = document.getElementById('gardenScene');

    if (!scene) return;

    let inventory = [];
    let decorations = [];
    let selectedItem = null;
    let selectedPlacement = null;
    let busy = false;

    const toolbar = document.createElement('section');
    toolbar.className = 'free-garden-toolbar';

    const heading = document.createElement('h3');
    heading.textContent = '🎒 Decoration Inventory';

    const hint = document.createElement('p');
    hint.textContent =
        'ลากไอเทมลงบนสนามหญ้า หรือคลิกเลือกแล้วคลิกตำแหน่งที่ต้องการ';

    const itemsBox = document.createElement('div');
    itemsBox.className = 'free-garden-inventory';

    const message = document.createElement('p');
    message.className = 'free-garden-message';
    message.setAttribute('role', 'status');

    toolbar.append(heading, hint, itemsBox, message);

    scene.insertAdjacentElement('afterend', toolbar);

    function showMessage(text, error = false) {
        message.textContent = text;
        message.style.color = error
            ? '#B04646'
            : '#487A54';
    }

    async function api(url, options = {}) {
        const response = await fetch(url, {
            credentials: 'same-origin',
            cache: 'no-store',
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
            throw new Error(data.message || 'ทำรายการไม่สำเร็จ');
        }

        return data;
    }

    function getPosition(event) {
        const rect = scene.getBoundingClientRect();

        const x = (event.clientX - rect.left) /
            rect.width * 100;

        const y = (event.clientY - rect.top) /
            rect.height * 100;

        // ไม่ให้ไอเทมชิดขอบหรือไปอยู่บนท้องฟ้ามากเกินไป
        return {
            x: Math.max(5, Math.min(95, x)),
            y: Math.max(45, Math.min(92, y))
        };
    }

    function renderInventory() {
        itemsBox.replaceChildren();

        const available = inventory.filter(
            item => item.quantity > 0
        );

        if (!available.length) {
            const empty = document.createElement('p');
            empty.textContent =
                'ยังไม่มีไอเทมว่าง ลองซื้อที่ Garden Shop';
            itemsBox.appendChild(empty);
            selectedItem = null;
            return;
        }

        if (
            selectedItem &&
            !available.some(item => item.id === selectedItem)
        ) {
            selectedItem = null;
        }

        available.forEach(item => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'free-inventory-item';

            if (selectedItem === item.id) {
                button.classList.add('selected');
            }

            button.disabled = busy;
            button.draggable = !busy;

            const icon = document.createElement('span');
            icon.textContent = item.icon;
            icon.className = 'free-inventory-icon';

            const name = document.createElement('span');
            name.textContent = item.name;

            const quantity = document.createElement('strong');
            quantity.textContent = `×${item.quantity}`;

            button.append(icon, name, quantity);

            button.addEventListener('click', () => {
                selectedItem = item.id;
                selectedPlacement = null;
                renderInventory();
                renderDecorations();
            });

            button.addEventListener('dragstart', event => {
                if (busy) {
                    event.preventDefault();
                    return;
                }

                selectedItem = item.id;
                selectedPlacement = null;

                event.dataTransfer.setData(
                    'application/x-afterglow-item',
                    item.id
                );

                event.dataTransfer.effectAllowed = 'copy';
            });

            itemsBox.appendChild(button);
        });
    }

    function createPlacedItem(decoration) {
        const wrapper = document.createElement('div');
        wrapper.className = 'free-placed-item';

        if (selectedPlacement === decoration.placementId) {
            wrapper.classList.add('selected');
        }

        wrapper.style.left = `${decoration.x}%`;
        wrapper.style.top = `${decoration.y}%`;

        const itemButton = document.createElement('button');
        itemButton.type = 'button';
        itemButton.className = 'free-placed-art';
        itemButton.textContent = decoration.icon;
        itemButton.title =
            `ย้าย ${decoration.name} ไปตำแหน่งใหม่`;

        itemButton.draggable = !busy;
        itemButton.disabled = busy;

        itemButton.addEventListener('dragstart', event => {
            if (busy) {
                event.preventDefault();
                return;
            }

            selectedPlacement = decoration.placementId;
            selectedItem = null;

            event.dataTransfer.setData(
                'application/x-afterglow-placement',
                decoration.placementId
            );

            event.dataTransfer.effectAllowed = 'move';
        });

        itemButton.addEventListener('click', event => {
            event.stopPropagation();

            selectedPlacement = decoration.placementId;
            selectedItem = null;

            showMessage(
                `เลือก ${decoration.name} แล้ว ` +
                'คลิกตำแหน่งใหม่ในสวนเพื่อย้าย'
            );

            renderInventory();
            renderDecorations();
        });

        const label = document.createElement('span');
        label.className = 'free-placed-label';
        label.textContent = decoration.name;

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'free-placed-remove';
        remove.textContent = '×';
        remove.title = 'เก็บคืน Inventory';
        remove.setAttribute('aria-label',
            `เก็บ ${decoration.name} คืน Inventory`);

        remove.disabled = busy;

        remove.addEventListener('click', async event => {
            event.stopPropagation();

            const confirmed = window.confirm(
                `เก็บ ${decoration.name} คืน Inventory ใช่หรือไม่?`
            );

            if (!confirmed) return;

            await removeDecoration(decoration.placementId);
        });

        wrapper.append(itemButton, label, remove);

        return wrapper;
    }

    function renderDecorations() {
        let layer = document.getElementById(
            'freeDecorLayer'
        );

        // สร้างใหม่ได้ในกรณีที่ garden.js
        // วาดฉากต้นไม้ใหม่และล้างเนื้อหาภายใน scene
        if (!layer) {
            layer = document.createElement('div');
            layer.id = 'freeDecorLayer';
            layer.className = 'free-decor-layer';
            scene.appendChild(layer);
        }

        layer.replaceChildren();

        decorations.forEach(decoration => {
            layer.appendChild(
                createPlacedItem(decoration)
            );
        });
    }

    async function reload() {
        const data = await api('/api/free-garden');

        decorations = data.decorations || [];
        inventory = data.inventory || [];

        renderInventory();
        renderDecorations();

        // อัปเดตระบบ 8 ช่องเดิมด้วย หากยังมีแสดงอยู่
        if (typeof window.loadDecorations === 'function') {
            await window.loadDecorations();
        }
    }

    async function performAction(action) {
        if (busy) return;

        busy = true;
        renderInventory();
        renderDecorations();

        try {
            const result = await action();

            showMessage(result.message || 'บันทึกสำเร็จ 🌱');
            await reload();
        } catch (error) {
            showMessage(error.message, true);

            try {
                await reload();
            } catch (reloadError) {
                console.error(reloadError);
            }
        } finally {
            busy = false;
            renderInventory();
            renderDecorations();
        }
    }

    async function placeItem(itemId, x, y) {
        await performAction(() =>
            api('/api/free-garden/place', {
                method: 'POST',
                body: JSON.stringify({ itemId, x, y })
            })
        );
    }

    async function moveItem(placementId, x, y) {
        await performAction(() =>
            api(`/api/free-garden/${placementId}/move`, {
                method: 'PATCH',
                body: JSON.stringify({ x, y })
            })
        );
    }

    async function removeDecoration(placementId) {
        await performAction(() =>
            api(`/api/free-garden/${placementId}`, {
                method: 'DELETE'
            })
        );
    }

    // วางจาก Inventory หรือย้ายของเดิม
    scene.addEventListener('dragover', event => {
        if (busy) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        scene.classList.add('free-drop-target');
    });

    scene.addEventListener('dragleave', event => {
        if (!scene.contains(event.relatedTarget)) {
            scene.classList.remove('free-drop-target');
        }
    });

    scene.addEventListener('drop', async event => {
        event.preventDefault();
        scene.classList.remove('free-drop-target');

        if (busy) return;

        const placementId = event.dataTransfer.getData(
            'application/x-afterglow-placement'
        );

        const itemId = event.dataTransfer.getData(
            'application/x-afterglow-item'
        );

        const { x, y } = getPosition(event);

        if (placementId) {
            selectedPlacement = null;
            await moveItem(placementId, x, y);
            return;
        }

        if (itemId) {
            selectedItem = itemId;
            await placeItem(itemId, x, y);
        }
    });

    // โหมดคลิกเลือก แล้วคลิกบนสนามหญ้า
    scene.addEventListener('click', async event => {
        if (busy) return;

        if (event.target.closest('.free-placed-item')) {
            return;
        }

        const { x, y } = getPosition(event);

        if (selectedPlacement) {
            const id = selectedPlacement;
            selectedPlacement = null;

            await moveItem(id, x, y);
            return;
        }

        if (selectedItem) {
            await placeItem(selectedItem, x, y);
        } else {
            showMessage(
                'เลือกไอเทมจาก Inventory ก่อนวางในสวน'
            );
        }
    });

    // ให้ garden.js เรียกซ้ำได้เมื่อวาดต้นไม้ใหม่
    window.renderFreeGarden = renderDecorations;

    async function initialize() {
        try {
            await api('/api/auth/me');
            await reload();
        } catch (error) {
            console.error('Free Garden:', error);
            showMessage(error.message, true);
        }
    }

    initialize();
})();
