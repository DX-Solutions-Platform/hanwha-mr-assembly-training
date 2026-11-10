'use client';
import React, { type CSSProperties } from 'react';
import styled from 'styled-components';
import type * as Three from 'three';
import type { ReferenceThree, ReferenceRenderer } from '@/features/education-select/referenceThree';

interface SourceProps { $style?: CSSProperties; $hover?: string; }
// 원본은 style 속성을 검색하고 장면 좌표를 갱신합니다. attrs로 같은 DOM 계약을 유지합니다.
export const SourceNode = styled.div.attrs<SourceProps>(({ $style }) => ({ style: $style }))<SourceProps>`
  &:hover { ${({ $hover }) => ($hover ?? '').split(';').filter(Boolean).map((rule) => `${rule} !important;`).join('')} }
`;
export interface ReferenceProps { cardIndex?: number; driveMenu?: boolean; }

/** DCLogic을 대체하는 React 수명주기. 장면·타이밍 값은 원본 생성 컴포넌트에 있습니다. */
export class PortedLogic<Props extends ReferenceProps = ReferenceProps> extends React.Component<Props, Record<string, unknown>> {
  referenceState: Record<string, unknown> = {};
  private disposed = false;
  private frames = new Set<number>();
  private timeouts = new Set<number>();
  private intervals = new Set<number>();
  private listeners: [string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined][] = [];
  private renderers = new Set<ReferenceRenderer>();
  declare holoLoop?: () => void;
  declare tick?: () => void;
  mountReference?(): void;
  unmountReference?(): void;
  updateReferenceState(update: Record<string, unknown> | ((state: Record<string, unknown>) => Record<string, unknown>), callback?: () => void) {
    if (this.disposed) return;
    const patch = typeof update === 'function' ? update(this.referenceState) : update;
    this.referenceState = { ...this.referenceState, ...patch };
    this.forceUpdate(callback);
  }
  componentDidMount() {
    this.disposed = false;
    // Strict Mode의 시험 마운트에서 WebGL을 만들지 않도록 커밋 뒤 초기화합니다.
    this.delay(() => {
      this.mountReference?.();
      if (this.props.driveMenu) {
        let last = 0;
        const step = () => { const now = performance.now(); if (now - last < 12) return; last = now; this.tick?.(); this.holoLoop?.(); };
        const frame = () => { this.scheduleFrame(frame); step(); };
        this.scheduleFrame(frame); this.repeat(step, 16);
      }
    }, 0);
  }
  componentWillUnmount() {
    this.disposed = true; this.unmountReference?.();
    this.frames.forEach(cancelAnimationFrame); this.timeouts.forEach(clearTimeout); this.intervals.forEach(clearInterval);
    this.frames.clear(); this.timeouts.clear(); this.intervals.clear();
    this.listeners.forEach(([type, listener, options]) => window.removeEventListener(type, listener, options)); this.listeners = [];
    this.renderers.forEach((renderer) => { renderer.dispose(); renderer.forceContextLoss(); }); this.renderers.clear();
    window.speechSynthesis?.cancel();
  }
  scheduleFrame(callback: FrameRequestCallback): number {
    if (this.disposed) return 0;
    const id = requestAnimationFrame((now) => { this.frames.delete(id); if (!this.disposed) callback(now); }); this.frames.add(id); return id;
  }
  delay(callback: () => void, ms = 0): number {
    if (this.disposed) return 0;
    const id = window.setTimeout(() => { this.timeouts.delete(id); if (!this.disposed) callback(); }, ms); this.timeouts.add(id); return id;
  }
  repeat(callback: () => void, ms: number): number {
    if (this.disposed) return 0;
    const id = window.setInterval(() => { if (!this.disposed) callback(); }, ms); this.intervals.add(id); return id;
  }
  listen(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
    window.addEventListener(type, listener, options); this.listeners.push([type, listener, options]);
  }
  unlisten(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
    window.removeEventListener(type, listener, options); this.listeners = this.listeners.filter(([t, l]) => t !== type || l !== listener);
  }
  createRenderer(T: ReferenceThree, parameters: Three.WebGLRendererParameters): ReferenceRenderer {
    const renderer = new T.WebGLRenderer(parameters) as ReferenceRenderer; this.renderers.add(renderer); return renderer;
  }
  referenceParams() {
    const params = new URLSearchParams(location.search);
    if (!params.has('sec') && this.props.cardIndex !== undefined) params.set('sec', String(Math.max(0, Math.min(3, this.props.cardIndex))));
    return params;
  }
}
export const ReferenceBoundary = styled.div<{ $scroll?: boolean }>`
  position:fixed;inset:0;overflow:${({ $scroll }) => $scroll ? 'auto' : 'hidden'};background:#000;color:#f2ede8;font-family:'NexonLv2Gothic',sans-serif;
  &, & * { box-sizing:content-box; }
  a {color:#f37321;} a:hover {color:#ff9a4d;}
`;
