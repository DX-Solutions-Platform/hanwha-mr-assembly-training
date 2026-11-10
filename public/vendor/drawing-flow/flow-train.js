(function () {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const T = window.THREE, P = window.FlowEngine.prototype, V = (x, y, z) => new T.Vector3(x, y, z);
  const MODE = { check: 'pair', place: 'guide', inside: 'xray', fasten: 'split' };
  const ORG = '#f37321', MINT = '#3fe0c5', RED = '#ff4d4d';
  P.trainBuild = function (pr, win, onState) {
    this.clear(); this.pr = pr; this.mode = 'train'; this.win = win; this.onState = onState; this.paused = false;
    const S = this.sz = Math.max(...pr.size); this.Z = { L: V(-1.7 * S, 0, -0.2 * S), M: V(1.6 * S, 0, 0.1 * S) };
    this.homeCam = { az: 0, el: 0.4, dist: S * 5.3, tgt: V(0, S * 0.25, S * 0.1) }; this.orbit(this.homeCam);
    const left = this.left = this.add(new T.Group()); left.position.copy(this.Z.L); left.scale.setScalar(0.9);
    const tb = new T.Box3();
    pr.pieces.forEach(pc => {
      const part = pr.parts[pc.part]; pc.home = V(pc.p[0], pc.p[1], pc.p[2]); pc.q = this.qOf(pc.r); pc.placed = false;
      pc.obj = this.add(this.solid(part)); pc.obj.visible = false;
      pc.obj.position.set(0, 0, 0); pc.obj.quaternion.set(0, 0, 0, 1); pc.obj.updateMatrixWorld(true); tb.setFromObject(pc.obj); const sv = tb.getSize(V()); pc.size = Math.max(sv.x, sv.y, sv.z); pc.long = sv.x >= sv.y && sv.x >= sv.z ? V(1, 0, 0) : sv.y >= sv.z ? V(0, 1, 0) : V(0, 0, 1); pc.longL = Math.max(sv.x, sv.y, sv.z);
      pc.wl = this.wire(part); pc.wl.position.copy(pc.home); pc.wl.quaternion.copy(pc.q); left.add(pc.wl);
      pc.dl = this.solid(part); pc.dl.position.copy(pc.home); pc.dl.quaternion.copy(pc.q); pc.dl.visible = false; left.add(pc.dl);
      pc.gh = this.edges(part, this.M.ghost); pc.gh.position.copy(pc.home); pc.gh.quaternion.copy(pc.q); pc.gh.visible = false; this.add(pc.gh);
    });
    const rect = (c, w, d, col, op) => { const g = new T.BufferGeometry().setFromPoints([V(-w / 2, 0, -d / 2), V(w / 2, 0, -d / 2), V(w / 2, 0, d / 2), V(-w / 2, 0, d / 2)]); const l = new T.LineLoop(g, new T.LineBasicMaterial({ color: col, transparent: true, opacity: op })); l.position.copy(c).setY(1.5); return this.add(l); };
    rect(V(0, 0, 0), S * 1.25, S * 1.05, 0xf37321, 0.55); rect(this.Z.M.clone().add(V(0, 0, S * 0.2)), S * 1.35, S * 1.25, 0x5a636a, 0.6); rect(this.Z.L, S * 1.15, S * 1.0, 0x5a636a, 0.6);
    const zl = (k, txt, c) => this.lab(k, `<div style="transform:translate(-50%,0);font:500 10px JetBrains Mono,monospace;letter-spacing:.16em;color:${c}">${txt}</div>`);
    const lz = zl('zL', '완성품', '#9aa4ab'), lw = zl('zW', '작업대', ORG), lm = zl('zM', '재료 구역', '#9aa4ab');
    this.hooks.push(() => { this.pin(lz, this.Z.L.clone().add(V(0, 0, S * 0.52))); this.pin(lw, V(0, 0, S * 0.55)); this.pin(lm, this.Z.M.clone().add(V(0, 0, S * 0.85))); });
    this.camO = new T.PerspectiveCamera(30, 1, 5, 10000); this.camI = new T.PerspectiveCamera(30, 1, 5, 10000);
    this.ui = document.createElement('div'); this.ui.style.cssText = 'position:absolute;inset:0;pointer-events:none'; win.appendChild(this.ui);
    this.ui.innerHTML = '<svg style="position:absolute;inset:0;width:100%;height:100%;overflow:visible"></svg>'; this.svg = this.ui.firstChild;
    this.stat = { t0: this.t, err: 0, warn: 0 }; this.si = 0; this.sti = 0; this.fin = false; this.secBegin();
    this.hooks.push(dt => this.trainTick(dt)); this.detail = R => this.detailRender(R);
  };
  P.emit = function (x) {
    if (!this.onState) return; const pr = this.pr, s = this.sec, st = this.step || {};
    const before = pr.sections.slice(0, this.si).reduce((a, q) => a + q.steps.length, 0), no = Math.min(pr.nSteps, before + this.sti + (this.fin ? 0 : 1));
    this.onState(Object.assign({ si: this.si, sti: this.sti, sec: s, step: st, vm: this.vm, stepNo: no, pct: Math.round((before + this.sti) / pr.nSteps * 100), toolOn: this.toolOn, left: this.queue ? this.queue.length : 0, fin: this.fin, err: this.stat.err, warn: this.stat.warn }, x || {}));
  };
  P.secBegin = function () {
    const pr = this.pr, S = this.sz, s = this.sec = pr.sections[this.si];
    pr.pieces.forEach(pc => pc.wl.children.forEach(c => { c.material = pc.sec === this.si ? this.M.hot : this.M.wire; }));
    Object.keys(this.labs).filter(k => /^mp/.test(k)).forEach(k => this.unlab(k));
    const items = s.idx.map(i => pr.pieces[i]), maxW = S * 1.2, gap = S * 0.07, tb = new T.Box3(); let x = 0, z = 0, rowD = 0;
    items.forEach((pc, j) => {
      const o = pc.obj; o.position.set(0, 0, 0); o.quaternion.copy(pc.q); o.updateMatrixWorld(true); tb.setFromObject(o);
      const w = tb.max.x - tb.min.x, d = tb.max.z - tb.min.z, c = tb.getCenter(V());
      if (x > 0 && x + w > maxW) { x = 0; z += rowD + gap; rowD = 0; }
      pc.mat = V(this.Z.M.x - maxW / 2 + x + w / 2 - c.x, -tb.min.y + 1, this.Z.M.z - S * 0.3 + z + d / 2 - c.z); x += w + gap; rowD = Math.max(rowD, d);
      o.visible = true; this.snap(o, pc.mat.clone().add(V(0, S * 0.9, 0)), pc.q); this.move(o, pc.mat, pc.q, 0.1 + j * 0.05, 5);
    });
    const seen = {}; items.forEach(pc => { if (seen[pc.part]) return; seen[pc.part] = pc; });
    this.mpl = Object.keys(seen).map(k => ({ pc: seen[k], l: this.lab('mp' + k, `<div style="transform:translate(-50%,0);font:500 12px NexonLv2Gothic,sans-serif;color:#dfe5e9;text-shadow:0 1px 3px #000">${escape(pr.parts[k].ko)}</div>`) }));
    this.sti = 0; this.stepBegin();
  };
  P.stepBegin = function () {
    const pr = this.pr, s = this.sec, st = this.step = s.steps[this.sti]; this.vm = MODE[st.t]; this.dz = 1; this.da = 0; this.de = 0;
    this.queue = st.part === 'all' ? [] : (st.pcs || s.idx).map(i => pr.pieces[i]).filter(pc => pc.part === st.part && !pc.placed);
    this.toolOn = false; this.hold = false; this.tq = 0; this.prog = 0; this.ang = 0; this.cur = null;
    if (this.toolG) { this.S.remove(this.toolG); this.toolG = null; }
    this.ghost(); this.ui.querySelectorAll('[data-x]').forEach(e => e.remove());
    if (st.t === 'check') this.buildInsp(st.part);
    if (st.t === 'fasten') { this.mkFastenUI(st); this.boltNext(); }
    this.emit();
  };
  P.ghost = function () { this.pr.pieces.forEach(pc => pc.gh.visible = false); const q = this.queue && this.queue[0]; if (q && this.step.t !== 'fasten') q.gh.visible = true; };
  P.stepDone = function () { this.emit({ msg: '완료', kind: 'ok' }); this.sti++; if (this.sti >= this.sec.steps.length) this.secDone(); else this.stepBegin(); };
  P.secDone = function () {
    this.sec.idx.forEach(i => { const pc = this.pr.pieces[i]; pc.wl.visible = false; pc.dl.visible = true; pc.dl.scale.setScalar(0.9); this.hooks.push(dt => { pc.dl.scale.lerp(V(1, 1, 1), 1 - Math.exp(-dt * 6)); }); });
    if (this.si >= this.pr.sections.length - 1) { this.fin = true; this.step = null; this.vm = null; this.pr.pieces.forEach(pc => pc.gh.visible = false); this.ui.querySelectorAll('[data-x]').forEach(e => e.remove()); this.svg.innerHTML = ''; this.emit({ msg: '교육 완료', kind: 'ok', time: this.t - this.stat.t0 }); return; }
    this.si++; this.secBegin();
  };
  P.buildInsp = function (part) {
    const sc = this.insp = new T.Scene(); sc.add(new T.HemisphereLight(0xe8eef2, 0x1b1714, 0.9)); const k = new T.DirectionalLight(0xffffff, 1.4); k.position.set(300, 600, 500); sc.add(k);
    const pr = this.pr, a = new T.Group(), b = new T.Group(), wm = new T.LineBasicMaterial({ color: 0xf37321, transparent: true, opacity: 0.85 });
    const list = part === 'all' ? pr.pieces : [pr.pieces.find(pc => pc.part === part && pc.sec === this.si)];
    list.forEach(pc => { const s = this.solid(pr.parts[pc.part]), w = this.wire(pr.parts[pc.part], wm); [s, w].forEach(o => { if (part === 'all') { o.position.copy(pc.home); o.quaternion.copy(pc.q); } }); a.add(s); b.add(w); });
    const bb = new T.Box3().setFromObject(a), c = bb.getCenter(V()), sz = bb.getSize(V()), m = Math.max(sz.x, sz.y, sz.z);
    [a, b].forEach(g => g.children.forEach(o => o.position.sub(c)));
    const pa = new T.Group(), pb = new T.Group(); pa.add(a); pb.add(b); pa.position.x = -m * 0.72; pb.position.x = m * 0.72; sc.add(pa, pb); this.ins = { pa, pb, m };
    this.camI.position.set(0, m * 0.35, m * 3.4); this.camI.lookAt(0, 0, 0);
  };
  P.mkFastenUI = function (st) {
    const d = document.createElement('div'); d.setAttribute('data-x', 1); d.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    d.innerHTML = `<div data-g style="position:absolute;right:16px;top:14px;width:min(40%,300px);display:flex;flex-direction:column;gap:6px"><div style="display:flex;justify-content:space-between;font:500 12px JetBrains Mono,monospace;color:#dfe5e9"><span>TORQUE</span><span data-gv>0.0 / ${escape(st.nm)} N·m</span></div><div style="position:relative;height:6px;background:rgba(255,255,255,.12)"><div style="position:absolute;left:${90 / 1.25}%;width:${25 / 1.25}%;top:-3px;bottom:-3px;border:1px solid ${MINT}"></div><div data-gb style="position:absolute;left:0;top:0;bottom:0;width:0;background:${ORG}"></div></div><div style="font:400 11px NexonLv2Gothic,sans-serif;color:#9aa4ab">${escape(st.nmSrc)}</div></div>
    <div data-rest style="position:absolute;right:16px;bottom:16px;pointer-events:auto;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 12px;border:1px solid rgba(243,115,33,.6);background:rgba(10,12,14,.55)"><div style="font:500 10px JetBrains Mono,monospace;letter-spacing:.12em;color:${ORG}">TOOL REST</div><div data-rn style="font:500 13px NexonLv2Gothic,sans-serif;color:#f4f6f7">${escape(st.toolKo)}</div><div data-rs style="font:400 11px NexonLv2Gothic,sans-serif;color:#9aa4ab">눌러서 집기</div></div>`;
    this.ui.appendChild(d); this.gv = d.querySelector('[data-gv]'); this.gb = d.querySelector('[data-gb]');
    d.querySelector('[data-rest]').addEventListener('pointerdown', ev => { ev.stopPropagation(); this.equip(); });
  };
  P.equip = function () {
    if (this.toolOn || !this.step || this.step.t !== 'fasten') return; this.toolOn = true; const st = this.step;
    const g = this.toolG = new T.Group(), m = new T.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.4, metalness: 0.7 }), h = new T.MeshStandardMaterial({ color: 0xf37321, roughness: 0.5, metalness: 0.2 });
    const add = (geo, mat, p, r) => { const o = new T.Mesh(geo, mat); o.position.set(p[0], p[1], p[2]); if (r) o.rotation.set(r[0], r[1], r[2]); g.add(o); };
    if (st.tool === 'wrench') { add(new T.CylinderGeometry(13, 13, 12, 6), m, [0, 9, 0]); add(new T.BoxGeometry(200, 10, 18), m, [108, 9, 0]); add(new T.BoxGeometry(70, 16, 24), h, [180, 9, 0]); }
    if (st.tool === 'hex') { add(new T.BoxGeometry(5, 34, 5), m, [0, 17, 0]); add(new T.BoxGeometry(100, 5, 5), m, [50, 34, 0]); }
    if (st.tool === 'driver') { add(new T.CylinderGeometry(2.4, 2.4, 70, 8), m, [0, 37, 0]); add(new T.CylinderGeometry(11, 13, 90, 16), h, [0, 117, 0]); }
    this.S.add(g); const rs = this.ui.querySelector('[data-rs]'); if (rs) rs.textContent = '사용 중'; this.emit({ msg: st.toolKo, kind: 'tool' });
  };
  P.boltNext = function () {
    const b = this.cur = this.queue[0]; if (!b) { this.stepDone(); return; }
    const part = this.pr.parts[b.part]; b.dir = V(0, 1, 0).applyQuaternion(b.q); b.loose = part.geo[0].s[1] * 0.7; this.prog = 0; this.tq = 0; this.ang = 0;
    this.bMove = true; this.move(b.obj, b.home.clone().addScaledVector(b.dir, b.loose), b.q, 0.1, 5); setTimeout(() => { this.bMove = false; }, 700);
  };
  P.tick2 = function () {};
  P.trainTick = function (dt) {
    if (this.paused || this.fin) return; const st = this.step;
    this.mpl && this.mpl.forEach(o => this.pin(o.l, o.pc.mat.clone().add(V(0, 0, o.pc.size * 0.5 + 24))));
    if (st && st.t === 'fasten' && this.cur) {
      const b = this.cur; let amp = 0;
      if (this.hold && this.toolOn) {
        const r = Math.min(1.2, this.tq / st.nm), sp = 6 * (1 - 0.8 * Math.min(1, r)); const da = sp * dt; this.ang += da;
        if (this.prog < 1) { this.prog = Math.min(1, this.prog + da / (Math.PI * 2 * 2.5)); this.tq = st.nm * 0.06 * this.prog; amp = 0.6; }
        else { this.tq += da * st.nm / 1.7; amp = 1 + 3.2 * r; }
        this.tickA = (this.tickA || 0) + da; if (this.tickA > 0.45) { this.tickA = 0; this.click(0.5 + r); }
        if (this.tq > st.nm * 1.15) { this.hold = false; this.stat.warn++; this.tq = 0; this.prog = 0.8; this.emit({ msg: `토크 초과 경고 · 규정 ${escape(st.nm)} N·m`, kind: 'warn' }); }
      }
      if (!this.bMove) { this.anim = this.anim.filter(o => o !== b.obj); b.obj.position.copy(b.home).addScaledVector(b.dir, b.loose * (1 - this.prog)); b.obj.quaternion.copy(b.q).multiply(new T.Quaternion().setFromAxisAngle(V(0, 1, 0), -this.ang)); }
      if (this.toolG) { this.toolG.position.copy(b.obj.position); this.toolG.quaternion.copy(b.obj.quaternion); }
      this.shake = amp; this.win.style.transform = amp ? `translate(${(Math.random() - 0.5) * amp}px,${(Math.random() - 0.5) * amp}px)` : '';
      if (this.gv) { this.gv.textContent = `${this.tq.toFixed(1)} / ${escape(st.nm)} N·m`; const p = Math.min(100, this.tq / st.nm / 1.25 * 100); this.gb.style.width = p + '%'; this.gb.style.background = this.tq > st.nm * 1.1 ? RED : this.tq >= st.nm * 0.9 ? MINT : ORG; }
    } else if (this.win.style.transform) this.win.style.transform = '';
  };
  P.click = function (v) { try { const A = this.ac || (this.ac = new (window.AudioContext || window.webkitAudioContext)()); const o = A.createOscillator(), g = A.createGain(); o.type = 'square'; o.frequency.value = 900 + v * 500; g.gain.setValueAtTime(0.035, A.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, A.currentTime + 0.04); o.connect(g).connect(A.destination); o.start(); o.stop(A.currentTime + 0.05); } catch (e) {} };
  P.winRect = function () { if (!this.win) return null; const a = this.win.getBoundingClientRect(), c = this.cv.getBoundingClientRect(); if (a.width < 10) return null; return { x: a.left - c.left, y: a.top - c.top, w: a.width, h: a.height }; };
  P.focus = function () { const q = this.cur || (this.queue && this.queue[0]); if (q) return q.home; const s = this.sec, c = V(); s.idx.forEach(i => c.add(this.pr.pieces[i].home)); return c.multiplyScalar(1 / s.idx.length); };
  P.xray = function (on) { const st = this.step; this.pr.pieces.forEach(pc => { if (!pc.placed || pc.part === st.part) return; pc.obj.traverse(o => { if (o.isMesh) { o.material.transparent = on; o.material.opacity = on ? 0.05 : 1; o.material.depthWrite = !on; } }); }); };
  P.detailRender = function (R) {
    const r = this.winRect(), st = this.step; if (!r || !st || this.paused) return; let h = '';
    if (this.vm === 'pair') {
      const I = this.ins; I.pa.rotation.y += 0.008; I.pb.rotation.y = I.pa.rotation.y; this.viewRender(this.insp, this.camI, r);
      const A = this.proj(I.pa.position, this.camI, { x: 0, y: 0, w: r.w, h: r.h }), B = this.proj(I.pb.position, this.camI, { x: 0, y: 0, w: r.w, h: r.h }), y = r.h * 0.86;
      h = `<line x1="${A.x + 40}" y1="${y}" x2="${B.x - 40}" y2="${y}" stroke="${MINT}" stroke-width="3"/><circle cx="${A.x + 40}" cy="${y}" r="7" fill="${MINT}"/><circle cx="${B.x - 40}" cy="${y}" r="7" fill="${MINT}"/><text x="${A.x}" y="${y + 5}" fill="#dfe5e9" font-size="12" text-anchor="middle" font-family="NexonLv2Gothic">실물</text><text x="${B.x}" y="${y + 5}" fill="#dfe5e9" font-size="12" text-anchor="middle" font-family="NexonLv2Gothic">와이어프레임</text>`;
      this.svg.innerHTML = h; return;
    }
    const tg = this.focus(), oc = V(0, 0, 0), ox0 = tg.x - oc.x, oz0 = tg.z - oc.z, outw = Math.hypot(ox0, oz0) > this.sz * 0.15, az = (outw ? Math.atan2(ox0, oz0) * 0.75 + this.orb.az * 0.25 : this.orb.az + 0.4) + this.da, el = Math.min(1.35, Math.max(-0.1, 0.45 + this.de));
    const pos = (cam, t, d, a, e) => { cam.position.set(t.x + Math.sin(a) * Math.cos(e) * d, t.y + Math.sin(e) * d, t.z + Math.cos(a) * Math.cos(e) * d); cam.lookAt(t); };
    const q = this.cur || (this.queue && this.queue[0]);
    if (this.vm === 'split') {
      const rl = { x: r.x, y: r.y, w: Math.round(r.w * 0.42), h: r.h }, rr = { x: r.x + Math.round(r.w * 0.42) + 2, y: r.y, w: r.w - Math.round(r.w * 0.42) - 2, h: r.h };
      const sc = this.sz; pos(this.camO, V(0, this.pr.size[1] * 0.4, 0), sc * 2.6, q ? Math.atan2(q.home.x, q.home.z) * 0.6 + this.da : az, 0.55); this.viewRender(this.S, this.camO, rl);
      const bt = q ? q.obj.position : tg, sh = this.shake || 0; const baz = Math.atan2(bt.x, bt.z) + this.da; pos(this.camD, bt.clone().add(V((Math.random() - 0.5) * sh * 0.6, (Math.random() - 0.5) * sh * 0.6, 0)), 230 * this.dz, baz, el); this.viewRender(this.S, this.camD, rr);
      const L = { x: 0, y: 0, w: rl.w, h: rl.h }, Rr = { x: rr.x - r.x, y: 0, w: rr.w, h: rr.h };
      if (q) { const a = this.proj(q.home, this.camO, L); h += `<circle cx="${a.x}" cy="${a.y}" r="10" fill="none" stroke="${ORG}" stroke-width="2"/>`; const b = this.proj(bt, this.camD, Rr); const rad = 46; h += `<circle cx="${b.x}" cy="${b.y}" r="${rad}" fill="none" stroke="${this.hold ? MINT : ORG}" stroke-width="3" stroke-dasharray="6 7" stroke-dashoffset="${-this.ang * 30}"/><path d="M ${b.x + rad} ${b.y - 10} l 6 12 l 8 -10" fill="none" stroke="${this.hold ? MINT : ORG}" stroke-width="2.5"/>`; }
      h += `<line x1="${rl.w + 1}" y1="0" x2="${rl.w + 1}" y2="${r.h}" stroke="rgba(243,115,33,.5)" stroke-width="2"/><text x="12" y="${r.h - 14}" fill="#9aa4ab" font-size="11" font-family="NexonLv2Gothic">작업 위치</text><text x="${rl.w + 14}" y="${r.h - 14}" fill="#9aa4ab" font-size="11" font-family="NexonLv2Gothic">${this.toolOn ? '확대창을 누르고 있으면 조여집니다' : ''}</text>`;
      this.svg.innerHTML = h; return;
    }
    const d = Math.max(q ? q.size * 3.0 : 0, this.sz * 0.55) * this.dz; pos(this.camD, tg, d, az, el);
    if (this.vm === 'xray') this.xray(true); this.viewRender(this.S, this.camD, r); if (this.vm === 'xray') this.xray(false);
    if (q) {
      const W = { x: 0, y: 0, w: r.w, h: r.h }, t = this.proj(q.home, this.camD, W), ax = q.long.clone().applyQuaternion(q.q).multiplyScalar(q.longL / 2), a = this.proj(q.home.clone().add(ax), this.camD, W), b = this.proj(q.home.clone().sub(ax), this.camD, W);
      const nx = -(b.y - a.y), ny = b.x - a.x, nl = Math.hypot(nx, ny) || 1, ox = nx / nl * 26, oy = ny / nl * 26;
      h += `<circle cx="${t.x}" cy="${t.y}" r="${16 + 4 * Math.sin(this.t * 5)}" fill="none" stroke="${ORG}" stroke-width="2"/><line x1="${t.x - 8}" y1="${t.y}" x2="${t.x + 8}" y2="${t.y}" stroke="${ORG}"/><line x1="${t.x}" y1="${t.y - 8}" x2="${t.x}" y2="${t.y + 8}" stroke="${ORG}"/>`;
      h += `<line x1="${a.x + ox}" y1="${a.y + oy}" x2="${b.x + ox}" y2="${b.y + oy}" stroke="#e4eaee" stroke-width="1.2"/><line x1="${a.x}" y1="${a.y}" x2="${a.x + ox * 1.3}" y2="${a.y + oy * 1.3}" stroke="#e4eaee" stroke-width="1"/><line x1="${b.x}" y1="${b.y}" x2="${b.x + ox * 1.3}" y2="${b.y + oy * 1.3}" stroke="#e4eaee" stroke-width="1"/><text x="${(a.x + b.x) / 2 + ox * 1.7}" y="${(a.y + b.y) / 2 + oy * 1.7 + 4}" fill="#f4f6f7" font-size="13" text-anchor="middle" font-family="JetBrains Mono">${Math.round(q.longL)} mm</text>`;
      if (this.drag) { const g = this.proj(this.drag.obj.position, this.camD, W), dist = Math.round(this.drag.obj.position.distanceTo(q.home)); h += `<line x1="${g.x}" y1="${g.y}" x2="${t.x}" y2="${t.y}" stroke="${dist < this.tol(q) ? MINT : ORG}" stroke-width="2" stroke-dasharray="7 6"/><path d="M ${t.x} ${t.y} m -9 -4 l 9 4 l -4 9" fill="none" stroke="${ORG}" stroke-width="2" transform="rotate(${Math.atan2(t.y - g.y, t.x - g.x) * 57.3 - 45} ${t.x} ${t.y})"/><text x="${(g.x + t.x) / 2 + 10}" y="${(g.y + t.y) / 2 - 8}" fill="${dist < this.tol(q) ? MINT : '#f4f6f7'}" font-size="13" font-family="JetBrains Mono">${dist} mm</text>`; }
      if (this.vm === 'xray') h += `<text x="14" y="${r.h - 14}" fill="#9aa4ab" font-size="11" font-family="NexonLv2Gothic">겉면 반투명 · 안쪽 작업</text>`;
    }
    this.svg.innerHTML = h;
  };
  P.tol = function (q) { return Math.max(30, q.size * 0.22); };
  P.mpos = function (e) { const c = this.cv.getBoundingClientRect(); return { x: e.clientX - c.left, y: e.clientY - c.top }; };
  P.inWin = function (m) { const r = this.winRect(); return r && m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h; };
  P.ray = function (m) { const rc = this.rc || (this.rc = new T.Raycaster()); const r = this.winRect(); if (this.vm !== 'pair' && this.vm !== 'split' && this.inWin(m)) rc.setFromCamera({ x: (m.x - r.x) / r.w * 2 - 1, y: -((m.y - r.y) / r.h * 2 - 1) }, this.camD); else rc.setFromCamera({ x: m.x / this.W * 2 - 1, y: -(m.y / this.H * 2 - 1) }, this.cam); return rc; };
  P.down = function (e) {
    if (this.mode !== 'train' || this.paused || this.fin) { this.ptr = { m: this.mpos(e), mode: 'orbit' }; return; }
    const m = this.mpos(e), st = this.step; this.ptr = { m, mode: 'orbit' };
    if (e.button === 0 && !this.inWin(m) && st) {
      const rc = this.ray(m), cand = this.sec.idx.map(i => this.pr.pieces[i]).filter(pc => !pc.placed && pc.obj.visible && !(st.t === 'fasten' && pc === this.cur));
      const hit = rc.intersectObjects(cand.map(pc => pc.obj), true)[0];
      if (hit) {
        const pc = cand.find(c => { let o = hit.object; while (o) { if (o === c.obj) return true; o = o.parent; } return false; });
        if (pc && (st.t === 'place' || st.t === 'inside') && pc.part === st.part) { const q0 = this.queue[0]; if (q0 !== pc) { [pc.home, q0.home] = [q0.home, pc.home]; [pc.q, q0.q] = [q0.q, pc.q]; [pc.gh, q0.gh] = [q0.gh, pc.gh]; this.queue[this.queue.indexOf(pc)] = q0; this.queue[0] = pc; } this.drag = pc; this.ptr.mode = 'drag'; this.anim = this.anim.filter(o => o !== pc.obj); return; }
        if (pc) { this.stat.err++; this.emit({ msg: '이 부품이 아닙니다', kind: 'err' }); return; }
      }
    }
    if (this.inWin(m) && e.button === 0 && st) {
      if (st.t === 'check') { this.stepDone(); return; }
      if (st.t === 'fasten' && this.cur && !this.bMove) { if (!this.toolOn) { this.stat.err++; this.emit({ msg: '도구가 맞지 않습니다', kind: 'err' }); return; } this.hold = true; this.ptr.mode = 'hold'; return; }
    }
    this.ptr.mode = this.inWin(m) ? 'drot' : 'orbit';
  };
  P.moveP = function (e) {
    const p = this.ptr; if (!p) return; const m = this.mpos(e), dx = m.x - p.m.x, dy = m.y - p.m.y; p.m = m;
    if (p.mode === 'drag' && this.drag) { const q = this.drag, rc = this.ray(m), pl = new T.Plane(V(0, 1, 0), -q.home.y), hit = V(); if (rc.ray.intersectPlane(pl, hit) && hit.distanceTo(this.cam.position) < this.sz * 9) q.obj.position.copy(hit); return; }
    if (p.mode === 'orbit') { this.orbT.az -= dx * 0.005; this.orbT.el = Math.min(1.3, Math.max(0.05, this.orbT.el + dy * 0.004)); }
    if (p.mode === 'drot') { this.da -= dx * 0.006; this.de += dy * 0.004; }
  };
  P.up = function () {
    const p = this.ptr; this.ptr = null; if (!p) return;
    if (p.mode === 'drag' && this.drag) {
      const q = this.drag; this.drag = null;
      if (q.obj.position.distanceTo(q.home) < this.tol(q)) { q.placed = true; this.move(q.obj, q.home, q.q, 0, 9); q.gh.visible = false; this.queue.shift(); this.click(1.4); if (!this.queue.length) this.stepDone(); else { this.ghost(); this.emit(); } }
      else { this.stat.err++; this.move(q.obj, q.mat, q.q, 0, 6); this.emit({ msg: '위치가 맞지 않습니다', kind: 'err' }); }
    }
    if (p.mode === 'hold') {
      this.hold = false; const st = this.step; if (!st || !this.cur) return;
      if (this.prog >= 1 && this.tq >= st.nm * 0.9) { const b = this.cur; b.placed = true; this.queue.shift(); this.emit({ msg: `체결 완료 · ${this.tq.toFixed(1)} N·m`, kind: 'ok' }); this.boltNext(); }
      else if (this.prog >= 1) this.emit({ msg: '덜 조였습니다', kind: 'err' });
    }
  };
  P.wheel = function (e) { const m = this.mpos(e), k = e.deltaY > 0 ? 1.1 : 0.9; if (this.mode === 'train' && this.inWin(m)) this.dz = Math.min(2.5, Math.max(0.35, this.dz * k)); else this.orbT.dist = Math.min(this.sz * 8, Math.max(this.sz * 1.2, this.orbT.dist * k)); };
  P.resetCam = function () { if (this.homeCam) this.orbit(this.homeCam); this.dz = 1; this.da = 0; this.de = 0; };
  P.skip = function () {
    const st = this.step; if (!st || this.fin) return;
    if (st.t === 'check') { this.stepDone(); return; }
    (this.queue || []).forEach(pc => { pc.placed = true; this.move(pc.obj, pc.home, pc.q, 0, 7); pc.gh.visible = false; }); this.queue = []; this.cur = null; this.hold = false; this.stepDone();
  };
})();
