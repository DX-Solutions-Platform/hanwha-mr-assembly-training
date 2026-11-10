(function () {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const T = window.THREE, D = Math.PI / 180;
  const V = (x, y, z) => new T.Vector3(x, y, z);
  function geoOf(g, dense) {
    if (g.t === 'mesh') {
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.BufferAttribute(g.positions, 3));
      geometry.setIndex(new T.BufferAttribute(g.indices, 1));
      if (g.normals) geometry.setAttribute('normal', new T.BufferAttribute(g.normals, 3));
      else geometry.computeVertexNormals();
      return geometry;
    }
    if (g.t === 'b') { const s = g.s, sg = dense ? s.map(v => Math.max(1, Math.min(9, Math.round(v / 42)))) : [1, 1, 1]; return new T.BoxGeometry(s[0], s[1], s[2], sg[0], sg[1], sg[2]); }
    const seg = g.seg || (g.s[0] > 40 ? 28 : 12);
    return new T.CylinderGeometry(g.s[0], g.s[0], g.s[1], seg, dense ? Math.max(1, Math.round(g.s[1] / 36)) : 1);
  }
  function setPR(o, p, r) { o.position.set(p[0], p[1], p[2]); o.rotation.set(r[0] * D, r[1] * D, r[2] * D); }

  class FlowEngine {
    constructor(canvas, overlay) {
      this.cv = canvas; this.ov = overlay; this.labs = {}; this.anim = []; this.hooks = []; this.t = 0;
      const R = this.R = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); R.outputEncoding = T.sRGBEncoding; R.localClippingEnabled = true;
      const S = this.S = new T.Scene(); S.fog = new T.Fog(0x07090b, 2600, 7000);
      S.add(new T.HemisphereLight(0xe8eef2, 0x1b1714, 0.85));
      const k = new T.DirectionalLight(0xffffff, 1.5); k.position.set(600, 1200, 900); S.add(k);
      const f = new T.DirectionalLight(0xbcd2e0, 0.55); f.position.set(-900, 500, -400); S.add(f);
      const rim = new T.DirectionalLight(0xf37321, 0.5); rim.position.set(-300, 300, -1200); S.add(rim);
      const grid = this.grid = new T.GridHelper(16000, 320, 0x30363b, 0x1d2226); grid.material.transparent = true; grid.material.opacity = 0.75; S.add(grid);
      this.cam = new T.PerspectiveCamera(36, 1, 10, 20000); this.camD = new T.PerspectiveCamera(30, 1, 2, 8000);
      this.orb = { az: -0.55, el: 0.42, dist: 2200, tgt: V(0, 220, 0) }; this.orbT = Object.assign({}, this.orb, { tgt: this.orb.tgt.clone() });
      this.M = {
        wire: new T.LineBasicMaterial({ color: 0xe4eaee, transparent: true, opacity: 0.42, depthWrite: false }),
        hot: new T.LineBasicMaterial({ color: 0xf37321, transparent: true, opacity: 0.8, depthWrite: false }),
        edge: new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 }),
        ghost: new T.LineBasicMaterial({ color: 0xf37321, transparent: true, opacity: 0.9, depthTest: false }),
        mint: new T.LineBasicMaterial({ color: 0x3fe0c5, transparent: true, opacity: 0.9, depthTest: false })
      };
      this.resize(); this._rs = () => this.resize(); window.addEventListener('resize', this._rs);
      this.last = performance.now(); const loop = (n) => { this.raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (n - this.last) / 1000); this.last = n; if (!this.suspended) this.tick(dt); }; this.raf = requestAnimationFrame(loop);
    }
    destroy() { cancelAnimationFrame(this.raf); window.removeEventListener('resize', this._rs); this.clear(); this.R.dispose(); }
    resize() { const w = this.cv.clientWidth || 1, h = this.cv.clientHeight || 1; this.W = w; this.H = h; this.R.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
    solid(part, opt) {
      const g = new T.Group();
      part.geo.forEach(e => {
        const m = new T.MeshStandardMaterial({ color: e.c || part.col, roughness: part.metal ? 0.38 : 0.7, metalness: e.t === 'mesh' ? 0.14 : part.metal ? 0.6 : 0.04, clippingPlanes: opt && opt.clip ? [opt.clip] : null });
        const o = new T.Mesh(geoOf(e, false), m); setPR(o, e.p, e.r);
        if (!(opt && opt.noEdge)) o.add(new T.LineSegments(new T.EdgesGeometry(o.geometry, 28), this.M.edge));
        g.add(o);
      });
      return g;
    }
    wire(part, mat) { const g = new T.Group(); part.geo.forEach(e => { const o = new T.LineSegments(new T.WireframeGeometry(geoOf(e, true)), mat || this.M.wire); setPR(o, e.p, e.r); g.add(o); }); return g; }
    edges(part, mat) { const g = new T.Group(); part.geo.forEach(e => { const o = new T.LineSegments(new T.EdgesGeometry(geoOf(e, false), 28), mat); o.renderOrder = 5; setPR(o, e.p, e.r); g.add(o); }); return g; }
    clear() { (this.objs || []).forEach(o => { o.parent && o.parent.remove(o); o.traverse(c => { c.geometry && c.geometry.dispose(); if (c.material && !Object.values(this.M).includes(c.material)) c.material.dispose(); }); }); this.objs = []; this.anim = []; this.hooks = []; Object.values(this.labs).forEach(l => l.remove()); this.labs = {}; if (this.ui) { this.ui.remove(); this.ui = null; } if (this.win) this.win.style.transform = ''; this.detail = null; this.onState = null; }
    add(o, parent) { (parent || this.S).add(o); this.objs.push(o); return o; }
    move(o, p, q, delay, rate) { o._tp = p.clone(); if (q) o._tq = q.clone(); o._dl = delay || 0; o._rt = rate || 6; if (!this.anim.includes(o)) this.anim.push(o); }
    snap(o, p, q) { o.position.copy(p); if (q) o.quaternion.copy(q); o._tp = null; o._tq = null; }
    qOf(r) { return new T.Quaternion().setFromEuler(new T.Euler(r[0] * D, r[1] * D, r[2] * D)); }
    lab(key, html, css) {
      let l = this.labs[key];
      if (!l) { l = document.createElement('div'); l.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;white-space:nowrap;will-change:transform;transition:opacity .3s;' + (css || ''); this.ov.appendChild(l); this.labs[key] = l; }
      if (html != null && l._h !== html) { l.innerHTML = html; l._h = html; }
      return l;
    }
    unlab(key) { const l = this.labs[key]; if (l) { l.remove(); delete this.labs[key]; } }
    proj(v, cam, rect) { const p = v.clone().project(cam || this.cam); const r = rect || { x: 0, y: 0, w: this.W, h: this.H }; return { x: r.x + (p.x + 1) / 2 * r.w, y: r.y + (1 - p.y) / 2 * r.h, z: p.z }; }
    pin(l, v, cam, rect, dx, dy) { const s = this.proj(v, cam, rect); l.style.transform = `translate(${s.x + (dx || 0)}px,${s.y + (dy || 0)}px)`; l.style.display = s.z > 1 ? 'none' : ''; return s; }
    down(e) { if (e.button !== 0 && e.button !== 2) return; const t = this.orbT, sx = e.clientX, sy = e.clientY, a0 = t.az, e0 = t.el; this.dragging = true; const mv = ev => { t.az = a0 - (ev.clientX - sx) * 0.006; t.el = Math.max(0.05, Math.min(1.35, e0 + (ev.clientY - sy) * 0.005)); }; const up = () => { this.dragging = false; window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); }; window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); }
    wheel(e) { const t = this.orbT, s = this.sz || 1000; t.dist = Math.max(s * 1.2, Math.min(s * 8, t.dist * (e.deltaY > 0 ? 1.08 : 0.93))); }
    orbit(o) { const t = this.orbT; Object.assign(t, o); if (o && o.tgt) t.tgt = o.tgt.clone(); }
    updCam(dt) {
      const a = this.orb, b = this.orbT, k = 1 - Math.exp(-dt * 4);
      a.az += (b.az - a.az) * k; a.el += (b.el - a.el) * k; a.dist += (b.dist - a.dist) * k; a.tgt.lerp(b.tgt, k);
      const c = this.cam; c.position.set(a.tgt.x + Math.sin(a.az) * Math.cos(a.el) * a.dist, a.tgt.y + Math.sin(a.el) * a.dist, a.tgt.z + Math.cos(a.az) * Math.cos(a.el) * a.dist); c.lookAt(a.tgt);
    }
    tick(dt) {
      this.t += dt; this.updCam(dt);
      this.anim = this.anim.filter(o => {
        if (o._dl > 0) { o._dl -= dt; return true; }
        const k = 1 - Math.exp(-dt * o._rt); let live = false;
        if (o._tp) { o.position.lerp(o._tp, k); if (o.position.distanceToSquared(o._tp) > 0.02) live = true; else o.position.copy(o._tp); }
        if (o._tq) { o.quaternion.slerp(o._tq, k); if (1 - Math.abs(o.quaternion.dot(o._tq)) > 1e-6) live = true; else o.quaternion.copy(o._tq); }
        return live;
      });
      this.M.hot.opacity = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(this.t * 5));
      this.M.ghost.opacity = 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(this.t * 6));
      this.hooks.forEach(h => h(dt));
      const R = this.R; R.setScissorTest(false); R.setViewport(0, 0, this.W, this.H); R.clear(); R.render(this.S, this.cam);
      if (this.detail) this.detail(R);
    }
    viewRender(scene, cam, r) {
      const R = this.R, y = this.H - r.y - r.h; cam.aspect = r.w / r.h; cam.updateProjectionMatrix();
      R.setScissorTest(true); R.setScissor(r.x, y, r.w, r.h); R.setViewport(r.x, y, r.w, r.h); R.clearDepth(); R.render(scene, cam); R.setScissorTest(false);
    }
    // ── 교육 만들기 (1~4단계)
    makeBuild(pr, makeWire) {
      this.clear(); this.pr = pr; this.mode = 'make'; this.detail = null;
      const S = Math.max(...pr.size); this.sz = S;
      this.orbit({ az: -0.6, el: 0.36, dist: S * 3.6, tgt: V(0, pr.size[1] * 0.45, 0) });
      pr.pieces.forEach(pc => {
        const part = pr.parts[pc.part]; const g = this.add(this.solid(part)); g.visible = false; pc.obj = g;
        pc.home = V(pc.p[0], pc.p[1], pc.p[2]); pc.q = this.qOf(pc.r); this.snap(g, pc.home, pc.q);
        const w = this.add(makeWire ? makeWire(g) : this.wire(part)); setPR(w, pc.p, pc.r); w.visible = false; pc.wireM = w;
      });
      const keys = Object.keys(pr.parts), gap = S * 0.16; let x = 0; this.show = {};
      const lay = {}; const dims = keys.map(k => { const o = this.solid(pr.parts[k]); let b = new T.Box3().setFromObject(o); const s0 = b.getSize(V()); lay[k] = s0.y > Math.max(s0.x, s0.z) * 1.4 ? (s0.x >= s0.z ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]) : s0.z > s0.x * 1.4 ? [0, Math.PI / 2, 0] : [0, 0, 0]; o.rotation.set(lay[k][0], lay[k][1], lay[k][2]); o.updateMatrixWorld(true); b = new T.Box3().setFromObject(o); o.traverse(c => c.geometry && c.geometry.dispose()); return [Math.max(40, b.max.x - b.min.x), Math.max(30, b.max.z - b.min.z)]; }), widths = dims.map(d => d[0]);
      const maxW = S * 1.5, rowsA = [[]]; let rw = 0; keys.forEach((k, i) => { if (rw > 0 && rw + widths[i] > maxW) { rowsA.push([]); rw = 0; } rowsA[rowsA.length - 1].push(i); rw += widths[i] + gap; });
      const pos = {}; let zz = 0; rowsA.forEach((row, ri) => { const tw = row.reduce((a, i) => a + widths[i], 0) + gap * (row.length - 1), rd = Math.max(...row.map(i => dims[i][1])); let xx = -tw / 2; zz -= ri ? rd / 2 + gap * 1.4 : 0; row.forEach(i => { pos[i] = [xx + widths[i] / 2, zz]; xx += widths[i] + gap; }); zz -= rd / 2; });
      this.showZ = zz;
      this.showRows = rowsA.length;
      keys.forEach((k, i) => {
        const clip = new T.Plane(V(0, -1, 0), -1e5); const g = this.add(this.solid(pr.parts[k], { clip })); g.rotation.set(lay[k][0], lay[k][1], lay[k][2]); g.updateMatrixWorld(true); const b = new T.Box3().setFromObject(g);
        g.position.set(pos[i][0], -b.min.y + 10, pos[i][1]); g.visible = false;
        this.show[k] = { g, clip, h: b.max.y - b.min.y, x0: g.position.x };
      });
      this.makeStep = -1; this.makeGo(0);
    }
    makeGo(n) {
      const pr = this.pr, S = this.sz; this.makeStep = n; this.hooks = []; ['dimW', 'dimH', 'dimD'].forEach(k => this.unlab(k)); Object.keys(this.labs).filter(k => /^sec|^sz/.test(k)).forEach(k => this.unlab(k));
      const shows = Object.values(this.show);
      if (n === 0) {
        pr.pieces.forEach(pc => { pc.obj.visible = false; pc.wireM.visible = true; });
        this.M.wire.opacity = 0.12; shows.forEach(s => s.g.visible = false);
        this.orbit({ az: this.frontAz ?? -0.6, el: 0.36, dist: S * 3.6 }); this.hooks.push(dt => { this.orbT.az += dt * 0.12; });
      }
      if (n === 1) {
        pr.pieces.forEach(pc => { pc.obj.visible = false; pc.wireM.visible = false; });
        this.orbit({ az: 0, el: 0.72, dist: S * 4.3, tgt: V(0, 0, this.showZ * 0.42) });
        let t0 = this.t; const stg = this.showSpan ? Math.min(0.32, this.showSpan / Math.max(1, shows.length)) : 0.32, rv = this.showSpan ? 0.45 : 0.7; shows.forEach((s, i) => { s.g.visible = true; s.clip.constant = -1e5; s.st = 0.25 + i * stg; });
        const keys = Object.keys(this.show);
        this.hooks.push(() => { keys.forEach(k => { const s = this.show[k], e = Math.max(0, Math.min(1, (this.t - t0 - s.st) / rv)); s.clip.set(V(0, -1, 0), 10 + e * (s.h + 2)); const l = this.lab('sz' + k, `<div style="font:500 12px NexonLv2Gothic,sans-serif;color:${e >= 1 ? '#e8ecef' : '#7c868d'};text-align:center;transform:translateX(-50%)">${escape(pr.parts[k].ko)}</div>`); this.pin(l, V(s.g.position.x, -6, s.g.position.z), null, null, 0, 6); if (this.showSpan) { const tt = this.t - t0 - s.st; l.style.opacity = tt > 0 && (tt < stg || s === shows[shows.length - 1]) ? 1 : 0; } }); });
      }
      if (n === 2) {
        shows.forEach(s => s.g.visible = false); this.M.wire.opacity = 0.42; if (this.autoRotFin) this.hooks.push(dt => { if (!this.dragging) this.orbT.az += dt * 0.12; });
        this.orbit({ az: this.frontAz ?? -0.62, el: 0.34, dist: S * 3.3, tgt: V(0, pr.size[1] * 0.45, 0) });
        pr.pieces.forEach((pc, i) => { const s = this.show[pc.part]; pc.obj.visible = true; pc.wireM.visible = false; this.snap(pc.obj, s.g.position.clone(), pc.q); this.move(pc.obj, pc.home, pc.q, 0.05 + i * (this.placeSpan ? Math.min(0.035, this.placeSpan / pr.pieces.length) : 0.035), this.placeSpan ? 3.2 : 4.5); });
        const b = new T.Box3(); pr.pieces.forEach(pc => b.expandByObject(pc.obj)); const bb = new T.Box3(V(-pr.size[0] / 2, 0, -pr.size[2] / 2), V(pr.size[0] / 2, pr.size[1], pr.size[2] / 2));
        const tag = (t) => `<div style="font:500 13px JetBrains Mono,monospace;color:#f4f6f7;transform:translate(-50%,-50%);display:flex;gap:6px;align-items:center;background:rgba(7,9,11,.72);padding:3px 7px;border:1px solid rgba(243,115,33,.55)">${t}<span style="font:500 11px NexonLv2Gothic,sans-serif;color:#f37321">${pr.sizeSrc}</span></div>`;
        const mn = bb.min, mx = bb.max, o = 40;
        const segs = { dimW: [V(mn.x, 0, mx.z + o), V(mx.x, 0, mx.z + o), pr.size[0]], dimH: [V(mx.x + o, 0, mx.z), V(mx.x + o, mx.y, mx.z), pr.size[1]], dimD: [V(mx.x + o, 0, mn.z), V(mx.x + o, 0, mx.z), pr.size[2]] };
        const svg = this.lab('dimL', '<svg width="100%" height="100%" style="position:absolute;inset:0;overflow:visible"></svg>', 'width:100%;height:100%;'); const sv = svg.firstChild;
        Object.keys(segs).forEach(k => this.lab(k, tag(segs[k][2] + ' mm')));
        const t0 = this.t;
        this.hooks.push(() => { if (this.t - t0 < 1.2) { sv.innerHTML = ''; Object.keys(segs).forEach(k => this.labs[k].style.opacity = 0); return; } let h = ''; Object.keys(segs).forEach(k => { const [a, c] = segs[k], A = this.proj(a), C = this.proj(c); h += `<line x1="${A.x}" y1="${A.y}" x2="${C.x}" y2="${C.y}" stroke="#f37321" stroke-width="1.2"/><circle cx="${A.x}" cy="${A.y}" r="2.5" fill="#f37321"/><circle cx="${C.x}" cy="${C.y}" r="2.5" fill="#f37321"/>`; const l = this.labs[k]; l.style.opacity = 1; this.pin(l, a.clone().lerp(c, 0.5)); }); sv.innerHTML = h; });
      } else this.unlab('dimL');
      if (n === 3) {
        shows.forEach(s => s.g.visible = false);
        const N = pr.sections.length, sp = S * 0.5;
        this.orbit({ az: -0.35, el: 0.4, dist: S * (3.7 + N * 0.55), tgt: V(S * 0.08, pr.size[1] * 0.45, 0) });
        pr.sections.forEach((s, si) => {
          const off = V((si - (N - 1) / 2) * sp, si % 2 ? S * 0.12 : 0, (si % 2 ? -1 : 1) * S * 0.14);
          s.idx.forEach((i, j) => { const pc = pr.pieces[i]; pc.obj.visible = true; this.move(pc.obj, pc.home.clone().add(off), pc.q, si * 0.12 + j * 0.01, 3.6); });
          const c = V(0, 0, 0); s.idx.forEach(i => c.add(pr.pieces[i].home)); c.multiplyScalar(1 / s.idx.length).add(off); s._c = c;
          s._l = this.lab('sec' + si, `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:30px;height:30px;display:grid;place-items:center;background:${s.final ? '#3fe0c5' : '#f37321'};color:#0a0c0e;font:700 15px JetBrains Mono,monospace">${escape(s.no)}</div><div style="font:500 13px NexonLv2Gothic,sans-serif;color:#f4f6f7;text-shadow:0 1px 4px #000">${escape(s.ko)}</div><div style="width:1px;height:26px;background:rgba(243,115,33,.7)"></div></div>`);
        });
        const top = pr.size[1] + 60;
        this.hooks.push(() => pr.sections.forEach(s => this.pin(s._l, V(s._c.x, top + (s._c.y - pr.size[1] * 0.4) * 0.3, s._c.z))));
      }
    }
  }
  window.FlowEngine = FlowEngine;
})();
