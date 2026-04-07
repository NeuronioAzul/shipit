---
name: nodejs
description: |
  Node.js standard library reference for server-side JavaScript/TypeScript development.

  Use when: working with file system operations, spawning child processes, handling
  streams, performing cryptography, creating HTTP servers/clients, managing paths,
  using worker threads, writing tests with the built-in test runner, or handling
  binary data with Buffers.

  Covers: fs, path, http, child_process, crypto, stream, events, worker_threads,
  test runner, util, net, url, and buffer modules.

  Keywords: Node.js, fs, path, http, child_process, crypto, stream, events,
  worker_threads, test runner, buffer, url, net, util, ES modules, TypeScript,
  async/await, pipeline, spawn, exec, fork, hash, cipher, EventEmitter
license: MIT
---

# Node.js Standard Library Reference

**Target**: Node.js >= 24 with ES Modules and TypeScript
**Last Updated**: 2026-04-07

## Table of Contents
1. [File System (fs)](#file-system)
2. [Path](#path)
3. [HTTP](#http)
4. [Child Process](#child-process)
5. [Crypto](#crypto)
6. [Streams](#streams)
7. [Events](#events)
8. [Worker Threads](#worker-threads)
9. [Test Runner](#test-runner)
10. [Util](#util)
11. [URL](#url)
12. [Buffer](#buffer)
13. [Net (TCP/IPC)](#net)

> **Convention**: Always use the `node:` protocol prefix for built-in modules (e.g., `import fs from 'node:fs/promises'`). Always prefer the promise-based API (`node:fs/promises`) over callbacks. Use `import` syntax (ESM), not `require()` (CJS).

---

## File System

The `node:fs/promises` API is the preferred way to interact with the file system. Use `node:fs` only when you need streams (`createReadStream`/`createWriteStream`) or synchronous methods.

```typescript
import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';

// Read file
const content = await fs.readFile('input.txt', 'utf8');

// Write file
await fs.writeFile('output.txt', content.toUpperCase());

// Append to file
await fs.appendFile('log.txt', `Processed at ${new Date()}\n`);

// File stats
const stats = await fs.stat('output.txt');
console.log(`Size: ${stats.size} bytes, isDir: ${stats.isDirectory()}`);

// List directory
const files = await fs.readdir('./src', { withFileTypes: true });
const dirs = files.filter(f => f.isDirectory()).map(f => f.name);

// Recursive directory listing
const allFiles = await fs.readdir('./src', { recursive: true });

// Check existence (prefer over fs.exists which is deprecated)
try {
  await fs.access('config.json');
} catch {
  console.log('File does not exist');
}

// Create directory recursively
await fs.mkdir('dist/assets/images', { recursive: true });

// Copy and rename
await fs.copyFile('source.txt', 'dest.txt');
await fs.rename('old.txt', 'new.txt');

// Remove file or directory
await fs.rm('temp', { recursive: true, force: true });
```

---

## Path

Utilities for file and directory paths. Results vary by OS; use `path.posix` or `path.win32` for cross-platform consistency.

```typescript
import path from 'node:path';

path.basename('/foo/bar/file.html');       // 'file.html'
path.basename('/foo/bar/file.html', '.html'); // 'file'
path.dirname('/foo/bar/file.html');        // '/foo/bar'
path.extname('index.coffee.md');           // '.md'

path.join('/foo', 'bar', 'baz', '..');     // '/foo/bar'
path.resolve('/foo/bar', './baz');         // '/foo/bar/baz'
path.resolve('src', 'components');         // '<cwd>/src/components'

path.parse('/home/user/file.txt');
// { root: '/', dir: '/home/user', base: 'file.txt', ext: '.txt', name: 'file' }

path.format({ dir: '/home/user', base: 'file.txt' }); // '/home/user/file.txt'

path.isAbsolute('/foo');   // true
path.isAbsolute('bar');    // false

path.relative('/data/orandea/test/aaa', '/data/orandea/impl/bbb');
// '../../impl/bbb'

// Platform info
path.sep;       // '\\' on Windows, '/' on POSIX
path.delimiter; // ';' on Windows, ':' on POSIX
```

---

## HTTP

The `node:http` module provides HTTP server and client implementations. For HTTPS, use `node:https`.

```typescript
import http from 'node:http';

// Create server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ url: req.url, method: req.method }));
});

server.listen(3000, '127.0.0.1', () => {
  console.log('Server running at http://127.0.0.1:3000/');
});

// Modern approach: use global fetch (available since Node 18+)
const response = await fetch('https://api.example.com/data');
const data = await response.json();
```

> **Note**: For HTTP requests, prefer the global `fetch()` API (stable since Node 21). Use `node:http.request()` only for low-level streaming or when you need fine-grained control.

---

## Child Process

Spawn subprocesses. Use `spawn()` for streams, `exec()` for buffered shell output, `execFile()` for executables without shell, `fork()` for Node.js IPC.

```typescript
import { spawn, exec, execFile, fork } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// exec — buffered output (use for short commands)
const { stdout, stderr } = await execAsync('git status --short');
console.log(stdout);

// spawn — streaming output (use for long-running processes)
const child = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
child.on('close', (code) => console.log(`Exited with code ${code}`));

// spawn with captured output
const proc = spawn('node', ['--version']);
let output = '';
proc.stdout.on('data', (chunk: Buffer) => { output += chunk; });
proc.on('close', () => console.log(output.trim()));

// execFile — without shell (safer, no shell injection risk)
const execFileAsync = promisify(execFile);
const { stdout: nodeVersion } = await execFileAsync('node', ['--version']);

// fork — Node.js child process with IPC
const worker = fork('./worker.js');
worker.send({ task: 'process-data' });
worker.on('message', (msg) => console.log('Worker result:', msg));

// Spawn with options
const child2 = spawn('cmd', ['/c', 'dir'], {
  cwd: 'C:\\project',
  env: { ...process.env, NODE_ENV: 'production' },
  shell: true,
  timeout: 30_000,
});
```

> **Security**: Always use `execFile()` or `spawn()` (without `shell: true`) when handling user input. Never interpolate user input into `exec()` strings — this prevents shell injection.

---

## Crypto

Hashing, HMAC, encryption/decryption, and key generation.

```typescript
import crypto from 'node:crypto';

// Hash
const hash = crypto.createHash('sha256').update('Hello World').digest('hex');

// HMAC
const hmac = crypto.createHmac('sha256', 'secret-key')
  .update('message')
  .digest('hex');

// Encryption / Decryption (AES-256-GCM — preferred over CBC)
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(12); // 12 bytes for GCM

function encrypt(text: string): { encrypted: string; tag: string } {
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { encrypted, tag: cipher.getAuthTag().toString('hex') };
}

function decrypt(encrypted: string, tag: string): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Random values
const randomBytes = crypto.randomBytes(16).toString('hex');
const uuid = crypto.randomUUID();

// Password hashing with scrypt (async)
const salt = crypto.randomBytes(16).toString('hex');
const scryptAsync = promisify(crypto.scrypt) as
  (password: string, salt: string, keylen: number) => Promise<Buffer>;
const derivedKey = await scryptAsync('user-password', salt, 64);
console.log(derivedKey.toString('hex'));
```

> **Best practice**: Use AES-256-GCM (authenticated encryption) instead of AES-256-CBC. Use `scrypt` for password hashing. Never use MD5 or SHA-1 for security.

---

## Streams

Readable, writable, duplex, and transform streams. Use `pipeline()` for composing streams safely.

```typescript
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip, createGunzip } from 'node:zlib';
import { Transform } from 'node:stream';

// Pipeline: compose streams safely (handles errors + cleanup)
await pipeline(
  createReadStream('input.txt'),
  createGzip(),
  createWriteStream('input.txt.gz')
);

// Pipeline with async generator
await pipeline(
  createReadStream('data.txt', 'utf8'),
  async function* (source) {
    for await (const chunk of source) {
      yield chunk.toUpperCase();
    }
  },
  createWriteStream('output.txt')
);

// Custom Transform stream
const uppercase = new Transform({
  transform(chunk, _encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  }
});

// Read stream with for-await-of
const readable = createReadStream('file.txt', { encoding: 'utf8' });
for await (const chunk of readable) {
  console.log(chunk);
}

// Abort support
const ac = new AbortController();
await pipeline(
  createReadStream('source.txt'),
  createGzip(),
  createWriteStream('dest.txt.gz'),
  { signal: ac.signal }
);
```

> **Rule**: Always use `pipeline()` instead of `.pipe()`. It handles error propagation and cleanup automatically.

---

## Events

The `EventEmitter` class is the foundation of Node.js event-driven architecture.

```typescript
import { EventEmitter, on } from 'node:events';

class MyEmitter extends EventEmitter {}
const emitter = new MyEmitter();

// Listen for events
emitter.on('data', (payload: string) => console.log('Data:', payload));
emitter.once('connect', () => console.log('Connected (once)'));

// Always handle errors (unhandled 'error' events crash the process)
emitter.on('error', (err: Error) => console.error('Error:', err.message));

// Emit
emitter.emit('data', 'hello');
emitter.emit('connect');

// Remove listener
const handler = () => {};
emitter.on('event', handler);
emitter.removeListener('event', handler);

// Listener count
emitter.listenerCount('data'); // 1

// Async iteration
const asyncEmitter = new EventEmitter();
setTimeout(() => {
  asyncEmitter.emit('data', 'first');
  asyncEmitter.emit('data', 'second');
}, 100);

for await (const [value] of on(asyncEmitter, 'data')) {
  console.log('Received:', value);
  if (value === 'second') break;
}
```

---

## Worker Threads

Parallel JavaScript execution via threads. Workers can share memory through `SharedArrayBuffer`.

```typescript
import {
  Worker, isMainThread, parentPort, workerData, MessageChannel
} from 'node:worker_threads';

if (isMainThread) {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    workerData: { start: 0, end: 1_000_000 }
  });

  worker.on('message', (result) => console.log('Sum:', result));
  worker.on('error', (err) => console.error('Worker error:', err));
  worker.on('exit', (code) => {
    if (code !== 0) console.error(`Worker exited with code ${code}`);
  });

  // Bidirectional communication via MessageChannel
  const { port1, port2 } = new MessageChannel();
  const worker2 = new Worker(new URL('./channel-worker.ts', import.meta.url));
  worker2.postMessage({ port: port2 }, [port2]);
  port1.on('message', (msg) => console.log('Received:', msg));
  port1.postMessage('Hello from main!');

} else {
  // Worker code
  const { start, end } = workerData as { start: number; end: number };
  let sum = 0;
  for (let i = start; i <= end; i++) sum += i;
  parentPort!.postMessage(sum);
}
```

> **Tip**: Use `new URL('./worker.ts', import.meta.url)` instead of `__filename` for ESM-compatible worker paths.

---

## Test Runner

Built-in test runner with subtests, hooks, mocking, and BDD syntax. Run with `node --test`.

```typescript
import test, { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Basic test
test('sync test', () => {
  assert.strictEqual(1 + 1, 2);
});

// Async test
test('async test', async () => {
  const result = await Promise.resolve(42);
  assert.strictEqual(result, 42);
});

// Subtests
test('parent', async (t) => {
  await t.test('child 1', () => assert.ok(true));
  await t.test('child 2', () => assert.ok(true));
});

// BDD style
describe('Math', () => {
  let value: number;

  beforeEach(() => { value = 0; });
  afterEach(() => { value = 0; });

  it('adds', () => {
    assert.strictEqual(1 + 2, 3);
  });

  describe('division', () => {
    it('divides', () => assert.strictEqual(10 / 2, 5));
  });
});

// Skip / Only
test('skipped', { skip: true }, () => {});
test('skip on windows', { skip: process.platform === 'win32' }, () => {});

// Mocking
test('mock function', () => {
  const fn = mock.fn((x: number) => x * 2);
  assert.strictEqual(fn(3), 6);
  assert.strictEqual(fn.mock.calls.length, 1);
  assert.deepStrictEqual(fn.mock.calls[0].arguments, [3]);
});
```

> Run: `node --test` (auto-discovers `**/*.test.{js,ts}`) or `node --test src/tests/`.

---

## Util

Utility functions for promisifying callbacks, debugging, and type checking.

```typescript
import util from 'node:util';
import fs from 'node:fs';

// Promisify callback-based functions
const readFile = util.promisify(fs.readFile);
const content = await readFile('config.json', 'utf8');

// Debug logging (enabled via NODE_DEBUG=myapp)
const debug = util.debuglog('myapp');
debug('Processing item %d', 42);

// Object inspection (handles circular refs)
const obj: any = { name: 'test', nested: { deep: 42 } };
obj.self = obj;
console.log(util.inspect(obj, { depth: null, colors: true }));

// Type checking
util.types.isPromise(Promise.resolve());    // true
util.types.isAsyncFunction(async () => {}); // true
util.types.isDate(new Date());              // true

// Deprecation
const old = util.deprecate(() => {}, 'old() is deprecated. Use new().');
```

---

## URL

URL parsing and formatting using the WHATWG URL Standard.

```typescript
import { URL, URLSearchParams, fileURLToPath, pathToFileURL } from 'node:url';

// Parse URL
const url = new URL('https://user:pass@example.com:8080/path?q=hello#hash');
url.hostname;  // 'example.com'
url.pathname;  // '/path'
url.searchParams.get('q'); // 'hello'

// Build URL
const newUrl = new URL('https://example.org');
newUrl.pathname = '/api/v1/data';
newUrl.searchParams.set('page', '2');
newUrl.href; // 'https://example.org/api/v1/data?page=2'

// Search params
const params = new URLSearchParams({ user: 'abc', page: '1' });
params.append('tag', 'node');
params.toString(); // 'user=abc&page=1&tag=node'

for (const [key, value] of params) {
  console.log(`${key}=${value}`);
}

// File URL conversion (useful in ESM for __filename/__dirname equivalents)
const __filename = fileURLToPath(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
```

> **ESM tip**: `__filename` and `__dirname` don't exist in ES modules. Use `fileURLToPath(import.meta.url)` instead.

---

## Buffer

Binary data handling. Buffers are fixed-size byte sequences (subclass of `Uint8Array`).

```typescript
// Creating buffers
const buf1 = Buffer.alloc(10);              // 10 zero-filled bytes
const buf2 = Buffer.from([0x48, 0x65]);     // from byte array
const buf3 = Buffer.from('Hello World');     // from string (UTF-8)
const buf4 = Buffer.from('48656c6c6f', 'hex'); // from hex

// Encoding / Decoding
const buf = Buffer.from('hello world');
buf.toString('hex');    // '68656c6c6f20776f726c64'
buf.toString('base64'); // 'aGVsbG8gd29ybGQ='

// Concatenation
const combined = Buffer.concat([Buffer.from('Hello'), Buffer.from(' World')]);
combined.toString(); // 'Hello World'

// Slicing (shared memory — use .slice() for copy in older Node)
const slice = combined.subarray(0, 5);
slice.toString(); // 'Hello'

// Comparison
Buffer.compare(Buffer.from('A'), Buffer.from('B')); // -1

// Search
const searchBuf = Buffer.from('Hello World');
searchBuf.indexOf('World');   // 6
searchBuf.includes('World');  // true
```

> **Prefer**: `Buffer.alloc()` (zero-filled) over `Buffer.allocUnsafe()` (may contain old memory) unless performance is critical and you'll overwrite all bytes.

---

## Net

TCP and IPC server/client networking.

```typescript
import net from 'node:net';

// TCP Server
const server = net.createServer((socket) => {
  socket.on('data', (data) => socket.write(`Echo: ${data}`));
  socket.on('error', (err) => console.error('Socket error:', err.message));
});

server.listen(8080, '127.0.0.1', () => {
  console.log('Listening on port 8080');
});

// TCP Client
const client = net.createConnection({ port: 8080 }, () => {
  client.write('Hello Server!');
});
client.on('data', (data) => {
  console.log('Response:', data.toString());
  client.end();
});

// Error handling
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port in use');
  }
});
```
