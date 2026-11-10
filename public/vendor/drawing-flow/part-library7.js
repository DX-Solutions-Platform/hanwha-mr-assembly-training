// Demo 7 부품 라이브러리 · 가상 사내 품번 체계(회사-분류-규격-길이-개정)와 시드 데이터
(function () {
  const TQ = { 3: 1.3, 4: 3, 5: 6, 6: 10, 8: 25, 10: 49, 12: 85, 14: 135, 16: 210 };
  const HEX = { cap: { 3: 2.5, 4: 3, 5: 4, 6: 5, 8: 6, 10: 8, 12: 10, 14: 12, 16: 14 }, csk: { 3: 2, 4: 2.5, 5: 3, 6: 4, 8: 5, 10: 6, 12: 8, 14: 10, 16: 10 }, grub: { 3: 1.5, 4: 2, 5: 2.5, 6: 3, 8: 4, 10: 5, 12: 6, 14: 6, 16: 8 } };
  const AF = { 3: 5.5, 4: 7, 5: 8, 6: 10, 8: 13, 10: 16, 12: 18, 14: 21, 16: 24 };
  const STD = { cap: ['BLT', '육각 구멍 볼트'], csk: ['CSK', '접시머리 나사'], grub: ['GRB', '무두 나사'], nut: ['NUT', '육각 너트'], dome: ['DNT', '캡 너트'], washer: ['WSH', '평와셔'] };
  const CAT = { plate: ['PLT', '판'], block: ['BLK', '블록'], rhs: ['FRM', '본체·각관'], shaft: ['SFT', '축'], bush: ['BSH', '부시·링'], disc: ['DSC', '원판'], gear: ['GER', '기어'], lever: ['LVR', '레버'], tnut: ['TNT', 'T너트'], other: ['MSC', '기타'] };
  const MAT = { MS: '강재', CI: '주철', BRZ: '청동', BRS: '황동', ALU: '알루미늄', 'S/S': '스테인리스', SYN: '고무·수지', blk: '흑착색 강' };
  const p3 = v => String(Math.max(0, Math.round(+v || 0))).padStart(3, '0');
  function dimPair(kind, d) {
    d = d || {};
    switch (kind) {
      case 'plate': return [d.L, d.T]; case 'block': case 'tnut': case 'other': return [d.L, d.H];
      case 'rhs': return [d.L, d.W]; case 'bush': return [d.od, d.l]; case 'disc': return [d.od, d.t];
      case 'gear': return [d.od, d.z]; case 'lever': return [d.L, d.T];
      case 'shaft': { const s = d.segs || [[20, 100, 0]]; return [Math.max(...s.map(a => a[0])), s.reduce((a, x) => a + x[1], 0)]; }
    }
    return [0, 0];
  }
  function code(e, rev) {
    rev = rev || e.rev || 'A';
    if (e.std) { const t = STD[e.type] || ['STD']; const ln = e.type === 'nut' ? Math.round(e.dm * 0.8) : e.type === 'dome' ? Math.round(e.dm * 1.3) : e.type === 'washer' ? Math.max(1, Math.round(e.dm * 0.17)) : e.L; return `DX-${t[0]}-M${e.dm}-${p3(ln)}-${rev}`; }
    const pre = e.pre || (CAT[e.kind] || ['MSC'])[0], dp = dimPair(e.kind, e.d);
    return `DX-${pre}-${p3(dp[0])}-${p3(dp[1])}${e.var ? '-' + String(e.var).padStart(2, '0') : ''}-${rev}`;
  }
  function stdInfo(type, dm) {
    if (type === 'washer') return { tq: null, tool: '—' };
    if (type === 'nut' || type === 'dome') return { tq: TQ[dm] || null, tool: `스패너 · 소켓 ${AF[dm] || '?'} mm` };
    if (type === 'grub') return { tq: null, tool: `육각 렌치 ${HEX.grub[dm] || '?'} mm`, note: '무두 나사 규정 토크 · 확인 필요' };
    return { tq: TQ[dm] || null, tool: `육각 렌치 ${(HEX[type] || HEX.cap)[dm] || '?'} mm` };
  }
  function specText(e) {
    const d = e.d || {}, f = v => Math.round(+v * 10) / 10;
    if (e.std) return e.L ? `M${e.dm} × ${e.L}` : `M${e.dm}`;
    if (e.specTxt) return e.specTxt;
    switch (e.kind) {
      case 'plate': return `${f(d.L)} × ${f(d.W)} × t${f(d.T)}`;
      case 'block': case 'tnut': case 'other': return `${f(d.L)} × ${f(d.W)} × ${f(d.H)}`;
      case 'rhs': return `${f(d.L)} × ${f(d.W)} × ${f(d.H)} · t${f(d.t)}`;
      case 'shaft': { const [D, L] = dimPair('shaft', d); return `Ø${f(D)} × ${f(L)}${(d.segs || []).some(s => s[2]) ? ' · 나사' : ''}`; }
      case 'bush': return `Ø${f(d.od)} / Ø${f(d.id)} × ${f(d.l)}`;
      case 'disc': return `Ø${f(d.od)} × t${f(d.t)}`;
      case 'gear': return `Ø${f(d.od)} · ${d.z}T · 폭 ${f(d.w)}`;
      case 'lever': return `${f(d.L)} × ${f(d.W)} × t${f(d.T)}`;
    }
    return '';
  }
  const SH = { prod: '소형 금속 셰이퍼', doc: 'JDWDS SHEET 01–07', secs: { 1: '베이스 및 컬럼 조립', 2: '작업대 및 바이스 조립', 3: '램 및 공구 홀더 조립', 4: '구동 메커니즘 조립' } };
  const SHC = [["1-01","베이스 플레이트","plate",{"L":501,"W":241,"T":30},1,"1","MS"],["1-02","베이스 받침대","plate",{"L":60,"W":38,"T":6},4,"1","MS"],["1-03","컬럼 본체","rhs",{"L":300,"W":201,"H":201,"t":12},1,"1","MS"],["1-04","상부 마운팅 플레이트","plate",{"L":275,"W":201,"T":74},1,"1","MS"],["1-05","램 가이드 플레이트","plate",{"L":121,"W":81,"T":10},2,"1","MS"],["1-06","램 가이드 기브 스트립","plate",{"L":121,"W":81,"T":10},2,"1","MS"],["1-07","작업대 가이드 플레이트","plate",{"L":181,"W":83,"T":18},2,"1","MS"],["1-08","잭 스크류 상부 베어링","bush",{"od":44,"id":25,"l":40},1,"1","BRZ"],["1-09","요동 레버 베어링 부시","bush",{"od":32,"id":20,"l":40},2,"1","BRZ"],["1-10","모터 샤프트 베어링 부시","bush",{"od":32,"id":20,"l":25},2,"1","BRZ"],["1-11","모터 샤프트 볼 베어링 하우징","bush",{"od":40,"id":20,"l":120,"fod":55,"ft":10},1,"1","MS"],["1-12","감속 기어 볼 베어링 하우징","bush",{"od":65,"id":40,"l":12,"fod":80,"ft":8},1,"1","MS"],["2-01","수직 잭 스크류","shaft",{"segs":[[12,252,1]]},1,"2","MS"],["2-02","이동식 더브테일 마운팅 플레이트","plate",{"L":61,"W":41,"T":12},1,"2","MS"],["2-03","스페이서 블록","block",{"L":58,"W":30,"H":28},1,"2","MS"],["2-04","크로스 슬라이드 가이드 플레이트","plate",{"L":57,"W":64,"T":12},1,"2","MS"],["2-05","크로스 슬라이드 블록","block",{"L":58,"W":26,"H":24},1,"2","BRS"],["2-06","크로스 슬라이드 스핀들","shaft",{"segs":[[16,303,1]]},1,"2","MS"],["2-07","작업 플랫폼 지지대","other",{"L":87,"W":81,"H":47},1,"2","MS"],["2-08","작업 플랫폼 플레이트","plate",{"L":121,"W":118,"T":8},1,"2","CI"],["2-09","바이스 베이스 플레이트","plate",{"L":50,"W":47,"T":22},1,"2","MS"],["2-10","바이스 이동 조","other",{"L":46,"W":34,"H":12},1,"2","MS"],["2-11","바이스 스크류 스핀들","shaft",{"segs":[[14,145,1]]},1,"2","MS"],["2-12","바이스 T-너트","tnut",{"L":18,"W":11,"H":10},4,"2","MS"],["3-01","램","block",{"L":349,"W":83,"H":60},1,"3","MS"],["3-02","요동 레버 상부 샤프트","shaft",{"segs":[[38,162,0]]},1,"3","MS"],["3-03","클래퍼 박스 홀더","block",{"L":114,"W":47,"H":30},1,"3","MS"],["3-04","클래퍼 박스","block",{"L":149,"W":32,"H":23},1,"3","MS"],["3-05","공구 홀더","block",{"L":88,"W":46,"H":24},1,"3","MS"],["3-06","절삭 공구","block",{"L":82,"W":52,"H":40},1,"3","MS"],["4-01","요동 레버 하부 샤프트","shaft",{"segs":[[24,224,0]]},1,"4","MS"],["4-02","요동 레버","lever",{"L":182,"W":52,"T":30,"d1":24,"d2":24},1,"4","MS"],["4-03","구동 샤프트","shaft",{"segs":[[16,128,0]]},1,"4","MS"],["4-04","구동 샤프트 기어 휠","gear",{"od":138,"w":24,"id":16,"z":48},1,"4","MS"],["4-05","아이들링 샤프트","shaft",{"segs":[[12,100,0]]},1,"4","MS"],["4-06","로킹 링","bush",{"od":48,"id":24,"l":8},1,"4","MS"],["4-07","크로스 컷 조정 디스크","disc",{"od":71,"t":4,"id":12},1,"4","MS"],["4-08","스페이서 링","bush",{"od":24,"id":12,"l":3},1,"4","MS"],["4-09","아이들러 샤프트 기어 휠","gear",{"od":66,"w":24,"id":12,"z":24},1,"4","MS"],["4-10","아이들러 샤프트 기어 휠 커버","disc",{"od":125,"t":6,"id":12},1,"4","MS"],["4-11","램 길이 조정 블록","block",{"L":82,"W":72,"H":17},1,"4","MS"],["4-12","조정 블록 스크류","shaft",{"segs":[[12,86,1]]},1,"4","MS"],["4-13","조정 피봇 액슬 너트","other",{"L":27,"W":22,"H":11},1,"4","MS"],["4-14","요동 슬라이드 블록 커버","plate",{"L":23,"W":23,"T":4},1,"4","BRZ"],["4-15","요동 슬라이드 블록","block",{"L":82,"W":62,"H":40},1,"4","MS"],["4-16","크로스 컷 조정 T-너트","tnut",{"L":21,"W":13,"H":12},1,"4","MS"],["4-17","크로스 컷 조정 로킹 플레이트","plate",{"L":62,"W":42,"T":15},1,"4","MS"],["4-18","크로스 컷 조정 폴","lever",{"L":71,"W":21,"T":10,"d1":10,"d2":10},1,"4","MS"],["4-19","조정 커넥팅 로드","shaft",{"segs":[[10,120,0]]},1,"4","MS"]];
  const SHS = [["csk",4,30,2],["csk",5,12,2],["cap",5,16,4],["grub",5,16,1],["nut",6,0,2],["grub",6,10,1],["grub",6,16,2],["csk",6,20,4],["cap",6,24,8],["grub",6,24,4],["csk",6,26,50],["grub",6,30,2],["grub",6,40,3],["grub",6,54,1],["dome",8,0,1],["washer",8,0,4],["cap",8,10,2],["cap",8,20,4],["cap",8,24,8],["cap",8,26,10],["grub",8,40,8],["csk",10,20,1],["cap",10,30,1],["cap",10,40,4],["cap",10,46,1],["cap",10,56,4],["cap",10,70,6],["dome",12,0,1],["washer",12,0,2],["cap",12,44,3]];
  const HP = { prod: '유압 펌프', doc: 'HP-2200 교육 데이터' };
  const HPC = [
    ['①', '펌프 본체', 'bush', { od: 260, id: 180, l: 220, fod: 300, ft: 20 }, 1, '하부', 'CI', 'HSG', '흡입·가압 본체 · HP-2200'],
    ['②', '베어링 하우징', 'bush', { od: 240, id: 120, l: 90, fod: 280, ft: 14 }, 1, '중부', 'CI', 'HSG', ''],
    ['③', '구동축', 'shaft', { segs: [[30, 420, 0]] }, 1, '중부', 'MS', '', ''],
    ['⑤', '상단 커버', 'disc', { od: 360, t: 8, id: 0 }, 1, '상부', 'ALU', 'CVR', ''],
    ['⑥', '베이스', 'plate', { L: 720, W: 520, T: 25 }, 1, '하부', 'MS', '', ''],
    ['C', '고정 링', 'bush', { od: 140, id: 120, l: 6 }, 1, '중부', 'MS', 'RNG', ''],
    ['D', '커플링', 'bush', { od: 50, id: 20, l: 70 }, 1, '중부', 'MS', 'CPL', '']
  ];
  const HPB = [
    { code: 'DX-MTR-2K2-090-A', name: '구동 모터', grp: '구매품', kind: 'bush', d: { od: 200, id: 0, l: 300, fod: 230, ft: 16 }, mat: 'ALU', specTxt: '2.2 kW · 프레임 90', dno: '④', card: '상부', qty: 1, maker: '구매 사양 · 확인 필요' },
    { code: 'DX-ORG-120-004-A', name: 'O-링', grp: '구매품', kind: 'bush', d: { od: 120, id: 112, l: 4 }, mat: 'SYN', specTxt: 'Ø120 · NBR', dno: 'B', card: '중부', qty: 2, maker: '구매 사양 · 확인 필요' },
    { code: 'DX-KEY-006-030-A', name: '평행 키', grp: '표준품', kind: 'block', d: { L: 30, W: 6, H: 6 }, mat: 'MS', specTxt: '6 × 6 × 30', dno: 'E', card: '중부', qty: 1 }
  ];
  function hist(src, ok, note) {
    const h = [{ rev: 'A', at: '2026-11-05 09:40', who: '제작 담당', note: src }];
    if (ok) h.push({ rev: 'A', at: '2026-11-05 14:10', who: '설계·품질 검수', note: '형상·수량 승인' });
    else h.push({ rev: 'A', at: '2026-11-05 14:10', who: '설계·품질 검수', note: note || '형상 확인 필요 · 승인 보류' });
    return h;
  }
  function seed() {
    const out = [], byCode = {};
    const push = e => { let c = code(e); if (byCode[c]) { let v = 2; while (byCode[code(Object.assign({}, e, { var: v }))]) v++; e.var = v; c = code(e); } e.code = c; byCode[c] = e; out.push(e); return e; };
    SHC.forEach(([dno, name, kind, d, qty, sec, mat]) => {
      const ok = kind !== 'other';
      push({ name, grp: '맞춤 부품', kind, d, mat, rev: 'A', status: ok ? '승인' : '승인 대기', src: ok ? '도면 분석' : '도면 분석 · 형상 추정', evid: `${SH.doc} · 품번 ${dno}`, uses: [{ prod: SH.prod, dno, card: SH.secs[sec], qty }], hist: hist('도면 JDWDS 분석으로 등록', ok, '형상을 이름으로 추정 · 형상 확인 필요'), rebuild: ['1-01', '1-03', '1-04', '3-01', '4-02', '4-04'].includes(dno) });
    });
    HPC.forEach(([dno, name, kind, d, qty, card, mat, pre, specTxt]) => {
      push({ name, grp: '맞춤 부품', kind, d, mat, pre: pre || undefined, specTxt: specTxt || undefined, rev: 'A', status: '승인', src: '교육 데이터', evid: `${HP.doc} · ${dno}`, uses: [{ prod: HP.prod, dno, card, qty }], hist: hist('유압 펌프 교육에서 등록', true) });
    });
    HPB.forEach(b => { const e = Object.assign({ rev: 'A', status: b.grp === '구매품' ? '승인 대기' : '승인', src: '교육 데이터', evid: `${HP.doc} · ${b.dno}`, uses: [{ prod: HP.prod, dno: b.dno, card: b.card, qty: b.qty }], hist: hist('유압 펌프 교육에서 등록', b.grp !== '구매품', '구매 사양서 미등록 · 확인 필요') }, b); e.code = b.code; byCode[b.code] = e; out.push(e); });
    const std = (type, dm, L) => { const k = `${type}|${dm}|${L}`; let e = out.find(x => x._k === k); if (!e) { const t = STD[type]; e = push({ _k: k, std: true, type, dm, L, name: t[1], grp: '표준품', kind: 'std', mat: 'blk', rev: 'A', status: '승인', src: '규격 카탈로그', evid: 'KS B 1003 · ISO 4762 계열 규격 · 확인 필요', uses: [], hist: [{ rev: 'A', at: '2026-11-04 10:00', who: '설계·품질 검수', note: '표준품 카탈로그 등록' }] }); } return e; };
    SHS.forEach(([type, dm, L, qty]) => std(type, dm, L).uses.push({ prod: SH.prod, dno: '부품표', card: '—', qty }));
    std('cap', 6, 20).uses.push({ prod: HP.prod, dno: 'A', card: '상부', qty: 4 });
    [4, 5, 6, 8, 10, 12].forEach(dm => [10, 16, 20, 25, 30, 40].forEach(L => std('cap', dm, L)));
    [4, 5, 6, 8, 10, 12, 16].forEach(dm => { std('nut', dm, 0); std('washer', dm, 0); });
    out.forEach(e => { delete e._k; e.spec = specText(e); if (e.std) Object.assign(e, stdInfo(e.type, e.dm)); });
    return out;
  }
  window.PartLib7 = { TQ, HEX, AF, STD, CAT, MAT, code, specText, stdInfo, dimPair, seed };
})();
