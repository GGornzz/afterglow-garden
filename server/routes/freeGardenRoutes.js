
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');
const { ITEMS } = require('./shopRoutes');

const router = express.Router();
router.use(requireAuth);

function ownerId(req) {
    return new ObjectId(req.session.userId);
}

function validId(id) {
    return typeof id === 'string' &&
        /^[0-9a-fA-F]{24}$/.test(id);
}

function validPosition(x, y) {
    return typeof x === 'number' &&
        typeof y === 'number' &&
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        x >= 5 && x <= 95 &&
        y >= 45 && y <= 92;
}

function findItem(id) {
    return ITEMS.find(item => item.id === id);
}

// ตำแหน่งเริ่มต้นของไอเทมจากระบบ 8 ช่องเดิม
function legacyPosition(slot) {
    const index = Number.isInteger(slot)
        ? Math.max(0, Math.min(7, slot))
        : 0;

    return {
        x: 12.5 + (index % 4) * 25,
        y: index < 4 ? 63 : 84
    };
}

function presentDecoration(decoration) {
    const item = findItem(decoration.itemId);
    const legacy = legacyPosition(decoration.slot);

    return {
        placementId: decoration.placementId.toString(),
        itemId: decoration.itemId,
        name: item?.name || 'Decoration',
        icon: item?.icon || '🌱',
        x: typeof decoration.x === 'number'
            ? decoration.x
            : legacy.x,
        y: typeof decoration.y === 'number'
            ? decoration.y
            : legacy.y
    };
}

// GET /api/free-garden
router.get('/', async (req, res) => {
    try {
        const user = await getDB().collection('users')
            .findOne(
                { _id: ownerId(req) },
                {
                    projection: {
                        inventory: 1,
                        gardenDecorations: 1
                    }
                }
            );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบสมาชิก'
            });
        }

        const inventory = user.inventory || {};

        res.json({
            success: true,
            decorations: (user.gardenDecorations || [])
                .map(presentDecoration),
            inventory: ITEMS.map(item => ({
                id: item.id,
                name: item.name,
                icon: item.icon,
                quantity: inventory[item.id] || 0
            })).filter(item => item.quantity > 0)
        });
    } catch (error) {
        console.error('Free garden GET:', error);
        res.status(500).json({
            success: false,
            message: 'โหลดสวนไม่สำเร็จ'
        });
    }
});

// POST /api/free-garden/place
router.post('/place', async (req, res) => {
    try {
        const { itemId, x, y } = req.body || {};
        const item = findItem(itemId);

        if (!item || !validPosition(x, y)) {
            return res.status(400).json({
                success: false,
                message: 'ไอเทมหรือตำแหน่งไม่ถูกต้อง'
            });
        }

        const placementId = new ObjectId();

        // หัก Inventory และเพิ่มไอเทม
        // พร้อมกันภายใน Document เดียว
        const result = await getDB().collection('users')
            .updateOne(
                {
                    _id: ownerId(req),
                    [`inventory.${item.id}`]: { $gte: 1 }
                },
                {
                    $inc: {
                        [`inventory.${item.id}`]: -1
                    },
                    $push: {
                        gardenDecorations: {
                            placementId,
                            itemId: item.id,
                            x,
                            y,
                            placedAt: new Date()
                        }
                    }
                }
            );

        if (!result.matchedCount) {
            return res.status(409).json({
                success: false,
                message: 'ไอเทมใน Inventory ไม่เพียงพอ'
            });
        }

        res.status(201).json({
            success: true,
            message: `วาง ${item.name} สำเร็จ 🌿`
        });
    } catch (error) {
        console.error('Free garden PLACE:', error);
        res.status(500).json({
            success: false,
            message: 'วางของไม่สำเร็จ'
        });
    }
});

// PATCH /api/free-garden/:id/move
router.patch('/:id/move', async (req, res) => {
    try {
        const { x, y } = req.body || {};

        if (
            !validId(req.params.id) ||
            !validPosition(x, y)
        ) {
            return res.status(400).json({
                success: false,
                message: 'รหัสหรือตำแหน่งไม่ถูกต้อง'
            });
        }

        const placementId = new ObjectId(req.params.id);

        const result = await getDB().collection('users')
            .updateOne(
                {
                    _id: ownerId(req),
                    'gardenDecorations.placementId': placementId
                },
                {
                    $set: {
                        'gardenDecorations.$.x': x,
                        'gardenDecorations.$.y': y
                    }
                }
            );

        if (!result.matchedCount) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบของตกแต่ง'
            });
        }

        res.json({
            success: true,
            message: 'ย้ายตำแหน่งสำเร็จ 🌱'
        });
    } catch (error) {
        console.error('Free garden MOVE:', error);
        res.status(500).json({
            success: false,
            message: 'ย้ายตำแหน่งไม่สำเร็จ'
        });
    }
});

// DELETE /api/free-garden/:id
router.delete('/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'รหัสไอเทมไม่ถูกต้อง'
            });
        }

        const db = getDB();
        const userId = ownerId(req);
        const placementId = new ObjectId(req.params.id);

        const user = await db.collection('users').findOne(
            {
                _id: userId,
                'gardenDecorations.placementId': placementId
            },
            {
                projection: { gardenDecorations: 1 }
            }
        );

        const decoration = (user?.gardenDecorations || [])
            .find(item =>
                item.placementId.toString() ===
                placementId.toString()
            );

        if (!decoration) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบไอเทมนี้'
            });
        }

        const item = findItem(decoration.itemId);

        if (!item) {
            return res.status(400).json({
                success: false,
                message: 'ไม่พบชนิดไอเทมในร้านค้า'
            });
        }

        const result = await db.collection('users').updateOne(
            {
                _id: userId,
                gardenDecorations: {
                    $elemMatch: {
                        placementId,
                        itemId: item.id
                    }
                }
            },
            {
                $pull: {
                    gardenDecorations: { placementId }
                },
                $inc: {
                    [`inventory.${item.id}`]: 1
                }
            }
        );

        if (!result.matchedCount) {
            return res.status(409).json({
                success: false,
                message: 'ไอเทมนี้ถูกเก็บไปแล้ว'
            });
        }

        res.json({
            success: true,
            message: `เก็บ ${item.name} คืน Inventory แล้ว`
        });
    } catch (error) {
        console.error('Free garden DELETE:', error);
        res.status(500).json({
            success: false,
            message: 'เก็บไอเทมไม่สำเร็จ'
        });
    }
});

module.exports = router;
