// Minimal gRPC example using @grpc/grpc-js and @grpc/proto-loader
// Expected behavior:
// - Starts a gRPC server on :4700 exposing demo.Greeter/GetUser
// - When a client calls GetUser with an id, returns { id, active: true }
// How to run:
//   node examples/communication/grpc/grpc_server.js
// Then in another terminal:
//   node examples/communication/grpc/grpc_client.js
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load the proto schema and create a JS object graph for the package
const pkgDef = protoLoader.loadSync(path.join(__dirname, 'hello.proto'));
const proto = grpc.loadPackageDefinition(pkgDef);
const Greeter = proto.demo.Greeter;

const server = new grpc.Server();
// Register the service implementation (method handlers)
server.addService(Greeter.service, {
    GetUser: (call, callback) => {
        // Access typed request fields; build a typed response.
        const id = call.request.id || 0;
        callback(null, { id, active: true });
    },
    SayHello: (call, callback) => {
        const name = (call.request?.name || 'World').toString();
        callback(null, { message: `Hello, ${name}!` });
    }
});

// Try binding on multiple addresses to avoid Windows/IPv6 issues.
const addresses = ['0.0.0.0:4700', '127.0.0.1:4700', 'localhost:4700'];
const creds = grpc.ServerCredentials.createInsecure();

function tryBind(i = 0) {
    if (i >= addresses.length) {
        console.error('Failed to bind gRPC server on all attempted addresses:', addresses.join(', '));
        process.exit(1);
        return;
    }
    const addr = addresses[i];
    server.bindAsync(addr, creds, (err, port) => {
        if (err) {
            console.error(`[gRPC] bind error on ${addr}:`, err.message || err);
            return tryBind(i + 1);
        }
        // In recent @grpc/grpc-js versions, start() is optional. Only log success.
        // If you prefer, you may still call server.start() here.
        try { server.start?.(); } catch {}
        console.log(`[gRPC] listening on ${addr} (resolved port ${port}) - service demo.Greeter/GetUser`);
    });
}

tryBind();