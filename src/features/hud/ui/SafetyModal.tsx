'use client';
import styled from 'styled-components';
import { CutButton } from '@/components/common/CutButton';

const SAFETY_RULE_LIST = ['보호 장갑과 보안경을 착용합니다.', '작업대 주변 정리 상태를 확인합니다.', '전원이 차단되어 있는지 확인합니다.'];

/** 안전 수칙 (부품 확인 전 1회) */
export function SafetyModal({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Dim>
      <Panel>
        <Title>안전 수칙</Title>
        {SAFETY_RULE_LIST.map((rule, ruleIndex) => <Rule key={rule}><No>{String(ruleIndex + 1).padStart(2, '0')}</No>{rule}</Rule>)}
        <CutButton onClick={onConfirm}>모두 확인했습니다</CutButton>
      </Panel>
    </Dim>
  );
}

const Dim = styled.div`position: absolute; inset: 0; z-index: 85; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.4);`;
const Panel = styled.div`width: 560px; padding: 28px 30px; display: flex; flex-direction: column; gap: 14px; background: rgba(10,8,6,.85); border: 1px solid rgba(243,115,33,.6); border-top: 2px solid #f37321;`;
const Title = styled.span`font-size: 26px; font-weight: 700; color: ${({ theme }) => theme.color.warning};`;
const Rule = styled.div`display: flex; gap: 12px; font-size: 17px; line-height: 1.5;`;
const No = styled.span`font-family: ${({ theme }) => theme.font.mono}; font-size: 13px; color: #f37321;`;
