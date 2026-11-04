import type { Product } from '@/types/training';

/**
 * 도면 분석 → 교육 데이터 생성.
 * 실제 서비스: 서버(비전 AI)에서 부품 인식·3D 모델 생성·조립 순서 추론 후 Product를 반환.
 * 판단 기준: 따로 만든 덩어리를 합치는 구조면 multi(덩어리별 카드 + 최종 결합), 아니면 single(카드 1장).
 * 지금은 API 자리만 두고 예시 결과(스텝 스툴)를 반환합니다.
 */
export async function analyzeDrawing(productName: string): Promise<Product> {
  // TODO: const response = await fetch('/api/drawings/analyze', { method: 'POST', body: formData }); return response.json();
  return {
    id: 'custom-' + Date.now(), code: 'NEW', name: productName || '스텝 스툴 BEKVÄM', isLive: true, structure: 'single', modelId: 'step-stool', parts: [],
    cards: [{
      id: 'stool-all', groupLabel: '도면 P1–P8', name: '스텝 스툴 조립', description: '측면 프레임부터 윗판 고정, 최종 점검까지 한 번에 진행합니다.', minutes: 18, status: 'now',
      steps: [
        { id: 's1', guide: '다리 프레임과 가로대를 맞대고 볼트 구멍을 정렬하세요.' },
        { id: 's2', guide: '육각 렌치를 가져오세요.', toolId: 'hexKey' },
        { id: 's3', guide: '아래 발판에 목심 2개를 끼우세요.' },
        { id: 's4', guide: '발판을 프레임 홈에 밀어 넣으세요.' },
        { id: 's5', guide: '육각 렌치를 가져오세요.', toolId: 'hexKey' },
        { id: 's6', guide: '윗판을 올리고 나사 3개를 체결하세요.', toolId: 'hexKey' },
        { id: 's7', guide: '바닥에 세우고 흔들림을 확인하세요.' },
        { id: 's8', guide: '볼트 8개를 끝까지 다시 조이세요.', toolId: 'hexKey' },
      ],
    }],
  };
}
