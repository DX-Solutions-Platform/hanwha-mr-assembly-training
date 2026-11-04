import { theme } from '@/styles/theme';

export const PRINCIPLE_LIST = [
  { title: '정면 시선', body: '안내 문구는 화면 중앙 높이에 둡니다. Quest 3에서는 아래쪽으로 시선이 잘 가지 않습니다.' },
  { title: '글자 최소화', body: '도구 이름·단계만 짧게 씁니다. 클릭 위치는 글로 알려 주지 않습니다.' },
  { title: '한 장면', body: '교육 선택 → 공정 선택 → 교육장은 화면 전환 없이 이어집니다.' },
  { title: '같은 기능', body: '모든 교육은 기능·UI가 같고, 도면에 따른 부품과 조립 내용만 다릅니다.' },
];

export const COLOR_TOKEN_LIST = [
  { name: '메인', token: 'primary', value: theme.color.primary },
  { name: '메인 보조', token: 'primarySoft', value: theme.color.primarySoft },
  { name: '성공(민트)', token: 'success', value: theme.color.success },
  { name: '주의', token: 'warning', value: theme.color.warning },
  { name: '오류', token: 'danger', value: theme.color.danger },
  { name: '글자', token: 'ink', value: theme.color.ink },
  { name: '글자 보조', token: 'inkSub', value: theme.color.inkSub },
  { name: '패널', token: 'panel', value: theme.color.panel },
];

export const TYPE_SCALE_LIST = (Object.entries(theme.size) as [string, number][]).map(([token, size]) => ({ token, size }));
export const SPACE_SCALE_LIST = (Object.entries(theme.space) as [string, number][]).map(([token, size]) => ({ token, size }));

export const RESOLUTION_RULE_LIST = [
  'UI는 1920×1080 좌표로 만들고 화면 크기에 맞춰 스케일 (HD 0.67배 ~ 4K 2배)',
  '3D는 스케일하지 않고 실제 픽셀로 렌더 · 픽셀 예산 FHD×1.25로 렌더 배율 제한',
  '프레임이 떨어지면 렌더 배율을 1 → 0.85 → 0.7 → 0.55로 자동 하향',
  '모바일(휴대폰·태블릿)은 접근 차단, Quest 3 브라우저는 허용',
];
