// Thread Pool Benchmark: Demonstrates diminishing returns when raising UV_THREADPOOL_SIZE
// Run (PowerShell): $env:UV_THREADPOOL_SIZE=64; node examples/thread_pool/pbkdf2_benchmark.js
// Run (Bash): UV_THREADPOOL_SIZE=64 node examples/thread_pool/pbkdf2_benchmark.js

import { pbkdf2 } from 'crypto';
import os from 'os';

// Use the actual environment value (must be set BEFORE starting Node process)
const WORKERS = Number(process.env.UV_THREADPOOL_SIZE || 4);
const TASKS = WORKERS * 4; // scale tasks relative to pool size to expose waves
const ITERATIONS = 150_000; // cost factor (increase for more pronounced difference)
const KEYLEN = 64;

console.log(`Starting PBKDF2 benchmark | UV_THREADPOOL_SIZE=${WORKERS}`);
console.log(`CPU cores=${os.cpus().length}, tasks=${TASKS}, iterations=${ITERATIONS}`);
console.log('Tip: In PowerShell set: $env:UV_THREADPOOL_SIZE=32; node examples/thread_pool/pbkdf2_benchmark.js');

let completed = 0;
const start = Date.now();
const waveTimes = []; // timestamps of completion waves

for (let i = 0; i < TASKS; i++) {
    pbkdf2(`password-${i}`, `salt-${i}`, ITERATIONS, KEYLEN, 'sha512', (err) => {
        if (err) throw err;
        completed++;
        // Record wave boundaries at multiples of WORKERS
        if (completed % WORKERS === 0) {
            waveTimes.push({ wave: completed / WORKERS, t: Date.now() - start });
        }
        if (completed === TASKS) {
            const total = Date.now() - start;
            console.log(`All tasks done in ${total}ms (avg ${(total / TASKS).toFixed(2)}ms)`);
            console.log('Wave completion times (approx concurrency exposure):');
            waveTimes.forEach(w => console.log(`  wave ${w.wave.toString().padStart(2,'0')} => ${w.t}ms`));
        }
    });
}
