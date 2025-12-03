// In-memory queue demo with producer & consumer and simple backpressure.
// Run (terminal only logs): node examples/communication/queues/in_memory_queue.js
// Run (with browser UI): node examples/communication/queues/in_memory_queue.js and open queue_client.html

class Queue {
    constructor(maxSize = 50) {
        this.items = [];
        this.maxSize = maxSize;
    }
    push(item) {
        if (this.items.length >= this.maxSize) return false;
        this.items.push(item);
        return true;
    }
    shift() {
        return this.items.shift();
    }
    size() {
        return this.items.length;
    }
}

import http from "http";

const queue = new Queue(20);
let produced = 0;
let consumed = 0;
let running = true; // consumer runs; no automatic producer
let consumePollMs = 50; // default consumer poll cadence

// --- SSE server for browser UI ---
const subscribers = new Set();
function sseSend(obj){
    const line = `data: ${JSON.stringify(obj)}\n\n`;
    for (const res of subscribers){ try { res.write(line); } catch{} }
}

const sseServer = http.createServer((req,res)=>{
    // CORS preflight for fetches from file:// client
    if (req.method === 'OPTIONS'){
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'content-type'
        });
        return res.end();
    }
    if (req.url === "/events"){
        res.writeHead(200,{
            "Content-Type":"text/event-stream",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Access-Control-Allow-Origin":"*"
        });
        res.write(`event: init\n`);
        res.write(`data: ${JSON.stringify({ produced, consumed, queueSize: queue.size() })}\n\n`);
        subscribers.add(res);
        req.on("close",()=>{ subscribers.delete(res); });
        return;
    }
    if (req.url.startsWith("/control")){
        const url = new URL(req.url, "http://localhost:4402");
        const action = url.searchParams.get("action");
        if (action === "pause") { running = false; }
        else if (action === "resume") { if (!running){ running = true; consume(); } }
        else if (action === "set") {
            const c = url.searchParams.get("consumeMs");
            if (c) consumePollMs = Math.max(1, Number(c));
        }
        res.writeHead(200,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"});
        res.end(JSON.stringify({ running, consumePollMs }));
        return;
    }
    if (req.url.startsWith('/enqueue')){
        const url = new URL(req.url, 'http://localhost:4402');
        const respond = (obj)=>{ res.writeHead(200,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}); res.end(JSON.stringify(obj)); };
        const addJobs = (count)=>{
            let accepted = 0; let rejected = 0;
            for (let i=0;i<count;i++){
                if (queue.push({ id: ++produced, ts: Date.now() })){
                    accepted++; sseSend({ type:"queued", id: produced, size: queue.size() });
                    console.log(`[PRODUCER] queued job #${produced}`);
                } else { rejected++; sseSend({ type:"backpressure", size: queue.size() }); break; }
            }
            return { accepted, rejected, queueSize: queue.size(), produced };
        };
        if (req.method === 'GET'){
            const count = Math.max(1, Number(url.searchParams.get('count') || 1));
            return respond(addJobs(count));
        }
        if (req.method === 'POST'){
            let body=''; req.on('data', c=> body+=c); req.on('end', ()=>{
                let count=1; try{ const j=JSON.parse(body||'{}'); count = Number(j.count||1); }catch{}
                respond(addJobs(Math.max(1, count)));
            });
            return;
        }
    }
    if (req.url === "/health"){
        res.writeHead(200,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"});
        res.end(JSON.stringify({ ok:true, subscribers: subscribers.size, running, produced, consumed, queueSize: queue.size(), consumePollMs }));
        return;
    }
    res.writeHead(404); res.end();
});
sseServer.listen(4402, ()=> console.log("[SSE] queue events on http://localhost:4402/events"));

// Manual enqueue is done via /enqueue endpoint; auto-producer disabled by default.

function consume() {
    if (!running) return;
    const job = queue.shift();
    if (job) {
        // simulate variable processing time
        const workTime = 50 + Math.random() * 150;
        setTimeout(() => {
            consumed++;
            const latency = Date.now() - job.ts;
            console.log(
                `[CONSUMER] processed #${job.id
                } latency=${latency}ms queueSize=${queue.size()}`
            );
            sseSend({ type:"processed", id: job.id, latency, size: queue.size() });
            consume();
        }, workTime);
    } else {
        setTimeout(consume, consumePollMs); // poll queue
    }
}

process.on("SIGINT", () => {
    running = false;
    console.log("Stopped. produced=", produced, "consumed=", consumed);
    sseSend({ type:"stopped", produced, consumed, size: queue.size() });
    for (const res of subscribers){ try { res.end(); } catch{} }
});

consume();
