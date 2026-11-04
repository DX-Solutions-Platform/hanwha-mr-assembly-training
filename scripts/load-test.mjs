// 부하 테스트 — 저사양 PC · Quest 3 근사 조건에서 모든 화면을 해상도별로 최소 3회 측정
// 사용: npm run build && npm start (다른 터미널) → npm run test:load
// 옵션: BASE_URL, RUN_COUNT(최소 3), HEADLESS=0(실제 GPU 사용 권장)
import { writeFile, mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const RUN_COUNT = Math.max(3, Number(process.env.RUN_COUNT ?? 3));
const SAMPLE_MS = 6000;
const PASS_AVERAGE_FPS = 45; // Quest 3 브라우저 72Hz 기준 최소 허용
const PASS_LOW_FPS = 30;     // 1% 저점
const SCENARIO_LIST = [
  { name: '교육 선택', route: '/training' },
  { name: '공정 선택(분해)', route: '/training?test=explode', waitMs: 3500 },
  { name: '교육장(한 화면)', route: '/training?test=hud', waitMs: 6000 },
  { name: '교육장(단독)', route: '/training/hud?product=hydraulic-pump&card=2' },
  { name: '여객기·스마트폰', route: '/training/complex', waitMs: 2500 },
  { name: '도면 업데이트', route: '/training/upload' },
  { name: '세부 조립 카드', route: '/training/cards' },
  { name: '스텝 스툴 교육', route: '/training/stool?card=0' },
];
const VIEWPORT_LIST = [
  { name: 'HD', width: 1280, height: 720 }, { name: 'FHD', width: 1920, height: 1080 },
  { name: 'QHD', width: 2560, height: 1440 }, { name: '4K', width: 3840, height: 2160 },
];
const DEVICE_PROFILE_LIST = [{ name: '저사양 PC', cpuRate: 4 }, { name: 'Quest 3 근사', cpuRate: 6 }];

const browser = await puppeteer.launch({ headless: process.env.HEADLESS === '0' ? false : 'new', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=default'] });
const resultList = [];
for (const scenario of SCENARIO_LIST) for (const viewport of VIEWPORT_LIST) for (const profile of DEVICE_PROFILE_LIST) for (let run = 1; run <= RUN_COUNT; run++) {
  const page = await browser.newPage();
  await page.setViewport({ width: viewport.width, height: viewport.height });
  const client = await page.target().createCDPSession();
  await client.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuRate });
  const startTime = Date.now();
  await page.goto(BASE_URL + scenario.route, { waitUntil: 'networkidle0' });
  const loadMs = Date.now() - startTime;
  if (scenario.waitMs) await new Promise((resolve) => setTimeout(resolve, scenario.waitMs));
  if (scenario.name === '교육장(한 화면)') {
    // 준비/안전/BOM 화면을 교육장 성능으로 잘못 기록하지 않습니다.
    await page.waitForSelector('[data-preparation-phase="safety"]', { timeout: 30000 });
    await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.textContent === '모두 확인했습니다')?.click());
    await page.waitForSelector('[data-preparation-phase="bom"]', { timeout: 10000 });
    await page.keyboard.press('Space');
    await page.waitForSelector('[data-preparation-phase="main"]', { timeout: 15000 });
  }
  const metric = await page.evaluate((sampleMs) => new Promise((resolve) => {
    const frameTimeList = []; let longTaskCount = 0; let lastTime = performance.now(); const begin = lastTime;
    try { new PerformanceObserver((list) => { longTaskCount += list.getEntries().length; }).observe({ type: 'longtask', buffered: false }); } catch { /* 미지원 */ }
    const tick = (time) => {
      frameTimeList.push(time - lastTime); lastTime = time;
      if (time - begin < sampleMs) { requestAnimationFrame(tick); return; }
      const averageMs = frameTimeList.reduce((sum, value) => sum + value, 0) / frameTimeList.length;
      const worstMs = [...frameTimeList].sort((a, b) => b - a)[Math.floor(frameTimeList.length * 0.01)];
      resolve({ averageFps: Math.round(1000 / averageMs), lowFps: Math.round(1000 / worstMs), longTaskCount });
    };
    requestAnimationFrame(tick);
  }), SAMPLE_MS);
  const heapMb = Math.round((await page.metrics()).JSHeapUsedSize / 1048576);
  const isPass = metric.averageFps >= PASS_AVERAGE_FPS && metric.lowFps >= PASS_LOW_FPS;
  resultList.push({ scenario: scenario.name, viewport: viewport.name, profile: profile.name, run, loadMs, ...metric, heapMb, isPass });
  await page.close();
}
await browser.close();

console.table(resultList);
await mkdir('docs', { recursive: true });
await writeFile('docs/load-test-result.json', JSON.stringify({ measuredAt: new Date().toISOString(), runCount: RUN_COUNT, resultList }, null, 2));
const failList = resultList.filter((result) => !result.isPass);
if (failList.length) { console.error(`FAIL ${failList.length}건 — docs/load-test-result.json 확인`); process.exit(1); }
console.log(`PASS · ${SCENARIO_LIST.length}개 화면 × ${VIEWPORT_LIST.length}개 해상도 × ${DEVICE_PROFILE_LIST.length}개 기기 × ${RUN_COUNT}회`);
