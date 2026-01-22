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

let completed = 0;
const start = Date.now();
const waveTimes = []; // timestamps of completion waves

for (let i = 0; i < TASKS; i++) {
    pbkdf2(`password-${i}`, `salt-${i}`, ITERATIONS, KEYLEN, 'sha512', (err) => {
        if (err) throw err;
        completed++;
        // Record wave boundaries at multiples of WORKERS
        if (completed % WORKERS === 0) {
            const waveTime = Date.now() - start;
            const waveNumber = completed / WORKERS;
            const previousWaveTime = waveTimes.length > 0 ? waveTimes[waveTimes.length - 1].t : 0;
            const waveDuration = waveTime - previousWaveTime;
            const avgPerTask = waveDuration / WORKERS;
            waveTimes.push({ wave: waveNumber, t: waveTime, duration: waveDuration, avgPerTask });
            
            console.log(`Wave ${waveNumber.toString().padStart(2,'0')} completed at ${waveTime}ms | wave took ${waveDuration}ms | avg ${avgPerTask.toFixed(2)}ms per task`);
        }
        if (completed === TASKS) {
            const total = Date.now() - start;
            console.log(`\nAll tasks done in ${total}ms`);
            console.log(`Overall average: ${(total / TASKS).toFixed(2)}ms per task`);
            console.log(`\nWave Summary (${WORKERS} workers processing ${WORKERS} tasks per wave):`);
            waveTimes.forEach(w => {
                console.log(`  Wave ${w.wave.toString().padStart(2,'0')}: ${w.duration}ms total, ${w.avgPerTask.toFixed(2)}ms per task`);
            });
        }
    });
}
