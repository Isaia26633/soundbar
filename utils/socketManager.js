/**
 * Socket Manager
 * Handles the socket.io-client connection to Formbar for Digipog transfers.
 */

const { io } = require('socket.io-client');

let socket = null;

/**
 * Connect to Formbar via socket.io.
 * @param {string} formbarUrl - Base URL of the Formbar server
 */
function connect(formbarUrl) {
    if (!formbarUrl) {
        console.error('[Socket] formbarUrl not set — socket transfers unavailable');
        return;
    }

    socket = io(formbarUrl, { transports: ['websocket'], reconnection: true });

    socket.on('connect',       ()      => console.log('[Socket] Connected to Formbar'));
    socket.on('disconnect',    (reason)=> console.log('[Socket] Disconnected:', reason));
    socket.on('connect_error', (err)   => console.error('[Socket] Connection error:', err.message));
}

/**
 * Returns true if the socket is currently connected.
 */
function isSocketConnected() {
    return socket?.connected ?? false;
}

/**
 * Emit an event and wait for an acknowledgement callback response.
 * @param {string} event   - Socket event name
 * @param {object} payload - Payload to send
 * @param {null}   _       - Unused (kept for interface compatibility)
 * @param {number} timeout - Timeout in ms (default 15s)
 * @returns {Promise<object>}
 */
function emitWithResponse(event, payload, _, timeout = 15000) {
    return new Promise((resolve, reject) => {
        if (!socket?.connected) {
            return reject(new Error('Socket not connected to Formbar'));
        }

        const timer = setTimeout(
            () => reject(new Error('Transfer timed out — no response from Formbar')),
            timeout
        );

        socket.emit(event, payload, (response) => {
            clearTimeout(timer);

            if (!response) return reject(new Error('No response from Formbar'));
            if (response.ok || response.success) return resolve(response);

            const err = new Error(response.error || response.message || 'Transfer failed');
            err.details = response;
            reject(err);
        });
    });
}

module.exports = { connect, isSocketConnected, emitWithResponse };
