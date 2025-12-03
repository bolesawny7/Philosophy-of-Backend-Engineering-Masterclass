// Simple Server-Sent Events implementation
// Run: node examples/communication/sse/sse_server.js
// Visit client: open sse_client.html in browser (served statically or via file://)

import http from 'http';

let counter = 0;

const server = http.createServer((req, res) => {
    if (req.url === '/events') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive'
        });
        res.write(`event: init\ndata: {"hello":"world"}\n\n`);
        const interval = setInterval(() => {
            counter++;
            res.write(`data: {"tick":${counter}}\n\n`);
        }, 2000);
        req.on('close', () => clearInterval(interval));
    } else {
        res.writeHead(404); res.end();
    }
});

server.listen(4100, () => console.log('SSE server listening on :4100 /events'));