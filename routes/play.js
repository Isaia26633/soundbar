const express    = require('express');
const router     = express.Router();
const { isAuthenticated }      = require('../utils/middleware');
const { isOwner }              = require('../utils/owners');
const { transfer }             = require('../utils/transferManager');
const { getTickets, deductTickets } = require('../utils/db');

const FORMPIX_URL      = process.env.formpixUrl;
const API_KEY          = process.env.apiKey;
const POOL_ID          = Number(process.env.poolID);
const TICKETS_PER_PLAY = 5;
const FLAT_PRICE       = 25;

// POST /api/play
router.post('/api/play', isAuthenticated, async (req, res) => {
    const { sfx, bgm, pin, useTickets } = req.body;
    const userId = req.session.userId;
    const owner   = isOwner(userId);

    if (!sfx && !bgm) {
        return res.status(400).json({ error: 'Must provide sfx or bgm.' });
    }

    if (!owner) {
        if (!POOL_ID || isNaN(POOL_ID)) {
            return res.status(500).json({ error: 'Server misconfigured: POOL_ID not set.' });
        }

        if (useTickets) {
            // --- Ticket path ---
            try {
                const balance = await getTickets(userId);
                if (balance < TICKETS_PER_PLAY) {
                    return res.status(402).json({ error: `Not enough tickets (have ${balance}, need ${TICKETS_PER_PLAY}).` });
                }
                await deductTickets(userId, TICKETS_PER_PLAY);
                console.log(`[Payment] Deducted ${TICKETS_PER_PLAY} tickets from ${userId} — ${balance - TICKETS_PER_PLAY} remaining`);
            } catch (err) {
                console.error('[Payment] Ticket deduction failed:', err.message);
                return res.status(402).json({ error: err.message });
            }
        } else {
            // --- Flat digipog path ---
            if (!pin) {
                return res.status(400).json({ error: 'PIN is required.' });
            }
            try {
                console.log(`[Payment] Charging ${FLAT_PRICE} digi from ${userId} to pool ${POOL_ID}`);
                await transfer({
                    from:   Number(userId),
                    to:     POOL_ID,
                    amount: FLAT_PRICE,
                    pin:    Number(pin),
                    reason: `Soundbar — ${sfx || bgm}`
                });
                console.log('[Payment] Transfer successful');
            } catch (err) {
                console.error('[Payment] Transfer failed:', err.message);
                return res.status(402).json({ error: err.message || 'Payment failed.' });
            }
        }
    } else {
        console.log(`[Payment] Owner ${userId} (${req.session.user}) — bypassing payment`);
    }

    // Play the sound on Formpix
    const params = new URLSearchParams();
    if (sfx) params.append('sfx', sfx);
    if (bgm) params.append('bgm', bgm);
    const url = `${FORMPIX_URL}/api/playSound?${params.toString()}`;
    console.log('[Formpix] Playing:', url);

    try {
        const response = await fetch(url, {
            method:  'POST',
            headers: { 'API': API_KEY, 'Content-Type': 'application/json' }
        });
        console.log('[Formpix] playSound response:', response.status, response.statusText);
        // Return updated ticket balance so client can refresh display immediately
        const ticketBalance = owner ? null : await getTickets(userId).catch(() => null);
        res.status(response.status).json({ status: response.status, tickets: ticketBalance });
    } catch (err) {
        console.error('[Formpix] playSound error:', err);
        res.status(500).json({ error: 'Failed to contact Formpix.' });
    }
});

module.exports = router;
