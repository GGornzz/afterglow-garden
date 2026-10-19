
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const {
    requireAuth
} = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

// รายการสินค้าในร้าน
// ใช้ ID ที่กำหนดไว้ใน Backend เท่านั้น
const ITEMS = [
    {
        id: 'flower-pot',
        name: 'Flower Pot',
        description: 'กระถางดอกไม้สำหรับตกแต่งสวน',
        icon: '🪴',
        category: 'Decorations',
        price: 30
    },
    {
        id: 'sunflower',
        name: 'Sunflower Decor',
        description: 'ดอกทานตะวันเพิ่มความสดใส',
        icon: '🌻',
        category: 'Flowers',
        price: 45
    },
    {
        id: 'garden-bench',
        name: 'Garden Bench',
        description: 'ม้านั่งพักผ่อนในสวนของคุณ',
        icon: '🪑',
        category: 'Furniture',
        price: 80
    },
    {
        id: 'butterfly',
        name: 'Butterfly',
        description: 'ผีเสื้อสีสวยที่มาเยี่ยมสวน',
        icon: '🦋',
        category: 'Decorations',
        price: 55
    },
    {
        id: 'garden-lantern',
        name: 'Garden Lantern',
        description: 'โคมไฟอบอุ่นสำหรับสวน',
        icon: '🏮',
        category: 'Decorations',
        price: 100
    },
    {
        id: 'stone-path',
        name: 'Stone Path',
        description: 'ทางเดินหินสวยงามในสวน',
        icon: '🪨',
        category: 'Furniture',
        price: 65
    }
];

function currentUserId(req) {
    return new ObjectId(req.session.userId);
}

function safeInventory(user) {
    const inventory = user.inventory || {};

    return ITEMS.map(item => ({
        ...item,
        quantity: Number(inventory[item.id] || 0)
    })).filter(item => item.quantity > 0);
}

// ==============================
// GET /api/shop/items
// สินค้าทั้งหมดในร้าน
// ==============================

router.get('/items', async (req, res) => {
    try {
        const user = await getDB()
            .collection('users')
            .findOne(
                { _id: currentUserId(req) },
                { projection: { coins: 1 } }
            );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบข้อมูลสมาชิก'
            });
        }

        res.json({
            success: true,
            items: ITEMS,
            coins: user.coins || 0
        });
    } catch (error) {
        console.error('Shop items:', error);

        res.status(500).json({
            success: false,
            message: 'โหลดสินค้าไม่สำเร็จ'
        });
    }
});

// ==============================
// GET /api/shop/inventory
// ไอเทมที่ผู้ใช้ซื้อไปแล้ว
// ==============================

router.get('/inventory', async (req, res) => {
    try {
        const user = await getDB()
            .collection('users')
            .findOne(
                { _id: currentUserId(req) },
                {
                    projection: {
                        coins: 1,
                        inventory: 1
                    }
                }
            );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบข้อมูลสมาชิก'
            });
        }

        res.json({
            success: true,
            coins: user.coins || 0,
            inventory: safeInventory(user)
        });
    } catch (error) {
        console.error('Shop inventory:', error);

        res.status(500).json({
            success: false,
            message: 'โหลด Inventory ไม่สำเร็จ'
        });
    }
});

// ==============================
// POST /api/shop/purchase
// ซื้อสินค้าโดยหัก Coins
// และเพิ่ม Inventory แบบ Atomic
// ==============================

router.post('/purchase', async (req, res) => {
    try {
        const { itemId } = req.body || {};

        if (typeof itemId !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกสินค้า'
            });
        }

        // ค้นหาราคาจาก Backend
        // ไม่รับราคาที่ Browser ส่งมาเอง
        const item = ITEMS.find(
            product => product.id === itemId
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบสินค้านี้'
            });
        }

        const db = getDB();
        const userId = currentUserId(req);

        // คำสั่งเดียวบน Document ผู้ใช้
        // มีเงื่อนไขว่าต้องมี Coins เพียงพอ
        const result = await db.collection('users')
            .updateOne(
                {
                    _id: userId,
                    coins: { $gte: item.price }
                },
                {
                    $inc: {
                        coins: -item.price,
                        [`inventory.${item.id}`]: 1
                    }
                }
            );

        if (result.matchedCount === 0) {
            const existing = await db
                .collection('users')
                .findOne(
                    { _id: userId },
                    { projection: { coins: 1 } }
                );

            return res.status(
                existing ? 400 : 401
            ).json({
                success: false,
                message: existing
                    ? 'Coins ไม่เพียงพอสำหรับซื้อสินค้านี้'
                    : 'ไม่พบข้อมูลสมาชิก'
            });
        }

        const user = await db.collection('users')
            .findOne(
                { _id: userId },
                {
                    projection: {
                        coins: 1,
                        inventory: 1
                    }
                }
            );

        res.json({
            success: true,
            message: `ซื้อ ${item.name} สำเร็จ! 🌿`,
            purchasedItem: item,
            coins: user.coins,
            inventory: safeInventory(user)
        });
    } catch (error) {
        console.error('Shop purchase:', error);

        res.status(500).json({
            success: false,
            message: 'ซื้อสินค้าไม่สำเร็จ'
        });
    }
});

module.exports = router;
module.exports.ITEMS = ITEMS;