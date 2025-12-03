// Minimal REST example
// Run: node examples/communication/rest/rest_server.js
import http from 'http';

const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET' && req.url === '/users/101') {
        res.end(JSON.stringify({ id: 101, active: true }));
    } else if (req.method === 'POST' && req.url === '/users') {
        let body = ''; req.on('data', c => body += c); req.on('end', () => {
            const data = body ? JSON.parse(body) : {};
            res.statusCode = 201; res.end(JSON.stringify({ ok: true, user: data }));
        });
    } else { res.statusCode = 404; res.end(JSON.stringify({ error: 'not found' })); }
});

server.listen(4500, () => console.log('REST on :4500 (GET /users/101, POST /users)'));