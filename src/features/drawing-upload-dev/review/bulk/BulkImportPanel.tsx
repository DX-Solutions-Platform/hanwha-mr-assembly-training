import { useRef } from 'react';
import styled from 'styled-components';
import { ActionButton, Muted } from '../../ui/sharedStyles';
import { CheckLabel, ReviewLabel, ReviewTextArea } from '../reviewStyles';

export function BulkImportPanel({ text, sourceName, shouldOverwrite, onText, onOverwrite, onError }: {
  text: string; sourceName: string; shouldOverwrite: boolean;
  onText: (text: string, sourceName: string) => void; onOverwrite: (value: boolean) => void; onError: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const load = async (file: File) => {
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('2 MB 이하의 CSV·TSV 파일을 선택하세요.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      let decoded: string;
      if (bytes[0] === 255 && bytes[1] === 254) decoded = new TextDecoder('utf-16le').decode(bytes);
      else if (bytes[0] === 254 && bytes[1] === 255) decoded = new TextDecoder('utf-16be').decode(bytes);
      else { try { decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { decoded = new TextDecoder('euc-kr', { fatal: true }).decode(bytes); } }
      onText(decoded, file.name); onError('');
    } catch (reason) { onError(reason instanceof Error ? reason.message : '부품표를 읽지 못했습니다.'); }
  };
  return <Root>
    <Header><h3>부품표로 한 번에 채우기</h3><ActionButton onClick={() => input.current?.click()}>부품표 파일 선택</ActionButton></Header>
    <Muted>CSV·TSV를 가져오거나 Excel의 표를 복사해 붙여넣으세요. 같은 부품번호끼리 연결합니다.</Muted>
    <ReviewLabel>부품표 붙여넣기<ReviewTextArea aria-label="일괄 부품표 입력" value={text} maxLength={2 * 1024 * 1024} spellCheck={false} placeholder={'부품번호\t품명\t수량\t재질\t규격·비고\nFLG-001\t플랜지\t1\tAL6061\t외경 100 mm'} onChange={(event) => { onText(event.target.value, '붙여넣은 부품표'); onError(''); }} /></ReviewLabel>
    {text && <Muted>가져온 자료: {sourceName}</Muted>}
    <CheckLabel><input aria-label="일괄 기존값 덮어쓰기" type="checkbox" checked={shouldOverwrite} onChange={(event) => onOverwrite(event.target.checked)} />기존 입력값도 바꾸기 · 값이 변경된 부품은 확정이 해제됩니다.</CheckLabel>
    <Muted>기본은 빈칸만 채웁니다. 부품번호의 앞자리 0과 기호는 유지해 주세요.</Muted>
    <input ref={input} type="file" aria-label="일괄 부품표 파일" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void load(file); event.target.value = ''; }} />
  </Root>;
}
const Root = styled.section(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[3] }));
const Header = styled.div(({ theme }) => ({ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: theme.space[3], h3: { margin: 0, fontSize: theme.size.base, color: theme.color.primarySoft }, button: { minHeight: theme.space[6] + theme.space[2], fontSize: theme.size.sm }, textarea: { minHeight: theme.space[8] * 2 } }));
