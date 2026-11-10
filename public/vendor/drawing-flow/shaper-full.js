// 소형 금속 성형기 · 도면 부품표 기준 모델 (1단계: 구간 1 프레임 = 도면 3쪽 1-01~1-12 + 체결 부품)
// 구간 2~4는 아직 이전 모델(shaper-hq.js)을 위치만 옮겨 사용합니다.
(function () {
  const S0 = window.FLOW_DATA && window.FLOW_DATA.shaper; if (!S0) return;
  const pp = (x, y, z) => [x || 0, y || 0, z || 0];
  const B = (sx, sy, sz, x, y, z, rx, ry, rz, m) => ({ t: 'b', s: [sx, sy, sz], p: pp(x, y, z), r: pp(rx, ry, rz), m });
  const RB = (sx, sy, sz, rad, x, y, z, rx, ry, rz, m) => ({ t: 'rb', s: [sx, sy, sz], rad, p: pp(x, y, z), r: pp(rx, ry, rz), m });
  const C = (r, h, x, y, z, rx, ry, rz, m, seg) => ({ t: 'c', s: [r, h], p: pp(x, y, z), r: pp(rx, ry, rz), m, seg });
  const CN = (r1, r2, h, x, y, z, rx, ry, rz, m) => ({ t: 'cn', s: [r1, r2, h], p: pp(x, y, z), r: pp(rx, ry, rz), m });
  const XP = (len, pts, x, y, z, rx, ry, rz, m) => ({ t: 'xp', s: [len], pts, p: pp(x, y, z), r: pp(rx, ry, rz), m });
  const P = (part, x, y, z, rx, ry, rz) => ({ part, p: [x, y, z], r: [rx || 0, ry || 0, rz || 0] });
  const hy = (x, y, z, r) => C(r, 1.2, x, y + 0.6, z, 0, 0, 0, 'dk', 20);
  const hx = (x, y, z, r) => C(r, 1.2, x + 0.6, y, z, 0, 0, 90, 'dk', 20);
  const hz = (x, y, z, r) => C(r, 1.2, x, y, z + 0.6, 90, 0, 0, 'dk', 20);
  const ring = (n, R, a0) => Array.from({ length: n }, (_, k) => { const a = (a0 + k * 360 / n) * Math.PI / 180; return [Math.cos(a) * R, Math.sin(a) * R]; });

  // 좌표: 앞쪽(작업대 쪽) = +x, 위 = +y, 기어 쪽 옆면 = +z. 베이스 판 중심 = 원점.
  const CX = -78, CY = 179;                                    // 컬럼 중심 (베이스 위 274)
  const colX = [CX - 124, CX + 124], colZ = [-74, 74];         // 컬럼 모서리 블록 M10 구멍
  // 체결 부품: 머리 아래 기준(local y=0), 축은 -y 방향
  const cyl = (d, L, hd, hh) => [C(hd / 2, hh, 0, hh / 2, 0, 0, 0, 0, 'dk', 24), C(d * 0.36, 1, 0, hh + 0.3, 0, 0, 0, 0, 'dk', 6), C(d / 2, L, 0, -L / 2, 0, 0, 0, 0, 'dk', 16)];
  const csk = (d, L) => [CN(d, d / 2, d / 2, 0, -d / 4, 0, 0, 0, 0, 'dk'), C(d * 0.32, 0.6, 0, 0.1, 0, 0, 0, 0, 'cr', 6), C(d / 2, L - d / 2, 0, -d / 2 - (L - d / 2) / 2, 0, 0, 0, 0, 'dk', 16)];
  const grub = (d, L) => [C(d / 2, L, 0, 0, 0, 0, 0, 0, 'dk', 16), C(d * 0.3, 0.6, 0, L / 2 + 0.2, 0, 0, 0, 0, 'cr', 6)];
  const M = 'sat';

  const parts = {
    base: { pn: '1-01', en: 'BASE PLATE', ko: '베이스 판', m: M, col: '#c2c7cd', dim: '500 × 240 × 20', src: '도면 3쪽', geo: [
      RB(42, 20, 240, 6, -229, 0, 0), RB(198, 20, 240, 6, 151, 0, 0), B(260, 20, 40, -78, 0, 100), B(260, 20, 40, -78, 0, -100),
      B(18, 20, 18, CX - 124 + 3, 0, 71), B(18, 20, 18, CX - 124 + 3, 0, -71), B(18, 20, 18, CX + 124 - 3, 0, 71), B(18, 20, 18, CX + 124 - 3, 0, -71),
      ...[[220, 90], [220, -90], [-220, 90], [-220, -90]].map(([x, z]) => hy(x, 10, z, 6)), hy(84, 10, 0, 12.5),
      ...colX.flatMap(x => colZ.map(z => hy(x, 10, z, 9)))] },
    foot: { pn: '1-02', en: 'BASE PLATE FOOT', ko: '베이스 받침', m: M, col: '#c2c7cd', dim: 'Ø40 × 22 · M12', src: '도면 3쪽', geo: [C(20, 12, 0, 6, 0, 0, 0, 0, M, 48), C(16, 10, 0, 17, 0, 0, 0, 0, M, 40), C(6, 20, 0, 32, 0, 0, 0, 0, 'cr', 20)] },
    column: { pn: '1-03.1', en: 'COLUMN BODY · RHS', ko: '컬럼 몸체 (각관)', m: M, col: '#c2c7cd', dim: '300 × 200 × 274 · 두께 10', src: '도면 3쪽', geo: [
      B(10, 274, 49, 145, 0, -59.5), B(10, 274, 49, 145, 0, 59.5), B(10, 214, 70, 145, 30, 0), B(10, 274, 168, -145, 0, 0),
      B(268, 274, 10, 0, 0, 95), B(268, 274, 10, 0, 0, -95),
      ...[[134, 84], [134, -84], [-134, 84], [-134, -84]].map(([x, z]) => C(16, 274, x, 0, z, 0, 0, 0, M, 24)),
      hz(10, 63, 100, 21), hz(-74, 17, 100, 21), hz(10, -57, 100, 16), hz(10, -57, -101.2, 16), hz(-74, 17, -101.2, 12), hz(10, 63, -101.2, 12)] },
    cblk: { pn: '1-03.2', en: 'COLUMN CORNER BLOCK', ko: '컬럼 모서리 블록', m: M, col: '#c2c7cd', dim: '32 × 25 × 32 · M10', src: '도면 3쪽', geo: [B(32, 25, 32, 0, 0, 0), hy(0, 12.5, 0, 5)] },
    cblk3: { pn: '1-03.3', en: 'COLUMN MID BLOCK', ko: '컬럼 중간 블록', m: M, col: '#c2c7cd', dim: '32 × 25 × 32 · M10', src: '도면 3쪽', geo: [RB(32, 25, 32, 6, 0, 0, 0), hy(0, 12.5, 0, 5)] },
    top: { pn: '1-04', en: 'TOP MOUNTING PLATE', ko: '상부 고정 판', m: M, col: '#c2c7cd', dim: '500 × 220 × 20', src: '도면 3쪽', geo: [
      RB(500, 20, 97, 8, 0, 0, 61.5), RB(500, 20, 97, 8, 0, 0, -61.5), B(212, 20, 26, -144, 0, 0), B(68, 20, 26, 216, 0, 0)] },
    rgp: { pn: '1-05', en: 'RAM GUIDE PLATE (L/R)', ko: '램 가이드 판', m: M, col: '#c2c7cd', dim: '330 × 43 × 36 · 60° 도브테일', src: '도면 3쪽', geo: [
      XP(330, [[-21.55, -18], [6.45, -18], [21.55, 5.6], [21.55, 18], [-21.55, 18]], 0, 0, 0), ...[-124, 0, 124].map(x => hy(x - 7, 18, 0, 10)), ...[-147, -49, 49, 147].map(x => hz(x, 0, 21.55, 4))] },
    gib: { pn: '1-06', en: 'RAM GUIDE GIB STRIP (L/R)', ko: '램 가이드 지브', m: 'brass', col: '#d8a548', metal: 1, dim: '333 × 19.4 × 11.8 · 30°', src: '도면 3쪽', geo: [B(333, 19.4, 8, 0, 0, 0, 30, 0, 0, 'brass')] },
    wgp: { pn: '1-07', en: 'WORKTABLE GUIDE PLATE', ko: '작업대 가이드 판', m: M, col: '#c2c7cd', dim: '180 × 29 × 19 · 60°', src: '도면 3쪽', geo: [B(19, 180, 29, 0, 0, 0), hx(9.5, 60, 0, 8), hx(9.5, -60, 0, 8)] },
    jtb: { pn: '1-08', en: 'JACK SCREW TOP BEARING', ko: '잭 나사 상부 베어링', m: 'brass', col: '#d8a548', metal: 1, dim: '40 × 19 × 18', src: '도면 3쪽', geo: [B(18, 19, 40, 0, 0, 0, 0, 0, 0, 'brass'), hx(9, 0, 11, 6.5), hx(9, 0, -11, 6.5), hy(0, 9.5, 0, 4.5)] },
    olb: { pn: '1-09', en: 'OSCILLATING LEVER BEARING BUSH', ko: '오실레이팅 레버 부시', m: 'brass', col: '#d8a548', metal: 1, dim: 'Ø40 · Ø32 PF · Ø24 × 19', src: '도면 3쪽', geo: [C(20, 3, 0, 1.5, 0, 0, 0, 0, 'brass', 48), C(16, 16, 0, -8, 0, 0, 0, 0, 'brass', 40), C(12, 1.2, 0, 3.2, 0, 0, 0, 0, 'dk', 32)] },
    msb: { pn: '1-10', en: 'MOTOR SHAFT BEARING BUSH', ko: '모터 축 부시', m: 'brass', col: '#d8a548', metal: 1, dim: 'Ø32 · Ø24 PF · Ø20 × 25', src: '도면 3쪽', geo: [C(16, 4, 0, 2, 0, 0, 0, 0, 'brass', 40), C(12, 21, 0, -10.5, 0, 0, 0, 0, 'brass', 32), C(10, 1.2, 0, 4.2, 0, 0, 0, 0, 'dk', 28)] },
    mbh: { pn: '1-11', en: 'MOTOR SHAFT BALL BEARING HOUSING', ko: '모터 축 베어링 하우징', m: 'al', col: '#d2d6db', metal: 1, dim: 'Ø76 · 베어링 Ø42 · 60 PCD', src: '도면 3쪽', geo: [
      C(38, 10, 0, 5, 0, 0, 0, 0, 'al', 64), C(28, 22, 0, 21, 0, 0, 0, 0, 'al', 56), C(21, 10, 0, 28, 0, 0, 0, 0, 'cr', 48), C(10, 1.2, 0, 33.2, 0, 0, 0, 0, 'dk', 28), ...ring(3, 30, 90).map(([a, b]) => C(3, 1.2, a, 10.4, b, 0, 0, 0, 'dk', 12))] },
    rgh: { pn: '1-12', en: 'RED. GEAR BALL BEARING HOUSING', ko: '감속 기어 베어링 하우징', m: 'al', col: '#d2d6db', metal: 1, dim: 'Ø98 · 베어링 Ø42 · 78 PCD', src: '도면 3쪽', geo: [
      C(49, 15, 0, 7.5, 0, 0, 0, 0, 'al', 72), C(32, 24, 0, 27, 0, 0, 0, 0, 'al', 56), C(21, 10, 0, 34.5, 0, 0, 0, 0, 'cr', 48), C(12.5, 1.2, 0, 39.7, 0, 0, 0, 0, 'dk', 28)] },
    m10x40: { pn: 'M10×40', en: 'CYL HEAD SCREW', ko: '육각 구멍 볼트 M10×40', m: 'dk', col: '#2b2f33', std: 1, dim: 'M10 × 40', src: '규격', geo: cyl(10, 40, 16, 10) },
    m10x70: { pn: 'M10×70', en: 'CYL HEAD SCREW', ko: '육각 구멍 볼트 M10×70', m: 'dk', col: '#2b2f33', std: 1, dim: 'M10 × 70', src: '규격', geo: cyl(10, 70, 16, 10) },
    m8x40g: { pn: 'M8×40', en: 'GRUB SCREW', ko: '무두 볼트 M8×40', m: 'dk', col: '#2b2f33', std: 1, dim: 'M8 × 40', src: '규격', geo: grub(8, 40) },
    m8x20: { pn: 'M8×20', en: 'CYL HEAD SCREW', ko: '육각 구멍 볼트 M8×20', m: 'dk', col: '#2b2f33', std: 1, dim: 'M8 × 20', src: '규격', geo: cyl(8, 20, 13, 8) },
    m8x26: { pn: 'M8×26', en: 'CYL HEAD SCREW', ko: '육각 구멍 볼트 M8×26', m: 'dk', col: '#2b2f33', std: 1, dim: 'M8 × 26', src: '규격', geo: cyl(8, 26, 13, 8) },
    m6x24: { pn: 'M6×24', en: 'CYL HEAD SCREW', ko: '육각 구멍 볼트 M6×24', m: 'dk', col: '#2b2f33', std: 1, dim: 'M6 × 24', src: '규격', geo: cyl(6, 24, 10, 6) },
    m6x26k: { pn: 'M6×26', en: 'C-SINK SCREW', ko: '접시머리 나사 M6×26', m: 'dk', col: '#2b2f33', std: 1, dim: 'M6 × 26', src: '규격', geo: csk(6, 26) },
    m6x20k: { pn: 'M6×20', en: 'C-SINK SCREW', ko: '접시머리 나사 M6×20', m: 'dk', col: '#2b2f33', std: 1, dim: 'M6 × 20', src: '규격', geo: csk(6, 20) }
  };

  // ── 구간 1 배치
  const p1 = [], add = (...a) => p1.push(P(...a));
  const colY = 42 + 137; // CY
  // 1-1 컬럼 몸체: 각관 + 모서리 블록 8 + 중간 블록 2 + 접시머리 나사 40
  add('column', CX, CY, 0);
  const blkY = [CY + 124.5, CY - 124.5];
  blkY.forEach(y => colX.forEach(x => colZ.forEach(z => add('cblk', x, y, z))));
  colZ.forEach(z => add('cblk3', CX, CY + 124.5, z));
  blkY.forEach(y => colX.forEach(x => colZ.forEach(z => {
    const fx = x > CX ? 1 : -1, fz = z > 0 ? 1 : -1;
    [-8, 8].forEach(d => add('m6x26k', CX + fx * 150, y, z + d, 0, 0, fx > 0 ? -90 : 90));
    [-8, 8].forEach(d => add('m6x26k', x + d, y, fz * 100, fz > 0 ? 90 : -90, 0, 0));
  })));
  colZ.forEach(z => { const fz = z > 0 ? 1 : -1; [[-8, -6], [8, -6], [-8, 6], [8, 6]].forEach(([dx, dy]) => add('m6x26k', CX + dx, CY + 124.5 + dy, fz * 100, fz > 0 ? 90 : -90, 0, 0)); });
  const n11 = p1.length;
  // 1-2 컬럼 부속 (SA-1-102)
  [-62, 62].forEach(z => add('wgp', 81.5, 152, z));
  [-62, 62].forEach(z => [92, 212].forEach(y => add('m8x20', 83, y, z, 0, 0, -90)));
  add('jtb', 81, 280, 0);
  [-11, 11].forEach(z => add('m6x24', 84, 280, z, 0, 0, -90));
  add('olb', -68, 122, 100, 90); add('olb', -68, 122, -100, -90);
  add('msb', -152, 196, -100, -90); add('msb', -68, 242, -100, -90);
  add('mbh', -152, 196, 100, 90);
  ring(3, 30, 90).forEach(([a, b]) => add('m6x20k', -152 + a, 196 - b, 110, 90));
  add('rgh', -68, 242, 100, 90);
  ring(4, 39, 45).forEach(([a, b]) => add('m8x26', -68 + a, 242 - b, 115, 90));
  const n12 = p1.length;
  // 1-3 베이스 결합: 받침 4 → 베이스 판 → 컬럼 고정 M10×40 4
  [[220, 90], [220, -90], [-220, 90], [-220, -90]].forEach(([x, z]) => add('foot', x, 0, z));
  add('base', 0, 32, 0);
  colX.forEach(x => colZ.forEach(z => add('m10x40', x, 32, z, 180)));
  const n13 = p1.length;
  // 1-4 상부 가이드 (SA-1-101)
  add('top', CX, 326, 0);
  add('rgp', CX + 7, 354, 74); add('rgp', CX + 7, 354, -74, 0, 180, 0);
  add('gib', CX + 7, 348, 55); add('gib', CX + 7, 348, -55, 0, 180, 0);
  [-124, 0, 124].forEach(dx => colZ.forEach(z => add('m10x70', CX + dx, 352, z)));
  [-147, -49, 49, 147].forEach(dx => [1, -1].forEach(f => add('m8x40g', CX + 7 + dx, 354, f * 75.5, f > 0 ? 90 : -90)));

  const W = (part, txt, sub, extra) => Object.assign({ t: 'place', part, sub, txt }, extra || {});
  const FX = (part, sub, toolKo, nm, nmSrc) => ({ t: 'fasten', part, sub, txt: '육각 렌치를 가져오세요.', tool: 'wrench', toolKo, nm, nmSrc });
  const sec1 = { no: '1', ko: '프레임', sub: ['1-1 컬럼 몸체 (1-03)', '1-2 컬럼 부속 (SA-1-102)', '1-3 베이스 결합 (1-01 · 1-02)', '1-4 상부 가이드 (SA-1-101)'], order: 'AI 제안 · 담당자 확인', pcs: p1, steps: [
    W('column', '컬럼 각관을 작업대에 세우세요.', 0), W('cblk', '모서리 블록 8개를 위아래 모서리 안쪽에 넣으세요.', 0), W('cblk3', '중간 블록 2개를 위쪽 옆면 안쪽에 넣으세요.', 0),
    FX('m6x26k', 0, '육각 렌치 4 mm', 10, '규격 표준값 · 강도 8.8'),
    W('wgp', '작업대 가이드 판 2개를 앞면에 맞추세요.', 1), FX('m8x20', 1, '육각 렌치 6 mm', 25, '규격 표준값 · 강도 8.8'),
    W('jtb', '잭 나사 상부 베어링을 앞면 위쪽에 대세요.', 1), FX('m6x24', 1, '육각 렌치 5 mm', 10, '규격 표준값 · 강도 8.8'),
    W('olb', '레버 부시 2개를 양쪽 옆면 구멍에 압입하세요.', 1), W('msb', '모터 축 부시 2개를 뒤쪽 옆면에 압입하세요.', 1),
    W('mbh', '모터 축 베어링 하우징을 옆면에 대세요.', 1), FX('m6x20k', 1, '육각 렌치 4 mm', 10, '규격 표준값 · 확인 필요'),
    W('rgh', '감속 기어 베어링 하우징을 옆면에 대세요.', 1), FX('m8x26', 1, '육각 렌치 6 mm', 25, '규격 표준값 · 확인 필요'),
    W('foot', '받침 4개를 베이스 판 모서리 M12 구멍에 돌려 끼우세요.', 2), W('base', '베이스 판을 받침 위에 놓으세요.', 2), W('column', '컬럼을 베이스 판 기준 구멍에 맞추세요.', 2),
    FX('m10x40', 2, '육각 렌치 8 mm', 49, '규격 표준값 · 강도 8.8'),
    W('top', '상부 고정 판을 컬럼 위에 놓으세요.', 3), W('rgp', '램 가이드 판 2개를 도브테일이 마주 보게 놓으세요.', 3), W('gib', '지브 2개를 도브테일 안쪽에 넣으세요.', 3),
    FX('m10x70', 3, '육각 렌치 8 mm', 49, '규격 표준값 · 강도 8.8'), FX('m8x40g', 3, '육각 렌치 4 mm', 5, '지브 조정 · 담당자 확인')
  ], subIdx: [n11, n12, n13] };

  // 구간 2~4: 이전 모델 위치만 새 프레임에 맞춤 (다음 단계에서 도면 기준으로 교체)
  const off = [[-10, -90, -60], [0, -55, 20], [0, 0, 20]];
  const old = S0.sections.slice(1).map((s, k) => { const o = off[Math.min(k, 2)]; return Object.assign({}, s, { pcs: s.pcs.map(pc => Object.assign({}, pc, { p: [pc.p[0] + o[0], pc.p[1] + o[1], pc.p[2] + o[2]] })), idx: [] }); });
  Object.keys(S0.parts).forEach(k => { if (!parts[k] && k !== 'base' && k !== 'column') parts[k] = S0.parts[k]; });
  if (S0.parts.gib && parts.gib && parts.gib.pn) parts.rgib = S0.parts.gib, old.forEach(s => s.pcs.forEach(pc => { if (pc.part === 'gib') pc.part = 'rgib'; }));

  const pr = Object.assign({}, S0, { parts, size: [617, 458, 389], sizeSrc: '도면 치수', sections: [sec1, ...old], bom: { types: 79, total: 206, built: '구간 1 · 도면 기준' } });
  pr.pieces = []; pr.sections.forEach((s, si) => { s.idx = []; s.pcs.forEach(pc => { pc.sec = si; pc.i = pr.pieces.length; s.idx.push(pc.i); pr.pieces.push(pc); }); });
  pr.nSteps = pr.sections.reduce((a, s) => a + s.steps.length, 0);
  window.FLOW_DATA.shaper = pr; window.ShaperFull = { v: 1 };
})();
