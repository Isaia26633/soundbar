const express  = require('express');
const router   = express.Router();
const { isAuthenticated } = require('../utils/middleware');
const { transfer }        = require('../utils/transferManager');
const { getTickets, addTickets } = require('../utils/db');

const POOL_ID = Number(process.env.poolID);

const PACKS = {
    starter: { tickets: 20,  cost: 80,  label: 'Starter Pack', discount: 20 },
    value:   { tickets: 50,  cost: 175, label: 'Value Pack',   discount: 30 },
    max:     { tickets: 100, cost: 300, label: 'Max Pack',     discount: 40 },
};

// GET /api/tickets — current balance
router.get('/api/tickets', isAuthenticated, async (req, res) => {
    try {
        const tickets = await getTickets(req.session.userId);
        res.json({ tickets });
    } catch (err) {
        console.error('[Tickets] getTickets error:', err);
        res.status(500).json({ error: 'Failed to get ticket balance.' });
    }
});

// GET /api/tickets/packs — pack definitions
router.get('/api/tickets/packs', isAuthenticated, (req, res) => {
    res.json({ packs: PACKS });
});

// POST /api/tickets/buy — purchase a pack
router.post('/api/tickets/buy', isAuthenticated, async (req, res) => {
    const { packId, pin } = req.body;
    const userId = req.session.userId;
    const pack   = PACKS[packId];

    if (!pack)                         return res.status(400).json({ error: 'Invalid pack.' });
    if (!pin)                          return res.status(400).json({ error: 'PIN is required.' });
    if (!POOL_ID || isNaN(POOL_ID))    return res.status(500).json({ error: 'Server misconfigured: POOL_ID not set.' });

    try {
        console.log(`[Tickets] User ${userId} buying ${pack.label} for ${pack.cost} digi`);
        await transfer({
            from:   Number(userId),
            to:     POOL_ID,
            amount: pack.cost,
            pin:    Number(pin),
            reason: `Soundbar — ${pack.label}`
        });
        await addTickets(userId, pack.tickets);
        const newBalance = await getTickets(userId);
        console.log(`[Tickets] Success — new balance: ${newBalance}`);
        res.json({ tickets: newBalance, added: pack.tickets });
    } catch (err) {
        console.error('[Tickets] Purchase failed:', err.message);
        res.status(402).json({ error: err.message || 'Purchase failed.' });
    }
});

module.exports = router;
