import type { AssemblyReport } from './assemblyTypes';

export interface AssemblyRecord { mistakes: number; hints: number; torque: number[]; }

/** Demo 1 HUD.buildReport: 미체결 기본값과 등급 경계를 포함한 원본 계산식. */
export function createAssemblyReport(record: AssemblyRecord, elapsedSeconds: number, mode: 'practice' | 'eval', at: string): AssemblyReport {
  const seconds = Math.round(elapsedSeconds);
  const accuracy = record.torque.length ? Math.round(record.torque.filter((value) => Math.abs(value - 12) <= 0.6).length / record.torque.length * 100) : 100;
  return {
    time: `${Math.floor(seconds / 60)}분 ${String(seconds % 60).padStart(2, '0')}초`,
    mistakes: record.mistakes, hints: record.hints, torque: `${accuracy}%`,
    bolts: record.torque.length ? record.torque.map((value) => value.toFixed(1)).join(' · ') : '12.0 · 12.0 · 12.0 · 12.0',
    grade: record.mistakes === 0 && accuracy === 100 ? '우수' : record.mistakes <= 2 ? '양호' : '재교육 권장',
    mode: mode === 'eval' ? '평가 모드' : '연습 모드', at,
  };
}
