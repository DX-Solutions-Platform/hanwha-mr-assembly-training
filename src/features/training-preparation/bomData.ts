/** Demo 1 HUD.dc.html BOM 원문. */
export const BOM = [
    { code: 'A', name: '고정 볼트', spec: 'M6 × 20', qty: 4, desc: '상단 커버를 모터에 고정합니다. 대각선 순서로 체결합니다.', use: '상부 03' },
    { code: 'B', name: 'O-링', spec: 'Ø 120 · NBR', qty: 2, desc: '하우징과 본체 사이를 밀봉해 작동유 누유를 막습니다.', use: '중부 01' },
    { code: 'C', name: '고정 링', spec: 'Ø 140', qty: 1, desc: '베어링이 축 방향으로 빠지지 않게 잡아 줍니다.', use: '중부 03' },
    { code: 'D', name: '커플링', spec: 'Ø 50 · L 70', qty: 1, desc: '모터 축과 구동축을 연결해 회전을 전달합니다.', use: '중부 02' },
    { code: 'E', name: '평행 키', spec: '6 × 6 × 30', qty: 1, desc: '축과 커플링 사이에 끼워 미끄러짐 없이 회전을 전달합니다.', use: '중부 02' },
    { code: 'F', name: '토크 렌치', spec: '12 N·m', qty: 1, desc: '설정 토크에 도달하면 클릭음으로 알려 토크 초과를 막습니다.', use: '상부 03' },
    { code: '①', name: '펌프 본체', spec: 'HP-2200', qty: 1, desc: '작동유를 흡입하고 가압하는 하부의 중심 부품입니다.', use: '하부 01' },
    { code: '②', name: '베어링 하우징', spec: 'Ø 240', qty: 1, desc: '구동축 베어링을 지지하며 상부와 하부를 연결합니다.', use: '중부 01' },
    { code: '③', name: '구동축', spec: 'Ø 30 · L 420', qty: 1, desc: '모터의 회전을 펌프 임펠러로 전달하는 축입니다.', use: '중부 02' },
    { code: '④', name: '구동 모터', spec: '2.2 kW', qty: 1, desc: '펌프를 회전시키는 전동기입니다. 상부 조립의 기준 부품입니다.', use: '상부 01' },
    { code: '⑤', name: '상단 커버', spec: 'Ø 360', qty: 1, desc: '모터 상부를 덮어 냉각 팬과 배선을 보호합니다.', use: '상부 02' },
    { code: '⑥', name: '베이스', spec: '720 × 520', qty: 1, desc: '펌프 전체를 바닥에 고정하는 받침입니다.', use: '하부 02' }
] as const;
