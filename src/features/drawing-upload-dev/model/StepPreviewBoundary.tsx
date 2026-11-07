import { Component, type ReactNode } from 'react';
import { ActionButton } from '../ui/sharedStyles';

export class StepPreviewBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    return this.state.hasError ? <div role="alert">3D 미리보기를 열지 못했습니다. WebGL을 지원하는 브라우저인지 확인해 주세요.<ActionButton onClick={this.props.onRetry}>미리보기 다시 열기</ActionButton></div> : this.props.children;
  }
}
