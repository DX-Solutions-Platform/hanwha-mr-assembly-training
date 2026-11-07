import styled from 'styled-components';
import { ActionButton, Muted } from './sharedStyles';
import { ActionMenu } from './ActionMenu';

export function UploadEmpty({ isLoading, onChoose, onExample, onAssembly }: { isLoading: boolean; onChoose: () => void; onExample: () => void; onAssembly: () => void }) {
  return <Root>
    <Mark aria-hidden="true">↑</Mark>
    <Title>도면을 올리면, 정보가 정리됩니다.</Title>
    <Description>PDF와 스캔 도면의 부품표·치수를 읽고 원문과 연결합니다.</Description>
    <Actions>
      <ActionButton $primary onClick={onChoose} disabled={isLoading}>PDF 선택</ActionButton>
      <ActionMenu label="예시로 둘러보기" direction="down" items={[
        { label: 'PDF로 3D 만들기', ariaLabel: 'PDF → 3D 예시', description: '플랜지 도면의 치수와 3D 모델 확인', onClick: onExample },
        { label: '조립품 편집하기', ariaLabel: '조립품 편집 예시', description: '플랜지·베이스판·볼트·너트 위치 수정', onClick: onAssembly },
      ]} />
    </Actions>
    <Muted>이곳에 PDF를 끌어다 놓을 수도 있습니다 · 50 MB / 200쪽 이하</Muted>
    <Footnote>스캔 PDF는 한국어·영문 OCR로 자동 인식합니다. 파일은 브라우저 안에서 처리됩니다.</Footnote>
  </Root>;
}
const Root = styled.div(({ theme }) => ({
  height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: theme.space[5], border: '1px dashed ' + theme.color.primaryLine, background: theme.color.panel,
  padding: theme.space[6], textAlign: 'center',
}));
const Mark = styled.span(({ theme }) => ({
  color: theme.color.primary, fontSize: theme.size.display, border: '1px solid ' + theme.color.primaryLine,
  width: theme.space[8] + theme.space[5], height: theme.space[8] + theme.space[5], display: 'grid', placeItems: 'center',
}));
const Title = styled.h2(({ theme }) => ({ margin: 0, fontSize: theme.size.xxl, lineHeight: 1.4 }));
const Description = styled.p(({ theme }) => ({ margin: 0, fontSize: theme.size.base, lineHeight: 1.7, color: theme.color.inkSub }));
const Actions = styled.div(({ theme }) => ({ display: 'flex', gap: theme.space[3] }));
const Footnote = styled.p(({ theme }) => ({ maxWidth: theme.space[8] * 9, margin: 0, color: theme.color.inkDisabled, fontSize: theme.size.md, lineHeight: 1.7 }));
