// (Demo 6용 · 부품 GLB 교체 지원) 도면 분석 결과(부품 형상·치수·배치)로 3D 부품과 완성품을 만듭니다. Drawing Analysis와 교육 선택에서 함께 씁니다.
export function makeBuilder() {
  const B = {
    noEdge: false,
    AF: { 3: 5.5, 4: 7, 5: 8, 6: 10, 8: 13, 10: 16, 12: 18, 14: 21, 16: 24 },
    WOD: { 3: 7, 4: 9, 5: 10, 6: 12, 8: 16, 10: 20, 12: 24, 14: 28, 16: 30 },
    norm(s) { return String(s || '').toUpperCase().replace(/[\s×]/g, ''); },
    mats() {
      if (this._M) return this._M; const T = window.THREE;
      const m = (c, me, ro) => new T.MeshStandardMaterial({ color: c, metalness: me, roughness: ro, side: T.DoubleSide });
      this._M = { MS: m(0x8c939a, 0.75, 0.38), CI: m(0x5f6469, 0.5, 0.66), BRS: m(0xcfa650, 0.85, 0.3), BRZ: m(0xb27c45, 0.8, 0.36), ALU: m(0xc8cdd3, 0.75, 0.3), 'S/S': m(0xb8bfc6, 0.85, 0.25), SPS: m(0x6d737a, 0.75, 0.4), CU: m(0xc47c48, 0.85, 0.32), SYN: m(0x2b2e31, 0.05, 0.6), blk: m(0x45484c, 0.7, 0.4), sock: m(0x0c0e10, 0.3, 0.8), edge: new T.LineBasicMaterial({ color: 0xffe4cc, transparent: true, opacity: 0.3 }), edgeOn: new T.LineBasicMaterial({ color: 0xf37321 }) };
      return this._M;
    },
    matKey(s) { const u = String(s || 'MS').toUpperCase(); const k = ['S/S', 'BRS', 'BRZ', 'ALU', 'CI', 'SPS', 'SYN', 'PEEK', 'CU', 'MS'].find(x => u.includes(x)); return k === 'PEEK' ? 'SYN' : (k || 'MS'); },
    pitch(d) { return ({ 3: 0.5, 4: 0.7, 5: 0.8, 6: 1, 8: 1.25, 10: 1.5, 12: 1.75, 14: 2, 16: 2 })[Math.round(d)] || Math.max(0.5, d * 0.14); },
    thread(pts, r, y0, y1, p) { const T = window.THREE; if ((y1 - y0) / p > 140) p = (y1 - y0) / 140; const dep = 0.55 * p; let y = y0; pts.push(new T.Vector2(r - dep, y)); while (y + p <= y1 + 1e-6) { pts.push(new T.Vector2(r, y + p * 0.5)); pts.push(new T.Vector2(r - dep, y + p)); y += p; } if (y < y1) pts.push(new T.Vector2(r - dep * 0.5, y1)); },
    buildPart(p) { const g = this._bp0(p); return window.__glbFit ? window.__glbFit(p, g) : g; },
    _bp0(p) {
      const T = window.THREE, M = this.mats(), g = new T.Group(); g.userData.pid = p.id;
      const mat = p.std ? M.blk : (M[this.matKey(p.mat)] || M.MS);
      const add = (geo, mm, edge) => { const o = new T.Mesh(geo, mm || mat); g.add(o); if (edge !== false && !this.noEdge) { const e = new T.LineSegments(new T.EdgesGeometry(geo, 30), M.edge); e.userData.edge = 1; g.add(e); } return o; };
      const V = (x, y) => new T.Vector2(x, y);
      if (p.std) { this.buildStd(p, add, M, V); return g; }
      const d = p.d || {}, n = (k, v) => { const x = +d[k]; return isFinite(x) && x > 0 ? x : v; };
      const ex = (shape, depth) => { const b = Math.min(0.8, depth * 0.06), dd = Math.max(0.2, depth - 2 * b); const geo = new T.ExtrudeGeometry(shape, { depth: dd, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 28 }); geo.translate(0, 0, -dd / 2); return geo; };
      const rr = (L, W, r) => { const s = new T.Shape(), x = L / 2, y = W / 2; r = Math.max(0, Math.min(r || 0, x - 0.05, y - 0.05)); s.moveTo(-x + r, -y); s.lineTo(x - r, -y); if (r) s.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false); s.lineTo(x, y - r); if (r) s.absarc(x - r, y - r, r, 0, Math.PI / 2, false); s.lineTo(-x + r, y); if (r) s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false); s.lineTo(-x, -y + r); if (r) s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false); return s; };
      const hole = (s, x, y, r) => { const h = new T.Path(); h.absarc(x, y, r, 0, Math.PI * 2, true); s.holes.push(h); };
      const holes = (s, L, W, list) => { const done = []; (list || []).forEach(([hx, hy, hd]) => { const r = hd / 2; if (Math.abs(hx) + r > L / 2 - 1 || Math.abs(hy) + r > W / 2 - 1) return; if (done.some(q => Math.hypot(q[0] - hx, q[1] - hy) < q[2] + r + 0.8)) return; done.push([hx, hy, r]); hole(s, hx, hy, r); }); };
      const lathe = (pts, edge) => add(new T.LatheGeometry(pts, 40), null, edge);
      switch (p.kind) {
        case 'plate': case 'block': { const L = n('L', 120), W = n('W', 80), H = p.kind === 'plate' ? n('T', 10) : n('H', 40); const s = rr(L, W, n('r', 0)); holes(s, L, W, p.holes); const geo = ex(s, H); geo.rotateX(-Math.PI / 2); add(geo); break; }
        case 'rhs': { const L = n('L', 300), W = n('W', 200), H = n('H', 200), t = Math.min(n('t', 10), Math.min(W, H) / 3); const s = rr(W, H, t * 1.2); s.holes.push(rr(W - 2 * t, H - 2 * t, t * 0.3)); const geo = ex(s, L); geo.rotateX(-Math.PI / 2); add(geo); break; }
        case 'dovetail': { const L = n('L', 150), W = n('W', 80), H = n('H', 20), a = n('a', 60) * Math.PI / 180; const top = Math.max(W * 0.25, W - 2 * H / Math.tan(a)); const s = new T.Shape(); s.moveTo(-W / 2, -H / 2); s.lineTo(W / 2, -H / 2); s.lineTo(top / 2, H / 2); s.lineTo(-top / 2, H / 2); s.closePath(); add(ex(s, L)); break; }
        case 'tnut': { const L = n('L', 30), W = n('W', 20), H = n('H', 14); const s = new T.Shape(); s.moveTo(-W / 2, -H / 2); s.lineTo(W / 2, -H / 2); s.lineTo(W / 2, 0); s.lineTo(W * 0.27, 0); s.lineTo(W * 0.27, H / 2); s.lineTo(-W * 0.27, H / 2); s.lineTo(-W * 0.27, 0); s.lineTo(-W / 2, 0); s.closePath(); add(ex(s, L)); break; }
        case 'shaft': { const segs = (d.segs && d.segs.length ? d.segs : [[20, 120, 0]]); const c0 = Math.min(1, segs[0][0] * 0.05); const pts = [V(0, 0), V(Math.max(0.1, segs[0][0] / 2 - c0), 0)]; let y = 0, thr = false; segs.forEach(([dd, ll, th], i) => { const r = dd / 2; if (th) { thr = true; this.thread(pts, r, y, y + ll, this.pitch(dd)); } else { pts.push(V(r, y + (i === 0 ? c0 : 0))); pts.push(V(r, y + ll)); } y += ll; }); const lr = segs[segs.length - 1][0] / 2; pts.push(V(Math.max(0.1, lr - c0), y)); pts.push(V(0, y)); const geo = new T.LatheGeometry(pts, 40); geo.translate(0, -y / 2, 0); add(geo, null, !thr); break; }
        case 'bush': { const od = n('od', 32), id = Math.min(+d.id || 0, od * 0.94), l = n('l', 30), fod = +d.fod > od ? +d.fod : 0, ft = fod ? Math.min(n('ft', 4), l * 0.8) : 0; const pts = [V(Math.max(0.1, id / 2), 0), V(od / 2, 0)]; if (fod) { pts.push(V(od / 2, l - ft), V(fod / 2, l - ft), V(fod / 2, l)); } else pts.push(V(od / 2, l)); pts.push(V(Math.max(0.1, id / 2), l), V(Math.max(0.1, id / 2), 0)); const geo = new T.LatheGeometry(pts, 48); geo.translate(0, -l / 2, 0); add(geo); break; }
        case 'disc': { const od = n('od', 80), t = n('t', 8), id = Math.min(+d.id || 0, od * 0.9); const s = new T.Shape(); s.absarc(0, 0, od / 2, 0, Math.PI * 2, false); if (id > 0.5) hole(s, 0, 0, id / 2); const cnt = Math.min(24, Math.round(+d.n || 0)), pcd = +d.pcd || 0, hd = +d.hd || 0; if (cnt && pcd && hd && pcd / 2 + hd / 2 < od / 2 - 1 && pcd / 2 - hd / 2 > id / 2 + 1) for (let i = 0; i < cnt; i++) { const a = i / cnt * Math.PI * 2; hole(s, Math.cos(a) * pcd / 2, Math.sin(a) * pcd / 2, hd / 2); } const geo = ex(s, t); geo.rotateX(-Math.PI / 2); add(geo); break; }
        case 'gear': { const od = n('od', 64), w = n('w', 12), z = Math.max(8, Math.min(160, Math.round(n('z', 30)))), m = od / (z + 2), rt = od / 2, rr0 = Math.max(rt - 2.25 * m, rt * 0.5), id = Math.min(+d.id || 0, rr0 * 1.6); const s = new T.Shape(), pa = Math.PI * 2 / z; for (let i = 0; i < z; i++) { const a = i * pa; const P = [[rr0, a], [rt, a + 0.2 * pa], [rt, a + 0.45 * pa], [rr0, a + 0.65 * pa]]; P.forEach(([r, aa], k) => { const x = Math.cos(aa) * r, y = Math.sin(aa) * r; if (i === 0 && k === 0) s.moveTo(x, y); else s.lineTo(x, y); }); } s.closePath(); if (id > 0.5) hole(s, 0, 0, id / 2); const geo = ex(s, w); geo.rotateX(-Math.PI / 2); add(geo, null, z <= 60); break; }
        case 'lever': { const L = n('L', 150), W = n('W', 30), T2 = n('T', 10), r = W / 2; const s = new T.Shape(); s.moveTo(-L / 2, -r); s.lineTo(L / 2, -r); s.absarc(L / 2, 0, r, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-L / 2, r); s.absarc(-L / 2, 0, r, Math.PI / 2, Math.PI * 1.5, false); const d1 = Math.min(+d.d1 || 0, W * 0.8), d2 = Math.min(+d.d2 || 0, W * 0.8); if (d1 > 0.5) hole(s, -L / 2, 0, d1 / 2); if (d2 > 0.5) hole(s, L / 2, 0, d2 / 2); const sl = Math.min(+d.slot || 0, L - Math.max(d1, d2) - W * 0.4); if (sl > 2) { const hw = W * 0.18, h = new T.Path(); h.moveTo(-sl / 2, -hw); h.absarc(-sl / 2, 0, hw, -Math.PI / 2, -Math.PI * 1.5, true); h.lineTo(sl / 2, hw); h.absarc(sl / 2, 0, hw, Math.PI / 2, -Math.PI / 2, true); h.lineTo(-sl / 2, -hw); s.holes.push(h); } const geo = ex(s, T2); geo.rotateX(-Math.PI / 2); add(geo); break; }
        default: { const s = rr(n('L', 60), n('W', 40), 1); const geo = ex(s, n('H', 30)); geo.rotateX(-Math.PI / 2); add(geo); }
      }
      return g;
    },
    buildStd(p, add, M, V) {
      const T = window.THREE, d = p.dm || 6, P = this.pitch(d), af = this.AF[d] || d * 1.6;
      if (p.type === 'nut' || p.type === 'dome') { const m = p.type === 'nut' ? 0.8 * d : 0.55 * d, R = af / Math.sqrt(3), s = new T.Shape(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; if (i) s.lineTo(R * Math.cos(a), R * Math.sin(a)); else s.moveTo(R * Math.cos(a), R * Math.sin(a)); } s.closePath(); const h = new T.Path(); h.absarc(0, 0, d * 0.42, 0, Math.PI * 2, true); s.holes.push(h); const geo = new T.ExtrudeGeometry(s, { depth: m, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 1, curveSegments: 20 }); geo.rotateX(-Math.PI / 2); add(geo); if (p.type === 'dome') { const sp = new T.SphereGeometry(af * 0.46, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2); sp.translate(0, m + 0.25, 0); add(sp, null, false); } return; }
      if (p.type === 'washer') { const od = this.WOD[d] || d * 2.1, t = Math.max(0.8, d * 0.16); const s = new T.Shape(); s.absarc(0, 0, od / 2, 0, Math.PI * 2, false); const h = new T.Path(); h.absarc(0, 0, d * 0.54, 0, Math.PI * 2, true); s.holes.push(h); const geo = new T.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 32 }); geo.rotateX(-Math.PI / 2); add(geo); return; }
      const L = p.L || d * 3, pts = [V(0, 0), V(d / 2 - P * 0.6, 0)]; let top = L, sr = d * 0.3;
      if (p.type === 'grub') { this.thread(pts, d / 2, 0.3, L, P); pts.push(V(d / 2 - P * 0.6, L), V(0, L)); sr = d * 0.28; }
      else if (p.type === 'csk') { const k = d * 0.55; this.thread(pts, d / 2, 0.3, L - k, P); pts.push(V(d / 2, L - k), V(d, L - 0.3), V(d - 0.3, L), V(0, L)); sr = d * 0.36; }
      else { const dk = d * 1.5, k = d; this.thread(pts, d / 2, 0.3, L, P); pts.push(V(d / 2, L), V(dk / 2 - 0.4, L), V(dk / 2, L + 0.4), V(dk / 2, L + k - 0.5), V(dk / 2 - 0.5, L + k), V(0, L + k)); top = L + k; sr = d * 0.36; }
      add(new T.LatheGeometry(pts, 32), null, false);
      const sk = new T.CylinderGeometry(sr, sr, 0.3, 6); sk.translate(0, top + 0.02, 0); add(sk, M.sock, false);
    },
    partSize(p) { const T = window.THREE, o = this.buildPart(p); o.updateMatrixWorld(true); const s = new T.Box3().setFromObject(o).getSize(new T.Vector3()); o.traverse(x => { if (x.geometry) x.geometry.dispose(); }); return [s.x, s.y, s.z].map(v => Math.round(v * 10) / 10); },
    place(p, pos, rot) { const T = window.THREE, obj = this.buildPart(p); obj.updateMatrixWorld(true); const c = new T.Box3().setFromObject(obj).getCenter(new T.Vector3()); obj.position.sub(c); const w = new T.Group(); w.add(obj); const r = (rot || [0, 0, 0]).map(v => (+v || 0) * Math.PI / 180); w.rotation.set(r[0], r[1], r[2]); w.position.set(+pos[0] || 0, +pos[1] || 0, +pos[2] || 0); w.userData.pid = p.id; return w; },
    buildAssembly(e) {
      const T = window.THREE, root = new T.Group(), pm = {}, si = {}; (e.parts || []).forEach(p => { pm[this.norm(p.id)] = p; }); (e.sections || []).forEach((s, i) => { si[s.id] = i; });
      let n = 0; ((e.layout && e.layout.items) || []).forEach(it => { const p = pm[this.norm(it.id)]; if (!p || p.std) return; (it.inst || []).slice(0, 12).forEach(ins => { const w = this.place(p, ins.p, ins.r); w.userData.gi = si[p.sec] || 0; root.add(w); n++; }); });
      if (!n) this.stackLayout(e, root, si);
      root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      return root;
    },
    stackLayout(e, root, si) {
      const T = window.THREE; let y = 0;
      (e.sections || []).forEach((s, k) => { const objs = []; (e.parts || []).filter(p => !p.std && p.sec === s.id).forEach(p => { for (let q = 0; q < Math.min(p.qty || 1, 4); q++) { const w = this.place(p, [0, 0, 0], [0, 0, 0]); w.updateMatrixWorld(true); objs.push({ w, sz: new T.Box3().setFromObject(w).getSize(new T.Vector3()) }); } });
        const W = Math.max(100, Math.sqrt(objs.reduce((a, o) => a + (o.sz.x + 10) * (o.sz.z + 10), 0)) * 1.25); let cx = 0, cz = 0, rowD = 0, layH = 0;
        objs.forEach(o => { if (cx > 0 && cx + o.sz.x > W) { cz += rowD + 10; cx = 0; rowD = 0; } o.w.position.set(cx + o.sz.x / 2, y + o.sz.y / 2, cz + o.sz.z / 2); o.w.userData.gi = si[s.id] || k; root.add(o.w); cx += o.sz.x + 10; rowD = Math.max(rowD, o.sz.z); layH = Math.max(layH, o.sz.y); });
        y += layH + 20; });
      const b = new T.Box3().setFromObject(root), c = b.getCenter(new T.Vector3()); root.children.forEach(o => { o.position.x -= c.x; o.position.z -= c.z; });
    }
  };
  return B;
}
