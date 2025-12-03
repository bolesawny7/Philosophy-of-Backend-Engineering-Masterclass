// Short Polling Client
// Repeatedly fetches a resource at a fixed interval. Shows latency, error handling,
// and optional exponential backoff when the server is unavailable.
//
// Usage (PowerShell):
//   node examples/communication/polling/long_poll_server.js   # in another terminal
//   node examples/communication/polling/short_poll_client.js
//
// Customize endpoint:
//   $env:SHORT_POLL_ENDPOINT='http://localhost:4000/state'; node ...
//

const endpoint = process.env.SHORT_POLL_ENDPOINT || 'http://localhost:4000/state';
const BASE_INTERVAL_MS = 1000; // base polling cadence
let currentInterval = BASE_INTERVAL_MS;
let consecutiveErrors = 0;
let totalRequests = 0;
let startTime = Date.now();

async function ensureFetch() {
    if (typeof fetch === 'undefined') {
        const { default: nodeFetch } = await import('node-fetch');
        global.fetch = nodeFetch;
    }
}

async function poll() {
    await ensureFetch();
    const reqStart = Date.now();
    totalRequests++;
    try {
        const res = await fetch(endpoint, { cache: 'no-store' });
        let dataText = '';
        try { dataText = JSON.stringify(await res.json()); } catch { dataText = '<no-json>'; }
        const latency = Date.now() - reqStart;
        console.log(`[SHORT POLL] ok status=${res.status} latency=${latency}ms data=${dataText}`);
        consecutiveErrors = 0;
        currentInterval = BASE_INTERVAL_MS; // reset backoff on success
    } catch (e) {
        consecutiveErrors++;
        const latency = Date.now() - reqStart;
        console.log(`[SHORT POLL] error=${e.code || e.message} latency=${latency}ms attempts=${consecutiveErrors}`);
        // Exponential backoff capped at 10s
        currentInterval = Math.min(BASE_INTERVAL_MS * 2 ** consecutiveErrors, 10_000);
    }
    scheduleNext();
}

function scheduleNext() {
    setTimeout(poll, currentInterval);
}

process.on('SIGINT', () => {
    const runtime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nStopped after ${runtime}s totalRequests=${totalRequests} errors=${consecutiveErrors}`);
    process.exit(0);
});

console.log(`[SHORT POLL] starting endpoint=${endpoint}`);
scheduleNext();
