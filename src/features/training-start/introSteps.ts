export type IntroVisual = 'flow' | 'product' | 'safety' | 'tools' | 'report' | 'upload';

export interface IntroStep {
  label: string;
  code: string;
  title: string;
  description: string;
  detailList: string[];
  visual: IntroVisual;
}

export const INTRO_STEP_LIST: IntroStep[] = [
  {
    label: '프로젝트 안내', code: 'SYSTEM BRIEF', title: '조립의 전 과정을\n직접 경험하세요.',
    description: 'MR 조립 교육은 3D 제품을 살펴보고, 공정을 이해한 뒤 직접 조립을 실습하는 교육 공간입니다.',
    detailList: ['PC와 Meta Quest 3 브라우저에서 교육에 접속합니다.', '제품 선택부터 안전 확인, 조립 실습, 결과 확인까지 이어집니다.', '오른쪽 방향키로 안내를 넘기고, 마지막 화면에서 확인을 눌러 입장하세요.'],
    visual: 'flow',
  },
  {
    label: '제품 · 공정 선택', code: 'SELECT YOUR MISSION', title: '제품을 선택하고,\n구조를 파악하세요.',
    description: '교육 선택 화면의 3D 제품을 누르면 부품이 펼쳐지고, 공정별 조립 구간을 확인할 수 있습니다.',
    detailList: ['현재 유압 펌프 교육을 진행할 수 있으며, 차량과 드론은 준비 중입니다.', '분해된 제품의 공정 라벨을 눌러 조립 구간을 선택합니다.', '교육 시작을 누르면 선택한 공정의 준비 단계로 이동합니다.'],
    visual: 'product',
  },
  {
    label: '안전 · 부품 준비', code: 'PREPARE BEFORE ASSEMBLY', title: '안전과 부품을\n먼저 확인하세요.',
    description: '바로 조립에 들어가기 전에 안전 수칙과 준비 부품을 살펴보고, 작업 순서를 이해합니다.',
    detailList: ['교육장 진입 후 표시되는 안전 수칙을 확인합니다.', '부품 목록에서 이름과 형상을 살펴보고 필요한 부품을 확인합니다.', '준비를 마치고 진행하면 재료가 배치되고 실습이 시작됩니다.'],
    visual: 'safety',
  },
  {
    label: '조립 실습 · 조작', code: 'HANDS ON', title: '도구를 고르고,\n직접 조립하세요.',
    description: '단계별 안내에 따라 부품과 도구를 선택하고, 조립 순서와 체결 과정을 실습합니다.',
    detailList: ['V 키를 누른 채 공구 패널에서 사용할 도구를 고릅니다.', '드래그로 회전하고 WASD · Q/E · 휠로 시점을 조작합니다.', 'F 키로 시점을 초기화하고, Esc 키로 일시정지할 수 있습니다.'],
    visual: 'tools',
  },
  {
    label: '모드 · 결과 확인', code: 'REVIEW YOUR PERFORMANCE', title: '실습 기록으로\n결과를 확인하세요.',
    description: '연습과 평가 모드를 선택하고, 진행 현황과 리포트를 통해 조립 결과를 돌아볼 수 있습니다.',
    detailList: ['연습 모드와 평가 모드는 교육장 하단에서 선택합니다.', '진행 현황에서 소요 시간, 실수 횟수, 힌트 사용을 확인합니다.', '토크 정확도와 볼트별 체결 결과를 살펴보고 다시 실습할 수 있습니다.'],
    visual: 'report',
  },
  {
    label: '도면 · 교범 확장', code: 'EXPAND YOUR TRAINING', title: '도면에서\n새 교범을 추가하세요.',
    description: '교범 관리에서 기존 조립 교범을 편집하고 3D 교범을 확인할 수 있습니다.',
    detailList: ['교범 ZIP을 열어 단계별 동작과 작업 안내를 수정합니다.', 'STEP, PDF 또는 CAD 파일을 올려 3D 교범을 확인합니다.', '준비한 교범을 ZIP으로 내보냅니다.'],
    visual: 'upload',
  },
];
