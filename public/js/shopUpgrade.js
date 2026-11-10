
/* =======================================
   AFTERGLOW GARDEN 2.0
   STEP 20.3 — SHOP UI UPGRADE
   ======================================= */

(() => {
    const $ = id => document.getElementById(id);

    const shopGrid = $('shopItemsGrid');
    const inventoryGrid = $('inventoryGrid');
    const header = document.querySelector('.shop-header');

    if (!shopGrid || !inventoryGrid || !header) return;

    function make(tag, className, text) {
        const el = document.createElement(tag);

        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;

        return el;
    }

    // ====================================
    // 1. WELCOME DECORATION
    // ====================================

    const heroDecor = make(
        'div',
        'shop-v2-hero-decor'
    );

    heroDecor.setAttribute('aria-hidden', 'true');

    ['🌱', '🦋', '🌸'].forEach((emoji, index) => {
        const item = make(
            'span',
            `shop-v2-floating deco-${index + 1}`,
            emoji
        );

        heroDecor.appendChild(item);
    });

    const hero = document.querySelector('.shop-hero');

    if (hero) {
        hero.appendChild(heroDecor);
    }

    // ====================================
    // 2. COLLECTION SUMMARY
    // ====================================

    const collection = make(
        'section',
        'shop-v2-collection'
    );

    const collectionIcon = make(
        'div',
        'shop-v2-collection-icon',
        '🎒'
    );

    const collectionText = make(
        'div',
        'shop-v2-collection-text'
    );

    const collectionTitle = make(
        'h3',
        '',
        'Your Garden Collection'
    );

    const collectionSubtitle = make(
        'p',
        '',
        'Start collecting lovely decorations.'
    );

    collectionSubtitle.id = 'shopV2CollectionInfo';

    collectionText.append(
        collectionTitle,
        collectionSubtitle
    );

    collection.append(
        collectionIcon,
        collectionText
    );

    const inventorySection = $('inventorySection');

    if (inventorySection) {
        inventorySection.insertAdjacentElement(
            'beforebegin',
            collection
        );
    }

    // ====================================
    // 3. ENHANCE PRODUCT CARDS
    // ====================================

    function refreshShopV2(items = [], owned = [], coins = 0) {
        const ownedMap = new Map(
            owned.map(item => [item.id, item.quantity])
        );

        // การ์ดสินค้าจาก shop.js เดิม
        const visibleCards = shopGrid.querySelectorAll(
            '.shop-item-card'
        );

        visibleCards.forEach(card => {
            const nameElement = card.querySelector('h3');

            if (!nameElement) return;

            const product = items.find(
                item => item.name === nameElement.textContent
            );

            if (!product) return;

            const quantity = ownedMap.get(product.id) || 0;

            card.classList.toggle(
                'shop-v2-owned',
                quantity > 0
            );

            card.classList.toggle(
                'shop-v2-unaffordable',
                coins < product.price
            );

            // ลบ Badge เดิมก่อน เพื่อไม่ให้ซ้ำ
            const existing = card.querySelector(
                '.shop-v2-badge'
            );

            if (existing) existing.remove();

            if (quantity > 0) {
                const badge = make(
                    'span',
                    'shop-v2-badge',
                    `✓ Owned ×${quantity}`
                );

                card.appendChild(badge);
            }
        });

        // Inventory collection summary
        const totalQuantity = owned.reduce(
            (sum, item) => sum + item.quantity,
            0
        );

        $('shopV2CollectionInfo').textContent =
            `You own ${totalQuantity} decoration(s) ` +
            `from ${owned.length} item type(s).`;

        // สินค้าที่เก็บสะสมแล้ว
        inventoryGrid.querySelectorAll(
            '.inventory-item-card'
        ).forEach(card => {
            card.classList.add('inventory-v2-card');
        });
    }

    // ====================================
    // 4. PURCHASE CELEBRATION
    // ====================================

    function celebratePurchase(item, coinsLeft) {
        const previous = $('shopV2Celebration');
        if (previous) previous.remove();

        const overlay = make(
            'div',
            'shop-v2-celebration'
        );

        overlay.id = 'shopV2Celebration';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute(
            'aria-label',
            'Purchase successful'
        );

        const panel = make(
            'div',
            'shop-v2-celebration-panel'
        );

        const icon = make(
            'div',
            'shop-v2-celebration-icon',
            item.icon
        );

        const heading = make(
            'h2',
            '',
            'New Item Unlocked!'
        );

        const description = make(
            'p',
            '',
            `You purchased ${item.name}!`
        );

        const balance = make(
            'strong',
            '',
            `🪙 ${coinsLeft} Coins remaining`
        );

        const close = make(
            'button',
            'shop-v2-celebration-close',
            'Continue Shopping 🌿'
        );

        close.type = 'button';

        const previousFocus = document.activeElement;

        function dismiss() {
            overlay.remove();
            document.removeEventListener('keydown', onKeydown);

            if (previousFocus?.isConnected) {
                previousFocus.focus();
            }
        }

        function onKeydown(event) {
            if (event.key === 'Escape') dismiss();

            if (event.key === 'Tab') {
                event.preventDefault();
                close.focus();
            }
        }

        close.addEventListener('click', dismiss);

        overlay.addEventListener('click', event => {
            if (event.target === overlay) dismiss();
        });

        panel.append(
            icon,
            heading,
            description,
            balance,
            close
        );

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        document.addEventListener('keydown', onKeydown);
        close.focus();
    }

    // ให้ shop.js เดิมเรียกใช้งานได้
    window.refreshShopV2 = refreshShopV2;
    window.celebratePurchaseV2 = celebratePurchase;

    console.log('🛍️ AFTERGLOW Shop 2.0 Loaded');
})();
