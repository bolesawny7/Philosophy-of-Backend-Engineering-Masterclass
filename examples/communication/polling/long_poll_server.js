// Long Polling Server: Holds connection until new data available.
// Run: node examples/communication/polling/long_poll_server.js

import http from 'http';

// EXPECTED BEHAVIOR:
// - Clients hit /state and the server *holds* the response open until a new value is available.
// - Every 5s currentValue increments; all pending clients receive a 200 with JSON { value }.
// - If a client waits 15s without an update it gets 204 (no content) so it can re-issue the request.
// Use with the short polling client for contrast (short polling wastes requests by always hitting even without changes).

let currentValue = 0;
const subscribers = new Set(); // waiting responses

function broadcastUpdate() {
    if (subscribers.size === 0) {
        return; // nothing waiting
    }
    console.log(`[SERVER] Broadcasting value=${currentValue} to ${subscribers.size} subscriber(s)`);
    for (const res of subscribers) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ value: currentValue, ts: Date.now() }));
    }
    subscribers.clear();
}

setInterval(() => {
    currentValue++; // new data every 5s
    console.log(`[SERVER] Tick value=${currentValue}`);
    broadcastUpdate();
}, 5000);

const server = http.createServer((req, res) => {
    if (req.url === '/state') {
        // Long poll: register subscriber and wait for next broadcast
        subscribers.add(res);
        console.log(`[SERVER] Subscriber added pending=${subscribers.size}`);
        // Timeout safety (avoid hanging forever)
        const timeout = setTimeout(() => {
            if (subscribers.has(res)) {
                console.log('[SERVER] Timeout: responding 204');
                res.writeHead(204);
                res.end();
                subscribers.delete(res);
            }
        }, 15000);
        // If client closes early
        req.on('close', () => {
            clearTimeout(timeout);
            if (subscribers.delete(res)) {
                console.log('[SERVER] Client aborted before update');
            }
        });
    } else {
        res.writeHead(404); res.end();
    }
});

server.listen(4000, () => console.log('Long polling server on :4000 (/state)'));