// WebSocket broadcast server
// Install deps: npm install (ws)
// Run: node examples/communication/push/websocket_server.js

import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 4200 });
let clientId = 0;

wss.on("connection", (ws) => {
    const id = ++clientId;
    ws.send(JSON.stringify({ type: "welcome", id }));
    ws.on("message", (data) => {
        for (const client of wss.clients) {
            if (client.readyState === 1) {
                client.send(
                    JSON.stringify({
                        type: "broadcast",
                        from: id,
                        payload: data.toString(),
                    })
                );
            }
        }
    });
});

console.log("WebSocket server on :4200");
console.log(
    'Test in browser console: const ws = new WebSocket("ws://localhost:4200"); ws.onmessage=e=>console.log(e.data); ws.send("hello")'
);
