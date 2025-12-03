# Thread Pool Benchmark

Demonstrates diminishing returns of increasing `UV_THREADPOOL_SIZE` for CPU-bound crypto operations (PBKDF2).

## Run

PowerShell:
```
$env:UV_THREADPOOL_SIZE=4; node examples/thread_pool/pbkdf2_benchmark.js
$env:UV_THREADPOOL_SIZE=32; node examples/thread_pool/pbkdf2_benchmark.js
$env:UV_THREADPOOL_SIZE=64; node examples/thread_pool/pbkdf2_benchmark.js
```

Bash:
```
UV_THREADPOOL_SIZE=4 node examples/thread_pool/pbkdf2_benchmark.js
UV_THREADPOOL_SIZE=32 node examples/thread_pool/pbkdf2_benchmark.js
UV_THREADPOOL_SIZE=64 node examples/thread_pool/pbkdf2_benchmark.js
```

Observe total time and average per task. After a point, contention / context switching outweighs gains.
