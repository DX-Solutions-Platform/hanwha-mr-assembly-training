/* eslint-disable -- 원본의 비정형 장면/상태 로직을 보존한 생성 파일. */
// @ts-nocheck
// 수정은 port-reference.py 변환기에서 합니다. 원본 파일 해시는 manifest.json에 있습니다.
'use client';
import React from 'react';
import { createGlobalStyle } from 'styled-components';
import { PortedLogic, SourceNode } from '../referenceRuntime';
const ReferenceCss = createGlobalStyle`@font-face{font-family:'NexonLv2Gothic';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_20-04@2.1/NEXON Lv2 Gothic Light.woff') format('woff');font-weight:300;font-display:swap}@font-face{font-family:'NexonLv2Gothic';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_20-04@2.1/NEXON Lv2 Gothic.woff') format('woff');font-weight:400;font-display:swap}@font-face{font-family:'NexonLv2Gothic';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_20-04@2.1/NEXON Lv2 Gothic Bold.woff') format('woff');font-weight:700;font-display:swap}@keyframes scan{0%{transform:translateY(-120px)}100%{transform:translateY(1200px)}}@keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}`;
export default class TrainingMenuReference extends PortedLogic {
  rootRef = React.createRef(); stripRef = React.createRef(); holoRef = React.createRef(); stackRef = React.createRef();
  referenceState = { scale: Math.min(window.innerWidth / 1920, window.innerHeight / 1080), screen: 'boot', focus: 1, entering: false, thumbs: [] };
  get CARDS() { return this.referenceState && this.referenceState.activeP === 'custom' && this.customCards ? this.customCards : this.PUMP_CARDS; }
  PUMP_CARDS = [
    { group: '상부 · UPPER', name: '모터 고정', desc: '구동 모터를 작업대 지그에 세우고 플랜지 핀을 맞춥니다.', steps: 3, min: 4, sec: 2, st: 'now', prog: 0 },
    { group: '상부 · UPPER', name: '상단 커버 · 볼트', desc: '상단 커버를 올리고 M6 볼트 4개를 대각선 순서로 체결합니다.', steps: 4, min: 6, sec: 2, st: 'idle', prog: 0 },
    { group: '중부 · MIDDLE', name: '베어링 하우징', desc: '하우징에 베어링을 압입하고 고정 링을 끼웁니다.', steps: 5, min: 7, sec: 1, st: 'idle' },
    { group: '중부 · MIDDLE', name: '구동축 삽입', desc: '구동축을 하우징 중심에 삽입하고 커플링을 연결합니다.', steps: 3, min: 5, sec: 1, st: 'idle' },
    { group: '하부 · LOWER', name: '펌프 본체', desc: '펌프 본체에 개스킷을 놓고 플랜지를 정렬합니다.', steps: 4, min: 6, sec: 0, st: 'idle' },
    { group: '하부 · LOWER', name: '베이스 · 배관', desc: '베이스에 본체를 고정하고 흡입·토출 배관을 연결합니다.', steps: 5, min: 8, sec: 0, st: 'idle' },
    { group: 'FINAL ASSEMBLY', name: '최종 결합', desc: '만든 상부·중부·하부를 합치고 동작을 점검합니다.', steps: 6, min: 10, sec: 3, st: 'final' }
  ];
  PARTNAME = ['하부', '중부', '상부', '전체'];
  onResize = () => this.updateReferenceState({ scale: Math.min(window.innerWidth / 1920, window.innerHeight / 1080) });
  onKey = (e) => {
    if (this.referenceState.screen !== 'cards' || this.referenceState.entering) return;
    if (e.key === 'ArrowLeft') this.target = Math.max(0, Math.round(this.target) - 1);
    if (e.key === 'ArrowRight') this.target = Math.min(this.CARDS.length - 1, Math.round(this.target) + 1);
    if (e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); this.enter(); }
  };
  mountReference() { this.startAll(); }
  startAll() {
    if (this._started) return; this._started = true;
    try { const raw = sessionStorage.getItem('dx_custom_training_v2'); if (raw) { this.custom = JSON.parse(raw); const n = this.custom.cards.length; this.customCards = this.custom.cards.map((x, i) => ({ group: 'STEP STOOL · 도면 ' + x.src, name: x.name, desc: x.desc, steps: x.steps, min: x.min, sec: 3, st: i === 0 ? 'now' : i === n - 1 ? 'final' : 'idle', prog: 0, img: x.img })); } } catch (e) {}
    this.listen('resize', this.onResize); this.listen('keydown', this.onKey); this.listen('mousemove', this.onMouse);
    this.f = 1; this.target = 1; this.vel = 0; this.mx = 0; this.my = 0; this.appear = 0;
    this.delay(() => this.updateReferenceState({ screen: 'product' }), 250);
    if (this.custom && this.referenceParams().get('new')) this.delay(() => { const g = this.rootRef.current && this.rootRef.current.querySelector('[style*="repeat(3,440px)"]'); if (g) g.scrollTo({ top: g.scrollHeight, behavior: 'smooth' }); }, 1400);
    
    this.bootHolo(); this.bootShelf();
  }
  unmountReference() { this._started = false; cancelAnimationFrame(this.shRaf); clearInterval(this.shIv); clearTimeout(this.sht); if (this.shR) this.shR.dispose(); this.unlisten('resize', this.onResize); this.unlisten('keydown', this.onKey); this.unlisten('mousemove', this.onMouse); cancelAnimationFrame(this.raf); clearTimeout(this.ht); clearTimeout(this.navT); if (this.hr) this.hr.dispose(); }
  onMouse = (e) => { const b = this.rootRef.current && this.rootRef.current.getBoundingClientRect(); if (!b) return; this.mx = (e.clientX - b.left) / b.width - 0.5; this.my = (e.clientY - b.top) / b.height - 0.5; };
  tick() {
    const strip = this.stripRef.current; if (!strip) return;
    const isCards = this.referenceState.screen === 'cards';
    if (isCards) { if (!this.cardsT0) this.cardsT0 = performance.now(); const p = Math.min(1, (performance.now() - this.cardsT0) / 1100); this.appear = 1 - Math.pow(1 - p, 3); } else { this.cardsT0 = 0; this.appear = Math.max(0, this.appear - 0.08); }
    if (!this.drag) { this.target += this.vel; this.vel *= 0.9; if (Math.abs(this.vel) < 0.002) { this.vel = 0; this.target += (Math.round(this.target) - this.target) * 0.12; } }
    this.target = Math.max(-0.3, Math.min(this.CARDS.length - 0.7, this.target));
    this.f += (this.target - this.f) * 0.14;
    const fi = Math.max(0, Math.min(this.CARDS.length - 1, Math.round(this.f)));
    if (fi !== this.referenceState.focus && !this.referenceState.entering) this.updateReferenceState({ focus: fi });
    const els = strip.querySelectorAll('[data-card]');
    const ent = this.enterT ? Math.min(1, (performance.now() - this.enterT) / 750) : 0; const ee = ent * ent * (3 - 2 * ent);
    const stack = this.stackRef.current; if (stack) stack.style.transform = 'none';
    els.forEach((el) => {
      const i = +el.getAttribute('data-card'); const d = i - this.f; const ad = Math.abs(d);
      const fan = Math.max(0, Math.min(1, this.appear * 1.7 - i * 0.09));
      const near = Math.max(0, 1 - ad);
      const N = this.CARDS.length, STEP = 360 / N;
      const dd = d + (1 - fan) * 1.2;
      let x = dd * 380, y = -near * 30 + (1 - fan) * 120, z = near * 120 - Math.min(Math.abs(dd), 4) * 90, sc = 1;
      let ry = Math.max(-38, Math.min(38, dd * STEP * 0.55));
      const aa = Math.abs(dd * STEP);
      let op = Math.max(0.3, 1 - aa / 180) * (ad > 3.4 ? Math.max(0, 1 - (ad - 3.4) * 2) : 1) * fan;
      if (this.enterT) { if (i === this.referenceState.focus) { x *= 1 - ee; ry *= 1 - ee; y -= ee * 30; z += ee * 650; sc = 1 + ee * 0.3; } else { op *= 1 - ee; x += Math.sign(d) * ee * 260; ry += Math.sign(d) * ee * 25; } }
      el.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg) scale(${sc})`;
      el.style.backfaceVisibility = 'hidden';
      el.style.opacity = op; el.style.zIndex = String(100 - Math.round(Math.min(ad, N - ad) * 10));
      const dim = el.firstElementChild && el.firstElementChild.lastElementChild; if (dim) dim.style.opacity = near > 0.5 ? 0 : 0.5 - near * 0.5;
    });
  }
  enter() {
    if (this.referenceState.entering) return; this.enterT = performance.now(); this.updateReferenceState({ entering: true });
    this.navT = this.delay(() => { window.location.href = this.referenceState.activeP === 'custom' ? '/training/stool?card=' + this.referenceState.focus : '/training/hud?intro=1'; }, 1250);
  }
  shelfCv = React.createRef();
  bootShelf() {
    if (!window.THREE || !this.shelfCv.current || !this.shelfKinds) { this.sht = this.delay(() => this.bootShelf(), 80); return; }
    const T = window.THREE, cv = this.shelfCv.current;
    const r = this.createRenderer(T, { canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setPixelRatio(1); r.setSize(1920, 1080, false); r.setClearColor(0, 0); r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.shadowMap.enabled = true; this.shR = r;
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight(0xe6ecf0, 0x1a1512, 0.8));
    const key = new T.DirectionalLight(0xffffff, 1.7); key.position.set(1.4, 3, 2.2); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); ['left', 'bottom'].forEach(k => key.shadow.camera[k] = -6); ['right', 'top'].forEach(k => key.shadow.camera[k] = 6); key.shadow.mapSize.set(2048, 2048); scene.add(key);
    const rim = new T.DirectionalLight(0xf37321, 1.4); rim.position.set(-2, 1, -1.6); scene.add(rim);
    scene.fog = new T.Fog(0x07090b, 9, 24); const grid = new T.GridHelper(48, 192, 0x5a3418, 0x241509); grid.material.transparent = true; grid.material.opacity = 0.5; scene.add(grid); const shF = new T.Mesh(new T.PlaneGeometry(48, 48), new T.ShadowMaterial({ opacity: 0.5 })); shF.rotation.x = -Math.PI / 2; shF.position.y = 0.001; shF.receiveShadow = true; scene.add(shF);
    const M = (color, metal = 0.2, rough = 0.6) => new T.MeshStandardMaterial({ color, metalness: metal, roughness: rough });
    const add = (g, geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    const box = (w, h, d) => new T.BoxGeometry(w, h, d), cyl = (a, h, n = 32) => new T.CylinderGeometry(a, a, h, n);
    const build = {
      pump: g => { const base = M(0x3a3f45, 0.5, 0.5), paint = M(0x2e5d86, 0.35, 0.45), steel = M(0xc9d1d8, 0.9, 0.25), dark = M(0x23272b, 0.6, 0.4), acc = M(0xf37321, 0.3, 0.5);
        add(g, box(0.72, 0.05, 0.52), base, 0, 0.025, 0); add(g, cyl(0.17, 0.32), paint, 0, 0.21, 0); for (let i = 0; i < 10; i++) add(g, box(0.012, 0.28, 0.36), paint, 0, 0.21, 0, 0, i * Math.PI / 10, 0);
        add(g, cyl(0.2, 0.03), acc, 0, 0.385, 0); add(g, cyl(0.12, 0.16), steel, 0, 0.48, 0); add(g, cyl(0.03, 0.12, 12), steel, 0, 0.6, 0);
        add(g, cyl(0.2, 0.03), dark, 0, 0.675, 0); add(g, cyl(0.16, 0.3), steel, 0, 0.84, 0); add(g, cyl(0.18, 0.035), dark, 0, 1.01, 0);
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; add(g, cyl(0.012, 0.03, 8), dark, Math.cos(a) * 0.15, 1.035, Math.sin(a) * 0.15); }
        add(g, cyl(0.035, 0.18), steel, 0.22, 0.84, 0, 0, 0, Math.PI / 2); },
      car: g => { const body = M(0xb8bec6, 0.75, 0.3), glass = M(0x1c2530, 0.2, 0.1), tire = M(0x16181a, 0, 0.9), rim = M(0xc9d1d8, 0.9, 0.25), lamp = M(0xf37321, 0.2, 0.4);
        add(g, box(1.0, 0.16, 0.44), body, 0, 0.17, 0); add(g, box(0.52, 0.14, 0.4), glass, -0.04, 0.32, 0); add(g, box(0.5, 0.02, 0.41), body, -0.04, 0.4, 0);
        [-0.32, 0.32].forEach(x => [-0.23, 0.23].forEach(z => { add(g, cyl(0.1, 0.07, 24), tire, x, 0.1, z, Math.PI / 2); add(g, cyl(0.055, 0.075, 16), rim, x, 0.1, z, Math.PI / 2); }));
        [-0.15, 0.15].forEach(z => add(g, box(0.02, 0.04, 0.08), lamp, 0.505, 0.2, z)); },
      drone: g => { const shell = M(0x2a2d31, 0.4, 0.4), arm = M(0x5d6670, 0.6, 0.35), motor = M(0xc9d1d8, 0.9, 0.25), prop = new T.MeshStandardMaterial({ color: 0xe6eaec, transparent: true, opacity: 0.35, roughness: 0.3 }), acc = M(0xf37321, 0.3, 0.5);
        add(g, box(0.26, 0.08, 0.26), shell, 0, 0.18, 0); add(g, box(0.1, 0.06, 0.08), shell, 0.16, 0.13, 0); add(g, new T.SphereGeometry(0.035, 16, 12), M(0x0d1013, 0.2, 0.1), 0.2, 0.12, 0);
        this.droneProps = []; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 0.36, z = Math.sin(a) * 0.36; add(g, box(0.36, 0.025, 0.04), arm, x / 2, 0.19, z / 2, 0, -a, 0); add(g, cyl(0.035, 0.06, 16), motor, x, 0.22, z); add(g, cyl(0.03, 0.01, 16), acc, x, 0.255, z); const p = add(g, cyl(0.15, 0.004, 32), prop, x, 0.265, z); this.droneProps.push(p); }
        [-1, 1].forEach(s => { add(g, box(0.02, 0.12, 0.02), arm, -0.06, 0.08, s * 0.1); add(g, box(0.02, 0.02, 0.3), arm, -0.06, 0.02, 0, 0, Math.PI / 2, 0); }); },
      stool: g => { const wood = M(0xdcc39a, 0, 0.75), woodD = M(0xc9ad80, 0, 0.8), steel = M(0xc9d1d8, 0.9, 0.25);
        [-0.2, 0.2].forEach(x => { add(g, box(0.035, 0.5, 0.045), wood, x, 0.25, -0.16, 0.06); add(g, box(0.035, 0.5, 0.045), wood, x, 0.25, 0.16, -0.06); add(g, box(0.03, 0.06, 0.34), woodD, x, 0.45, 0); add(g, box(0.03, 0.05, 0.38), woodD, x, 0.2, 0); });
        add(g, box(0.4, 0.04, 0.02), steel, 0, 0.45, -0.15); add(g, box(0.4, 0.022, 0.2), wood, 0, 0.23, 0.2); add(g, box(0.43, 0.024, 0.36), wood, 0, 0.51, 0); add(g, box(0.12, 0.026, 0.03), M(0x3a2e22, 0, 1), 0, 0.511, 0); }
    };
    let items = [], builtKey = '';
    const buildItems = () => { items.forEach(it => scene.remove(it.holder)); this.droneProps = null; builtKey = this.shelfKinds.join(); items = this.shelfKinds.map(kind => {
      const holder = new T.Group(), spin = new T.Group(), model = new T.Group(); build[kind](model);
      const bx = new T.Box3().setFromObject(model), sz = bx.getSize(new T.Vector3()), k = 0.68 / Math.max(Math.hypot(sz.x, sz.z), sz.y * 0.85); model.scale.setScalar(k); const ctr = bx.getCenter(new T.Vector3()); model.position.set(-ctr.x * k, 0.05 - bx.min.y * k, -ctr.z * k);
      spin.add(model); holder.add(spin);
      const ped = add(holder, cyl(0.38, 0.05, 64), M(0x15191c, 0.6, 0.45), 0, 0.025, 0); ped.castShadow = false;
      const ringM = new T.MeshBasicMaterial({ color: 0xf37321, transparent: true, opacity: 0.5 }); const ring = new T.Mesh(new T.TorusGeometry(0.38, 0.006, 8, 96), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; holder.add(ring);
      const glowM = new T.MeshBasicMaterial({ color: 0xf37321, transparent: true, opacity: 0.0, depthWrite: false }); const glow = new T.Mesh(new T.RingGeometry(0.39, 0.45, 96), glowM); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.003; holder.add(glow);
      const hit = new T.Mesh(cyl(0.42, 0.95, 12), new T.MeshBasicMaterial({ visible: false })); hit.position.y = 0.48; holder.add(hit); scene.add(holder); return { hit, holder, spin, ringM, glowM, lift: 0, sc: 0, rot: Math.random() * 6 };
    }); };
    buildItems();
    const cam = new T.PerspectiveCamera(30, 16 / 9, 0.05, 60); const restCam = cam.clone(); cam.fov = 34; cam.updateProjectionMatrix(); restCam.fov = 34; restCam.updateProjectionMatrix(); const REST_P = new T.Vector3(0, 2.6, 6.4), REST_L = new T.Vector3(0, 0.55, 0); restCam.position.copy(REST_P); restCam.lookAt(REST_L); restCam.updateMatrixWorld(); const camP = REST_P.clone(), camL = REST_L.clone(); const rc = new T.Raycaster(), zPlane = new T.Plane(new T.Vector3(0, 0, 1), 0), hitV = new T.Vector3();
    const worldXAt = (px) => { rc.setFromCamera(new T.Vector2(px / 1920 * 2 - 1, -((1080 - 330) / 1080 * 2 - 1)), restCam); rc.ray.intersectPlane(zPlane, hitV); return hitV.x; };
    const t0 = performance.now(); let last = t0; const isNew = this.referenceParams().get('new') === '1';
    const loop = () => {
      const now = performance.now(); if (now - last < 12) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; const st = this.referenceState;
      if (this.shelfKinds.join() !== builtKey) buildItems(); const vis = st.screen === 'product' || st.screen === 'boot'; cv.style.opacity = st.screen === 'product' ? 1 : 0; cv.style.transition = 'opacity .5s'; if (!vis && cv.style.opacity === '0' && this._shHidden) return; this._shHidden = !vis;
      const n = items.length, w = this.shelfW, x0 = (1920 - n * w) / 2, xs = items.map((_, i) => (i - (n - 1) / 2) * Math.min(1.7, 6.8 / Math.max(1, n))), base = 1.58 * Math.min(1, 6.8 / Math.max(1, n) / 1.7); this.shXs = xs;
      const hovI = st.openP != null ? st.openP : st.hovP; const tp = REST_P.clone(), tl = REST_L.clone();
      if (hovI != null && xs[hovI] !== undefined) { const fx = xs[hovI]; if (st.openP != null) { tp.set(fx, 1.5, 3.6); tl.set(fx, 0.75, 0); } else { tp.set(fx * 0.55, 2.2, 5.0); tl.set(fx * 0.8, 0.5, 0); } }
      const k = Math.min(1, dt * (st.openP != null ? 4 : 2.2)); camP.lerp(tp, k); camL.lerp(tl, k); cam.position.copy(camP); cam.lookAt(camL);
      items.forEach((it, i) => {
        const hov = st.hovP === i, me = st.openP === i, other = st.openP != null && !me, et = Math.max(0, Math.min(1, ((now - t0) / 1000 - 0.3 - i * 0.12) / 0.8)), ee = 1 - Math.pow(1 - et, 3);
        it.holder.position.set(xs[i], 0, 0);
        it.lift += (((hov || me) ? 0.08 : 0) + (me ? 0.12 : 0) - it.lift) * Math.min(1, dt * 8); const tsc = me ? 1.12 : other ? 0.85 : hov ? 1.05 : 1; it.sc += (tsc - it.sc) * Math.min(1, dt * 7);
        it.rot += dt * (me ? 2.4 : hov ? 1.1 : 0.35); it.spin.rotation.y = it.rot; it.spin.position.y = it.lift + Math.sin(now / 1000 * 1.3 + i) * 0.008; it.spin.scale.setScalar(Math.max(0.001, ee)); it.holder.scale.setScalar(Math.max(0.001, base * it.sc * (0.85 + 0.15 * ee)));
        const pulse = isNew && i === n - 1 && this.custom ? 0.5 + 0.5 * Math.sin(now / 1000 * 4) : 0;
        it.ringM.opacity = (other ? 0.15 : hov || me ? 1 : 0.5) * ee; it.glowM.opacity = ((hov || me ? 0.22 : 0) + pulse * 0.25) * ee;
        if (this.droneProps && this.shelfKinds[i] === 'drone') this.droneProps.forEach(p => p.rotation.y += dt * (hov || me ? 30 : 6));
      });
      const pv = new T.Vector3(); items.forEach((it, i) => { const lr = this.shelfLblRefs && this.shelfLblRefs[i] && this.shelfLblRefs[i].current; if (!lr) return; pv.set(xs[i], -0.02, 0.62 * base).project(cam); lr.style.left = ((pv.x + 1) / 2 * 1920).toFixed(1) + 'px'; lr.style.top = ((1 - pv.y) / 2 * 1080 + 14).toFixed(1) + 'px'; });
      r.render(scene, cam);
    };
    const ray = new T.Raycaster(), ptr = new T.Vector2();
    const pickAt = e => { const b = cv.getBoundingClientRect(); ptr.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1); ray.setFromCamera(ptr, cam); const h = ray.intersectObjects(items.map(it => it.hit), false)[0]; return h ? items.findIndex(it => it.hit === h.object) : null; };
    cv.addEventListener('pointermove', e => { if (this.referenceState.screen !== 'product' || this.referenceState.openP != null) return; if (this.ovw) { if (Math.hypot(e.clientX - this.ovw.x, e.clientY - this.ovw.y) < 80 * (cv.getBoundingClientRect().width / 1920)) return; this.ovw = null; } const i = pickAt(e); cv.style.cursor = i != null ? 'pointer' : 'default'; if (i != null && i !== this.referenceState.hovP) this.updateReferenceState({ hovP: i }); });
    cv.addEventListener('wheel', e => { if (this.referenceState.screen !== 'product') return; e.preventDefault(); if (this.referenceState.openP != null) return; this.ovw = { x: e.clientX, y: e.clientY }; if (this.referenceState.hovP != null) this.updateReferenceState({ hovP: null }); }, { passive: false });
    cv.addEventListener('click', e => { if (this.referenceState.screen !== 'product') return; const i = pickAt(e); if (i != null && this.shelfPicks && this.shelfPicks[i]) this.shelfPicks[i](); });
    const rafLoop = () => { this.shRaf = this.scheduleFrame(rafLoop); loop(); }; rafLoop(); clearInterval(this.shIv); this.shIv = this.repeat(loop, 16);
  }
  bootHolo() {
    if (!window.THREE || !this.holoRef.current) { this.ht = this.delay(() => this.bootHolo(), 80); return; }
    const T = window.THREE;
    const r = this.createRenderer(T, { antialias: true, alpha: true }); r.setPixelRatio(1); r.setSize(600, 360); r.setClearColor(0, 0); this.holoRef.current.appendChild(r.domElement); this.hr = r;
    const s = new T.Scene(), cam = new T.PerspectiveCamera(30, 600 / 360, 0.01, 30); cam.position.set(0, 1.0, 2.6); cam.lookAt(0, 0.52, 0);
    const g = new T.Group(); s.add(g);
    const box = (w, h, d) => new T.BoxGeometry(w, h, d), cyl = (a, h, n = 32) => new T.CylinderGeometry(a, a, h, n);
    const secs = [[], [], []];
    const part = (geo, y, si) => { const lm = new T.LineBasicMaterial({ color: 0xf37321, transparent: true, opacity: 0.45 }); const e = new T.LineSegments(new T.EdgesGeometry(geo, 25), lm); e.position.y = y; g.add(e); const fm = new T.MeshBasicMaterial({ color: 0xf37321, transparent: true, opacity: 0, depthWrite: false }); const m = new T.Mesh(geo, fm); m.position.y = y; g.add(m); secs[si].push({ lm, fm }); };
    part(box(0.72, 0.04, 0.52), 0.02, 0); part(cyl(0.17, 0.32), 0.2, 0); part(cyl(0.2, 0.025), 0.37, 0);
    part(cyl(0.12, 0.16), 0.47, 1); part(cyl(0.03, 0.12, 12), 0.6, 1);
    part(cyl(0.2, 0.03), 0.675, 2); part(cyl(0.16, 0.3), 0.84, 2); part(cyl(0.18, 0.035), 1.01, 2);
    this.renderThumbs(T);
    this.renderProducts(T);
    const t0 = performance.now();
    let hl = 0; const loop = () => {
      const nn = performance.now(); if (nn - hl < 30) return; hl = nn;
      const me = this; if (me.referenceState.screen !== 'cards' && (me.appear || 0) < 0.02) return;
      const t = (performance.now() - t0) / 1000, sec = me.CARDS[me.referenceState.focus].sec, b = 0.5 + 0.5 * Math.sin(t * 5);
      g.rotation.y = t * 0.35;
      secs.forEach((list, si) => { const on = sec === 3 || sec === si; list.forEach(({ lm, fm }) => { lm.opacity = on ? 0.95 : 0.22; lm.color.setHex(on ? 0xffb07a : 0xf37321); fm.opacity = on ? 0.12 + 0.28 * b : 0; }); });
      r.render(s, cam);
    };
    this.holoLoop = loop;
  }
  renderThumbs(T) {
    const W = 640, H = 380; const tr = this.createRenderer(T, { antialias: true, preserveDrawingBuffer: true }); tr.setPixelRatio(1); tr.setSize(W, H); tr.outputEncoding = T.sRGBEncoding; tr.toneMapping = T.ACESFilmicToneMapping; tr.toneMappingExposure = 1.0; tr.shadowMap.enabled = true;
    const std = (c, m = 0.3, ro = 0.6) => new T.MeshStandardMaterial({ color: c, metalness: m, roughness: ro });
    const box = (w, h, d) => new T.BoxGeometry(w, h, d), cyl = (a, h, n = 48) => new T.CylinderGeometry(a, a, h, n);
    const M = { steel: std(0xc9d1d8, 0.9, 0.22), dark: std(0x3a3f46, 0.6, 0.4), fin: std(0x4a5058, 0.6, 0.4), blue: std(0x2f5f86, 0.65, 0.35), blue2: std(0x3c78a6, 0.65, 0.3), brass: std(0xb8913a, 0.85, 0.3), hole: std(0x15181b, 0.3, 0.6), base: std(0x2b4a63, 0.6, 0.45), cover: std(0xaeb9c3, 0.85, 0.28), house: std(0x8a96a0, 0.85, 0.3) };
    const add = (g, geo, mat, x, y, z, rx = 0, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; m.rotation.z = rz; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    const motor = (g, y = 0) => { add(g, cyl(0.2, 0.03), M.steel, 0, y + 0.015, 0); add(g, cyl(0.16, 0.3), M.dark, 0, y + 0.18, 0); for (let i = 0; i < 7; i++) add(g, cyl(0.175, 0.012), M.fin, 0, y + 0.06 + i * 0.038, 0); };
    const cover = (g, y, bolts) => { add(g, cyl(0.18, 0.035), M.cover, 0, y, 0); add(g, cyl(0.11, 0.05), M.blue2, 0, y + 0.012, 0); add(g, cyl(0.03, 0.06, 24), M.hole, 0, y + 0.014, 0); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; add(g, cyl(0.02, bolts ? 0.02 : 0.004, 6), bolts ? M.brass : M.hole, Math.cos(a) * 0.145, y + 0.02, Math.sin(a) * 0.145); } };
    const housing = (g, y = 0) => { add(g, cyl(0.12, 0.16), M.house, 0, y + 0.08, 0); add(g, cyl(0.14, 0.02), M.brass, 0, y + 0.17, 0); add(g, new T.TorusGeometry(0.075, 0.012, 12, 40), M.steel, 0, y + 0.2, 0, Math.PI / 2); };
    const shaft = (g, y = 0) => { add(g, cyl(0.03, 0.42, 24), M.steel, 0, y + 0.21, 0); add(g, cyl(0.06, 0.08), M.steel, 0, y + 0.44, 0); add(g, box(0.02, 0.1, 0.012), M.hole, 0.03, y + 0.3, 0); };
    const body = (g, y = 0) => { add(g, cyl(0.17, 0.32), M.blue, 0, y + 0.16, 0); for (let i = 0; i < 6; i++) add(g, cyl(0.192, 0.016), M.blue2, 0, y + 0.04 + i * 0.045, 0); add(g, cyl(0.2, 0.025), M.steel, 0, y + 0.33, 0); };
    const base = (g) => { add(g, box(0.72, 0.04, 0.52), M.base, 0, 0.02, 0); add(g, cyl(0.04, 0.3, 24), M.steel, 0.3, 0.2, 0, 0, Math.PI / 2); add(g, new T.TorusGeometry(0.08, 0.04, 16, 24, Math.PI / 2), M.steel, 0.45, 0.28, 0); add(g, cyl(0.04, 0.2, 24), M.steel, 0.53, 0.38, 0); add(g, cyl(0.06, 0.02), M.brass, 0.53, 0.49, 0); body(g, 0.04); };
    const builders = [
      (g) => motor(g), (g) => { motor(g, -0.2); cover(g, 0.16, true); }, (g) => housing(g), (g) => { housing(g, -0.1); shaft(g, -0.05); }, (g) => body(g), (g) => base(g),
      (g) => { add(g, box(0.72, 0.04, 0.52), M.base, 0, 0.02, 0); body(g, 0.04); housing(g, 0.37); shaft(g, 0.42); motor(g, 0.655); cover(g, 0.98, true); }
    ];
    const frames = [[0.9, 0.55, 0.16], [0.8, 0.5, 0.2], [0.6, 0.38, 0.12], [0.85, 0.5, 0.22], [0.8, 0.5, 0.17], [1.5, 0.8, 0.22], [2.1, 1.1, 0.55]];
    const out = builders.map((b, i) => {
      const s = new T.Scene(); s.background = new T.Color(0x07090b); s.fog = new T.Fog(0x07090b, 2, 7);
      const gr = new T.GridHelper(8, 80, 0xf37321, 0x3a2210); gr.material.opacity = 0.5; gr.material.transparent = true; s.add(gr);
      const sh = new T.Mesh(new T.PlaneGeometry(6, 6), new T.ShadowMaterial({ opacity: 0.5 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.001; sh.receiveShadow = true; s.add(sh);
      const g = new T.Group(); s.add(g); b(g); g.rotation.y = 0.6; if (i === 1) g.position.y = 0.2; if (i === 2 || i === 3) g.position.y = 0.1;
      s.add(new T.HemisphereLight(0xdde4ea, 0x1a1512, 0.7));
      const kl = new T.DirectionalLight(0xffffff, 1.5); kl.position.set(1.5, 3, 2); kl.castShadow = true; kl.shadow.mapSize.set(512, 512); s.add(kl);
      const rim = new T.DirectionalLight(0xf37321, 1.6); rim.position.set(-2, 1, -1.5); s.add(rim);
      const [dist, h, ty] = frames[i]; const cam = new T.PerspectiveCamera(32, W / H, 0.01, 20); cam.position.set(dist * 0.75, h + ty, dist); cam.lookAt(0, ty, 0);
      tr.render(s, cam); return tr.domElement.toDataURL('image/jpeg', 0.86);
    });
    tr.dispose(); this.thumbBlobs = out.map(d => { const b = atob(d.split(',')[1]), u = new Uint8Array(b.length); for (let k = 0; k < b.length; k++) u[k] = b.charCodeAt(k); return URL.createObjectURL(new Blob([u], { type: 'image/jpeg' })); }); this.updateReferenceState({ thumbs: out });
  }
  folders(prods, isProd, scr) {
    const st = this.referenceState, art = st.prodArt || {};
    const S = { rest: [42, 0, 0, 15, 0], hover: [-60, 10, 1.6, 14, -12], open: [-185, 48, 6, 40, -30] };
    return prods.map((p, i) => {
      const mode = st.openP === i ? 'open' : st.hovP === i ? 'hover' : 'rest';
      const [lift, spread, fan, stack, hinge] = S[mode];
      const ent = isProd, ad = i * 0.15, n = p.files.length;
      const jr = [-1.2, 0.9, -0.5], jx = [-3, 4, -1]; const ai = i, pa = p.custom ? p.artImg : art['p' + ai];
      return {
        i, code: p.code, name: p.name, meta: p.meta, pct: p.pct, live: !!p.live, demo: !p.live,
        vis: isProd || scr === 'boot' ? 'visible' : 'hidden', op: isProd ? 1 : 0, y: isProd ? 0 : -60, z: isProd ? 0 : -300, delay: isProd ? 0 : i * 0.06,
        hinge, art: pa || '', hasArt: !!pa, bg: pa ? 'url(' + pa + ')' : 'none', artOp: pa ? 1 : 0, sat: mode === 'rest' ? 0.75 : 1,
        backY: ent ? 0 : 22, backOp: ent ? 1 : 0, d0: ad, frontY: ent ? 0 : 46, frontOp: ent ? 1 : 0, d2: ad + 0.42,
        enter: () => this.referenceState.hovP !== i && this.updateReferenceState({ hovP: i }), leave: () => this.referenceState.hovP === i && this.updateReferenceState({ hovP: null }),
        pick: () => {
          if (!isProd) return;
          if (this.referenceState.openP === i && !p.live) { this.updateReferenceState({ openP: null }); return; }
          this.updateReferenceState({ openP: i });
          if (p.live) { clearTimeout(this.openT); this.openT = this.delay(() => { this.f = -2.5; this.target = 0; this.appear = 0; this.updateReferenceState({ screen: 'cards', openP: null, hovP: null, activeP: p.custom ? 'custom' : 'pump', focus: 0 }); }, 820); }
        },
        sheets: p.files.map((f, v) => {
          const slot = n <= 1 ? 0 : (v / (n - 1)) * 2 - 1, depth = n - 1 - v, img = (p.custom ? p.imgs[v] : p.live ? (this.thumbBlobs || [])[v] : art['p' + ai + 's' + v]) || '';
          return { name: f[0], meta: f[1], img, hasImg: !!img, bg: img ? 'url(' + img + ')' : 'none', imgOp: img ? 1 : 0, z: v + 1, tx: jx[v] + slot * spread, ty: lift - depth * stack, rot: jr[v] + slot * fan, dT: depth * 0.04, enterY: ent ? 0 : -120, op: ent ? 1 : 0, dE: ad + 0.18 + depth * 0.09 };
        })
      };
    });
  }
  renderProducts(T) {
    const tr = this.createRenderer(T, { antialias: true, preserveDrawingBuffer: true }); tr.setPixelRatio(1); tr.outputEncoding = T.sRGBEncoding; tr.toneMapping = T.ACESFilmicToneMapping; tr.toneMappingExposure = 1.0; tr.shadowMap.enabled = true;
    const std = (col, m = 0.3, ro = 0.6, e) => new T.MeshStandardMaterial({ color: col, metalness: m, roughness: ro, emissive: e || 0, emissiveIntensity: e ? 1.6 : 0 });
    const box = (w, h, d) => new T.BoxGeometry(w, h, d), cyl = (r, h, n = 40) => new T.CylinderGeometry(r, r, h, n);
    const add = (g, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    const M = { steel: std(0xc9d1d8, 0.9, 0.22), dark: std(0x3a3f46, 0.6, 0.4), fin: std(0x4a5058, 0.6, 0.4), blue: std(0x2f5f86, 0.65, 0.35), blue2: std(0x3c78a6, 0.65, 0.3), brass: std(0xb8913a, 0.85, 0.3), base: std(0x2b4a63, 0.6, 0.45), cover: std(0xaeb9c3, 0.85, 0.28), house: std(0x8a96a0, 0.85, 0.3),
      paint: std(0x9e1c22, 0.55, 0.3), glass: std(0x0d141b, 0.9, 0.08), rubber: std(0x18191b, 0.1, 0.85), trim: std(0x202327, 0.5, 0.5), head: std(0xffffff, 0, 0.2, 0xfff4e0), tail: std(0x550000, 0, 0.3, 0xff2a2a),
      carbon: std(0x23272c, 0.4, 0.45), shell: std(0xd8dde2, 0.3, 0.35), prop: std(0x2a2d31, 0.2, 0.5), led: std(0x552200, 0, 0.3, 0xf37321) };
    const pump = (g) => { add(g, box(0.72, 0.04, 0.52), M.base, 0, 0.02, 0); add(g, cyl(0.17, 0.32), M.blue, 0, 0.2, 0); for (let i = 0; i < 6; i++) add(g, cyl(0.192, 0.016), M.blue2, 0, 0.08 + i * 0.045, 0); add(g, cyl(0.2, 0.025), M.steel, 0, 0.37, 0); add(g, cyl(0.12, 0.16), M.house, 0, 0.46, 0); add(g, cyl(0.14, 0.02), M.brass, 0, 0.55, 0); add(g, cyl(0.2, 0.03), M.steel, 0, 0.67, 0); add(g, cyl(0.16, 0.3), M.dark, 0, 0.84, 0); for (let i = 0; i < 7; i++) add(g, cyl(0.175, 0.012), M.fin, 0, 0.72 + i * 0.038, 0); add(g, cyl(0.18, 0.035), M.cover, 0, 1.0, 0); add(g, cyl(0.11, 0.05), M.blue2, 0, 1.015, 0); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; add(g, cyl(0.02, 0.02, 6), M.brass, Math.cos(a) * 0.145, 1.03, Math.sin(a) * 0.145); } add(g, cyl(0.04, 0.3, 24), M.steel, 0.3, 0.2, 0, 0, 0, Math.PI / 2); };
    const car = (g) => {
      add(g, box(1.62, 0.26, 0.74), M.paint, 0, 0.33, 0); add(g, box(0.56, 0.08, 0.72), M.paint, 0.52, 0.48, 0, 0, 0, -0.1); add(g, box(0.4, 0.1, 0.72), M.paint, -0.62, 0.49, 0);
      add(g, box(0.82, 0.24, 0.66), M.glass, -0.1, 0.58, 0); add(g, box(0.64, 0.04, 0.64), M.paint, -0.14, 0.715, 0); add(g, box(0.04, 0.24, 0.68), M.paint, 0.2, 0.58, 0, 0, 0, -0.5); add(g, box(0.04, 0.24, 0.68), M.paint, -0.47, 0.58, 0, 0, 0, 0.45);
      add(g, box(0.1, 0.14, 0.76), M.trim, 0.83, 0.25, 0); add(g, box(0.1, 0.14, 0.76), M.trim, -0.83, 0.25, 0); add(g, box(1.0, 0.05, 0.76), M.trim, 0, 0.2, 0);
      [0.24, -0.24].forEach(z => { add(g, box(0.03, 0.05, 0.16), M.head, 0.815, 0.4, z); add(g, box(0.03, 0.05, 0.16), M.tail, -0.815, 0.42, z); });
      [[0.52, 0.37], [0.52, -0.37], [-0.52, 0.37], [-0.52, -0.37]].forEach(([x, z]) => { add(g, cyl(0.2, 0.14, 40), M.rubber, x, 0.2, z, Math.PI / 2); add(g, cyl(0.13, 0.15, 24), M.steel, x, 0.2, z, Math.PI / 2); for (let k = 0; k < 5; k++) add(g, box(0.02, 0.2, 0.02), M.dark, x, 0.2, z + Math.sign(z) * 0.08, 0, 0, k / 5 * Math.PI); });
    };
    const drone = (g) => {
      add(g, box(0.36, 0.1, 0.42), M.carbon, 0, 0.32, 0); add(g, box(0.28, 0.07, 0.34), M.shell, 0, 0.4, 0); add(g, box(0.12, 0.02, 0.2), M.led, 0, 0.44, 0);
      for (let k = 0; k < 4; k++) { const arm = new T.Group(); arm.rotation.y = Math.PI / 4 + k * Math.PI / 2; arm.position.y = 0.33; g.add(arm); add(arm, cyl(0.022, 0.46, 16), M.carbon, 0.3, 0, 0, 0, 0, Math.PI / 2); add(arm, cyl(0.05, 0.07, 24), M.dark, 0.52, 0.03, 0); add(arm, cyl(0.012, 0.03, 12), M.steel, 0.52, 0.08, 0); add(arm, box(0.42, 0.006, 0.04), M.prop, 0.52, 0.095, 0, 0, 0.5 + k, 0); add(arm, box(0.03, 0.02, 0.03), M.led, 0.5, -0.02, 0); add(arm, cyl(0.008, 0.2, 8), M.carbon, 0.42, -0.12, 0); }
      add(g, new T.SphereGeometry(0.065, 24, 16), M.dark, 0.08, 0.22, 0); add(g, cyl(0.03, 0.03, 20), M.glass, 0.135, 0.22, 0, 0, 0, Math.PI / 2);
    };
    const scene = (build, ry) => {
      const s = new T.Scene(); s.background = new T.Color(0x07090b); s.fog = new T.Fog(0x07090b, 2.5, 8);
      const gr = new T.GridHelper(10, 100, 0xf37321, 0x3a2210); gr.material.opacity = 0.5; gr.material.transparent = true; s.add(gr);
      const sh = new T.Mesh(new T.PlaneGeometry(8, 8), new T.ShadowMaterial({ opacity: 0.55 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.001; sh.receiveShadow = true; s.add(sh);
      const g = new T.Group(); g.rotation.y = ry; s.add(g); build(g);
      s.add(new T.HemisphereLight(0xdde4ea, 0x1a1512, 0.7));
      const kl = new T.DirectionalLight(0xffffff, 1.5); kl.position.set(1.5, 3, 2); kl.castShadow = true; kl.shadow.mapSize.set(1024, 1024); kl.shadow.camera.left = -2; kl.shadow.camera.right = 2; kl.shadow.camera.top = 2; kl.shadow.camera.bottom = -2; s.add(kl);
      const rim = new T.DirectionalLight(0xf37321, 1.7); rim.position.set(-2, 1, -1.5); s.add(rim);
      return s;
    };
    const toBlobUrl = (d) => { const b = atob(d.split(',')[1]), u = new Uint8Array(b.length); for (let k = 0; k < b.length; k++) u[k] = b.charCodeAt(k); return URL.createObjectURL(new Blob([u], { type: 'image/jpeg' })); };
    const shot = (s, w, h, pos, look) => { tr.setSize(w, h); const cam = new T.PerspectiveCamera(32, w / h, 0.01, 30); cam.position.set(...pos); cam.lookAt(...look); tr.render(s, cam); return toBlobUrl(tr.domElement.toDataURL('image/jpeg', 0.86)); };
    const out = {};
    const sp = scene(pump, 0.6); out.p0 = shot(sp, 480, 390, [2.0, 1.45, 2.6], [0, 0.0, 0]);
    const sc = scene(car, -0.5); out.p1 = shot(sc, 480, 390, [2.5, 1.3, 2.9], [0, -0.2, 0]);
    out.p1s0 = shot(sc, 400, 270, [1.15, 0.45, 1.25], [0.3, 0.22, 0.4]); out.p1s1 = shot(sc, 400, 270, [1.7, 0.6, 0.4], [0.6, 0.35, -0.3]); out.p1s2 = shot(sc, 400, 270, [0.6, 1.4, 1.9], [0, 0.45, 0]);
    const sd = scene(drone, 0.3); out.p2 = shot(sd, 480, 390, [1.6, 1.15, 1.95], [0, -0.05, 0]);
    out.p2s0 = shot(sd, 400, 270, [0.75, 0.65, 0.55], [0.3, 0.38, 0.25]); out.p2s1 = shot(sd, 400, 270, [0.55, 0.3, 0.35], [0.08, 0.24, 0]); out.p2s2 = shot(sd, 400, 270, [0.2, 1.4, 0.9], [0, 0.32, 0]);
    tr.dispose(); this.updateReferenceState({ prodArt: out });
  }
  renderVals() {
    
    if (this.f === undefined) { this.f = 1; this.target = 1; this.vel = 0; this.mx = 0; this.my = 0; this.appear = 0; }
    
    const st = this.referenceState, s = st.scale, scr = st.screen, isCards = scr === 'cards', isProd = scr === 'product';
    const P = {
      pump: 'M60 170 H140 V178 H60 Z M75 170 V110 H125 V170 M70 110 H130 V104 H70 Z M88 104 V80 H112 V104 M80 80 H120 V74 H80 Z M84 74 V40 H116 V74 M80 40 H120 V34 H80 Z M75 120 H125 M75 132 H125 M75 144 H125 M75 156 H125 M84 50 H116 M84 60 H116',
      car: 'M20 130 Q30 100 60 96 L80 74 Q100 64 130 70 L156 96 Q180 100 184 124 L184 134 H20 Z M50 134 A18 18 0 1 0 50.1 134 M150 134 A18 18 0 1 0 150.1 134 M84 78 L74 96 H150 L132 76 Z',
      drone: 'M80 92 H120 V112 H80 Z M40 70 H80 M120 70 H160 M60 70 L88 92 M140 70 L112 92 M60 130 L88 112 M140 130 L112 112 M40 130 H80 M120 130 H160 M40 66 A20 6 0 1 0 40.1 66 M160 66 A20 6 0 1 0 160.1 66 M40 134 A20 6 0 1 0 40.1 134 M160 134 A20 6 0 1 0 160.1 134'
    };
    const prods = [
      { code: 'P-01', name: '유압 펌프', meta: '조립 카드 7', pct: 0, live: true, files: [['모터 고정', '01'], ['상단 커버 · 볼트', '02'], ['베어링 하우징', '03']] },
      { code: 'P-02', name: '차량', meta: '조립 카드 12', pct: 0, files: [['바퀴 조립', '04'], ['전면 범퍼', '03'], ['차체 중앙', '01']] },
      { code: 'P-03', name: '드론', meta: '조립 카드 8', pct: 0, files: [['모터 · 프로펠러', '03'], ['카메라 짐벌', '05'], ['메인 프레임', '01']] }
    ];
    if (this.custom) { const cc = this.custom.cards; prods.push({ code: 'NEW', name: this.custom.name, meta: '조립 카드 ' + cc.length + ' · 도면에서 생성', pct: 0, live: true, custom: true, artImg: this.custom.art, imgs: cc.slice(0, 3).map(x => x.img), files: cc.slice(0, 3).map((x, k) => [x.name, String(k + 1).padStart(2, '0')]) }); }
    const lay = (sec) => { const on = (k) => sec === 3 || sec === k; const L = (k, d) => ({ d, fill: on(k) ? 'rgba(243,115,33,.28)' : 'rgba(243,115,33,.03)', stroke: on(k) ? '#ffb07a' : 'rgba(243,115,33,.45)' }); return [L(2, 'M30 22 L80 8 L130 22 L80 36 Z M30 22 V40 L80 54 L130 40 V22'), L(1, 'M30 62 L80 48 L130 62 L80 76 Z M30 62 V80 L80 94 L130 80 V62'), L(0, 'M30 102 L80 88 L130 102 L80 116 Z M30 102 V120 L80 134 L130 120 V102')]; };
    const f = st.focus;
    const nS = prods.length, sw = Math.min(460, Math.floor(1760 / Math.max(1, nS)));
    this.shelfKinds = prods.map(p => p.custom ? 'stool' : p.code === 'P-01' ? 'pump' : p.code === 'P-02' ? 'car' : 'drone'); this.shelfW = sw;
    this.shelfLblRefs = this.shelfLblRefs || Array.from({ length: 12 }, () => React.createRef());
    const shelf = prods.map((p, i) => { const hov = st.hovP === i, open = st.openP != null, me = st.openP === i; return {
      ref: this.shelfLblRefs[i], w: sw, nameW: sw - 40, code: p.custom ? 'NEW · 도면에서 생성' : p.code, name: p.name, meta: p.live ? '조립 카드 ' + (p.custom ? this.custom.cards.length : p.meta.replace(/\D+/g, '')) : '준비 중',
      codeC: p.custom ? '#3fe0c5' : '#f37321', metaC: p.live ? '#e6eaec' : '#b4bcc0', cursor: p.live ? 'pointer' : 'default',
      op: !isProd ? 0 : open && !me ? 0.15 : p.live ? 1 : 0.6, y: isProd ? 0 : 40, lineW: hov || me ? 120 : 36,
      enter: () => this.referenceState.hovP !== i && this.updateReferenceState({ hovP: i }), leave: () => this.referenceState.hovP === i && this.updateReferenceState({ hovP: null }),
      pick: () => { if (!isProd || !p.live || this.referenceState.openP != null) return; this.updateReferenceState({ openP: i }); clearTimeout(this.openT); this.openT = this.delay(() => { this.f = -2.5; this.target = 0; this.appear = 0; this.updateReferenceState({ screen: 'cards', openP: null, hovP: null, activeP: p.custom ? 'custom' : 'pump', focus: 0 }); }, 900); }
    }; });
    return {
      shelfCv: this.shelfCv, shelf: (this.shelfPicks = shelf.map(x => x.pick), shelf),
      scale: s, frameW: 1920 * s, frameH: 1080 * s, rootRef: this.rootRef, stripRef: this.stripRef, holoRef: this.holoRef, stackRef: this.stackRef,
      scanEl: React.createElement('div', { key: 'scan', style: { position: 'absolute', left: 0, right: 0, top: 0, height: 120, background: 'linear-gradient(180deg,transparent,rgba(243,115,33,.07),transparent)', animation: 'scan 6s linear infinite', pointerEvents: 'none' } }),
      isCards, isProdScr: isProd, hdrOp: scr === 'boot' ? 0 : 1, hdrY: scr === 'boot' ? -20 : 0,
      title: isCards ? '유압 펌프 · 조립 카드' : '교육 선택',
      subtitle: isCards ? '순서대로 진행합니다 · 카드를 눌러 교육장으로 들어갑니다' : '조립할 제품을 선택하세요',
      prodPE: isProd ? 'auto' : 'none', cardsPE: isCards && !st.entering ? 'auto' : 'none', cardsOp: isCards ? 1 : 0,
      holoOp: st.activeP === 'custom' ? 0 : 1,
      products: this.folders(prods, isProd, scr), _old: prods.map((p, i) => ({ ...p, vis: isProd || scr === 'boot' ? 'visible' : 'hidden', op: isProd ? (p.live ? 1 : 0.55) : 0, y: isProd ? 0 : (scr === 'boot' ? 80 : -60), z: isProd ? 0 : -300, ry: isProd ? (i - 1) * -8 : (i - 1) * -30, delay: isProd ? i * 0.12 : i * 0.06, pick: () => { if (p.live && isProd) { this.f = -2.5; this.target = 1; this.appear = 0; this.updateReferenceState({ screen: 'cards' }); } } })),
      focus: { part: this.PARTNAME[this.CARDS[f].sec] },
      cards: this.CARDS.map((c, i) => ({ i, img: (st.activeP === 'custom' ? c.img : st.thumbs[i]) || '', hasImg: !!(st.activeP === 'custom' ? c.img : st.thumbs[i]), no: String(i + 1).padStart(2, '0'), group: c.group, name: c.name, desc: c.desc, steps: c.steps, min: c.min, layers: lay(c.sec), isDone: c.st === 'done', isNow: c.st === 'now', isFinal: c.st === 'final', pct: c.st === 'done' ? 100 : c.st === 'now' ? (c.prog / c.steps) * 100 : 0, bar: c.st === 'done' ? '#3ddc84' : '#f37321', edge: i === f ? 1 : 0, isFocus: i === f, isDoneDot: i !== f && c.st === 'done', isIdleDot: i !== f && c.st !== 'done' })),
      hints: [{ k: '드래그 · 휠', v: '카드 넘기기' }, { k: '← →', v: '이동' }, { k: '클릭 · Enter', v: '교육장 입장' }],
      flashOp: st.entering ? 1 : 0, blackOp: st.entering ? 1 : 0,
      back: () => this.updateReferenceState({ screen: 'product', openP: null, hovP: null }),
      onDown: (e) => { this.drag = { x: e.clientX, t: this.target, moved: 0, lx: e.clientX, lt: performance.now() }; this.vel = 0; e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.style.cursor = 'grabbing'; },
      onMove: (e) => { if (!this.drag) return; const sc = this.referenceState.scale; const dx = (e.clientX - this.drag.x) / sc; this.drag.moved = Math.max(this.drag.moved, Math.abs(dx)); this.target = this.drag.t - dx / 300; const now = performance.now(); this.drag.v = -((e.clientX - this.drag.lx) / sc / 300) / Math.max(1, now - this.drag.lt) * 16; this.drag.lx = e.clientX; this.drag.lt = now; },
      onUp: (e) => { if (!this.drag) return; const d = this.drag; this.drag = null; e.currentTarget.style.cursor = 'grab'; if (d.moved < 6) { const el = e.target.closest && e.target.closest('[data-card]'); if (el) { const i = +el.getAttribute('data-card'); if (i === this.referenceState.focus) this.enter(); else this.target = i; } return; } this.vel = (d.v || 0) * 0.9; },
      onWheel: (e) => { this.vel += Math.sign(e.deltaY || e.deltaX) * 0.06; }
    };
  }

  render() { const v = this.renderVals(); return <><ReferenceCss /><SourceNode as="div" $style={{"position":"fixed","inset":"0","background":"#000","display":"flex","alignItems":"center","justifyContent":"center","overflow":"hidden"}}><SourceNode as="div" $style={{"width":String(v.frameW) + "px","height":String(v.frameH) + "px","flex":"none"}}><SourceNode as="div" ref={v.rootRef} $style={{"position":"relative","width":"1920px","height":"1080px","overflow":"hidden","transformOrigin":"0 0","transform":"scale(" + String(v.scale) + ")","background":"radial-gradient(ellipse at 50% 40%,#151c20 0%,#090c0e 60%,#040506 100%)","color":"#f2ede8","fontFamily":"'NexonLv2Gothic',sans-serif","userSelect":"none"}}><SourceNode as="div" $style={{"position":"absolute","left":"-1200px","top":"640px","width":"4320px","height":"1400px","backgroundImage":"linear-gradient(rgba(243,115,33,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(243,115,33,.16) 1px,transparent 1px)","backgroundSize":"80px 80px","transform":"perspective(700px) rotateX(70deg)","transformOrigin":"50% 0","WebkitMaskImage":"linear-gradient(180deg,transparent,#000 30%,#000 70%,transparent)","maskImage":"linear-gradient(180deg,transparent,#000 30%,#000 70%,transparent)","pointerEvents":"none"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","inset":"0","pointerEvents":"none","backgroundImage":"repeating-linear-gradient(0deg,rgba(255,255,255,.02) 0 1px,transparent 1px 4px)"}}></SourceNode>{"\n"}{v.scanEl}{"\n\n"}<SourceNode as="div" $style={{"position":"absolute","left":"64px","top":"52px","display":"flex","flexDirection":"column","gap":"12px","opacity":v.hdrOp,"transform":"translateY(" + String(v.hdrY) + "px)","transition":"opacity .6s,transform .6s cubic-bezier(.2,0,0,1)"}}><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"500 13px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#f37321","letterSpacing":".2em"}}>{"HANWHA · MR ASSEMBLY TRAINING"}</SourceNode><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"700 44px/1.1 'NexonLv2Gothic'","textShadow":"-2px 0 rgba(255,59,78,.45),2px 0 rgba(63,224,208,.35)"}}>{v.title}</SourceNode><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"400 17px/1 'NexonLv2Gothic'","color":"#e6eaec"}}>{v.subtitle}</SourceNode></SourceNode>{(v.isCards) ? <><SourceNode as="div" onClick={v.back} $hover={"background:rgba(243,115,33,.2)"} $style={{"position":"absolute","right":"64px","top":"56px","display":"flex","alignItems":"center","gap":"10px","height":"48px","padding":"0 18px","border":"1px solid rgba(243,115,33,.7)","background":"rgba(243,115,33,.05)","cursor":"pointer","clipPath":"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))"}}><SourceNode as="svg" width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} stroke={"#f37321"} strokeWidth={"1.8"} strokeLinecap={"round"} strokeLinejoin={"round"}><SourceNode as="path" d={"M19 12H5"}></SourceNode><SourceNode as="path" d={"m12 19-7-7 7-7"}></SourceNode></SourceNode><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"400 15px/1 'NexonLv2Gothic'"}}>{"제품 선택"}</SourceNode></SourceNode></> : null}{(v.isProdScr) ? <><SourceNode as="a" href={"/training/upload"} $hover={"background:rgba(243,115,33,.2)"} $style={{"position":"absolute","right":"64px","top":"56px","zIndex":"5","display":"flex","alignItems":"center","gap":"10px","height":"48px","padding":"0 18px","border":"1px solid rgba(243,115,33,.7)","background":"rgba(243,115,33,.05)","color":"#f2ede8","textDecoration":"none","clipPath":"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))"}}><SourceNode as="svg" width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} stroke={"#f37321"} strokeWidth={"1.8"} strokeLinecap={"round"} strokeLinejoin={"round"}><SourceNode as="path" d={"M12 16V4"}></SourceNode><SourceNode as="path" d={"m6 10 6-6 6 6"}></SourceNode><SourceNode as="path" d={"M4 20h16"}></SourceNode></SourceNode><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"400 15px/1 'NexonLv2Gothic'"}}>{"도면 업데이트"}</SourceNode></SourceNode></> : null}<SourceNode as="div" $style={{"position":"absolute","left":"0","top":"0","width":"1920px","height":"1080px","perspective":"1600px","pointerEvents":v.prodPE}}><SourceNode as="div" $style={{"position":"absolute","left":"0","top":"0","width":"1920px","height":"1080px"}}><SourceNode as="canvas" ref={v.shelfCv} width={"1920"} height={"1080"} $style={{"position":"absolute","left":"0","top":"0","width":"1920px","height":"1080px"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","inset":"0","pointerEvents":"none"}}>{(v.shelf ?? []).map((m, index) => <React.Fragment key={index}><SourceNode as="div" ref={m.ref} $style={{"position":"absolute","left":"0","top":"0","transform":"translate(-50%,0)","display":"flex","flexDirection":"column","alignItems":"center","gap":"10px","opacity":m.op,"transition":"opacity .5s"}}><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"500 13px/1 var(--font-mono),'JetBrains Mono',monospace","letterSpacing":".2em","color":m.codeC}}>{m.code}</SourceNode><SourceNode as="span" $style={{"maxWidth":String(m.nameW) + "px","overflow":"hidden","textOverflow":"ellipsis","whiteSpace":"nowrap","font":"700 34px/1.1 'NexonLv2Gothic'","color":"#fff","textShadow":"0 2px 14px rgba(0,0,0,.8)"}}>{m.name}</SourceNode><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"400 15px/1 'NexonLv2Gothic'","color":m.metaC}}>{m.meta}</SourceNode><SourceNode as="div" $style={{"width":String(m.lineW) + "px","height":"2px","marginTop":"6px","background":"#f37321","boxShadow":"0 0 10px rgba(243,115,33,.8)","transition":"width .3s"}}></SourceNode></SourceNode></React.Fragment>)}</SourceNode></SourceNode></SourceNode><SourceNode as="div" $style={{"position":"absolute","right":"60px","top":"130px","width":"600px","height":"360px","transform":"scale(.62)","transformOrigin":"100% 0","pointerEvents":"none","opacity":v.cardsOp,"transition":"opacity .8s .2s"}}><SourceNode as="div" ref={v.holoRef} $style={{"position":"absolute","inset":"0","opacity":v.holoOp}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","right":"0","top":"40px","display":"flex","flexDirection":"column","gap":"8px","alignItems":"flex-end"}}><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"500 12px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#f37321","letterSpacing":".14em"}}>{"PREVIEW"}</SourceNode><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"700 20px/1 'NexonLv2Gothic'"}}>{v.focus.part}</SourceNode><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"400 14px/1 'NexonLv2Gothic'","color":"#e6eaec"}}>{"완성품에서의 위치"}</SourceNode></SourceNode></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"64px","top":"210px","width":"760px","display":"flex","alignItems":"center","opacity":v.cardsOp,"transition":"opacity .8s .3s","pointerEvents":"none"}}>{(v.cards ?? []).map((c, index) => <React.Fragment key={index}><SourceNode as="div" $style={{"flex":"1","display":"flex","alignItems":"center"}}>{(c.isFocus) ? <><SourceNode as="span" $style={{"width":"14px","height":"14px","transform":"rotate(45deg)","background":"#f37321","boxShadow":"0 0 12px #f37321","flex":"none"}}></SourceNode></> : null}{(c.isDoneDot) ? <><SourceNode as="span" $style={{"width":"10px","height":"10px","transform":"rotate(45deg)","background":"#3ddc84","flex":"none"}}></SourceNode></> : null}{(c.isIdleDot) ? <><SourceNode as="span" $style={{"width":"10px","height":"10px","transform":"rotate(45deg)","border":"1.5px solid rgba(243,115,33,.7)","boxSizing":"border-box","flex":"none"}}></SourceNode></> : null}<SourceNode as="div" $style={{"flex":"1","height":"1px","background":"rgba(243,115,33,.35)"}}></SourceNode></SourceNode></React.Fragment>)}</SourceNode><SourceNode as="div" ref={v.stripRef} $style={{"position":"absolute","left":"0","top":"250px","width":"1920px","height":"780px","perspective":"2200px","perspectiveOrigin":"50% 40%","opacity":v.cardsOp,"transition":"opacity .5s","pointerEvents":v.cardsPE,"cursor":"grab"}} onPointerDown={v.onDown} onPointerMove={v.onMove} onPointerUp={v.onUp} onPointerLeave={v.onUp} onWheel={v.onWheel}><SourceNode as="div" ref={v.stackRef} $style={{"position":"absolute","left":"960px","top":"90px","width":"0","height":"0","transformStyle":"preserve-3d","transform":"none"}}>{(v.cards ?? []).map((c, index) => <React.Fragment key={index}><SourceNode as="div" data-card={c.i} $style={{"position":"absolute","left":"-180px","top":"0","width":"360px","height":"540px","transformStyle":"preserve-3d","willChange":"transform,opacity"}}><SourceNode as="div" $style={{"position":"absolute","inset":"0","boxSizing":"border-box","display":"flex","flexDirection":"column","padding":"16px 18px 16px","border":"1.5px solid rgba(243,115,33,.75)","background":"rgba(10,11,13,.9)","clipPath":"polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px))"}}><SourceNode as="div" $style={{"position":"absolute","left":"0","top":"0","bottom":"0","width":"14px","background":"linear-gradient(90deg,rgba(243,115,33,.45),rgba(243,115,33,0))","opacity":c.edge}}></SourceNode><SourceNode as="div" $style={{"position":"relative","height":"210px","border":"1px solid rgba(243,115,33,.55)","background":"#07090b","overflow":"hidden"}}>{(c.hasImg) ? <><SourceNode as="img" src={c.img} $style={{"position":"absolute","inset":"0","width":"100%","height":"100%","objectFit":"cover","display":"block"}} /></> : null}<SourceNode as="div" $style={{"position":"absolute","inset":"0","backgroundImage":"repeating-linear-gradient(0deg,rgba(243,115,33,.05) 0 1px,transparent 1px 3px)"}}></SourceNode><SourceNode as="span" $style={{"position":"absolute","left":"10px","top":"10px","font":"700 30px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#f37321","textShadow":"0 0 14px rgba(0,0,0,.9)"}}>{c.no}</SourceNode>{(c.isDone) ? <><SourceNode as="span" $style={{"position":"absolute","right":"10px","top":"10px","font":"700 11px/1 var(--font-mono),'JetBrains Mono',monospace","padding":"5px 8px","background":"#3ddc84","color":"#06140c"}}>{"DONE"}</SourceNode></> : null}{(c.isNow) ? <><SourceNode as="span" $style={{"position":"absolute","right":"10px","top":"10px","font":"700 11px/1 var(--font-mono),'JetBrains Mono',monospace","padding":"5px 8px","background":"#f37321","color":"#140a04"}}>{"NOW"}</SourceNode></> : null}{(c.isFinal) ? <><SourceNode as="span" $style={{"position":"absolute","right":"10px","top":"10px","font":"700 11px/1 var(--font-mono),'JetBrains Mono',monospace","padding":"5px 8px","border":"1px solid #f37321","background":"rgba(0,0,0,.6)","color":"#f37321"}}>{"FINAL"}</SourceNode></> : null}</SourceNode><SourceNode as="span" $style={{"marginTop":"16px","whiteSpace":"nowrap","font":"500 12px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#ffb07a","letterSpacing":".14em"}}>{c.group}</SourceNode><SourceNode as="span" $style={{"marginTop":"10px","whiteSpace":"nowrap","font":"700 26px/1.15 'NexonLv2Gothic'","color":"#fff"}}>{c.name}</SourceNode><SourceNode as="span" $style={{"marginTop":"12px","font":"400 15px/1.55 'NexonLv2Gothic'","color":"#eef1f2","textWrap":"pretty"}}>{c.desc}</SourceNode><SourceNode as="div" $style={{"marginTop":"auto","display":"flex","flexDirection":"column","gap":"10px"}}><SourceNode as="div" $style={{"display":"flex","justifyContent":"space-between"}}><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"500 13px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#ffb07a"}}>{c.steps}{" STEPS"}</SourceNode><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"500 13px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#c9d0d3"}}>{"≈ "}{c.min}{" MIN"}</SourceNode></SourceNode><SourceNode as="div" $style={{"height":"3px","background":"rgba(243,115,33,.18)"}}><SourceNode as="div" $style={{"width":String(c.pct) + "%","height":"3px","background":c.bar,"boxShadow":"0 0 8px " + String(c.bar)}}></SourceNode></SourceNode><SourceNode as="div" $style={{"display":"flex","justifyContent":"flex-end","gap":"14px","opacity":c.edge}}><SourceNode as="div" $style={{"display":"flex","alignItems":"center","gap":"6px"}}><SourceNode as="span" $style={{"width":"20px","height":"20px","borderRadius":"50%","border":"1.5px solid #f37321","display":"flex","alignItems":"center","justifyContent":"center","font":"700 10px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#f37321"}}>{"A"}</SourceNode><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"500 12px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#eef1f2"}}>{"교육 시작"}</SourceNode></SourceNode></SourceNode></SourceNode><SourceNode as="div" $style={{"position":"absolute","inset":"0","background":"#05070a","opacity":"0","pointerEvents":"none"}}></SourceNode></SourceNode></SourceNode></React.Fragment>)}</SourceNode></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"0","right":"0","bottom":"30px","display":"flex","justifyContent":"center","gap":"26px","opacity":v.cardsOp,"transition":"opacity .6s .4s","pointerEvents":"none"}}>{(v.hints ?? []).map((h, index) => <React.Fragment key={index}><SourceNode as="div" $style={{"display":"flex","alignItems":"center","gap":"8px"}}><SourceNode as="span" $style={{"minWidth":"24px","height":"24px","padding":"0 7px","boxSizing":"border-box","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid rgba(243,115,33,.85)","font":"500 11px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#f37321"}}>{h.k}</SourceNode><SourceNode as="span" $style={{"whiteSpace":"nowrap","font":"400 14px/1 'NexonLv2Gothic'","color":"#eef1f2"}}>{h.v}</SourceNode></SourceNode></React.Fragment>)}</SourceNode><SourceNode as="div" $style={{"position":"absolute","inset":"0","pointerEvents":"none","background":"radial-gradient(circle at 50% 60%,rgba(255,176,122,.9),rgba(243,115,33,.4) 30%,rgba(0,0,0,0) 70%)","opacity":v.flashOp,"transition":"opacity .45s"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","inset":"0","pointerEvents":"none","background":"#000","opacity":v.blackOp,"transition":"opacity .5s .35s"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","inset":"0","pointerEvents":"none","background":"radial-gradient(ellipse 85% 90% at 50% 50%,transparent 66%,rgba(0,0,0,.6) 100%)"}}></SourceNode></SourceNode></SourceNode></SourceNode></>; }
}
