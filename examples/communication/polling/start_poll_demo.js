// Convenience script to start long-poll server + short poll client.
// Run: node examples/communication/polling/start_poll_demo.js
// Requires Node >=18 for global fetch or installs node-fetch on the fly.

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.join(__dirname, 'long_poll_server.js');
const clientPath = path.join(__dirname, 'short_poll_client.js');

console.log('[DEMO] Starting long_poll_server.js on :4000 ...');
const server = spawn(process.execPath, [serverPath], { stdio: 'inherit' });

setTimeout(() => {
    console.log('[DEMO] Starting short_poll_client.js ...');
    const client = spawn(process.execPath, [clientPath], { stdio: 'inherit', env: { ...process.env, SHORT_POLL_ENDPOINT: 'http://localhost:4000/state' } });
    client.on('exit', code => console.log(`[DEMO] Client exited code=${code}`));
}, 800); // small delay to let server bind

process.on('SIGINT', () => {
    console.log('\n[DEMO] Shutting down...');
    server.kill('SIGINT');
    process.exit(0);
});
