import type { Product } from '@/types/training';
import { createCard } from './cardFactory';

// 시연용 기본 구성 3개. 도면 업데이트로 만든 교육은 trainingStore에서 뒤에 추가됩니다.
export const BASE_PRODUCT_LIST: Product[] = [
  {
    id: 'hydraulic-pump', code: 'P-01', name: '유압 펌프', isLive: true, structure: 'multi', modelId: 'hydraulic-pump', parts: [],
    cards: [
      createCard('pump-01', '01 · 베이스', '베이스·모터 하우징', '베이스 판을 지그에 고정하고 모터 하우징을 세웁니다.', 4, ['베이스 판을 작업 지그에 올리세요.', '모터 하우징을 플랜지 핀에 맞추세요.', ['토크 렌치를 가져오세요.', 'torqueWrench']], 'done'),
      createCard('pump-02', '02 · 모터', '모터 내부 조립', '고정자·회전자·베어링을 순서대로 넣습니다.', 5, ['고정자를 하우징에 밀어 넣으세요.', '회전자를 축에 끼우세요.', ['고무 망치를 가져오세요.', 'rubberHammer']], 'done'),
      createCard('pump-03', '03 · 펌프', '펌프부 조립', '커플링으로 모터와 펌프 바디를 연결합니다.', 5, ['커플링을 축 끝에 맞추세요.', '펌프 바디를 올리세요.', '고정 볼트를 꽂으세요.', ['토크 렌치를 가져오세요.', 'torqueWrench']], 'now'),
      createCard('pump-04', '04 · 밸브', '밸브 블록·캡', '밸브 블록과 상부 캡을 결합합니다.', 4, ['밸브 블록을 펌프 바디 위에 올리세요.', '상부 캡을 덮으세요.', ['토크 렌치를 가져오세요.', 'torqueWrench']]),
    ],
  },
  {
    id: 'vehicle', code: 'P-02', name: '차량', isLive: true, structure: 'multi', modelId: 'vehicle', parts: [],
    cards: [
      createCard('car-01', '01 · 차체', '차체 프레임', '하부 프레임과 차체 패널을 결합합니다.', 6, ['하부 프레임을 지그에 고정하세요.', '차체 패널을 올리세요.', ['토크 렌치를 가져오세요.', 'torqueWrench']], 'now'),
      createCard('car-02', '02 · 바퀴', '바퀴·서스펜션', '허브에 바퀴를 끼우고 휠 너트를 조입니다.', 5, ['바퀴를 허브에 맞추세요.', ['토크 렌치를 가져오세요.', 'torqueWrench']]),
      createCard('car-03', '03 · 차문', '차문', '차문을 힌지에 걸고 고정합니다.', 4, ['차문을 힌지 핀에 거세요.', ['육각 렌치를 가져오세요.', 'hexKey']]),
      createCard('car-04', '04 · 범퍼', '앞 범퍼·라이트', '앞 범퍼와 라이트를 장착합니다.', 4, ['라이트를 범퍼 홈에 끼우세요.', '범퍼를 차체에 맞추세요.']),
      createCard('car-05', '05 · 실내', '실내 조립', '좌석과 대시보드를 설치합니다.', 5, ['대시보드를 올리세요.', '좌석을 레일에 고정하세요.', ['육각 렌치를 가져오세요.', 'hexKey']]),
    ],
  },
  {
    id: 'drone', code: 'P-03', name: '드론', isLive: true, structure: 'multi', modelId: 'drone', parts: [],
    cards: [
      createCard('drone-01', '01 · 본체', '본체·배터리', '본체 프레임에 배터리를 장착합니다.', 3, ['본체를 지그에 올리세요.', '배터리를 슬롯에 밀어 넣으세요.'], 'now'),
      createCard('drone-02', '02 · 암', '암·모터', '암 4개를 본체에 끼우고 모터를 고정합니다.', 5, ['암을 본체 홈에 끼우세요.', '모터를 암 끝에 올리세요.', ['육각 렌치를 가져오세요.', 'hexKey']]),
      createCard('drone-03', '03 · 프로펠러', '프로펠러', '회전 방향에 맞춰 프로펠러를 끼웁니다.', 3, ['회전 방향 표시를 확인하세요.', '프로펠러를 모터 축에 끼우세요.']),
      createCard('drone-04', '04 · 카메라', '카메라·짐벌', '짐벌을 본체 아래에 고정합니다.', 3, ['짐벌 커넥터를 맞추세요.', '고정 나사를 조이세요.']),
      createCard('drone-05', '05 · 랜딩', '랜딩 기어', '랜딩 기어를 끼웁니다.', 2, ['랜딩 기어를 본체 아래에 끼우세요.']),
    ],
  },
];
