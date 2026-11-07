import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { AWQ_SHAPE_NAME_MODEL, SHAPE_NAME_MODEL, type ShapeNameModel } from '@/features/drawing-upload-dev/shape-name/shapeNameTypes';

export const OLLAMA_URL = 'http://127.0.0.1:11434';
export const VLLM_URL = 'http://127.0.0.1:18080/v1';
let awqProcess: ChildProcess | null = null;

async function isAwqListening() {
  try {
    await fetch(VLLM_URL + '/models', { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(1200) });
    return true;
  } catch {
    return false;
  }
}

function launchWsl(action: 'serve' | 'stop') {
  const root = process.cwd().replace(/\\/g, '/');
  const drive = /^([a-z]):(\/.*)$/i.exec(root);
  if (process.platform !== 'win32' || !drive) throw new Error('Windows의 WSL2 실행 경로를 찾지 못했습니다.');
  const script = '/mnt/' + drive[1].toLowerCase() + drive[2] + '/scripts/qwen-awq-wsl.sh';
  return spawn('wsl.exe', ['-d', 'Ubuntu-24.04', '-u', 'qwen-local', '--', 'bash', script, action], {
    windowsHide: true, stdio: 'ignore',
  });
}

async function stopAwq() {
  if (!awqProcess && !await isAwqListening()) return;
  const child = launchWsl('stop');
  await new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error('27B를 종료하지 못했습니다.')));
  });
  for (let attempt = 0; awqProcess && attempt < 20; attempt++) await delay(250);
  if (awqProcess || await isAwqListening()) throw new Error('27B가 실행 중입니다. 종료한 뒤 8B로 다시 시도하세요.');
}

async function unload8b(signal: AbortSignal) {
  const options = { cache: 'no-store', redirect: 'error', signal } as const;
  const response = await fetch(OLLAMA_URL + '/api/ps', options);
  if (!response.ok) throw new Error('8B 실행 상태를 확인하지 못했습니다.');
  const { models } = await response.json();
  if (!Array.isArray(models)) throw new Error('Ollama 실행 목록이 올바르지 않습니다.');
  if (!models.some((entry) => entry.name === SHAPE_NAME_MODEL || entry.model === SHAPE_NAME_MODEL)) return;
  const stopped = await fetch(OLLAMA_URL + '/api/generate', {
    ...options, method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: SHAPE_NAME_MODEL, keep_alive: 0, stream: false }),
  });
  if (!stopped.ok) throw new Error('8B를 GPU에서 내리지 못했습니다.');
  await stopped.arrayBuffer();
  for (let attempt = 0; attempt < 20; attempt++) {
    const active = await fetch(OLLAMA_URL + '/api/ps', options);
    if (!active.ok) break;
    const data = await active.json();
    if (Array.isArray(data.models) && !data.models.some((entry: { name?: string; model?: string }) => entry.name === SHAPE_NAME_MODEL || entry.model === SHAPE_NAME_MODEL)) return;
    await delay(250, undefined, { signal });
  }
  throw new Error('8B가 아직 실행 중입니다. 잠시 후 다시 시도하세요.');
}

export async function prepareLocalModel(model: ShapeNameModel, signal: AbortSignal) {
  if (model !== AWQ_SHAPE_NAME_MODEL) {
    await stopAwq();
    return;
  }
  await unload8b(signal);
  if (await isAwqListening()) return;
  if (!awqProcess) {
    const child = launchWsl('serve');
    awqProcess = child;
    const clear = () => { if (awqProcess === child) awqProcess = null; };
    child.once('error', clear);
    child.once('exit', clear);
    child.unref();
  }
  while (awqProcess) {
    signal.throwIfAborted();
    if (await isAwqListening()) return;
    await delay(1000, undefined, { signal });
  }
  throw new Error('WSL2에서 27B 서버를 시작하지 못했습니다.');
}
