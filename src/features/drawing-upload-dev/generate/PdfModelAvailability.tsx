import styled from 'styled-components';
import { ActionButton, Muted, StateText } from '../ui/sharedStyles';
import type { planFlangeDrafts } from './planFlangeDrafts';
import type { GeneratedFlangeDraft, useFlangeDrafts } from './useFlangeDrafts';

export function PdfModelAvailability({ plan, results, isScanning, fallback, hasLibraryModels, onGenerate, onFallback }: {
  plan: ReturnType<typeof planFlangeDrafts> | null; results: ReturnType<typeof useFlangeDrafts>; onGenerate: (draft: GeneratedFlangeDraft) => void;
  isScanning: boolean;
  fallback: 'off' | 'preparing' | 'ready' | 'choose' | 'linked';
  hasLibraryModels: boolean;
  onFallback: () => void;
}) {
  const drafts = [...(results?.values() ?? [])].filter((item) => typeof item !== 'string');
  const failures = [...(results ?? [])].flatMap(([number, value]) => typeof value === 'string' ? [number + ' · ' + value] : []);
  const pending = !plan || (plan.candidates.length > 0 && !results) || (isScanning && !drafts.length && !plan.reused.length);
  const support = pending || fallback === 'preparing' ? 'preparing' : drafts.length || fallback === 'ready' ? 'supported' :
    plan?.reused.length || hasLibraryModels ? 'reused' : 'unsupported';
  const issues = [...(plan?.issues ?? []), ...failures];
  return <Root aria-label="이 PDF의 3D 생성 가능 여부" data-pdf-model-support={support}>
    <Heading><strong>PDF 기반 3D 생성</strong><StateText $tone={support === 'supported' || support === 'reused' ? 'success' : 'warning'}>
      {pending ? '플랜지 윤곽 확인 중' : drafts.length ? '3D 초안 ' + drafts.length + '건 준비' :
        fallback === 'ready' ? '입체 모델 초안 준비' : fallback === 'preparing' ? '입체 구조를 확인하는 중' :
        fallback === 'choose' ? '입체 근거 확인 필요' : plan?.reused.length || hasLibraryModels ? '라이브러리 GLB 사용' : '도면 확인 필요'}
    </StateText></Heading>
    {plan?.reused.length ? <Muted>{plan.reused.join(', ')} · 라이브러리에 GLB가 등록된 부품</Muted> : null}
    {drafts.length > 0 && <DraftList>{drafts.map((draft) => <Row key={draft.source.outline?.key ?? draft.source.values.part.partNumber} data-flange-draft={draft.source.values.part.partNumber} data-outline-draft={draft.source.outline?.key}>
      <Muted>{draft.source.values.part.partNumber || draft.source.evidence.outerDiameter.pageNumber + '쪽 · 번호 미기재'} · {draft.source.outline ? '볼트 구멍 ' + draft.source.values.parameters.holeCount + '개 인식' : '치수 7개 확인'}</Muted>
      <GenerateButton onClick={() => onGenerate(draft)}>{draft.source.outline ? '윤곽 3D 미리보기' : drafts.length === 1 ? '이 PDF로 3D 생성' : draft.source.values.part.partNumber + ' 3D 초안 검토'}</GenerateButton>
    </Row>)}</DraftList>}
    {drafts.length > 0 && <Muted>3D 미리보기에서 원문과 대조하고 치수를 확정할 수 있습니다.</Muted>}
    {fallback === 'ready' && <Row><Muted>PDF에서 입체 모델을 준비했습니다.</Muted><GenerateButton onClick={onFallback}>3D 초안 열기</GenerateButton></Row>}
    {fallback === 'choose' && <Row><Muted>입체도 모서리 또는 세 방향 투상도를 직접 지정할 수 있습니다.</Muted><GenerateButton onClick={onFallback}>도면 영역 확인</GenerateButton></Row>}
    {fallback === 'linked' && <Row><Muted>이 도면의 등록 모델을 조립 화면에서 사용할 수 있습니다.</Muted><GenerateButton onClick={onFallback}>다른 영역 초안 만들기</GenerateButton></Row>}
    {issues.length > 0 && <IssueList>{issues.map((issue) => <li key={issue}>{issue}</li>)}</IssueList>}
  </Root>;
}
const Root = styled.section(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2], padding: theme.space[3], border: '1px solid ' + theme.color.primaryLineWeak, background: theme.color.panel, flexShrink: 0 }));
const Heading = styled.div(({ theme }) => ({ display: 'flex', justifyContent: 'space-between', gap: theme.space[3], alignItems: 'baseline', strong: { color: theme.color.primarySoft, fontSize: theme.size.md, fontWeight: theme.weight.medium } }));
const Row = styled.div(({ theme }) => ({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: theme.space[2] }));
const DraftList = styled.div(({ theme }) => ({ display: 'grid', gap: theme.space[2], maxHeight: theme.space[8] * 2, overflow: 'auto' }));
const GenerateButton = styled(ActionButton)(({ theme }) => ({ minHeight: theme.space[6] + theme.space[2], fontSize: theme.size.sm }));
const IssueList = styled.ul(({ theme }) => ({ margin: 0, paddingLeft: theme.space[5], maxHeight: theme.space[8] * 2, overflow: 'auto', color: theme.color.warning, fontSize: theme.size.sm }));
