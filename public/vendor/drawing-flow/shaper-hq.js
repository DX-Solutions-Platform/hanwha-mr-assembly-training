// 소형 금속 성형기 고품질 모델 (설계도 렌더 이미지 기준) · Drawing Analysis Merge Draft 전용
(function () {
  const T = window.THREE, D = Math.PI / 180;
  const pp = (x, y, z) => [x || 0, y || 0, z || 0];
  const B = (sx, sy, sz, x, y, z, rx, ry, rz, m) => ({ t: 'b', s: [sx, sy, sz], p: pp(x, y, z), r: pp(rx, ry, rz), m });
  const RB = (sx, sy, sz, rad, x, y, z, rx, ry, rz, m) => ({ t: 'rb', s: [sx, sy, sz], rad, p: pp(x, y, z), r: pp(rx, ry, rz), m });
  const C = (r, h, x, y, z, rx, ry, rz, m, seg) => ({ t: 'c', s: [r, h], p: pp(x, y, z), r: pp(rx, ry, rz), m, seg });
  const CN = (r1, r2, h, x, y, z, rx, ry, rz, m) => ({ t: 'cn', s: [r1, r2, h], p: pp(x, y, z), r: pp(rx, ry, rz), m });
  const TO = (R, tb, x, y, z, rx, ry, rz, m) => ({ t: 'to', s: [R, tb], p: pp(x, y, z), r: pp(rx, ry, rz), m });
  const KN = (r, h, x, y, z, rx, ry, rz, m) => ({ t: 'kn', s: [r, h], p: pp(x, y, z), r: pp(rx, ry, rz), m });
  const XP = (len, pts, x, y, z, rx, ry, rz, m) => ({ t: 'xp', s: [len], pts, p: pp(x, y, z), r: pp(rx, ry, rz), m });
  const P = (part, x, y, z, rx, ry, rz) => ({ part, p: [x, y, z], r: [rx || 0, ry || 0, rz || 0] });
  const dotZ = (x, y, z, r) => [C(r || 4.5, 1.2, x, y, z + 0.6, 90, 0, 0, 'cr', 20), C((r || 4.5) * 0.48, 1.4, x, y, z + 0.9, 90, 0, 0, 'dk', 6)];
  const dotX = (x, y, z, r) => [C(r || 4.5, 1.2, x + 0.6, y, z, 0, 0, 90, 'cr', 20), C((r || 4.5) * 0.48, 1.4, x + 0.9, y, z, 0, 0, 90, 'dk', 6)];
  const holeZ = (x, y, z, r) => [C(r + 2.2, 1.2, x, y, z + 0.6, 90, 0, 0, 'cr', 28), C(r, 1.6, x, y, z + 0.9, 90, 0, 0, 'dk', 28)];
  const holeY = (x, y, z, r) => [C(r + 2.2, 1.2, x, y + 0.6, z, 0, 0, 0, 'cr', 28), C(r, 1.6, x, y + 0.9, z, 0, 0, 0, 'dk', 28)];
  const PAINT = '#5f6e78', STEEL = '#9aa3ab';

  const feet = [];
  [[-205, -172], [205, -172], [-205, 172], [205, 172]].forEach(([x, z]) => { feet.push(C(24, 8, x, -17, z, 0, 0, 0, 'cr', 48), C(12, 4, x, -11, z, 0, 0, 0, 'al', 28)); });
  const colGeo = [RB(270, 410, 260, 8, 0, 205, 0, 0, 0, 0, 'al'), RB(240, 380, 6, 2, 0, 205, 131, 0, 0, 0, 'al'), RB(300, 22, 300, 3, -5, 421, 5, 0, 0, 0, 'al')];
  [-130, -65, 0, 65, 125].forEach(x => colGeo.push(...holeZ(x, 421, 155, 5)));
  [-120, -20, 80].forEach(x => colGeo.push(...holeY(x, 432, 132, 4)));
  [[-105, 35], [105, 35], [-105, 375], [105, 375], [-105, 205], [105, 205], [0, 375], [0, 35]].forEach(([x, y]) => colGeo.push(...dotZ(x, y, 134)));
  [[25, -112], [25, 112], [385, -112], [385, 112]].forEach(([y, z]) => colGeo.push(...dotX(135, y, z)));
  const gearGeo = [
    RB(96, 86, 30, 6, 0, 0, 19, 0, 0, 0, 'al'),
    C(64, 20, 44, 0, 78, 0, 0, 90, 'cr', 72), C(58, 8, 30, 0, 78, 0, 0, 90, 'al', 64), C(56, 30, 11, 0, 78, 0, 0, 90, 'cr', 72),
    TO(56, 2.6, -4, 0, 78, 0, 0, 90, 'cr'), C(48, 24, -16, 0, 78, 0, 0, 90, 'al', 64), C(40, 12, -34, 0, 78, 0, 0, 90, 'cr', 56),
    C(30, 6, 57, 0, 78, 0, 0, 90, 'al', 48), C(15, 5, 62, 0, 78, 0, 0, 90, 'cr', 32),
    C(14, 110, -95, 0, 78, 0, 0, 90, 'cr', 40), C(20, 12, -120, 0, 78, 0, 0, 90, 'al', 40), TO(16, 3, -136, 0, 78, 0, 0, 90, 'brass'), CN(11, 14, 4, -152, 0, 78, 0, 0, 90, 'cr')
  ];
  [[33, 33], [33, -33], [-33, 33], [-33, -33]].forEach(([y, z]) => { gearGeo.push(C(4.2, 1.6, 54.8, y, 78 + z, 0, 0, 90, 'cr', 16), C(2, 1.8, 55.2, y, 78 + z, 0, 0, 90, 'dk', 6)); });
  const rod = (x, y, z) => [C(8, 12, x, y, z, 0, 0, 28.3, 'cr', 24), TO(8.6, 2.4, x, y, z, 0, 0, 28.3, 'brass'), C(5, 44, x, y, z - 22, 90, 0, 0, 'al', 16)];
  const rails = [];
  [[130, -105], [130, 105], [260, -105], [260, 105]].forEach(([y, z]) => rails.push(...dotX(-34, y, z)));

  const shaper = {
    key: 'shaper', ko: '소형 금속 성형기', code: 'ETAU-LIMEUR', drawing: { type: 'pdf', src: 'uploads/etau-limeur-jdw.pdf' },
    sizeSrc: '도면 치수', size: [458, 617, 389],
    read: { pages: 8, parts: 17, steps: 24, note: '치수 표기 있음 · 조립도 1·7쪽' },
    parts: {
      base: { ko: '베이스', col: PAINT, m: 'sat', geo: [RB(458, 18, 389, 4, 0, 0, 0)].concat(feet), dim: '458 × 40 × 389', src: '도면' },
      column: { ko: '컬럼', col: PAINT, m: 'al', geo: colGeo, dim: '240 × 420 × 300', src: '도면' },
      gear: { ko: '크랭크 기어', col: '#b3a58c', metal: 1, m: 'cr', geo: gearGeo, dim: 'Ø170 × 24', src: '도면' },
      pinion: { ko: '피니언', col: '#b3a58c', metal: 1, m: 'cr', geo: [C(34, 14, 0, 0, 11, 90, 0, 0, 'al', 56), C(28, 10, 0, 0, 23, 90, 0, 0, 'cr', 56), TO(26, 3.2, 0, 0, 28.5, 90, 0, 0, 'brass'), C(17, 6, 0, 0, 31, 90, 0, 0, 'cr', 40), C(6, 2, 0, 0, 34.5, 90, 0, 0, 'dk', 6)], dim: 'Ø52 × 30', src: '도면' },
      rocker: { ko: '로커 암', col: '#8a949b', metal: 1, m: 'cr', geo: [C(4, 118, 0, 0, 52, 0, 0, 28.3, 'cr', 16)].concat(rod(28, -52, 52), rod(-28, 52, 52)), dim: '34 × 300 × 18', src: '도면' },
      handle: { ko: '핸들', col: '#2b2f33', m: 'cr', geo: [C(26, 30, 0, 0, 19, 90, 0, 0, 'al', 48), C(56, 10, 0, 0, 40, 90, 0, 0, 'cr', 72), TO(56, 5, 0, 0, 40, 90, 0, 0, 'cr'), C(42, 2, 0, 0, 45.5, 90, 0, 0, 'al', 64), C(18, 16, 0, 0, 48, 90, 0, 0, 'cr', 40), C(7, 4, 0, 0, 57.5, 90, 0, 0, 'dk', 6), B(62, 10, 8, 30, -30, 50, 0, 0, -45, 'cr'), C(7, 44, 56, -56, 72, 90, 0, 0, 'cr', 24), C(9, 6, 56, -56, 96, 90, 0, 0, 'cr', 24)], dim: 'Ø14 × 70', src: '도면' },
      ram: { ko: '램', col: '#6d7c86', m: 'al', geo: [XP(430, [[-125, -70], [125, -70], [125, 18], [72, 70], [-72, 70], [-125, 18]], 0, 70, 0, 0, 0, 0, 'al'), B(432, 1.6, 3, 0, 142.4, 0, 0, 0, 0, 'dk')].concat(...[-170, -80, 10, 100].map(x => holeZ(x, 30, 127.5, 4))), dim: '520 × 70 × 90', src: '도면' },
      gib: { ko: '지브', col: STEEL, metal: 1, m: 'cr', geo: [B(300, 16, 12, 0, 0, 0, 0, 0, 0, 'cr')], dim: '240 × 14 × 16', src: '도면' },
      head: { ko: '툴 헤드', col: '#6d7c86', m: 'al', geo: [RB(30, 160, 150, 4, 0, 50, 0, 0, 0, 0, 'al'), C(62, 36, 33, 72, 0, 0, 0, 90, 'cr', 80), TO(62, 3, 51, 72, 0, 0, 0, 90, 'cr'), C(26, 6, 54, 72, 0, 0, 0, 90, 'al', 48), B(4, 56, 10, 52.5, 72, 0, 0, 0, 0, 'dk'), C(9, 10, 58, 72, 0, 0, 0, 90, 'cr', 32), C(5, 2, 63.5, 72, 0, 0, 0, 90, 'dk', 6), CN(9, 22, 56, 43, 4, -62, 0, 0, 90, 'cr'), B(20, 14, 14, 80, 4, -62, 0, 0, 0, 'cr')], dim: '70 × 110 × 80', src: '도면' },
      bit: { ko: '바이트', col: '#d2d6da', metal: 1, m: 'cr', geo: [RB(46, 56, 58, 4, 4, 28, 0, 0, 0, 0, 'al'), B(26, 28, 42, 36, 30, 0, 0, 0, 0, 'brass'), C(5.2, 2, 49.6, 30, 11, 0, 0, 90, 'cr', 20), C(2.6, 2.2, 50.2, 30, 11, 0, 0, 90, 'dk', 6), C(5.2, 2, 49.6, 30, -11, 0, 0, 90, 'cr', 20), C(2.6, 2.2, 50.2, 30, -11, 0, 0, 90, 'dk', 6), B(10, 44, 10, 4, -18, 0, 0, 0, 0, 'cr')], dim: '12 × 50 × 12', src: '도면' },
      support: { ko: '테이블 지지대', col: PAINT, m: 'al', geo: [RB(16, 160, 250, 4, -42, 195, 0, 0, 0, 0, 'al'), C(56, 14, 45, 7, 0, 0, 0, 0, 'al', 72), C(46, 36, 45, 32, 0, 0, 0, 0, 'cr', 72), TO(46, 3, 45, 50, 0, 0, 0, 0, 'cr'), C(38, 22, 45, 61, 0, 0, 0, 0, 'al', 64), C(34, 10, 45, 100, 0, 0, 0, 0, 'al', 64), TO(34, 2.5, 45, 105, 0, 0, 0, 0, 'cr'), C(24, 170, 45, 155, 0, 0, 0, 0, 'cr', 48)].concat(rails), dim: '60 × 120 × 90', src: '도면' },
      table: { ko: '테이블', col: PAINT, m: 'al', geo: [RB(140, 60, 240, 4, 0, 30, 0, 0, 0, 0, 'al'), B(142, 6, 10, 0, 57.5, 55, 0, 0, 0, 'dk'), B(142, 6, 10, 0, 57.5, -55, 0, 0, 0, 'dk')], dim: '200 × 70 × 200', src: '도면' },
      vise: { ko: '바이스 몸체', col: '#7b8790', m: 'al', geo: [RB(120, 24, 150, 3, 0, 12, 0, 0, 0, 0, 'al'), B(60, 2, 20, 0, 24.5, 0, 0, 0, 0, 'dk')], dim: '150 × 25 × 110', src: '도면' },
      jaw: { ko: '바이스 조', col: STEEL, metal: 1, m: 'cr', geo: [RB(18, 40, 150, 2, 0, 20, 0, 0, 0, 0, 'cr')], dim: '18 × 45 × 110', src: '도면' },
      vscrew: { ko: '바이스 핸들', col: '#2b2f33', m: 'cr', geo: [C(7, 70, 20, 0, 0, 0, 0, 90, 'cr', 24), KN(30, 44, 70, 0, 0, 0, 0, 90, 'cr'), C(24, 4, 94, 0, 0, 0, 0, 90, 'cr', 48), C(10, 2.4, 97, 0, 0, 0, 0, 90, 'al', 32)], dim: 'Ø12 × 110', src: '도면' },
      bolt: { ko: '볼트 M8', col: STEEL, metal: 1, m: 'cr', geo: [C(4, 30, 0, -15, 0, 0, 0, 0, 'cr', 16), C(6.5, 7, 0, 3.5, 0, 0, 0, 0, 'cr', 40), C(3.2, 1.2, 0, 7.4, 0, 0, 0, 0, 'dk', 6)], dim: 'M8 × 50', src: '부품표' }
    },
    pieces: [], sections: []
  };
  shaper.sections = [
    { no: '1', ko: '베이스 · 컬럼', pcs: [P('base', 0, 21, 0), P('column', -65, 30, -20), P('bolt', -190, 30, -162), P('bolt', -190, 30, 122), P('bolt', 55, 30, -162), P('bolt', 55, 30, 122)], steps: [
      { t: 'check', part: 'column', txt: '컬럼 부품을 확인하세요.' },
      { t: 'place', part: 'base', txt: '베이스를 작업대에 놓으세요.' },
      { t: 'place', part: 'column', txt: '컬럼을 베이스 위 기준선에 맞추세요.' },
      { t: 'fasten', part: 'bolt', txt: '토크 렌치를 가져오세요.', tool: 'wrench', toolKo: '토크 렌치 13 mm', nm: 25, nmSrc: '규격 표준값 · 강도 8.8' }
    ] },
    { no: '2', ko: '구동부', sub: ['2-1 크랭크 기어', '2-2 로커 암 · 핸들'], pcs: [P('gear', -60, 330, 90), P('pinion', -125, 150, 90), P('rocker', -25, 250, 90), P('handle', 10, 175, 90)], steps: [
      { t: 'inside', part: 'gear', sub: 0, txt: '크랭크 기어를 컬럼 안쪽 축에 끼우세요.' },
      { t: 'inside', part: 'pinion', sub: 0, txt: '피니언을 크랭크 기어 아래에 물리세요.' },
      { t: 'inside', part: 'rocker', sub: 1, txt: '로커 암을 크랭크 핀에 거세요.' },
      { t: 'place', part: 'handle', sub: 1, txt: '핸들을 컬럼 앞쪽 축에 끼우세요.' }
    ] },
    { no: '3', ko: '램 · 툴 헤드', sub: ['3-1 램', '3-2 툴 헤드'], pcs: [P('ram', -15, 462, -20), P('gib', -40, 472, 111), P('gib', -40, 472, -151), P('head', 215, 462, -20), P('bit', 215, 430, -20)], steps: [
      { t: 'place', part: 'ram', sub: 0, txt: '램을 컬럼 위 안내면에 올리세요.' },
      { t: 'place', part: 'gib', sub: 0, txt: '지브를 램 양쪽 홈에 끼우세요.' },
      { t: 'place', part: 'head', sub: 1, txt: '툴 헤드를 램 앞쪽에 다세요.' },
      { t: 'place', part: 'bit', sub: 1, txt: '바이트를 툴 헤드 아래에 끼우세요.' }
    ] },
    { no: '4', ko: '테이블 · 바이스', pcs: [P('support', 120, 30, -20), P('table', 155, 270, -20), P('bolt', 100, 330, 88), P('bolt', 100, 330, -128), P('vise', 155, 330, -20), P('jaw', 104, 354, -20), P('jaw', 206, 354, -20)], steps: [
      { t: 'place', part: 'support', txt: '테이블 지지대를 베이스에 세우세요.' },
      { t: 'place', part: 'table', txt: '테이블을 지지대 위에 올리세요.' },
      { t: 'fasten', part: 'bolt', txt: '토크 렌치를 가져오세요.', tool: 'wrench', toolKo: '토크 렌치 13 mm', nm: 25, nmSrc: '규격 표준값 · 강도 8.8' },
      { t: 'place', part: 'vise', txt: '바이스 몸체를 테이블 위에 놓으세요.' },
      { t: 'place', part: 'jaw', txt: '바이스 조를 양쪽에 끼우세요.' }
    ] },
    { no: '5', ko: '최종 결합', final: true, pcs: [P('vscrew', 215, 372, -20)], steps: [
      { t: 'place', part: 'vscrew', txt: '바이스 핸들을 끼워 완성하세요.' },
      { t: 'check', part: 'all', txt: '완성품을 확인하세요.' }
    ] }
  ];
  shaper.pieces = []; shaper.sections.forEach((s, si) => { s.idx = []; s.pcs.forEach(pc => { pc.sec = si; pc.i = shaper.pieces.length; s.idx.push(pc.i); shaper.pieces.push(pc); }); });
  shaper.nSteps = shaper.sections.reduce((a, s) => a + s.steps.length, 0);
  if (window.FLOW_DATA) window.FLOW_DATA.shaper = shaper;

  function rbox(w, h, d, r) {
    const b = Math.max(0.2, Math.min(r, w / 4, h / 4, d / 4)), x = (w - 2 * b) / 2, y = (h - 2 * b) / 2, rc = Math.max(0.3, Math.min(r, x - 0.1, y - 0.1));
    const sh = new T.Shape(); sh.moveTo(-x + rc, -y); sh.lineTo(x - rc, -y); sh.quadraticCurveTo(x, -y, x, -y + rc); sh.lineTo(x, y - rc); sh.quadraticCurveTo(x, y, x - rc, y); sh.lineTo(-x + rc, y); sh.quadraticCurveTo(-x, y, -x, y - rc); sh.lineTo(-x, -y + rc); sh.quadraticCurveTo(-x, -y, -x + rc, -y);
    const depth = Math.max(0.1, d - 2 * b), g = new T.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 4 });
    g.translate(0, 0, -depth / 2); return g;
  }
  function knurl(r, h, wire) {
    const n = wire ? 24 : 72, g = new T.CylinderGeometry(r, r, h, n, wire ? 2 : 1); if (wire) return g;
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z); if (rr > r * 0.97) { const k = Math.round(Math.atan2(z, x) / (2 * Math.PI / n)), f = Math.abs(k) % 2 ? 1.035 : 0.965; p.setX(i, x * f); p.setZ(i, z * f); } }
    g.computeVertexNormals(); return g;
  }
  function geo(e, wire) {
    const s = e.s;
    if (e.t === 'b') { const sg = wire ? s.map(v => Math.max(1, Math.min(9, Math.round(v / 42)))) : [1, 1, 1]; return new T.BoxGeometry(s[0], s[1], s[2], sg[0], sg[1], sg[2]); }
    if (e.t === 'rb') return wire ? geo({ t: 'b', s }, true) : rbox(s[0], s[1], s[2], e.rad || 3);
    if (e.t === 'c') { const seg = wire ? Math.min(24, e.seg || 24) : (e.seg || (s[0] > 30 ? 64 : s[0] > 10 ? 40 : 20)); return new T.CylinderGeometry(s[0], s[0], s[1], Math.max(3, seg), wire ? Math.max(1, Math.round(s[1] / 36)) : 1); }
    if (e.t === 'cn') return new T.CylinderGeometry(s[0], s[1], s[2], wire ? 20 : 56, 1);
    if (e.t === 'to') { const g = new T.TorusGeometry(s[0], s[1], wire ? 6 : 14, wire ? 28 : 72); g.rotateX(Math.PI / 2); return g; }
    if (e.t === 'kn') return knurl(s[0], s[1], wire);
    if (e.t === 'xp') { const sh = new T.Shape(); e.pts.forEach((q, i) => i ? sh.lineTo(q[0], q[1]) : sh.moveTo(q[0], q[1])); const bv = wire ? 0 : 2.5, depth = s[0] - 2 * bv, g = new T.ExtrudeGeometry(sh, { depth, bevelEnabled: !wire, bevelThickness: bv, bevelSize: bv, bevelSegments: 2, curveSegments: 4 }); g.translate(0, 0, -depth / 2); g.rotateY(Math.PI / 2); return g; }
    return new T.BoxGeometry(1, 1, 1);
  }
  const tiny = e => e.t === 'c' && e.s[0] < 6 && e.s[1] < 3;
  function setPR(o, p, r) { o.position.set(p[0], p[1], p[2]); o.rotation.set(r[0] * D, r[1] * D, r[2] * D); }

  function envMap(R) {
    const sc = new T.Scene(), pm = new T.PMREMGenerator(R);
    sc.add(new T.Mesh(new T.BoxGeometry(10, 10, 10), new T.MeshBasicMaterial({ color: 0x4a4f55, side: T.BackSide })));
    const L = (w, h, x, y, z, k, col) => { const m = new T.MeshBasicMaterial({ color: col || 0xffffff, side: T.DoubleSide }); m.color.multiplyScalar(k); const o = new T.Mesh(new T.PlaneGeometry(w, h), m); o.position.set(x, y, z); o.lookAt(0, 0, 0); sc.add(o); };
    L(7, 7, 0, 4.9, 0, 2.6); L(3.2, 4.5, -4.9, 1.2, 1, 6); L(2.2, 4.5, 4.9, 0.8, -1, 2.4, 0xdfe8ff); L(8, 1.2, 0, 2.4, -4.9, 4.5); L(6, 0.9, 1, -0.6, 4.9, 2.2); L(9.6, 9.6, 0, -4.9, 0, 1.5, 0xb8bcc2);
    const tex = pm.fromScene(sc, 0.035).texture; pm.dispose(); return tex;
  }

  window.ShaperHQ = {
    geo, tiny, envMap,
    apply(E) {
      E.S.environment = envMap(E.R);
      const mk = (c, mt, rg) => new T.MeshStandardMaterial({ color: c, metalness: mt, roughness: rg, envMapIntensity: 1 });
      const MAT = { al: mk(0xd2d6db, 1, 0.16), sat: mk(0xc2c7cd, 1, 0.3), cr: mk(0xf3f5f7, 1, 0.05), brass: mk(0xd8a548, 1, 0.2), dk: mk(0x101214, 0.4, 0.55) };
      E.solid = function (part, opt) {
        const g = new T.Group();
        part.geo.forEach(e => {
          const m = (MAT[e.m || part.m || 'al'] || MAT.al).clone(); if (opt && opt.clip) m.clippingPlanes = [opt.clip];
          const o = new T.Mesh(geo(e, false), m); setPR(o, e.p, e.r);
          if (!(opt && opt.noEdge) && e.m !== 'dk' && !tiny(e)) o.add(new T.LineSegments(new T.EdgesGeometry(o.geometry, 35), this.M.edge));
          g.add(o);
        });
        return g;
      };
      E.wire = function (part, mat) {
        const g = new T.Group();
        part.geo.forEach(e => { if (tiny(e)) return; const gg = geo(e, true), o = new T.LineSegments(e.t === 'xp' || e.t === 'kn' ? new T.EdgesGeometry(gg, 20) : new T.WireframeGeometry(gg), mat || this.M.wire); gg.dispose(); setPR(o, e.p, e.r); g.add(o); });
        return g;
      };
      E.edges = function (part, mat) {
        const g = new T.Group();
        part.geo.forEach(e => { if (tiny(e)) return; const gg = geo(e, false), o = new T.LineSegments(new T.EdgesGeometry(gg, 35), mat); gg.dispose(); o.renderOrder = 5; setPR(o, e.p, e.r); g.add(o); });
        return g;
      };
    }
  };
})();
