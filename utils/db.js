/**
 * Database — SQLite via sqlite3
 * Stores per-user ticket balances in soundbar.db
 */

const sqlite3 = require('sqlite3').verbose();
const path    = require('path');
const fs      = require('fs');

const dbDir = path.join(__dirname, '..', 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(path.join(dbDir, 'soundbar.db'), (err) => {
    if (err) console.error('[DB] Failed to open database:', err.message);
    else     console.log('[DB] Connected to db/soundbar.db');
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS user_tickets (
            user_id  INTEGER PRIMARY KEY,
            tickets  INTEGER NOT NULL DEFAULT 0
        )
    `, (err) => {
        if (err) console.error('[DB] Failed to create user_tickets table:', err.message);
        else     console.log('[DB] user_tickets table ready');
    });
});

/** Get ticket balance for a user (returns 0 if no row exists) */
function getTickets(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT tickets FROM user_tickets WHERE user_id = ?',
            [Number(userId)],
            (err, row) => {
                if (err) return reject(err);
                resolve(row ? row.tickets : 0);
            }
        );
    });
}

/** Overwrite ticket balance for a user */
function setTickets(userId, amount) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO user_tickets (user_id, tickets) VALUES (?, ?)
             ON CONFLICT(user_id) DO UPDATE SET tickets = excluded.tickets`,
            [Number(userId), Number(amount)],
            (err) => (err ? reject(err) : resolve())
        );
    });
}

/** Add tickets to a user's balance */
async function addTickets(userId, amount) {
    const current = await getTickets(userId);
    return setTickets(userId, current + Number(amount));
}

/**
 * Deduct tickets from a user's balance.
 * Throws if they don't have enough.
 */
async function deductTickets(userId, amount) {
    const current = await getTickets(userId);
    if (current < amount) {
        throw new Error(`Not enough tickets (have ${current}, need ${amount})`);
    }
    return setTickets(userId, current - Number(amount));
}

module.exports = { getTickets, setTickets, addTickets, deductTickets };
