/** 원본 클릭·좌석·저항·오류 효과음. */
export class AssemblySound {
  private context: AudioContext | null = null;
  play(kind: 'click' | 'seat' | 'heavy' | 'tick' | 'err') {
    try {
      this.context ??= new AudioContext(); const context = this.context, now = context.currentTime, duration = kind === 'click' ? 0.05 : 0.018;
      if (context.state === 'suspended') void context.resume();
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate), data = buffer.getChannelData(0);
      for (let index = 0; index < data.length; index++) data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / data.length, kind === 'click' ? 2 : 4);
      const source = context.createBufferSource(); source.buffer = buffer;
      const filter = context.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = kind === 'click' ? 2200 : 4200; filter.Q.value = 1.2;
      if (kind === 'err') { const oscillator = context.createOscillator(), gain = context.createGain(); oscillator.type = 'square'; oscillator.frequency.setValueAtTime(320, now); oscillator.frequency.setValueAtTime(220, now + 0.12); gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3); oscillator.connect(gain); gain.connect(context.destination); oscillator.start(now); oscillator.stop(now + 0.32); return; }
      const gain = context.createGain(); gain.gain.value = kind === 'click' ? 0.9 : kind === 'seat' ? 0.4 : kind === 'heavy' ? 0.32 : 0.18;
      if (kind === 'heavy') filter.frequency.value = 2600; source.connect(filter); filter.connect(gain); gain.connect(context.destination); source.start(now);
    } catch { /* 원본과 같이 오디오가 차단되면 나머지 조립은 계속합니다. */ }
    try { navigator.vibrate?.(kind === 'click' ? [40, 30, 60] : kind === 'heavy' ? 20 : 8); } catch { /* 진동 미지원 */ }
  }
  dispose() { if (this.context) void this.context.close(); }
}
