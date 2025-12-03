// Basic request-response HTTP server with latency logging
// Run: node examples/communication/request_response/http_server.js

import http from 'http';

const server = http.createServer((req, res) => {
    const start = process.hrtime.bigint();
    if (req.url === '/slow') {
        // Simulate CPU work
        let sum = 0;
        for (let i = 0; i < 5_000_000; i++) sum += i;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sum }));
    } else if (req.url === '/fast') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
    } else {
        res.writeHead(404); res.end();
    }
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1e6;
    console.log(`${req.method} ${req.url} -> ${ms.toFixed(2)}ms`);
});

server.listen(4300, () => console.log('HTTP server listening on :4300 (/fast, /slow)'));