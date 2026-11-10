import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { createSocket } from 'node:dgram';
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { isIPv4 } from 'node:net';
import { hostname, networkInterfaces } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { readVrLessonArchive, VR_LESSON_MAX_MB } from '../../practice/vrLessonArchive';

const service = 'dx-vr-training-local';
const protocolVersion = '0.1.0';
const preferredPort = 8787;
const discoveryPort = 48787;
const recentFor = 5 * 60 * 1000;
const directory = join(process.cwd(), 'data', 'quest-bridge');
const statePath = join(directory, 'state.json');
const maxBytes = VR_LESSON_MAX_MB * 1024 * 1024;
const validId = /^[a-z0-9][a-z0-9._-]{0,127}$/i;
const validVersion = /^\d{1,12}\.\d{1,12}\.\d{1,12}$/;

type Entry = {
  trainingId: string; contentVersion: string; title: unknown; summary: unknown;
  modes: unknown[]; bytes: number; sha256: string;
};
type Device = { id: string; name: string; tokenHash: string; entries: Entry[] };
type Store = { serverId: string; devices: Device[] };
class BridgeError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

function ip(value = '') {
  return value.replace(/^::ffff:/, '');
}

function isPrivate(value: string) {
  if (!isIPv4(value)) return false;
  const [a, b] = value.split('.').map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function digest(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex');
}

function matches(a: string, b: string) {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage, limit: number) {
  if (Number(req.headers['content-length']) > limit) throw new BridgeError(413, 'PACKAGE_TOO_LARGE');
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of req) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += data.length;
    if (length > limit) throw new BridgeError(413, 'PACKAGE_TOO_LARGE');
    chunks.push(data);
  }
  return Buffer.concat(chunks, length);
}

async function writeAtomic(path: string, data: string | Buffer) {
  const temporary = join(directory, randomUUID() + '.tmp');
  try {
    await writeFile(temporary, data, { flag: 'wx', mode: 0o600 });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true }).catch(() => {});
  }
}

function catalog(device: Device) {
  return [...new Map(device.entries.map((entry) => [entry.trainingId, entry])).values()];
}

function versionOrder(a: string, b: string) {
  const right = b.split('.').map(Number);
  return a.split('.').map(Number).reduce((order, value, index) => order || value - right[index], 0);
}

async function prepareEntry(data: Buffer<ArrayBuffer>): Promise<Entry> {
  try {
    const { manifest, lesson } = await readVrLessonArchive(new File([data], 'package.vrlesson.zip'), true);
    const { trainingId, contentVersion } = manifest;
    const details = record(lesson);
    if (!validId.test(trainingId) || !validVersion.test(contentVersion) ||
        details.trainingId !== trainingId || details.contentVersion !== contentVersion) {
      throw new Error('Lesson identifier mismatch');
    }
    return {
      trainingId, contentVersion, title: details.title ?? trainingId, summary: details.summary ?? {},
      modes: Array.isArray(details.modes) ? details.modes : [], bytes: data.length, sha256: digest(data),
    };
  } catch {
    throw new BridgeError(422, 'INVALID_PACKAGE');
  }
}

async function createBridge() {
  await mkdir(directory, { recursive: true });
  let store: Store;
  try {
    store = JSON.parse(await readFile(statePath, 'utf8')) as Store;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    store = { serverId: randomUUID(), devices: [] };
    await writeAtomic(statePath, JSON.stringify(store));
  }
  const hello = { service, protocolVersion, serverId: store.serverId, pcName: hostname() };
  const origins = new Set<string>();
  const seen = new Map<string, number>();
  let port = preferredPort;
  let pairing: { code: string; expires: number; failures: number } | undefined;
  let updating: Promise<unknown> = Promise.resolve();
  let uploading = false;

  function update<T>(change: (current: Store) => Promise<{ next: Store; value: T }>) {
    const pending = updating.then(async () => {
      const { next, value } = await change(store);
      if (next !== store) {
        await writeAtomic(statePath, JSON.stringify(next));
        store = next;
      }
      return value;
    });
    updating = pending.catch(() => {});
    return pending;
  }

  function authenticate(req: IncomingMessage) {
    const authorization = req.headers.authorization;
    if (!authorization || !/^Bearer [A-Za-z0-9_-]{43}$/.test(authorization)) throw new BridgeError(401, 'PAIR_REQUIRED');
    const tokenHash = digest(authorization.slice(7));
    const device = store.devices.find((item) => matches(item.tokenHash, tokenHash));
    if (!device) throw new BridgeError(401, 'PAIR_REQUIRED');
    seen.set(device.id, Date.now());
    return device;
  }

  async function admin(req: IncomingMessage, res: ServerResponse, path: string, remote: string) {
    const origin = req.headers.origin;
    if (remote !== '127.0.0.1' || req.headers.host !== `127.0.0.1:${port}` || !origin || !origins.has(origin)) {
      throw new BridgeError(403, 'LOCAL_ONLY');
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Private-Network': 'true' });
      res.end();
      return;
    }
    if (req.method === 'GET' && path === '/admin/status') {
      send(res, 200, {
        pcName: hello.pcName,
        addresses: Object.values(networkInterfaces()).flatMap((interfaces) =>
          (interfaces ?? []).filter((item) => !item.internal && isPrivate(item.address)).map((item) => `${item.address}:${port}`)),
        devices: store.devices.map((device) => ({
          id: device.id, name: device.name, connected: Date.now() - (seen.get(device.id) ?? 0) < recentFor,
          trainings: catalog(device),
        })),
      });
      return;
    }
    if (req.method === 'POST' && path === '/admin/pairing') {
      pairing = { code: randomInt(1_000_000).toString().padStart(6, '0'), expires: Date.now() + 300_000, failures: 0 };
      send(res, 200, { code: pairing.code, expires: pairing.expires });
      return;
    }
    const target = path.match(/^\/admin\/devices\/([a-f0-9-]{36})\/trainings$/);
    if (req.method !== 'POST' || !target) throw new BridgeError(404, 'NOT_FOUND');
    const id = target[1];
    if (!store.devices.some((device) => device.id === id) || Date.now() - (seen.get(id) ?? 0) >= recentFor) {
      throw new BridgeError(409, 'DEVICE_NOT_CONNECTED');
    }
    if (req.headers['content-type'] !== 'application/zip') throw new BridgeError(415, 'INVALID_PACKAGE');
    if (uploading) throw new BridgeError(409, 'UPLOAD_IN_PROGRESS');
    uploading = true;
    try {
      const data = await readBody(req, maxBytes);
      const entry = await prepareEntry(data);
      const saved = await update(async (current) => {
        const device = current.devices.find((item) => item.id === id)!;
        const latest = catalog(device).find((item) => item.trainingId === entry.trainingId);
        if (latest && versionOrder(entry.contentVersion, latest.contentVersion) <= 0) {
          if (latest.contentVersion === entry.contentVersion && latest.sha256 === entry.sha256) return { next: current, value: latest };
          throw new BridgeError(409, 'VERSION_CONFLICT');
        }
        if (device.entries.length >= 64) throw new BridgeError(507, 'CATALOG_LIMIT');
        const path = join(directory, `${entry.sha256}.vrlesson.zip`);
        await writeAtomic(path, data);
        const devices = current.devices.map((item) => item.id === id ? { ...item, entries: [...item.entries, entry] } : item);
        return { next: { ...current, devices }, value: entry };
      });
      send(res, 200, { entry: saved });
    } finally {
      uploading = false;
    }
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const remote = ip(req.socket.remoteAddress);
    if (remote !== '127.0.0.1' && !isPrivate(remote)) throw new BridgeError(403, 'LOCAL_ONLY');
    const path = (req.url ?? '').split('?', 1)[0];
    if (path.startsWith('/admin/')) return admin(req, res, path, remote);
    if (req.method === 'GET' && path === '/api/device/hello') return send(res, 200, hello);
    if (req.method === 'POST' && path === '/api/device/pair') {
      let body: Record<string, unknown>;
      try { body = record(JSON.parse((await readBody(req, 2048)).toString('utf8'))); }
      catch { throw new BridgeError(400, 'INVALID_PAIR_CODE'); }
      const result = await update(async (current) => {
        if (!pairing || pairing.expires <= Date.now() || pairing.failures >= 5 ||
            typeof body.code !== 'string' || !/^\d{6}$/.test(body.code) || !matches(pairing.code, body.code)) {
          if (pairing) pairing.failures++;
          throw new BridgeError(403, 'INVALID_PAIR_CODE');
        }
        if (current.devices.length >= 16) throw new BridgeError(507, 'DEVICE_LIMIT');
        pairing = undefined;
        const token = randomBytes(32).toString('base64url');
        const device: Device = {
          id: randomUUID(), name: (typeof body.deviceName === 'string' ? body.deviceName.trim().slice(0, 80) : '') || 'Meta Quest',
          tokenHash: digest(token), entries: [],
        };
        return { next: { ...current, devices: [...current.devices, device] }, value: { token, deviceId: device.id } };
      });
      return send(res, 200, { serverId: store.serverId, tokenType: 'Bearer', ...result });
    }
    if (req.method === 'GET' && path === '/api/catalog') {
      return send(res, 200, { serverId: store.serverId, protocolVersion, trainings: catalog(authenticate(req)) });
    }
    const requested = path.match(/^\/api\/trainings\/([^/]+)\/versions\/([^/]+)\/package$/);
    if (req.method !== 'GET' || !requested) throw new BridgeError(404, 'NOT_FOUND');
    const [, id, version] = requested;
    const entry = authenticate(req).entries.find((item) => item.trainingId === id && item.contentVersion === version);
    if (!entry) throw new BridgeError(404, 'NOT_FOUND');
    const file = await open(join(directory, `${entry.sha256}.vrlesson.zip`), 'r');
    res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Length': entry.bytes, 'Cache-Control': 'no-store' });
    await pipeline(file.createReadStream(), res);
  }

  const server = createServer({ requestTimeout: 120_000, headersTimeout: 10_000 }, (req, res) => {
    void handle(req, res).catch((error) => {
      if (res.headersSent || res.destroyed) { res.destroy(); return; }
      if (error instanceof BridgeError) send(res, error.status, { code: error.code });
      else {
        console.error('Quest bridge request failed', error);
        send(res, 500, { code: 'BRIDGE_ERROR' });
      }
    });
  });
  const listen = (requestedPort: number) => new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(requestedPort, '0.0.0.0', () => { server.removeListener('error', reject); resolve(); });
  });
  try { await listen(preferredPort); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
    await listen(0);
  }
  const listening = server.address();
  if (!listening || typeof listening === 'string') throw new Error('Quest bridge did not bind a TCP port');
  port = listening.port;
  server.on('error', (error) => console.error('Quest bridge listener', error));
  server.unref();

  const discovery = createSocket('udp4');
  discovery.on('error', () => { try { discovery.close(); } catch {} });
  discovery.on('message', (data, sender) => {
    if (data.length > 1024 || !isPrivate(sender.address)) return;
    let request: Record<string, unknown>;
    try { request = record(JSON.parse(data.toString('utf8'))); } catch { return; }
    if (request.type !== 'DXVR_DISCOVER' || request.protocolVersion !== protocolVersion ||
        typeof request.requestId !== 'string' || !/^[a-f0-9]{32}$/i.test(request.requestId)) return;
    const reply = Buffer.from(JSON.stringify({ ...hello, type: 'DXVR_DISCOVER_RESPONSE', requestId: request.requestId, apiPort: port }));
    discovery.send(reply, sender.port, sender.address, () => {});
  });
  discovery.bind(discoveryPort, '0.0.0.0', () => discovery.unref());
  return { origins, address: `http://127.0.0.1:${port}` };
}

const processBridge = globalThis as typeof globalThis & { questBridge?: ReturnType<typeof createBridge> };

export async function openQuestBridge(origin: string) {
  processBridge.questBridge ??= createBridge().catch((error) => {
    delete processBridge.questBridge;
    throw error;
  });
  const { origins, address } = await processBridge.questBridge;
  origins.add(origin);
  return address;
}
