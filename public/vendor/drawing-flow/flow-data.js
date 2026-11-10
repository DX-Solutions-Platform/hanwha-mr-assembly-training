(function () {
  const B = (sx, sy, sz, x, y, z, rx, ry, rz, c) => ({ t: 'b', s: [sx, sy, sz], p: [x || 0, y || 0, z || 0], r: [rx || 0, ry || 0, rz || 0], c });
  const C = (r, h, x, y, z, rx, ry, rz, c, seg) => ({ t: 'c', s: [r, h], p: [x || 0, y || 0, z || 0], r: [rx || 0, ry || 0, rz || 0], c, seg });
  const P = (part, x, y, z, rx, ry, rz) => ({ part, p: [x, y, z], r: [rx || 0, ry || 0, rz || 0] });
  const WOOD = '#d6c09a', STEEL = '#9aa3ab', PAINT = '#5f6e78';

  const stool = {
    key: 'stool', ko: '스텝 스툴', code: 'BEKVAM', drawing: { type: 'img', src: 'uploads/pasted-1793775993130-0.png' },
    sizeSrc: '그림 비율', size: [430, 512, 430],
    read: { pages: 6, parts: 9, steps: 12, note: '치수 표기 없음 · 조립 그림 6쪽' },
    parts: {
      leg: { ko: '다리', col: WOOD, geo: [B(38, 500, 38)], dim: '38 × 500 × 38', src: '그림' },
      rungT: { ko: '측면 가로대 (위)', col: WOOD, geo: [B(34, 44, 220)], dim: '34 × 44 × 220', src: '그림' },
      rungB: { ko: '측면 가로대 (아래)', col: WOOD, geo: [B(34, 44, 290)], dim: '34 × 44 × 290', src: '그림' },
      dowel: { ko: '나무못', col: '#e8d6b2', geo: [C(5, 30)], dim: 'Ø10 × 30', src: '그림' },
      rail: { ko: '연결 가로대', col: WOOD, geo: [B(322, 44, 30)], dim: '322 × 44 × 30', src: '그림' },
      nut: { ko: '배럴 너트', col: '#c3c8cd', metal: 1, geo: [C(5, 14, 0, 0, 0, 0, 0, 90)], dim: 'Ø10 × 14', src: '그림' },
      bolt: { ko: '볼트 M6', col: STEEL, metal: 1, geo: [C(3, 60, 0, -30, 0), C(6.5, 5, 0, 2.5, 0, 0, 0, 0, null, 6)], dim: 'M6 × 60', src: '부품표' },
      step: { ko: '디딤판', col: WOOD, geo: [B(322, 20, 150)], dim: '322 × 20 × 150', src: '그림' },
      seat: { ko: '상판', col: WOOD, geo: [B(430, 20, 300), B(110, 1, 28, 0, 10.6, -60, 0, 0, 0, '#2a2420')], dim: '430 × 20 × 300', src: '그림' },
      screw: { ko: '나사 4×30', col: STEEL, metal: 1, geo: [C(2.2, 30, 0, -15, 0), C(4.5, 3, 0, 1.5, 0)], dim: 'Ø4 × 30', src: '부품표' }
    },
    pieces: [], sections: []
  };
  const frame = (x) => [P('leg', x, 250, 150, -6), P('leg', x, 250, -150, 6), P('dowel', x, 470, 116, 90), P('dowel', x, 470, -116, 90), P('dowel', x, 120, 151, 90), P('dowel', x, 120, -151, 90), P('rungT', x, 470, 0), P('rungB', x, 120, 0)];
  const rails = [[465, 95], [465, -95], [240, 125], [140, -140]];
  const conn = [];
  rails.forEach(([y, z]) => conn.push(P('rail', 0, y, z)));
  rails.forEach(([y, z]) => { conn.push(P('nut', -150, y, z)); conn.push(P('nut', 150, y, z)); });
  rails.forEach(([y, z]) => { conn.push(P('bolt', -199, y, z, 0, 0, 90)); conn.push(P('bolt', 199, y, z, 0, 0, -90)); });
  const plates = [P('step', 0, 272, 135), P('seat', 0, 502, 0), P('screw', -180, 512, 80), P('screw', 180, 512, 80), P('screw', -180, 512, -80), P('screw', 180, 512, -80)];
  const frameSteps = [
    { t: 'check', part: 'leg', txt: '다리 부품을 확인하세요.' },
    { t: 'place', part: 'leg', txt: '다리 2개를 작업대에 세우세요.' },
    { t: 'place', part: 'dowel', txt: '나무못을 다리 구멍에 끼우세요.' },
    { t: 'place', part: 'rungT', txt: '위 가로대를 나무못에 맞춰 끼우세요.' },
    { t: 'place', part: 'rungB', txt: '아래 가로대를 나무못에 맞춰 끼우세요.' }
  ];
  stool.sections = [
    { no: '1', ko: '왼쪽 측면 프레임', pcs: frame(-180), steps: frameSteps },
    { no: '2', ko: '오른쪽 측면 프레임', pcs: frame(180), steps: frameSteps, repeat: '1과 같은 작업' },
    { no: '3', ko: '프레임 연결', pcs: conn, steps: [
      { t: 'place', part: 'rail', txt: '연결 가로대를 양쪽 프레임 사이에 맞추세요.' },
      { t: 'inside', part: 'nut', txt: '배럴 너트를 가로대 안쪽 구멍에 넣으세요.' },
      { t: 'fasten', part: 'bolt', txt: '육각 렌치를 가져오세요.', tool: 'hex', toolKo: '육각 렌치 4 mm', nm: 10, nmSrc: '규격 표준값 · 강도 8.8' }
    ] },
    { no: '4', ko: '판 장착 · 최종 결합', pcs: plates, final: true, steps: [
      { t: 'place', part: 'step', txt: '디딤판을 아래 연결 가로대 위에 올리세요.' },
      { t: 'place', part: 'seat', txt: '상판을 프레임 위에 올리세요.' },
      { t: 'fasten', part: 'screw', txt: '십자 드라이버를 가져오세요.', tool: 'driver', toolKo: '십자 드라이버 PH2', nm: 3, nmSrc: '규격 표준값' }
    ] }
  ];

  const shaper = {
    key: 'shaper', ko: '소형 금속 성형기', code: 'ETAU-LIMEUR', drawing: { type: 'pdf', src: 'uploads/etau-limeur-jdw.pdf' },
    sizeSrc: '도면 치수', size: [458, 617, 389],
    read: { pages: 8, parts: 17, steps: 24, note: '치수 표기 있음 · 조립도 1·7쪽' },
    parts: {
      base: { ko: '베이스', col: PAINT, geo: [B(458, 40, 389)], dim: '458 × 40 × 389', src: '도면' },
      column: { ko: '컬럼', col: PAINT, geo: [B(20, 420, 300, -110), B(20, 420, 300, 110), B(200, 420, 20, 0, 0, -140), B(200, 420, 20, 0, 0, 140), B(240, 12, 300, 0, 204, 0)], dim: '240 × 420 × 300', src: '도면' },
      gear: { ko: '크랭크 기어', col: '#b3a58c', metal: 1, geo: [C(85, 24, 0, 0, 0, 0, 0, 0, null, 30), C(22, 70)], dim: 'Ø170 × 24', src: '도면' },
      pinion: { ko: '피니언', col: '#b3a58c', metal: 1, geo: [C(26, 30, 0, 0, 0, 0, 0, 0, null, 14), C(8, 90)], dim: 'Ø52 × 30', src: '도면' },
      rocker: { ko: '로커 암', col: '#8a949b', metal: 1, geo: [B(34, 300, 18)], dim: '34 × 300 × 18', src: '도면' },
      handle: { ko: '핸들', col: '#2b2f33', geo: [C(7, 70), C(16, 14, 0, 35, 0)], dim: 'Ø14 × 70', src: '도면' },
      ram: { ko: '램', col: '#6d7c86', geo: [B(520, 70, 90)], dim: '520 × 70 × 90', src: '도면' },
      gib: { ko: '지브', col: STEEL, metal: 1, geo: [B(240, 14, 16)], dim: '240 × 14 × 16', src: '도면' },
      head: { ko: '툴 헤드', col: '#6d7c86', geo: [B(70, 110, 80)], dim: '70 × 110 × 80', src: '도면' },
      bit: { ko: '바이트', col: '#d2d6da', metal: 1, geo: [B(12, 50, 12)], dim: '12 × 50 × 12', src: '도면' },
      support: { ko: '테이블 지지대', col: PAINT, geo: [B(60, 120, 90)], dim: '60 × 120 × 90', src: '도면' },
      table: { ko: '테이블', col: PAINT, geo: [B(200, 70, 200)], dim: '200 × 70 × 200', src: '도면' },
      vise: { ko: '바이스 몸체', col: '#7b8790', geo: [B(150, 25, 110)], dim: '150 × 25 × 110', src: '도면' },
      jaw: { ko: '바이스 조', col: STEEL, metal: 1, geo: [B(18, 45, 110)], dim: '18 × 45 × 110', src: '도면' },
      vscrew: { ko: '바이스 핸들', col: '#2b2f33', geo: [C(6, 110), C(14, 10, 0, 55, 0)], dim: 'Ø12 × 110', src: '도면' },
      bolt: { ko: '볼트 M8', col: STEEL, metal: 1, geo: [C(4, 50, 0, -25, 0), C(7.5, 6, 0, 3, 0, 0, 0, 0, null, 6)], dim: 'M8 × 50', src: '부품표' }
    },
    pieces: [], sections: []
  };
  shaper.sections = [
    { no: '1', ko: '베이스 · 컬럼', pcs: [P('base', 0, 20, 0), P('column', -80, 250, 0), P('bolt', -210, 40, 120), P('bolt', -210, 40, -120), P('bolt', 50, 40, 120), P('bolt', 50, 40, -120)], steps: [
      { t: 'check', part: 'column', txt: '컬럼 부품을 확인하세요.' },
      { t: 'place', part: 'base', txt: '베이스를 작업대에 놓으세요.' },
      { t: 'place', part: 'column', txt: '컬럼을 베이스 위 기준선에 맞추세요.' },
      { t: 'fasten', part: 'bolt', txt: '토크 렌치를 가져오세요.', tool: 'wrench', toolKo: '토크 렌치 13 mm', nm: 25, nmSrc: '규격 표준값 · 강도 8.8' }
    ] },
    { no: '2', ko: '구동부', sub: ['2-1 크랭크 기어', '2-2 로커 암 · 핸들'], pcs: [P('gear', -80, 230, 0, 90), P('pinion', -150, 120, 0, 90), P('rocker', -80, 290, 50, 0, 0, 12), P('handle', -80, 230, 180, 90)], steps: [
      { t: 'inside', part: 'gear', sub: 0, txt: '크랭크 기어를 컬럼 안쪽 축에 끼우세요.' },
      { t: 'inside', part: 'pinion', sub: 0, txt: '피니언을 크랭크 기어 아래에 물리세요.' },
      { t: 'inside', part: 'rocker', sub: 1, txt: '로커 암을 크랭크 핀에 거세요.' },
      { t: 'place', part: 'handle', sub: 1, txt: '핸들을 컬럼 앞쪽 축에 끼우세요.' }
    ] },
    { no: '3', ko: '램 · 툴 헤드', sub: ['3-1 램', '3-2 툴 헤드'], pcs: [P('ram', -20, 495, 0), P('gib', -80, 467, 53), P('gib', -80, 467, -53), P('head', 205, 405, 0), P('bit', 205, 325, 0)], steps: [
      { t: 'place', part: 'ram', sub: 0, txt: '램을 컬럼 위 안내면에 올리세요.' },
      { t: 'place', part: 'gib', sub: 0, txt: '지브를 램 양쪽 홈에 끼우세요.' },
      { t: 'place', part: 'head', sub: 1, txt: '툴 헤드를 램 앞쪽에 다세요.' },
      { t: 'place', part: 'bit', sub: 1, txt: '바이트를 툴 헤드 아래에 끼우세요.' }
    ] },
    { no: '4', ko: '테이블 · 바이스', pcs: [P('support', 140, 100, 0), P('table', 140, 195, 0), P('bolt', 60, 230, 80), P('bolt', 60, 230, -80), P('vise', 170, 242, 0), P('jaw', 115, 277, 0), P('jaw', 225, 277, 0)], steps: [
      { t: 'place', part: 'support', txt: '테이블 지지대를 베이스에 세우세요.' },
      { t: 'place', part: 'table', txt: '테이블을 지지대 위에 올리세요.' },
      { t: 'fasten', part: 'bolt', txt: '토크 렌치를 가져오세요.', tool: 'wrench', toolKo: '토크 렌치 13 mm', nm: 25, nmSrc: '규격 표준값 · 강도 8.8' },
      { t: 'place', part: 'vise', txt: '바이스 몸체를 테이블 위에 놓으세요.' },
      { t: 'place', part: 'jaw', txt: '바이스 조를 양쪽에 끼우세요.' }
    ] },
    { no: '5', ko: '최종 결합', final: true, pcs: [P('vscrew', 290, 270, 0, 0, 0, -90)], steps: [
      { t: 'place', part: 'vscrew', txt: '바이스 핸들을 끼워 완성하세요.' },
      { t: 'check', part: 'all', txt: '완성품을 확인하세요.' }
    ] }
  ];

  [stool, shaper].forEach(pr => {
    pr.pieces = []; pr.sections.forEach((s, si) => { s.idx = []; s.pcs.forEach(pc => { pc.sec = si; pc.i = pr.pieces.length; s.idx.push(pc.i); pr.pieces.push(pc); }); });
    pr.nSteps = pr.sections.reduce((a, s) => a + s.steps.length, 0);
  });
  window.FLOW_DATA = { stool, shaper };
})();
