// Minimal gRPC client
// Expected behavior:
// - Connects to localhost:4700 and calls demo.Greeter/GetUser with id=101
// - Prints the binary-decoded response as a JS object: { id: 101, active: true }
// How to run:
//   1) Start the server: node examples/communication/grpc/grpc_server.js
//   2) Run this client:  node examples/communication/grpc/grpc_client.js
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pkgDef = protoLoader.loadSync(path.join(__dirname, 'hello.proto'));
const proto = grpc.loadPackageDefinition(pkgDef);
// Create a typed client for the service
const client = new proto.demo.Greeter('localhost:4700', grpc.credentials.createInsecure());

// Call GetUser
client.GetUser({ id: 101 }, (err, resp) => {
    if (err) console.error('GetUser Error:', err);
    else console.log('GetUser Reply:', resp);
});

// Call SayHello
client.SayHello({ name: 'Bahbouh' }, (err, resp) => {
    if (err) console.error('SayHello Error:', err);
    else console.log('SayHello Reply:', resp);
});