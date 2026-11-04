/* eslint-disable -- 원본의 비정형 장면/상태 로직을 보존한 생성 파일. */
// @ts-nocheck
// 수정은 port-reference.py 변환기에서 합니다. 원본 파일 해시는 manifest.json에 있습니다.
'use client';
import React from 'react';
import { createGlobalStyle } from 'styled-components';
import { PortedLogic, SourceNode } from '../referenceRuntime';
const ReferenceCss = createGlobalStyle`@font-face{font-family:'NexonLv2Gothic';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_20-04@2.1/NEXON Lv2 Gothic.woff') format('woff');font-weight:400;font-display:swap}@font-face{font-family:'NexonLv2Gothic';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_20-04@2.1/NEXON Lv2 Gothic Bold.woff') format('woff');font-weight:700;font-display:swap}
@keyframes cxDrift{from{transform:translateX(0)}to{transform:translateX(-160px)}}
@keyframes cxShoot{0%{transform:translate(0,0) rotate(-32deg);opacity:0}4%{opacity:1}12%{transform:translate(-520px,330px) rotate(-32deg);opacity:0}100%{transform:translate(-520px,330px) rotate(-32deg);opacity:0}}`;
export default class ComplexExplodeReference extends PortedLogic {
  referenceState = { scale: Math.min(window.innerWidth / 1920, window.innerHeight / 1080), model: 'plane', sel: null, hov: null, hovPi: null, wire: false, leaving: false, nSub: 0 };
  lRef = Array.from({ length: 8 }, () => React.createRef());
  sRef = Array.from({ length: 14 }, () => React.createRef());
  glRef = React.createRef(); lnRef = React.createRef();
  META = {
    plane: { name: '여객기', sub: '터보팬 엔진 · 내부 구조 포함', yaw: 0.72, pitch: 0.3, R: 4.2, secs: [
      ['동체 구조', '외피 · 프레임 · 스트링어', '외피 3분할과 원형 프레임, 길이 방향 스트링어로 이루어진 기본 구조입니다. 레이돔과 테일 콘이 앞뒤를 마감합니다.', 12, 45],
      ['주날개', '외피 · 스파 · 리브 · 플랩', '스파가 날개 하중을 받고, 리브가 날개 단면 형상을 유지합니다. 뒤쪽에 플랩과 에일러론이 붙습니다.', 10, 40],
      ['꼬리날개', '안정판 · 방향타 · 승강타', '수직·수평 안정판이 방향을 잡고, 방향타와 승강타가 좌우·상하 자세를 조종합니다.', 8, 30],
      ['엔진 코어', '팬 · 압축기 · 연소실 · 터빈', '팬이 공기를 빨아들이면 압축기가 압축하고, 연소실에서 연료와 태운 뒤 터빈을 돌려 추력을 만듭니다.', 14, 55],
      ['나셀 · 파일런', '팬 카울 · 역추력 카울 · 파일런', '엔진 코어를 감싸는 덮개와, 엔진을 날개에 매다는 파일런입니다.', 6, 25],
      ['랜딩 기어', '노즈 기어 · 메인 기어 · 휠', '앞쪽 노즈 기어와 날개 아래 메인 기어가 착륙 하중을 받습니다.', 9, 35],
      ['조종석', '조종석 창 · 계기판 · 좌석', '조종사 2인이 앉는 공간입니다. 계기판, 조종간, 오버헤드 패널이 들어갑니다.', 8, 30],
      ['객실 내장', '바닥 · 좌석 · 오버헤드 빈', '객실 바닥 위에 좌석 열과 짐칸, 갤리가 배치됩니다.', 7, 28]] },
    phone: { name: '스마트폰', sub: '카메라 3구 · 내부 기판 포함', yaw: 0.95, pitch: 0.24, R: 2.7, secs: [
      ['후면 커버', '후면 유리 · 카메라 범프 · 충전 코일', '뒷면 유리와 카메라 범프, 안쪽에 붙는 무선 충전 코일입니다.', 5, 15],
      ['카메라 모듈', '광각 · 초광각 · 망원 · 브래킷', '렌즈 3개를 브래킷에 고정하고 플래시와 LiDAR를 함께 배치합니다.', 6, 20],
      ['배터리', '배터리 셀 · 커넥터 · 접착 탭', '배터리 셀을 접착 탭으로 고정하고 커넥터를 메인보드에 연결합니다.', 4, 12],
      ['메인보드', 'PCB · AP · 메모리 · 쉴드 캔', 'PCB 위에 AP와 메모리, 전원 관리 IC를 올리고 쉴드 캔으로 덮습니다.', 9, 30],
      ['미드 프레임', '측면 프레임 · 미드 플레이트 · 버튼', '전체 부품이 고정되는 뼈대입니다. 측면 버튼이 프레임에 들어갑니다.', 5, 15],
      ['디스플레이', 'OLED 패널 · 플렉스 · 터치 IC', 'OLED 패널과 플렉스 케이블, 터치 IC로 이루어집니다.', 6, 18],
      ['전면 유리', '커버 유리 · 전면 센서 · 방수 테이프', '전면 카메라와 Face ID 센서를 정렬한 뒤, 방수 테이프로 커버 유리를 붙입니다.', 4, 12],
      ['스피커 · 진동 · SIM', '스피커 · 탭틱 엔진 · SIM · USB-C', '하단 스피커와 탭틱 엔진, SIM 트레이, USB-C 포트, 수화부 스피커입니다.', 6, 16]] }
  };
  onResize = () => this.updateReferenceState({ scale: Math.min(window.innerWidth / 1920, window.innerHeight / 1080) }, () => this.fitRes && this.fitRes());
  mountReference() { this.listen('resize', this.onResize); this.boot(); }
  unmountReference() { this.unlisten('resize', this.onResize); this.unlisten('keydown', this.onKey); cancelAnimationFrame(this.raf); clearTimeout(this.bt); clearTimeout(this.introT); if (this.r) this.r.dispose(); }

  boot() {
    const T = window.THREE; if (!T || !this.glRef.current) { this.bt = this.delay(() => this.boot(), 80); return; }
    const r = this.createRenderer(T, { antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(1); this.fitRes = () => { const s = Math.min(1, Math.max(0.5, this.referenceState.scale * Math.min(window.devicePixelRatio || 1, 1.5))); r.setSize(Math.round(1920 * s), Math.round(1080 * s), false); }; this.fitRes(); r.setClearColor(0x000000, 0);
    r.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
    r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    this.glRef.current.appendChild(r.domElement); this.r = r;
    const sc = new T.Scene(); this.sc = sc;
    const cam = new T.PerspectiveCamera(32, 16 / 9, 0.05, 200); cam.setViewOffset(1920, 1080, 150, 0, 1920, 1080); this.cam = cam;
    sc.add(new T.HemisphereLight(0xdfe6ee, 0x1a1210, 0.85));
    const key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(4, 7, 5); sc.add(key);
    const rim = new T.DirectionalLight(0xf37321, 1.7); rim.position.set(-6, 2, -5); sc.add(rim);
    const rim2 = new T.DirectionalLight(0x9fb4c8, 0.7); rim2.position.set(5, -2, -6); sc.add(rim2);
    const fill = new T.DirectionalLight(0xffe2cc, 0.55); fill.position.set(-4, 3, 6); sc.add(fill);
    this.ray = new T.Raycaster(); this.mouse = null; this.v = new T.Vector3();
    this.orb = { yaw: 0, pitch: 0, dist: 10, tYaw: 0, tPitch: 0, zoom: 1, tgt: new T.Vector3(), pan: new T.Vector3(), tPan: new T.Vector3() };
    this.bindInput(r.domElement);
    this.load(this.referenceState.model);
    let last = performance.now();
    const loop = now => { this.raf = this.scheduleFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; this.frame(dt, now / 1000); };
    this.raf = this.scheduleFrame(loop);
  }

  kit(T, root, PAL) {
    const self = this; let cur = null;
    const P = (sec, name, ex1, ex2) => { const g = new T.Group(); root.add(g); cur = { idx: self.parts.length, sec, name, g, ex1: new T.Vector3(...ex1), ex2: new T.Vector3(...ex2), mats: [], cache: {}, lm: new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }), meshes: [], a: 1, hl: 0 }; self.parts.push(cur); return cur; };
    self.shared = self.shared || {}; const mat = k => { if (!cur.cache[k]) { const d = PAL[k]; if (!self.shared[k]) { const m0 = new T.MeshStandardMaterial({ color: d[0], metalness: d[1], roughness: d[2], transparent: d[3] < 1, opacity: d[3], emissive: d[4] || 0x000000, emissiveIntensity: d[4] ? d[5] : 0, side: d[6] ? T.DoubleSide : T.FrontSide }); m0.userData = { op0: d[3], own: !!d[4] }; self.shared[k] = m0; } const m = self.shared[k]; cur.cache[k] = m; cur.mats.push(m); } return cur.cache[k]; }; const _unused = k => { if (!cur.cache[k]) { const d = PAL[k]; const m = new T.MeshStandardMaterial({ color: d[0], metalness: d[1], roughness: d[2], transparent: true, opacity: d[3], emissive: d[4] || 0xf37321, emissiveIntensity: d[4] ? d[5] : 0, side: d[6] ? T.DoubleSide : T.FrontSide }); m.userData = { op0: d[3], own: !!d[4] }; cur.cache[k] = m; cur.mats.push(m); } return cur.cache[k]; };
    const M = (geo, k, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, edge = true) => { const m = new T.Mesh(geo, mat(k)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.userData.pi = cur.idx; cur.g.add(m); cur.meshes.push(m); if (edge) { const eg = new T.EdgesGeometry(geo, 30); m.updateMatrix(); eg.applyMatrix4(m.matrix); (cur.eg = cur.eg || []).push(eg); } self.pick.push(m); return m; };
    const I = (geo, k, list) => { const im = new T.InstancedMesh(geo, mat(k), list.length); list.forEach((mm, i) => im.setMatrixAt(i, mm)); im.userData.pi = cur.idx; cur.g.add(im); cur.meshes.push(im); cur.inst = true; return im; };
    const d = new T.Object3D();
    const ring = (n, r0, r1, x, y, z, tw) => { const out = [], rm = (r0 + r1) / 2; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; d.position.set(x, y + Math.cos(a) * rm, z + Math.sin(a) * rm); d.rotation.set(a, tw, 0); d.updateMatrix(); out.push(d.matrix.clone()); } return out; };
    const at = (x, y, z, rx = 0, ry = 0, rz = 0) => { d.position.set(x, y, z); d.rotation.set(rx, ry, rz); d.updateMatrix(); return d.matrix.clone(); };
    return { P, M, I, ring, at };
  }

  buildPlane(T, root) {
    const PAL = { skin: [0xe9ecef, .35, .38, 1, 0, 0, 1], orange: [0xf37321, .3, .45, 1], wing: [0xd3d8de, .45, .4, 1], inner: [0x8d949c, .7, .4, 1], spar: [0x6f7780, .8, .35, 1], metal: [0xb9c0c8, .85, .3, 1], ti: [0x9aa3ad, .9, .32, 1, 0, 0, 1], dark: [0x2a2d31, .5, .5, 1], copper: [0xc27a43, .85, .32, 1, 0, 0, 1], tire: [0x141516, 0, .92, 1], glass: [0x1b2a3a, .2, .05, .8, 0, 0, 1], seat: [0x3a4656, .1, .7, 1], screen: [0x0d1115, .2, .4, 1, 0x3fa9c9, .7], window: [0x0e1620, .3, .1, 1], cabin: [0xcfc8bd, .05, .8, 1] };
    const { P, M, I, ring, at } = this.kit(T, root, PAL);
    const cylX = (r1, r2, len, seg = 32, open = false) => { const g = new T.CylinderGeometry(r1, r2, len, seg, 1, open); g.rotateZ(-Math.PI / 2); return g; };
    const cylY = (r, len, seg = 16) => new T.CylinderGeometry(r, r, len, seg);
    const cylZ = (r, len, seg = 24) => { const g = new T.CylinderGeometry(r, r, len, seg); g.rotateX(Math.PI / 2); return g; };
    const latheX = (pts, dir) => { const g = new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), 36); g.rotateZ(dir > 0 ? -Math.PI / 2 : Math.PI / 2); return g; };
    const plan = (LE, CH, z0, z1, f0, f1, th) => { const s = new T.Shape(); s.moveTo(LE(z0) - CH(z0) * f0, z0); s.lineTo(LE(z1) - CH(z1) * f0, z1); s.lineTo(LE(z1) - CH(z1) * f1, z1); s.lineTo(LE(z0) - CH(z0) * f1, z0); s.closePath(); const g = new T.ExtrudeGeometry(s, { depth: th, bevelEnabled: false }); g.rotateX(Math.PI / 2); g.translate(0, th / 2, 0); return g; };
    const win = (x0, x1) => { const l = []; for (let x = x0; x <= x1; x += 0.19) for (const s of [-1, 1]) l.push(at(x, 0.1, s * 0.318)); return l; };
    const winG = new T.BoxGeometry(0.07, 0.075, 0.014);
    // 01 fuselage
    P(0, '전방 동체', [0, 0, 0], [0.55, 0.4, 0]); M(cylX(0.32, 0.32, 1.4, 40), 'skin', 1.6, 0, 0); M(cylX(0.327, 0.327, 0.07, 40), 'orange', 1.05, 0, 0, 0, 0, 0, false); I(winG, 'window', win(0.95, 1.9));
    P(0, '중앙 동체', [0, 0, 0], [0, 0.75, 0]); M(cylX(0.32, 0.32, 1.8, 40), 'skin', 0, 0, 0); I(winG, 'window', win(-0.8, 0.8));
    P(0, '후방 동체', [0, 0, 0], [-0.55, 0.4, 0]); M(cylX(0.32, 0.25, 1.4, 40), 'skin', -1.6, 0, 0); I(winG, 'window', win(-2.1, -1.0));
    const nose = []; for (let i = 0; i <= 12; i++) { const t = i / 12; nose.push([Math.max(0.001, 0.32 * Math.sqrt(1 - t * t)), t * 0.75]); }
    P(0, '레이돔', [0.35, 0, 0], [1.0, 0, 0]); M(latheX(nose, 1), 'skin', 2.3, 0, 0);
    const tail = []; for (let i = 0; i <= 10; i++) { const t = i / 10; tail.push([0.25 - t * 0.2, t * 0.72]); }
    P(0, '테일 콘', [-0.35, 0, 0], [-1.0, 0, 0]); M(latheX(tail, -1), 'skin', -2.3, 0, 0);
    P(0, '동체 프레임', [0, 0, 0], [0, 0, 0]); for (let k = 0; k < 11; k++) M(new T.TorusGeometry(0.3, 0.012, 6, 40), 'inner', -2.1 + k * 0.42, 0, 0, 0, Math.PI / 2, 0, false);
    P(0, '스트링어', [0, 0, 0], [0, -0.55, 0]); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; M(new T.BoxGeometry(4.4, 0.018, 0.018), 'spar', 0, Math.cos(a) * 0.285, Math.sin(a) * 0.285, 0, 0, 0, false); }
    // 02 wings
    const LE = z => 0.62 - (z - 0.3) * 0.5, CH = z => 1.35 - (z - 0.3) * 0.33, WY = -0.2;
    for (const s of [1, -1]) {
      const side = s > 0 ? '우측' : '좌측';
      P(1, side + ' 날개 외피', [0, -0.05, s * 0.95], [0, 0.45, 0]); M(plan(LE, CH, 0.3, 3.0, 0, 0.82, 0.06), 'wing', 0, WY, 0).scale.z = s;
      P(1, '날개 스파', [0, -0.05, s * 0.95], [0, -0.32, 0]);
      for (const f of [0.2, 0.68]) { const x0 = LE(0.35) - CH(0.35) * f, x1 = LE(2.9) - CH(2.9) * f, L = Math.hypot(x1 - x0, 2.55); M(new T.BoxGeometry(0.03, 0.045, L), 'spar', (x0 + x1) / 2, WY, s * 1.625, 0, s * Math.atan2(x1 - x0, 2.55), 0); }
      P(1, '날개 리브', [0, -0.05, s * 0.95], [0, 0, 0]); for (let k = 0; k < 7; k++) { const z = 0.45 + k * 0.38; M(new T.BoxGeometry(CH(z) * 0.78, 0.045, 0.014), 'inner', LE(z) - CH(z) * 0.42, WY, s * z); }
      P(1, '플랩', [0, -0.05, s * 0.95], [-0.35, -0.08, 0]); M(plan(LE, CH, 0.35, 1.7, 0.84, 1, 0.035), 'wing', 0, WY, 0).scale.z = s;
      P(1, '에일러론', [0, -0.05, s * 0.95], [-0.35, 0, s * 0.18]); M(plan(LE, CH, 1.85, 2.85, 0.84, 1, 0.035), 'wing', 0, WY, 0).scale.z = s;
    }
    // 03 tail
    const shapeXY = (pts, th) => { const s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => s.lineTo(p[0], p[1])); s.closePath(); const g = new T.ExtrudeGeometry(s, { depth: th, bevelEnabled: false }); g.translate(0, 0, -th / 2); return g; };
    P(2, '수직 안정판', [-0.95, 0.4, 0], [0, 0.3, 0]); M(shapeXY([[-1.95, 0.18], [-2.72, 1.3], [-2.97, 1.3], [-2.86, 0.18]], 0.05), 'wing', 0, 0, 0);
    P(2, '방향타', [-0.95, 0.4, 0], [-0.3, 0, 0]); M(shapeXY([[-2.87, 0.2], [-2.98, 1.28], [-3.1, 1.28], [-3.0, 0.2]], 0.04), 'wing', 0, 0, 0);
    const LEh = z => -2.42 - (z - 0.12) * 0.45, CHh = z => 0.55 - (z - 0.12) * 0.3;
    for (const s of [1, -1]) {
      P(2, '수평 안정판', [-0.95, 0.4, s * 0.3], [0, 0, s * 0.35]); M(plan(LEh, CHh, 0.12, 1.1, 0, 0.8, 0.04), 'wing', 0, 0.12, 0).scale.z = s;
      P(2, '승강타', [-0.95, 0.4, s * 0.3], [-0.3, 0, s * 0.35]); M(plan(LEh, CHh, 0.14, 1.08, 0.82, 1, 0.03), 'wing', 0, 0.12, 0).scale.z = s;
    }
    // 04 engine core + 05 nacelle
    const sp = []; for (let i = 0; i <= 8; i++) { const t = i / 8; sp.push([Math.max(0.001, 0.09 * (1 - t * t)), t * 0.15]); }
    const ex = []; for (let i = 0; i <= 8; i++) { const t = i / 8; ex.push([0.1 - t * 0.085, t * 0.3]); }
    for (const s of [1, -1]) {
      const X = 0.32, Y = -0.62, Z = s * 1.15, o1 = [0, -1.0, s * 0.35];
      P(3, '팬', o1, [0.75, 0, 0]); M(latheX(sp, 1), 'ti', X + 0.57, Y, Z); M(cylX(0.09, 0.09, 0.04, 24), 'ti', X + 0.55, Y, Z); I(new T.BoxGeometry(0.012, 0.19, 0.065), 'ti', ring(20, 0.09, 0.28, X + 0.55, Y, Z, 0.5));
      P(3, '저압 압축기', o1, [0.45, 0, 0]); for (let j = 0; j < 3; j++) { const x = X + 0.4 - j * 0.06; M(cylX(0.11, 0.11, 0.028, 20), 'metal', x, Y, Z); I(new T.BoxGeometry(0.01, 0.1, 0.035), 'metal', ring(16, 0.11, 0.21, x, Y, Z, 0.4)); }
      P(3, '고압 압축기', o1, [0.2, 0, 0]); for (let j = 0; j < 4; j++) { const x = X + 0.21 - j * 0.05; M(cylX(0.09, 0.09, 0.022, 20), 'metal', x, Y, Z); I(new T.BoxGeometry(0.008, 0.06, 0.025), 'metal', ring(18, 0.09, 0.15, x, Y, Z, 0.4)); }
      P(3, '연소실', o1, [0, 0, 0]); M(cylX(0.155, 0.155, 0.14, 28, true), 'copper', X - 0.0, Y, Z, 0, 0, 0, false); M(cylX(0.1, 0.1, 0.14, 24, true), 'copper', X, Y, Z, 0, 0, 0, false); M(new T.TorusGeometry(0.13, 0.02, 8, 32), 'copper', X + 0.075, Y, Z, 0, Math.PI / 2, 0, false);
      P(3, '고압 터빈', o1, [-0.25, 0, 0]); for (let j = 0; j < 2; j++) { const x = X - 0.11 - j * 0.045; M(cylX(0.1, 0.1, 0.022, 20), 'ti', x, Y, Z); I(new T.BoxGeometry(0.01, 0.06, 0.025), 'ti', ring(20, 0.1, 0.16, x, Y, Z, -0.5)); }
      P(3, '저압 터빈', o1, [-0.5, 0, 0]); for (let j = 0; j < 3; j++) { const x = X - 0.21 - j * 0.05; M(cylX(0.12, 0.12, 0.024, 20), 'ti', x, Y, Z); I(new T.BoxGeometry(0.01, 0.09, 0.03), 'ti', ring(22, 0.12, 0.21, x, Y, Z, -0.5)); }
      P(3, '배기 콘', o1, [-0.85, 0, 0]); M(latheX(ex, -1), 'metal', X - 0.36, Y, Z); M(cylX(0.24, 0.2, 0.12, 32, true), 'dark', X - 0.42, Y, Z, 0, 0, 0, false);
      P(3, '엔진 샤프트', o1, [0, -0.35, 0]); M(cylX(0.022, 0.022, 1.0, 12), 'metal', X + 0.05, Y, Z);
      P(4, '팬 카울', [0.2, -0.35, s * 0.75], [0.4, 0, 0]); M(cylX(0.31, 0.31, 0.5, 40, true), 'skin', X + 0.42, Y, Z, 0, 0, 0, false); M(new T.TorusGeometry(0.3, 0.028, 10, 40), 'skin', X + 0.67, Y, Z, 0, Math.PI / 2, 0, false);
      P(4, '역추력 카울', [-0.2, -0.35, s * 0.75], [-0.4, 0, 0]); M(cylX(0.31, 0.25, 0.5, 40, true), 'skin', X - 0.08, Y, Z, 0, 0, 0, false);
      P(4, '파일런', [0, -0.25, s * 0.45], [0, 0.3, 0]); M(new T.BoxGeometry(1.0, 0.16, 0.06), 'skin', X + 0.1, Y + 0.38, Z);
    }
    // 06 gear
    P(5, '노즈 기어', [0, -1.3, 0], [0, 0, 0]); M(cylY(0.022, 0.36, 10), 'metal', 2.0, -0.47, 0); M(new T.BoxGeometry(0.08, 0.02, 0.05), 'dark', 2.03, -0.55, 0);
    P(5, '휠 · 타이어', [0, -1.3, 0], [0, -0.35, 0]); for (const z of [-0.048, 0.048]) { M(cylZ(0.075, 0.045, 24), 'tire', 2.0, -0.66, z); M(cylZ(0.04, 0.05, 16), 'metal', 2.0, -0.66, z, 0, 0, 0, false); }
    for (const s of [1, -1]) {
      P(5, '메인 기어', [0, -1.3, s * 0.2], [0, 0, 0]); M(cylY(0.032, 0.42, 12), 'metal', -0.12, -0.5, s * 0.5); M(new T.BoxGeometry(0.3, 0.04, 0.04), 'dark', -0.12, -0.72, s * 0.5);
      P(5, '휠 · 타이어', [0, -1.3, s * 0.2], [0, -0.35, s * 0.2]); for (const x of [-0.22, -0.02]) for (const dz of [-0.06, 0.06]) { M(cylZ(0.1, 0.065, 24), 'tire', x, -0.76, s * 0.5 + dz); M(cylZ(0.055, 0.07, 16), 'metal', x, -0.76, s * 0.5 + dz, 0, 0, 0, false); }
    }
    // 07 cockpit
    const cw = new T.CylinderGeometry(0.334, 0.334, 0.36, 28, 1, true, Math.PI + 0.45, Math.PI - 0.9); cw.rotateZ(-Math.PI / 2);
    P(6, '조종석 창', [0.9, 0.85, 0], [0.2, 0.35, 0]); M(cw, 'glass', 2.12, 0, 0, 0, 0, 0, false);
    P(6, '계기판', [0.9, 0.85, 0], [0.3, 0, 0]); M(new T.BoxGeometry(0.05, 0.12, 0.42), 'dark', 2.42, 0.02, 0, 0, 0, -0.4); for (let i = 0; i < 4; i++) M(new T.BoxGeometry(0.006, 0.07, 0.085), 'screen', 2.39, 0.03, -0.15 + i * 0.1, 0, 0, -0.4, false);
    P(6, '조종석 좌석', [0.9, 0.85, 0], [-0.25, 0, 0]); for (const s of [1, -1]) { M(new T.BoxGeometry(0.1, 0.04, 0.1), 'seat', 2.12, -0.12, s * 0.11); M(new T.BoxGeometry(0.03, 0.16, 0.1), 'seat', 2.06, -0.03, s * 0.11); }
    P(6, '조종간 · 스로틀', [0.9, 0.85, 0], [0.15, -0.15, 0]); for (const s of [1, -1]) M(cylY(0.008, 0.12, 8), 'metal', 2.28, -0.06, s * 0.11); M(new T.BoxGeometry(0.06, 0.04, 0.05), 'dark', 2.28, -0.07, 0);
    P(6, '오버헤드 패널', [0.9, 0.85, 0], [0, 0.3, 0]); M(new T.BoxGeometry(0.22, 0.03, 0.2), 'dark', 2.22, 0.24, 0);
    // 08 cabin
    P(7, '객실 바닥', [0, 1.45, 0], [0, -0.25, 0]); M(new T.BoxGeometry(3.7, 0.025, 0.52), 'inner', -0.15, -0.13, 0);
    const sb = [], sk = []; for (let x = 1.5; x > -2.0; x -= 0.19) for (const z of [-0.2, -0.1, 0.1, 0.2]) { sb.push(at(x, -0.1, z)); sk.push(at(x - 0.04, -0.035, z)); }
    P(7, '승객 좌석', [0, 1.45, 0], [0, 0.15, 0]); I(new T.BoxGeometry(0.09, 0.03, 0.085), 'seat', sb); I(new T.BoxGeometry(0.022, 0.11, 0.085), 'seat', sk);
    P(7, '오버헤드 빈', [0, 1.45, 0], [0, 0.35, 0]); for (const s of [1, -1]) M(new T.BoxGeometry(3.4, 0.07, 0.09), 'cabin', -0.2, 0.19, s * 0.2);
    P(7, '갤리 · 화장실', [0, 1.45, 0], [0.35, 0, 0]); M(new T.BoxGeometry(0.22, 0.3, 0.46), 'cabin', 1.78, 0.02, 0);
  }

  buildPhone(T, root) {
    const PAL = { back: [0x2b3442, .25, .18, 1], frame: [0xb7bcc2, .95, .22, 1], plate: [0x8f969d, .8, .35, 1], pcb: [0x1d4a3a, .2, .55, 1], chip: [0x1a1b1e, .3, .5, 1], shield: [0xc9ced3, .9, .3, 1], bat: [0x222428, .3, .5, 1], label: [0x8a9096, .6, .4, 1], flex: [0xd08a2c, .3, .5, 1], disp: [0x06070a, .3, .3, 1, 0x1d3550, .55], glass: [0x0c1016, .2, .03, .42, 0, 0, 1], lens: [0x07080a, .4, .15, 1], ring: [0x9aa0a6, .9, .25, 1], sil: [0xa9aeb4, .9, .3, 1], grey: [0x3a3d42, .4, .6, 1], copper: [0xc27a43, .85, .3, 1], white: [0xe6e2dc, 0, .8, 1], flash: [0xfff3dd, .1, .4, 1, 0xffe8c4, .4] };
    const { P, M } = this.kit(T, root, PAL);
    const rr = (w, h, r) => { const s = new T.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
    const ext = (sh, d) => { const g = new T.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 8 }); g.translate(0, 0, -d / 2); return g; };
    const slab = (w, h, r, d) => ext(rr(w, h, r), d);
    const ringS = (w, h, r, w2, h2, r2, d) => { const s = rr(w, h, r); s.holes.push(rr(w2, h2, r2)); return ext(s, d); };
    const cylZ = (r, len, seg = 28) => { const g = new T.CylinderGeometry(r, r, len, seg); g.rotateX(Math.PI / 2); return g; };
    const B = (w, h, d) => new T.BoxGeometry(w, h, d);
    const E = (dz, dy = 0) => [dz * 0.32, dz * 0.12 + dy, dz];
    const LP = [[-0.48, 1.2], [-0.48, 0.99], [-0.28, 1.095]], LC = [-0.41, 1.095];
    P(0, '후면 유리', E(-1.6), [0, 0, 0]); M(slab(1.48, 3.08, 0.21, 0.014), 'back', 0, 0, -0.075);
    P(0, '카메라 범프', E(-1.6), [0, 0, -0.25]); M(slab(0.64, 0.64, 0.15, 0.022), 'back', -0.38, 1.1, -0.092);
    P(0, '카메라 커버 유리', E(-1.6), [0, 0, -0.45]); LP.forEach(p => { M(cylZ(0.1, 0.008), 'glass', p[0], p[1], -0.106, 0, 0, 0, false); M(new T.TorusGeometry(0.1, 0.008, 6, 32), 'ring', p[0], p[1], -0.106, 0, 0, 0, false); });
    P(0, '무선 충전 코일', E(-1.6), [0, 0, 0.3]); for (const r of [0.32, 0.27, 0.22]) M(new T.TorusGeometry(r, 0.01, 6, 48), 'copper', 0, -0.15, -0.064, 0, 0, 0, false);
    ['광각 카메라', '초광각 카메라', '망원 카메라'].forEach((n, i) => { const p = LP[i]; P(1, n, E(-1.1), [(p[0] - LC[0]) * 2.4, (p[1] - LC[1]) * 2.4, -0.08]); M(cylZ(0.085, 0.07), 'lens', p[0], p[1], -0.055); M(new T.TorusGeometry(0.085, 0.01, 6, 32), 'ring', p[0], p[1], -0.09, 0, 0, 0, false); M(B(0.17, 0.17, 0.02), 'chip', p[0], p[1], -0.02); });
    P(1, '카메라 브래킷', E(-1.1), [0, 0, 0.25]); M(B(0.52, 0.5, 0.012), 'sil', -0.38, 1.1, -0.012);
    P(1, '플래시 · LiDAR', E(-1.1), [0.3, 0, 0]); M(cylZ(0.035, 0.012), 'flash', -0.22, 1.3, -0.09); M(cylZ(0.03, 0.012), 'lens', -0.22, 0.9, -0.09);
    P(2, '배터리 셀', E(-0.7), [0, 0, 0]); M(slab(1.15, 1.6, 0.08, 0.045), 'bat', 0.05, -0.42, -0.035); M(B(0.9, 1.2, 0.002), 'label', 0.05, -0.42, -0.0585, 0, 0, 0, false);
    P(2, '배터리 커넥터', E(-0.7), [0, 0.35, 0.12]); M(B(0.3, 0.12, 0.006), 'flex', 0.35, 0.42, -0.02);
    P(2, '접착 탭', E(-0.7), [0, 0, -0.3]); for (const x of [-0.3, 0.4]) M(B(0.08, 1.3, 0.003), 'white', x, -0.42, -0.06);
    P(3, 'PCB 기판', E(-0.3), [0, 0, 0]); M(slab(0.72, 1.02, 0.06, 0.012), 'pcb', 0.32, 0.95, -0.02);
    P(3, 'AP (프로세서)', E(-0.3), [0, 0, 0.32]); M(B(0.2, 0.2, 0.018), 'sil', 0.3, 1.05, -0.006);
    P(3, '메모리', E(-0.3), [0.12, 0, 0.3]); M(B(0.16, 0.11, 0.016), 'chip', 0.3, 0.76, -0.007);
    P(3, '쉴드 캔', E(-0.3), [0, 0, 0.55]); M(B(0.62, 0.9, 0.03), 'shield', 0.32, 0.95, 0.008);
    P(3, '전원 관리 IC', E(-0.3), [0, -0.1, 0.25]); M(B(0.1, 0.1, 0.012), 'chip', 0.55, 0.62, -0.009);
    P(3, '보드 커넥터', E(-0.3), [0.25, 0, 0.15]); [[0.6, 1.32], [0.6, 0.56], [0.06, 0.56]].forEach(p => M(B(0.12, 0.05, 0.02), 'grey', p[0], p[1], -0.008));
    P(4, '측면 프레임', E(0), [0, 0, 0]); M(ringS(1.5, 3.1, 0.22, 1.4, 3.0, 0.18, 0.16), 'frame', 0, 0, 0);
    P(4, '미드 플레이트', E(0), [0, 0, -0.35]); M(slab(1.4, 3.0, 0.18, 0.008), 'plate', 0, 0, 0.03);
    P(4, '측면 버튼', E(0), [0.35, 0, 0]); M(B(0.03, 0.35, 0.06), 'frame', 0.765, 0.55, 0);
    P(4, '측면 버튼', E(0), [-0.35, 0, 0]); [1.05, 0.72, 0.45].forEach((y, i) => M(B(0.03, i ? 0.22 : 0.1, 0.06), 'frame', -0.765, y, 0));
    P(5, 'OLED 패널', E(0.6), [0, 0, 0]); M(slab(1.42, 3.02, 0.2, 0.012), 'disp', 0, 0, 0.062);
    P(5, '디스플레이 플렉스', E(0.6), [0, -0.38, -0.12]); M(B(0.34, 0.36, 0.004), 'flex', 0, -1.62, 0.054);
    P(5, '터치 IC', E(0.6), [0, -0.55, -0.08]); M(B(0.1, 0.08, 0.012), 'chip', 0, -1.66, 0.05);
    P(6, '커버 유리', E(1.1), [0, 0, 0]); M(slab(1.5, 3.1, 0.22, 0.01), 'glass', 0, 0, 0.082);
    P(6, '전면 카메라 · Face ID', E(1.1), [0, 0.12, -0.35]); M(slab(0.36, 0.1, 0.05, 0.006), 'lens', 0, 1.38, 0.072); M(cylZ(0.02, 0.01), 'lens', -0.09, 1.38, 0.076); M(cylZ(0.024, 0.01), 'lens', 0.1, 1.38, 0.076);
    P(6, '방수 테이프', E(1.1), [0, 0, -0.22]); M(ringS(1.48, 3.08, 0.21, 1.4, 3.0, 0.18, 0.004), 'white', 0, 0, 0.074);
    P(7, '하단 스피커', E(-0.7, -0.35), [-0.3, -0.2, 0]); M(B(0.42, 0.17, 0.06), 'grey', -0.42, -1.36, -0.02);
    P(7, '탭틱 엔진', E(-0.7, -0.35), [0.3, -0.2, 0]); M(B(0.46, 0.13, 0.05), 'sil', 0.36, -1.36, -0.02);
    P(7, 'USB-C 포트', E(-0.7, -0.35), [0, -0.42, 0]); M(B(0.24, 0.06, 0.07), 'sil', 0, -1.5, -0.005);
    P(7, 'SIM 트레이', E(-0.7), [0.5, 0, 0]); M(B(0.02, 0.5, 0.025), 'sil', 0.72, -0.2, -0.005);
    P(7, '수화부 스피커', E(-0.7, 0.2), [0, 0.35, 0]); M(B(0.3, 0.045, 0.03), 'grey', 0, 1.47, 0.03);
  }

  load(model) {
    const T = window.THREE;
    if (this.root) { this.sc.remove(this.root); this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); this.parts.forEach(p => { p.lm.dispose(); }); }
    if (this.shared) Object.values(this.shared).forEach(m => m.dispose()); this.shared = {}; if (this.dimM) this.dimM.dispose(); this.dimM = new T.MeshBasicMaterial({ color: 0x8a96a3, transparent: true, opacity: 0.06, depthWrite: false }); if (this.hlM) Object.values(this.hlM).forEach(m => m.dispose()); this.hlM = {};
    const root = new T.Group(); this.sc.add(root); this.root = root; this.parts = []; this.pick = [];
    (model === 'plane' ? this.buildPlane : this.buildPhone).call(this, T, root);
    this.parts.forEach(p => { if (!p.eg) return; let n = 0; p.eg.forEach(g => n += g.attributes.position.count); const arr = new Float32Array(n * 3); let o = 0; p.eg.forEach(g => { arr.set(g.attributes.position.array, o); o += g.attributes.position.array.length; g.dispose(); }); const mg = new T.BufferGeometry(); mg.setAttribute('position', new T.BufferAttribute(arr, 3)); p.g.add(new T.LineSegments(mg, p.lm)); p.eg = null; });
    root.updateMatrixWorld(true);
    const bb = new T.Box3();
    this.proxyM = this.proxyM || new T.MeshBasicMaterial({ visible: false }); this.parts.forEach(p => { if (p.inst && !p.meshes.some(m => !m.isInstancedMesh)) { const b0 = new T.Box3().setFromObject(p.g), sz = b0.getSize(new T.Vector3()), px = new T.Mesh(new T.BoxGeometry(sz.x || .01, sz.y || .01, sz.z || .01), this.proxyM); b0.getCenter(px.position).sub(p.g.position); px.userData.pi = p.idx; p.g.add(px); this.pick.push(px); } }); this.parts.forEach(p => { const b = new T.Box3().setFromObject(p.g); p.c0 = b.getCenter(new T.Vector3()).sub(p.g.position); p.rad = b.getSize(new T.Vector3()).length() / 2; p.base = p.g.position.clone(); p.wc = new T.Vector3(); bb.union(b); });
    const M = this.META[model]; this.center0 = bb.getCenter(new T.Vector3()); this.M = M;
    this.secC = Array.from({ length: 8 }, () => new T.Vector3()); this.secS = Array.from({ length: 8 }, () => [960, 540]);
    this.e1 = 0; this.v1 = 0; this.t1 = 0; this.e2 = Array(8).fill(0); this.v2 = Array(8).fill(0); this.t2 = Array(8).fill(0);
    this.la = 0; this.sa = 0; this.loadT = performance.now(); this.subList = [];
    clearTimeout(this.introT); this.introT = this.delay(() => { this.t1 = 1; }, 650);
    const o = this.orb; o.yaw = o.tYaw = M.yaw; o.pitch = o.tPitch = M.pitch; o.dist = M.R * 2.4; o.zoom = 1; o.tgt.copy(this.center0); o.pan.set(0, 0, 0); o.tPan.set(0, 0, 0);
    this.applyWire(this.referenceState.wire);
  }

  applyWire(w) { (this.parts || []).forEach(p => { p.mats.forEach(m => { m.visible = !w; }); p.lm.color.setHex(w ? 0xffe6d2 : 0xffffff); }); Object.values(this.shared || {}).forEach(m => { m.visible = !w; }); Object.values(this.hlM || {}).forEach(m => { m.visible = !w; }); if (this.dimM) this.dimM.visible = !w; }

  selectSec(s) {
    const prev = this.referenceState.sel; if (prev != null) this.t2[prev] = 0;
    if (s != null) { this.t2[s] = 1; const seen = {}; this.subList = []; this.parts.forEach((p, i) => { if (p.sec === s && !seen[p.name] && this.subList.length < 14) { seen[p.name] = 1; this.subList.push(i); } }); }
    else this.subList = [];
    this.subHov = null; this._lHov = null; this._lHp = null; this._sw = null; this.updateReferenceState({ sel: s, hov: null, hovPi: null, nSub: this.subList.length });
  }

  startTraining() { if (this.referenceState.sel == null || this.referenceState.leaving) return; this.updateReferenceState({ leaving: true }); this.delay(() => { window.location.href = '/training/hud?intro=1&sec=0'; }, 650); }

  bindInput(cv) {
    const T = window.THREE, cl = (v, a, b) => Math.max(a, Math.min(b, v));
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => { this.drag = { b: e.button, x: e.clientX, y: e.clientY, mv: 0 }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} });
    cv.addEventListener('pointermove', e => {
      const b = cv.getBoundingClientRect(); this.mouse = [(e.clientX - b.left) / b.width * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1]; this.mvd = true;
      const d = this.drag; if (!d) return; const k = 1 / (this.referenceState.scale || 1), dx = (e.clientX - d.x) * k, dy = (e.clientY - d.y) * k; d.x = e.clientX; d.y = e.clientY; d.mv += Math.abs(dx) + Math.abs(dy); const o = this.orb;
      if (d.b === 0) { o.tYaw -= dx * 0.005; o.tPitch = cl(o.tPitch + dy * 0.004, -0.7, 1.25); }
      else { const rt = new T.Vector3().setFromMatrixColumn(this.cam.matrixWorld, 0), up = new T.Vector3().setFromMatrixColumn(this.cam.matrixWorld, 1), s = o.dist * 0.0009; o.tPan.addScaledVector(rt, -dx * s).addScaledVector(up, dy * s); }
    });
    cv.addEventListener('pointerup', () => { const d = this.drag; this.drag = null; if (d && d.b === 0 && d.mv < 6) { const pi = this.hovPi; if (pi != null) { const s = this.parts[pi].sec; if (s !== this.referenceState.sel) this.selectSec(s); } } });
    cv.addEventListener('pointerleave', () => { if (!this.drag) this.mouse = null; });
    cv.addEventListener('wheel', e => { e.preventDefault(); if (e.ctrlKey || e.altKey) { this.orb.zoom = cl(this.orb.zoom * (1 + Math.sign(e.deltaY) * 0.1), 0.45, 1.8); return; } const st = e.deltaY > 0 ? -0.2 : 0.2, s = this.referenceState.sel; if (s != null) this.t2[s] = cl(this.t2[s] + st, 0, 1); else this.t1 = cl(this.t1 + st, 0, 1); }, { passive: false });
    this.onKey = e => { const k = (e.key || '').toLowerCase(); if (k === 'r') this.updateReferenceState(s => ({ wire: !s.wire }), () => this.applyWire(this.referenceState.wire)); else if (k === 'f') { const o = this.orb; o.tYaw = this.M.yaw; o.tPitch = this.M.pitch; o.tPan.set(0, 0, 0); o.zoom = 1; } else if (e.key === 'Escape') this.selectSec(null); else if (k === 'a') this.startTraining(); };
    this.listen('keydown', this.onKey);
  }

  frame(dt, t) {
    const T = window.THREE; if (!this.parts) return;
    const st = this.referenceState, sel = st.sel, M = this.M, cam = this.cam, o = this.orb, v = this.v;
    const K = 34, C = 8.2;
    this.v1 += ((this.t1 - this.e1) * K - this.v1 * C) * dt; this.e1 += this.v1 * dt;
    for (let s = 0; s < 8; s++) { this.v2[s] += ((this.t2[s] - this.e2[s]) * K - this.v2[s] * C) * dt; this.e2[s] += this.v2[s] * dt; }
    const bob = Math.max(0, Math.min(1, this.e1)) * M.R * 0.004, cnt = Array(8).fill(0);
    this.secC.forEach(c => c.set(0, 0, 0));
    this.parts.forEach((p, i) => { p.g.position.copy(p.base).addScaledVector(p.ex1, this.e1).addScaledVector(p.ex2, this.e2[p.sec]); p.g.position.y += Math.sin(t * 1.1 + i * 0.7) * bob; p.wc.copy(p.g.position).add(p.c0); this.secC[p.sec].add(p.wc); cnt[p.sec]++; });
    this.secC.forEach((c, s) => { if (cnt[s]) c.multiplyScalar(1 / cnt[s]); });
    // hover pick
    if (this.mouse && !this.drag && this.mvd && t - (this._rt || 0) > 0.06) { this._rt = t; this.mvd = false; this.ray.setFromCamera({ x: this.mouse[0], y: this.mouse[1] }, cam); const hits = this.ray.intersectObjects(this.pick, false); let pi = null; for (const h of hits) { const p = this.parts[h.object.userData.pi]; if (p && p.a > 0.5) { pi = p.idx; break; } } this.rayPi = pi; }
    else if (!this.mouse) this.rayPi = null;
    const pi = this.subHov != null ? this.subHov : this.rayPi, hs = this.lblHov != null ? this.lblHov : (pi != null ? this.parts[pi].sec : null);
    this.hovPi = this.rayPi;
    if (sel == null && hs !== this._lHov) { this._lHov = hs; this.updateReferenceState({ hov: hs }); }
    const hp = sel != null && (pi == null || this.parts[pi].sec === sel) ? pi : this._lHp; if (sel != null && hp !== this._lHp) { this._lHp = hp; this.updateReferenceState({ hovPi: hp }); }
    this.r.domElement.style.cursor = this.drag ? 'grabbing' : (hs != null && (sel == null || hs !== sel)) ? 'pointer' : 'grab';
    // dim + highlight
    const w = st.wire;
    this.parts.forEach(p => {
      const ta = sel == null ? 1 : (p.sec === sel ? 1 : 0.07); p.a += (ta - p.a) * Math.min(1, dt * 6);
      const th = sel == null ? (hs === p.sec ? 1 : 0) : (pi === p.idx ? 1 : 0); p.hl += (th - p.hl) * Math.min(1, dt * 10);
      const mode = p.a < 0.5 ? 'dim' : (p.hl > 0.5 ? 'hl' : 'n'); if (mode !== p._mode) { p._mode = mode; p.meshes.forEach(m => { if (!m.userData.m0) m.userData.m0 = m.material; const m0 = m.userData.m0; if (mode === 'dim') m.material = this.dimM; else if (mode === 'hl' && !m0.userData.own) { if (!this.hlM[m0.uuid]) { const h = m0.clone(); h.emissive = new T.Color(0xf37321); h.emissiveIntensity = 0.35; h.userData = m0.userData; h.visible = !this.referenceState.wire; this.hlM[m0.uuid] = h; } m.material = this.hlM[m0.uuid]; } else m.material = m0; }); }
      p.lm.opacity = ((w ? 0.85 : 0.26) + p.hl * 0.45) * p.a;
    });
    // camera
    let tgt = this.center0, dist = M.R * 3.4;
    if (sel != null) { tgt = this.secC[sel]; let rad = 0.2; this.parts.forEach(p => { if (p.sec === sel) rad = Math.max(rad, p.wc.distanceTo(tgt) + p.rad * 0.6); }); dist = Math.max(M.R * 1.15, Math.min(M.R * 3.4, rad * 3.8)); }
    if (!this.drag && sel == null) o.tYaw += dt * 0.035;
    const kk = Math.min(1, dt * 5); o.yaw += (o.tYaw - o.yaw) * kk; o.pitch += (o.tPitch - o.pitch) * kk; o.pan.lerp(o.tPan, kk);
    o.dist += (dist * o.zoom - o.dist) * Math.min(1, dt * 2.2); o.tgt.lerp(tgt, Math.min(1, dt * 3));
    const c = v.copy(o.tgt).add(o.pan);
    cam.position.set(c.x + Math.sin(o.yaw) * Math.cos(o.pitch) * o.dist, c.y + Math.sin(o.pitch) * o.dist, c.z + Math.cos(o.yaw) * Math.cos(o.pitch) * o.dist); cam.lookAt(c);
    cam.updateMatrixWorld();
    this.r.render(this.sc, cam);
    // overlay
    const P = new T.Vector3(), proj = q => { P.copy(q).project(cam); return [(P.x + 1) / 2 * 1920, (1 - P.y) / 2 * 1080]; };
    const ctx = this.lnRef.current && this.lnRef.current.getContext('2d'); if (!ctx) return; ctx.clearRect(0, 0, 1920, 1080);
    const lt = sel == null && performance.now() - this.loadT > 1300 ? 1 : 0; this.la += (lt - this.la) * Math.min(1, dt * 5);
    const items = this.secC.map((q, s) => { const a = proj(q); this.secS[s] = a; return { s, ax: a[0], ay: a[1], ly: a[1] - 40 }; }).sort((a, b) => a.ay - b.ay);
    const GAP = 100, TOP = 110, BOT = 1000 - 82;
    for (let i = 0; i < items.length; i++) items[i].ly = Math.max(i ? items[i - 1].ly + GAP : TOP, Math.min(BOT, items[i].ly));
    for (let i = items.length - 1; i >= 0; i--) if (i < items.length - 1) items[i].ly = Math.min(items[i].ly, items[i + 1].ly - GAP); else items[i].ly = Math.min(items[i].ly, BOT);
    const LX = 1450;
    items.forEach(it => {
      const el = this.lRef[it.s].current; if (el) { el.style.transform = 'translate(' + LX + 'px,' + it.ly.toFixed(1) + 'px)'; el.style.opacity = this.la.toFixed(3); el.style.pointerEvents = this.la > 0.5 ? 'auto' : 'none'; }
      if (this.la < 0.02) return; const hv = hs === it.s, a = this.la * (hv ? 1 : 0.7);
      ctx.strokeStyle = 'rgba(243,115,33,' + a + ')'; ctx.lineWidth = hv ? 2 : 1.4; ctx.beginPath(); ctx.moveTo(it.ax, it.ay); ctx.lineTo(LX - 46, it.ly + 40); ctx.lineTo(LX - 2, it.ly + 40); ctx.stroke();
      ctx.fillStyle = 'rgba(255,217,189,' + this.la + ')'; ctx.beginPath(); ctx.arc(it.ax, it.ay, hv ? 4 : 3, 0, Math.PI * 2); ctx.fill();
    });
    // sub labels
    const stg = sel != null && Math.abs(this.e2[sel]) > 0.55 ? 1 : 0; this.sa += (stg - this.sa) * Math.min(1, dt * 6);
    if (sel != null && this.subList.length) {
      const cx = this.secS[sel][0]; const L = [], R = [];
      this.subList.forEach((pi2, k) => { const a = proj(this.parts[pi2].wc); (a[0] >= cx ? R : L).push({ k, pi: pi2, ax: a[0], ay: a[1], ly: a[1] - 16 }); });
      const lay = (arr, right) => { arr.sort((a, b) => a.ay - b.ay); for (let i = 0; i < arr.length; i++) arr[i].ly = Math.max(i ? arr[i - 1].ly + 44 : 90, arr[i].ly); const ext = arr.length ? (right ? Math.max(...arr.map(q => q.ax)) + 90 : Math.min(...arr.map(q => q.ax)) - 90) : 0;
        arr.forEach(q => { const el = this.sRef[q.k].current; if (!el) return; if (!this._sw) this._sw = {}; if (this._sw[q.k] == null && el.offsetWidth) this._sw[q.k] = el.offsetWidth; const wd = this._sw[q.k] || 150, x = right ? Math.min(1880 - wd, Math.max(q.ax + 70, ext)) : Math.max(40, Math.min(q.ax - 70, ext) - wd); el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + q.ly.toFixed(1) + 'px)'; el.style.opacity = this.sa.toFixed(3);
          if (this.sa < 0.02) return; const ex2 = right ? x : x + wd, hv = pi === q.pi; ctx.strokeStyle = 'rgba(243,115,33,' + (this.sa * (hv ? 1 : 0.75)) + ')'; ctx.lineWidth = hv ? 2 : 1.2; ctx.beginPath(); ctx.moveTo(q.ax, q.ay); ctx.lineTo(ex2 + (right ? -18 : 18), q.ly + 16); ctx.lineTo(ex2, q.ly + 16); ctx.stroke(); ctx.fillStyle = 'rgba(255,217,189,' + this.sa + ')'; ctx.beginPath(); ctx.arc(q.ax, q.ay, 2.6, 0, Math.PI * 2); ctx.fill(); }); };
      lay(R, true); lay(L, false);
    } else this.sRef.forEach(r => { if (r.current) r.current.style.opacity = '0'; });
  }

  renderVals() {
    const st = this.referenceState, M = this.META[st.model], sel = st.sel, pad = n => String(n).padStart(2, '0');
    const stc = i => i < 2 ? ['DONE', '#3fe0c5'] : i === 2 ? ['NOW', '#f37321'] : ['NEXT', '#c9d0d3'];
    const s = sel != null ? M.secs[sel] : null, parts = this.parts || [];
    return {
      scale: st.scale, frameW: 1920 * st.scale, frameH: 1080 * st.scale, glRef: this.glRef, lnRef: this.lnRef,
      prodName: M.name, prodSub: M.sub, totalMin: M.secs.reduce((a, q) => a + q[4], 0),
      bars: M.secs.map((q, i) => ({ c: i < 2 ? '#3fe0c5' : i === 2 ? '#f37321' : 'rgba(243,115,33,.22)' })),
      models: [['plane', '여객기'], ['phone', '스마트폰']].map(([k, n]) => { const on = st.model === k; return { name: n, bd: on ? '#f37321' : 'rgba(243,115,33,.4)', bg: on ? 'rgba(243,115,33,.2)' : 'rgba(8,9,11,.5)', font: on ? "700 15px/1 'NexonLv2Gothic'" : "400 15px/1 'NexonLv2Gothic'", pick: () => { if (st.model === k) return; this.subList = []; this.lblHov = null; this.subHov = null; this.updateReferenceState({ model: k, sel: null, hov: null, hovPi: null, nSub: 0 }); this.load(k); } }; }),
      labels: M.secs.map((q, i) => ({ ref: this.lRef[i], no: pad(i + 1), name: q[0], sub: q[1], state: stc(i)[0], c: stc(i)[1], bg: st.hov === i && sel == null ? 'rgba(243,115,33,.2)' : 'rgba(8,9,11,.62)', enter: () => { this.lblHov = i; }, leave: () => { this.lblHov = null; }, pick: () => { this.lblHov = null; this.selectSec(i); } })),
      subs: (this.subList || []).map((pi, k) => { const on = st.hovPi === pi; return { ref: this.sRef[k], no: pad(k + 1), name: parts[pi] ? parts[pi].name : '', bd: on ? '#f37321' : 'rgba(243,115,33,.45)', bg: on ? 'rgba(243,115,33,.24)' : 'rgba(8,9,11,.75)', enter: () => { this.subHov = pi; }, leave: () => { this.subHov = null; } }; }),
      hasSel: sel != null,
      pn: s ? { no: pad(sel + 1), state: stc(sel)[0], c: stc(sel)[1], name: s[0], desc: s[2], steps: s[3], min: s[4], cnt: parts.filter(p => p.sec === sel).length, chips: (this.subList || []).map(pi => ({ t: parts[pi] ? parts[pi].name : '' })) } : { no: '', state: '', c: '#f37321', name: '', desc: '', steps: 0, min: 0, cnt: 0, chips: [] },
      backAll: () => this.selectSec(null), startTraining: () => this.startTraining(),
      hints: sel == null ? [{ k: '', t: '공정을 선택하세요' }, { k: '휠', t: '조립 / 분해' }, { k: '드래그', t: '회전' }, { k: 'R', t: '와이어프레임' }] : [{ k: '휠', t: '부품 조립 / 분해' }, { k: '드래그', t: '회전' }, { k: 'ESC', t: '전체 보기' }, { k: 'A', t: '교육 시작' }],
      leaveOp: st.leaving ? 1 : 0
    };
  }

  render() { const v = this.renderVals(); return <><ReferenceCss /><SourceNode as="div" $style={{"position":"fixed","inset":"0","background":"#000","display":"flex","alignItems":"center","justifyContent":"center","overflow":"hidden"}}><SourceNode as="div" $style={{"width":String(v.frameW) + "px","height":String(v.frameH) + "px","flex":"none"}}><SourceNode as="div" $style={{"position":"relative","width":"1920px","height":"1080px","overflow":"hidden","transformOrigin":"0 0","transform":"scale(" + String(v.scale) + ")","background":"linear-gradient(180deg,#020203 0%,#060505 55%,#100804 100%)","color":"#f2ede8","fontFamily":"'NexonLv2Gothic',sans-serif","userSelect":"none"}}><SourceNode as="div" $style={{"position":"absolute","left":"0","top":"0","width":"2200px","height":"900px","opacity":".95","animation":"cxDrift 120s linear infinite alternate","backgroundImage":"radial-gradient(3px 3px at 14% 16%,rgba(255,236,220,.9),transparent),radial-gradient(3px 3px at 62% 22%,rgba(255,236,220,.9),transparent),radial-gradient(2.4px 2.4px at 84% 9%,rgba(255,220,190,.85),transparent),radial-gradient(1.4px 1.4px at 8% 40%,#fff 50%,transparent),radial-gradient(1.4px 1.4px at 22% 8%,#fff 50%,transparent),radial-gradient(1.8px 1.8px at 33% 28%,#ffd9bd 50%,transparent),radial-gradient(1.4px 1.4px at 47% 12%,#fff 50%,transparent),radial-gradient(1.4px 1.4px at 58% 46%,#fff 50%,transparent),radial-gradient(1.8px 1.8px at 66% 6%,#fff 50%,transparent),radial-gradient(1.4px 1.4px at 81% 44%,#ffd9bd 50%,transparent),radial-gradient(1.4px 1.4px at 90% 24%,#fff 50%,transparent),radial-gradient(1.4px 1.4px at 39% 58%,#fff 50%,transparent),radial-gradient(1.4px 1.4px at 95% 54%,#fff 50%,transparent),radial-gradient(1.2px 1.2px at 4% 64%,#fff 50%,transparent),radial-gradient(1.2px 1.2px at 27% 50%,#fff 50%,transparent),radial-gradient(1.2px 1.2px at 72% 62%,#fff 50%,transparent),radial-gradient(1.2px 1.2px at 52% 32%,#ffd9bd 50%,transparent)"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"1500px","top":"90px","width":"150px","height":"1.5px","background":"linear-gradient(90deg,rgba(255,236,220,0),rgba(255,236,220,.95))","opacity":"0","animation":"cxShoot 11s linear 3s infinite"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"1100px","top":"40px","width":"120px","height":"1.5px","background":"linear-gradient(90deg,rgba(255,236,220,0),rgba(255,236,220,.9))","opacity":"0","animation":"cxShoot 15s linear 8s infinite"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","inset":"0","background":"radial-gradient(ellipse 70% 42% at 50% 92%,rgba(243,115,33,.26) 0%,rgba(120,46,10,.14) 45%,transparent 75%)"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"-1040px","top":"900px","width":"4000px","height":"4000px","borderRadius":"50%","background":"radial-gradient(circle at 50% 0%,#0d0a09 0%,#050404 20%,#020202 50%)","boxShadow":"0 -1px 2px rgba(255,214,180,.75),0 -4px 16px rgba(255,160,90,.45),0 -22px 70px rgba(243,115,33,.3),0 -80px 170px rgba(243,115,33,.13)"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"660px","top":"770px","width":"600px","height":"260px","background":"radial-gradient(ellipse 50% 50% at 50% 50%,rgba(255,236,212,.55) 0%,rgba(255,180,110,.3) 10%,rgba(243,115,33,.14) 30%,transparent 70%)","mixBlendMode":"screen","filter":"blur(6px)"}}></SourceNode><SourceNode as="div" ref={v.glRef} $style={{"position":"absolute","inset":"0"}}></SourceNode><SourceNode as="canvas" ref={v.lnRef} width={"1920"} height={"1080"} $style={{"position":"absolute","inset":"0","width":"1920px","height":"1080px","pointerEvents":"none"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","inset":"0","pointerEvents":"none"}}><SourceNode as="a" href={"/training"} $hover={"background:rgba(243,115,33,.18)"} $style={{"position":"absolute","left":"64px","top":"48px","display":"flex","alignItems":"center","gap":"10px","height":"46px","padding":"0 18px","pointerEvents":"auto","border":"1px solid rgba(243,115,33,.7)","background":"rgba(8,9,11,.6)","color":"#f2ede8","textDecoration":"none","font":"400 15px/1 'NexonLv2Gothic'","clipPath":"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))"}}><SourceNode as="span" $style={{"color":"#f37321","font":"700 16px/1 var(--font-mono),'JetBrains Mono',monospace"}}>{"←"}</SourceNode><SourceNode as="span">{"교육 선택"}</SourceNode></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"64px","top":"150px","width":"380px","display":"flex","flexDirection":"column","gap":"18px"}}><SourceNode as="span" $style={{"font":"500 13px/1 var(--font-mono),'JetBrains Mono',monospace","letterSpacing":".2em","color":"#f37321"}}>{"공정 선택"}</SourceNode><SourceNode as="span" $style={{"font":"700 54px/1.05 'NexonLv2Gothic'","color":"#fff"}}>{v.prodName}</SourceNode><SourceNode as="span" $style={{"font":"400 15px/1.4 'NexonLv2Gothic'","color":"#e6eaec"}}>{v.prodSub}</SourceNode><SourceNode as="div" $style={{"display":"flex","gap":"28px","paddingTop":"4px"}}><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"8px"}}><SourceNode as="span" $style={{"font":"500 12px/1 var(--font-mono),'JetBrains Mono',monospace","letterSpacing":".14em","color":"#c9d0d3"}}>{"공정"}</SourceNode><SourceNode as="span" $style={{"font":"700 30px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#fff"}}>{"08"}</SourceNode></SourceNode><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"8px"}}><SourceNode as="span" $style={{"font":"500 12px/1 var(--font-mono),'JetBrains Mono',monospace","letterSpacing":".14em","color":"#c9d0d3"}}>{"표준 작업 시간"}</SourceNode><SourceNode as="span" $style={{"font":"700 30px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#fff"}}>{"≈ "}{v.totalMin}<SourceNode as="span" $style={{"fontSize":"15px","color":"#c9d0d3"}}>{" MIN"}</SourceNode></SourceNode></SourceNode><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"8px"}}><SourceNode as="span" $style={{"font":"500 12px/1 var(--font-mono),'JetBrains Mono',monospace","letterSpacing":".14em","color":"#c9d0d3"}}>{"완료"}</SourceNode><SourceNode as="span" $style={{"font":"700 30px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#3fe0c5"}}>{"2"}<SourceNode as="span" $style={{"fontSize":"15px","color":"#c9d0d3"}}>{" / 8"}</SourceNode></SourceNode></SourceNode></SourceNode><SourceNode as="div" $style={{"display":"flex","gap":"4px"}}>{(v.bars ?? []).map((b, index) => <React.Fragment key={index}><SourceNode as="div" $style={{"flex":"1","height":"3px","background":b.c}}></SourceNode></React.Fragment>)}</SourceNode><SourceNode as="div" $style={{"display":"flex","gap":"8px","paddingTop":"10px","pointerEvents":"auto"}}>{(v.models ?? []).map((m, index) => <React.Fragment key={index}><SourceNode as="div" onClick={m.pick} $hover={"background:rgba(243,115,33,.2)"} $style={{"height":"40px","display":"flex","alignItems":"center","padding":"0 16px","cursor":"pointer","border":"1px solid " + String(m.bd),"background":m.bg,"font":m.font,"color":"#f2ede8"}}>{m.name}</SourceNode></React.Fragment>)}</SourceNode></SourceNode>{(v.labels ?? []).map((l, index) => <React.Fragment key={index}><SourceNode as="div" ref={l.ref} onMouseEnter={l.enter} onMouseLeave={l.leave} onClick={l.pick} $style={{"position":"absolute","left":"0","top":"0","display":"flex","flexDirection":"column","gap":"7px","padding":"10px 14px","borderLeft":"2px solid " + String(l.c),"background":l.bg,"cursor":"pointer","pointerEvents":"auto","opacity":"0","willChange":"transform,opacity","transition":"background .2s"}}><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"500 12px/1 var(--font-mono),'JetBrains Mono',monospace","letterSpacing":".14em","color":l.c}}>{l.no}{" · "}{l.state}</SourceNode><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"700 22px/1 'NexonLv2Gothic'","color":"#fff"}}>{l.name}</SourceNode><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"400 14px/1 'NexonLv2Gothic'","color":"#e6eaec"}}>{l.sub}</SourceNode></SourceNode></React.Fragment>)}{(v.subs ?? []).map((s, index) => <React.Fragment key={index}><SourceNode as="div" ref={s.ref} onMouseEnter={s.enter} onMouseLeave={s.leave} $style={{"position":"absolute","left":"0","top":"0","display":"flex","alignItems":"center","gap":"8px","padding":"7px 11px","border":"1px solid " + String(s.bd),"background":s.bg,"pointerEvents":"auto","opacity":"0","willChange":"transform,opacity"}}><SourceNode as="span" $style={{"font":"700 11px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#f37321"}}>{s.no}</SourceNode><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"700 15px/1 'NexonLv2Gothic'","color":"#fff"}}>{s.name}</SourceNode></SourceNode></React.Fragment>)}{(v.hasSel) ? <><SourceNode as="div" $style={{"position":"absolute","right":"64px","bottom":"64px","width":"460px","display":"flex","flexDirection":"column","gap":"14px","padding":"22px 24px","pointerEvents":"auto","border":"1px solid rgba(243,115,33,.55)","borderTop":"2px solid #f37321","background":"rgba(8,9,11,.8)"}}><SourceNode as="span" $style={{"font":"500 12px/1 var(--font-mono),'JetBrains Mono',monospace","letterSpacing":".14em","color":v.pn.c}}>{v.pn.no}{" · "}{v.pn.state}</SourceNode><SourceNode as="span" $style={{"font":"700 30px/1.1 'NexonLv2Gothic'","color":"#fff"}}>{v.pn.name}</SourceNode><SourceNode as="span" $style={{"font":"400 16px/1.55 'NexonLv2Gothic'","color":"#e6eaec","textWrap":"pretty"}}>{v.pn.desc}</SourceNode><SourceNode as="div" $style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>{(v.pn.chips ?? []).map((c, index) => <React.Fragment key={index}><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"400 13px/1 'NexonLv2Gothic'","padding":"6px 9px","border":"1px solid rgba(243,115,33,.4)","color":"#ffd9bd"}}>{c.t}</SourceNode></React.Fragment>)}</SourceNode><SourceNode as="div" $style={{"display":"flex","gap":"22px","paddingTop":"4px","font":"500 13px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#c9d0d3"}}><SourceNode as="span">{"STEPS "}<SourceNode as="span" $style={{"color":"#fff","fontWeight":"700"}}>{v.pn.steps}</SourceNode></SourceNode><SourceNode as="span">{"≈ "}<SourceNode as="span" $style={{"color":"#fff","fontWeight":"700"}}>{v.pn.min}</SourceNode>{" MIN"}</SourceNode><SourceNode as="span">{"부품 "}<SourceNode as="span" $style={{"color":"#fff","fontWeight":"700"}}>{v.pn.cnt}</SourceNode></SourceNode></SourceNode><SourceNode as="div" $style={{"display":"flex","gap":"10px","paddingTop":"6px"}}><SourceNode as="div" onClick={v.backAll} $hover={"background:rgba(243,115,33,.15)"} $style={{"flex":"1","height":"52px","display":"flex","alignItems":"center","justifyContent":"center","gap":"8px","cursor":"pointer","border":"1px solid rgba(243,115,33,.6)","font":"400 15px/1 'NexonLv2Gothic'"}}>{"전체 보기 "}<SourceNode as="span" $style={{"font":"500 11px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#c9d0d3"}}>{"ESC"}</SourceNode></SourceNode><SourceNode as="div" onClick={v.startTraining} $hover={"filter:brightness(1.1)"} $style={{"flex":"1.5","height":"52px","display":"flex","alignItems":"center","justifyContent":"center","gap":"10px","cursor":"pointer","background":"#f37321","color":"#140a04","font":"700 17px/1 'NexonLv2Gothic'","clipPath":"polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))"}}><SourceNode as="span" $style={{"font":"700 12px/1 var(--font-mono),'JetBrains Mono',monospace","padding":"4px 6px","border":"1px solid #140a04"}}>{"A"}</SourceNode>{"교육 시작"}</SourceNode></SourceNode></SourceNode></> : null}<SourceNode as="div" $style={{"position":"absolute","left":"0","right":"0","bottom":"44px","display":"flex","justifyContent":"center","gap":"24px","font":"400 17px/1 'NexonLv2Gothic'","color":"#e6eaec","textShadow":"0 1px 6px rgba(0,0,0,.8)"}}>{(v.hints ?? []).map((h, index) => <React.Fragment key={index}><SourceNode as="span" $style={{"display":"flex","alignItems":"center","gap":"8px","whiteSpace":"nowrap"}}><SourceNode as="b" $style={{"font":"700 14px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#f37321"}}>{h.k}</SourceNode>{h.t}</SourceNode></React.Fragment>)}</SourceNode></SourceNode><SourceNode as="div" $style={{"position":"absolute","inset":"0","background":"#000","pointerEvents":"none","opacity":v.leaveOp,"transition":"opacity .6s ease"}}></SourceNode></SourceNode></SourceNode></SourceNode></>; }
}
