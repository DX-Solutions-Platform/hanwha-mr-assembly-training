'use client';
import type { ReferenceProps } from './referenceRuntime';
import HudPrototypeReference from './generated/HudPrototypeReference';
import styled from 'styled-components';
import type { RefObject } from 'react';

export interface ToolProps extends ReferenceProps { rest?: boolean; hovered?: boolean; }

/** 원본 loadToolThumbs/toolLoop만 재사용. r149 인스턴스를 공유해 공구의 버전 혼용을 없앱니다. */
export class ReferenceToolModel extends HudPrototypeReference {
  declare props: ToolProps;
  declare toolRaf: number;
  declare restCv: RefObject<HTMLCanvasElement | null>;
  declare toolCv: RefObject<HTMLCanvasElement | null>;
  constructor(props: ToolProps) { super(props); }
  mountReference() {
    this.updateReferenceState({ radial: !this.props.rest, restTool: this.props.rest ? 4 : null, rSel: this.props.hovered ? 4 : null });
    void this.loadToolThumbs(); this.toolRaf = this.scheduleFrame(this.toolLoop);
  }
  componentDidUpdate(previous: ToolProps) {
    if (previous.rest !== this.props.rest || previous.hovered !== this.props.hovered) this.updateReferenceState({ radial: !this.props.rest, restTool: this.props.rest ? 4 : null, rSel: this.props.hovered ? 4 : null });
  }
  render() { return this.props.rest ? <RestCanvas ref={this.restCv} width={300} height={300} /> : <ToolCanvas ref={this.toolCv} width={440} height={640} />; }
}
const ToolCanvas = styled.canvas`width:220px;height:320px;pointer-events:none;filter:drop-shadow(0 0 2px rgba(255,190,140,.85)) drop-shadow(0 0 10px rgba(243,115,33,.45));`;
const RestCanvas = styled(ToolCanvas)`width:150px;height:150px;`;
