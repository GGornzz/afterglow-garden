
const $ = id => document.getElementById(id);

let shopItems = [];
let ownedItems = [];
let currentCoins = 0;
let buying = false;

async function shopAPI(url, options = {}) {
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
        throw new Error(
            data.message || 'เกิดข้อผิดพลาด'
        );
    }

    return data;
}

function createText(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = value;
    return el;
}

function message(text, error = false) {
    const el = $('shopMessage');
    el.textContent = text;
    el.style.color = error ? '#B04646' : '#487A54';
}

function updateWallet() {
    $('shopCoins').textContent =
        currentCoins.toLocaleString();
}

function ownedQuantity(id) {
    return ownedItems.find(x => x.id === id)?.quantity || 0;
}

function createShopCard(item) {
    const card = document.createElement('article');
    card.className = 'shop-item-card';

    const art = createText(
        'div',
        'shop-item-art',
        item.icon
    );

    const category = createText(
        'span',
        'shop-item-category',
        item.category
    );

    const name = createText(
        'h3',
        '',
        item.name
    );

    const description = createText(
        'p',
        'shop-item-description',
        item.description
    );

    const footer = document.createElement('div');
    footer.className = 'shop-item-footer';

    const price = createText(
        'strong',
        'shop-item-price',
        `🪙 ${item.price}`
    );

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shop-buy-btn';

    button.textContent = 'Buy Now';

    if (buying) {
        button.disabled = true;
    } else if (currentCoins < item.price) {
        button.disabled = true;
        button.textContent = 'Not Enough Coins';
    } else {
        button.addEventListener('click', () => {
            purchaseItem(item);
        });
    }

    footer.append(price, button);

    const owned = createText(
        'p',
        'shop-owned-count',
        `Owned: ${ownedQuantity(item.id)}`
    );

    card.append(
        art,
        category,
        name,
        description,
        footer,
        owned
    );

    return card;
}

function renderShop() {
    const filter = $('shopFilter').value;

    const items = shopItems.filter(item =>
        filter === 'All' || item.category === filter
    );

    const grid = $('shopItemsGrid');
    grid.replaceChildren();

    items.forEach(item => {
        grid.appendChild(createShopCard(item));
    });
}

function createInventoryCard(item) {
    const card = document.createElement('article');
    card.className = 'inventory-item-card';

    const icon = createText(
        'div',
        'inventory-icon',
        item.icon
    );

    const name = createText(
        'strong',
        '',
        item.name
    );

    const quantity = createText(
        'span',
        'inventory-quantity',
        `× ${item.quantity}`
    );

    card.append(icon, name, quantity);

    return card;
}

function renderInventory() {
    const grid = $('inventoryGrid');
    grid.replaceChildren();

    ownedItems.forEach(item => {
        grid.appendChild(createInventoryCard(item));
    });

    const total = ownedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    $('inventoryCount').textContent =
        `${total} items`;

    $('inventoryEmpty').hidden = total !== 0;
}

async function loadShop() {
    try {
        const [shop, inventory] = await Promise.all([
            shopAPI('/api/shop/items'),
            shopAPI('/api/shop/inventory')
        ]);

        shopItems = shop.items || [];
        ownedItems = inventory.inventory || [];
        currentCoins = inventory.coins || 0;

        updateWallet();
        renderShop();
        renderInventory();

        console.log('Shop loaded:', shopItems);
        console.log('Inventory loaded:', ownedItems);
    } catch (error) {
        message(error.message, true);
    }
}

async function purchaseItem(item) {
    if (buying) return;

    const confirmed = window.confirm(
        `ซื้อ ${item.name} ราคา ${item.price} Coins ใช่หรือไม่?`
    );

    if (!confirmed) return;

    buying = true;
    renderShop();

    try {
        const data = await shopAPI('/api/shop/purchase', {
            method: 'POST',
            body: JSON.stringify({
                itemId: item.id
            })
        });

        currentCoins = data.coins;
        ownedItems = data.inventory || [];

        updateWallet();
        renderInventory();

        message(`🌿 ${data.message}`);

    } catch (error) {
        message(error.message, true);

        // ตรวจข้อมูลล่าสุดอีกครั้งหลังเกิดข้อผิดพลาด
        await loadShop();
    } finally {
        buying = false;
        renderShop();
    }
}

async function initializeShop() {
    try {
        await shopAPI('/api/auth/me');

        $('shopShell').hidden = false;

        await loadShop();
    } catch (error) {
        console.error('Shop initialization:', error);
    }
}

$('shopFilter').addEventListener('change', renderShop);

initializeShop();

console.log('🪴 AFTERGLOW Garden Shop Loaded');
