// 성형기 재질 (Shaper Texture Draft v3 기준: 스테인리스 강 · 연삭면 · 선반 가공면)
(function () {
  class ShaperTexC {
    constructor() { this.TURN = ['gear', 'pinion', 'handle', 'vscrew']; }
  rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  noise(N, cells, seed) {
    const rnd = this.rng(seed), g = new Float32Array(cells * cells); for (let i = 0; i < g.length; i++) g[i] = rnd();
    const out = new Float32Array(N * N), f = cells / N;
    for (let y = 0; y < N; y++) { const gy = y * f, y0 = Math.floor(gy), ty = gy - y0, sy = ty * ty * (3 - 2 * ty), y1 = (y0 + 1) % cells;
      for (let x = 0; x < N; x++) { const gx = x * f, x0 = Math.floor(gx), tx = gx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % cells, a = g[y0 * cells + x0], b = g[y0 * cells + x1], c = g[y1 * cells + x0], d = g[y1 * cells + x1], top = a + (b - a) * sx; out[y * N + x] = top + (c + (d - c) * sx - top) * sy; } }
    return out;
  }
  fbm(N, list, seed) { const out = new Float32Array(N * N); let tw = 0; list.forEach(([c, w], k) => { const n = this.noise(N, c, seed + k * 977); for (let i = 0; i < out.length; i++) out[i] += n[i] * w; tw += w; }); for (let i = 0; i < out.length; i++) out[i] /= tw; return out; }
  line1(n, seed, smooth) { const r = this.rng(seed), a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = r(); if (smooth) for (let i = 0; i < n; i++) a[i] = (a[i] * 2 + a[(i + 1) % n] + a[(i + n - 1) % n]) / 4; return a; }
  noise2(N, cx, cy, seed) { const rnd = this.rng(seed), g = new Float32Array(cx * cy); for (let i = 0; i < g.length; i++) g[i] = rnd(); const out = new Float32Array(N * N);
    for (let y = 0; y < N; y++) { const gy = y * cy / N, y0 = Math.floor(gy), ty = gy - y0, sy = ty * ty * (3 - 2 * ty), y1 = (y0 + 1) % cy;
      for (let x = 0; x < N; x++) { const gx = x * cx / N, x0 = Math.floor(gx), tx = gx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % cx, a = g[y0 * cx + x0], b = g[y0 * cx + x1], c = g[y1 * cx + x0], e = g[y1 * cx + x1], top = a + (b - a) * sx; out[y * N + x] = top + (c + (e - c) * sx - top) * sy; } }
    return out; }
  wear(cx, N, seed, mode, nS, nM) {
    const r = this.rng(seed), at = f => { for (const ox of [0, -N]) for (const oy of [0, -N]) f(ox, oy); };
    for (let i = 0; i < nM; i++) { const x = r() * N, y = r() * N, rr = (40 + r() * 110) * N / 1024, a = 0;
      if (mode === 'bmp') continue; at((ox, oy) => { const g = cx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rr); g.addColorStop(0, mode === 'col' ? `rgba(38,34,30,${a})` : `rgba(0,0,0,${a * 1.2})`); g.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = g; cx.fillRect(x + ox - rr, y + oy - rr, rr * 2, rr * 2); }); }
    for (let i = 0; i < nS; i++) { const x = r() * N, y = r() * N, L = (8 + r() * 70) * N / 1024, an = r() < 0.7 ? -0.35 + r() * 0.3 : r() * Math.PI, w = 0.5 + r() * 1.1, a = 0.08 + r() * 0.22, lt = r() < 0.6;
      const c = mode === 'col' ? (lt ? `rgba(235,238,240,${a})` : `rgba(25,25,25,${a})`) : mode === 'rgh' ? `rgba(0,0,0,${a * 1.5})` : `rgba(0,0,0,${Math.min(1, a * 2)})`;
      at((ox, oy) => { cx.strokeStyle = c; cx.lineWidth = w; cx.beginPath(); cx.moveTo(x + ox, y + oy); cx.lineTo(x + ox + Math.cos(an) * L, y + oy + Math.sin(an) * L); cx.stroke(); }); }
  }
  tex(N, fn, srgb, clamp, post) {
    const T = window.THREE, cv = document.createElement('canvas'); cv.width = cv.height = N; const cx = cv.getContext('2d'), im = cx.createImageData(N, N), cl = v => Math.max(0, Math.min(255, Math.round(v * 255)));
    for (let i = 0; i < N * N; i++) { const c = fn(i); const r = Array.isArray(c) ? c : [c, c, c]; im.data[i * 4] = cl(r[0]); im.data[i * 4 + 1] = cl(r[1]); im.data[i * 4 + 2] = cl(r[2]); im.data[i * 4 + 3] = 255; }
    cx.putImageData(im, 0, 0); if (post) post(cx, N); const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = clamp ? T.ClampToEdgeWrapping : T.RepeatWrapping; t.anisotropy = 8; if (srgb) t.encoding = T.sRGBEncoding; return t;
  }
  mats() {
    const T = window.THREE, N = 1024, M2 = 512, mk = (c, mt, rg) => new T.MeshStandardMaterial({ color: c, metalness: mt, roughness: rg }), ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const W = (mode, seed, s) => (cx, n) => this.wear(cx, n, seed, mode, Math.round(260 * (s || 1)), Math.round(0 * (s || 1)));
    const lo = this.fbm(N, [[3, 0.5], [6, 0.35], [12, 0.15]], 11), grain = this.fbm(N, [[192, 0.5], [384, 0.5]], 29), stk = this.noise2(N, 40, 3, 37), gm = i => 0.1 * ss(0.85, 0.98, stk[i]);
    const paint = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.62, roughness: 0.64, bumpScale: 0.16, envMapIntensity: 0.5,
      map: this.tex(N, i => { const v = 0.46 + 0.04 * (grain[i] - 0.5) + 0.03 * (lo[i] - 0.5) - 0.03 * gm(i); return [v * 0.95, v * 0.99, v * 1.04]; }, true, false, W('col', 101)),
      roughnessMap: this.tex(N, i => 0.44 + 0.12 * grain[i], false, false, W('rgh', 101)),
      bumpMap: this.tex(N, i => 0.5 + 0.5 * (grain[i] - 0.5), false, false, W('bmp', 101)) });
    const ln = this.line1(M2, 71, false), lnS = this.line1(M2, 83, true), gr = this.fbm(M2, [[8, 0.6], [16, 0.4]], 91);
    const ground = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 1, roughness: 1, bumpScale: 0.25,
      map: this.tex(M2, i => { const v = 0.6 + 0.12 * (lnS[(i / M2) | 0] - 0.5) - 0.02 * ss(0.6, 0.9, gr[i]); return [v, v * 1.005, v * 1.01]; }, true, false, W('col', 202, 0.5)),
      roughnessMap: this.tex(M2, i => 0.34 + 0.16 * ln[(i / M2) | 0] + 0.12 * gr[i], false, false, W('rgh', 202, 0.5)),
      bumpMap: this.tex(M2, i => ln[(i / M2) | 0], false, false, W('bmp', 202, 0.5)) });
    const rad = this.line1(M2, 53, true), oil = this.fbm(M2, [[6, 1]], 61), ringF = i => { const x = i % M2 - M2 / 2, y = ((i / M2) | 0) - M2 / 2; return rad[Math.min(M2 - 1, Math.floor(Math.hypot(x, y) * 2))]; };
    const turned = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 1, roughness: 1, bumpScale: 0.2,
      map: this.tex(M2, i => { const v = 0.68 + 0.08 * (ringF(i) - 0.5) - 0.16 * ss(0.5, 0.8, oil[i]); return [v, v * 0.99, v * 0.97]; }, true, true, W('col', 303, 0.4)),
      roughnessMap: this.tex(M2, i => 0.26 + 0.22 * ringF(i) - 0.1 * oil[i], false, true, W('rgh', 303, 0.4)),
      bumpMap: this.tex(M2, i => ringF(i), false, true) });
    return { paint, ground, turned, oxide: mk(0x34373a, 0.75, 0.48), resin: mk(0x18191a, 0, 0.55), brass: mk(0x8f7444, 1, 0.48), dk: mk(0x0e1012, 0.3, 0.6) };
  }
  boxUV(g, k) {
    const T = window.THREE; if (!g.attributes.normal) g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); let u, v; if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i); } else if (ay >= az) { u = p.getX(i); v = p.getZ(i); } else { u = p.getX(i); v = p.getY(i); } uv[i * 2] = u * k; uv[i * 2 + 1] = v * k; }
    g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  }
  turnUV(g, r) {
    const T = window.THREE, p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2), k = 0.5 / Math.max(1, r);
    for (let i = 0; i < p.count; i++) { if (Math.abs(n.getY(i)) > 0.9) { uv[i * 2] = 0.5 + p.getX(i) * k; uv[i * 2 + 1] = 0.5 + p.getZ(i) * k; } else { uv[i * 2] = 0.5 + 0.48 * ((Math.abs(p.getY(i)) * 0.02) % 1); uv[i * 2 + 1] = 0.5; } }
    g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  }
  pick(key, e, M) {
    const m = e.m || 'al', r = e.s[0];
    if (m === 'dk') return M.dk; if (m === 'brass') return M.brass;
    if (key === 'bolt') return M.oxide;
    if (key === 'handle' && e.p[0] === 56) return M.resin;
    if (key === 'gib' || key === 'jaw' || key === 'bit') return M.ground;
    if (this.TURN.includes(key)) return e.t === 'c' || e.t === 'kn' || e.t === 'cn' ? M.turned : M.ground;
    if (m === 'cr') return e.t === 'c' && r <= 5 ? M.oxide : e.t === 'c' && r >= 8 ? M.turned : M.ground;
    return M.paint;
  }

  }
  const X = new ShaperTexC();
  window.ShaperTex = {
    patch(E, pr) {
      const T = window.THREE, H = window.ShaperHQ, D = Math.PI / 180; let M = null;
      const keyOf = part => Object.keys(pr.parts).find(k => pr.parts[k] === part);
      E.solid = function (part, opt) {
        if (!M) M = X.mats();
        const g = new T.Group(), key = keyOf(part);
        part.geo.forEach(e => {
          const geo = H.geo(e, false); let mt = X.pick(key, Object.assign({ m: part.m }, e), M);
          if (mt === M.turned && e.t !== 'to') X.turnUV(geo, e.s[0]); else if (mt.map) X.boxUV(geo, mt === M.ground ? 1 / 25 : 1 / 150);
          if (opt && opt.clip) { mt = mt.clone(); mt.clippingPlanes = [opt.clip]; }
          if (mt.vertexColors && !geo.attributes.color) geo.setAttribute('color', new T.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
          const o = new T.Mesh(geo, mt); o.position.set(e.p[0], e.p[1], e.p[2]); o.rotation.set(e.r[0] * D, e.r[1] * D, e.r[2] * D);
          if (!(opt && opt.noEdge) && e.m !== 'dk' && !H.tiny(e)) o.add(new T.LineSegments(new T.EdgesGeometry(o.geometry, 35), this.M.edge));
          g.add(o);
        });
        return g;
      };
    }
  };
})();
