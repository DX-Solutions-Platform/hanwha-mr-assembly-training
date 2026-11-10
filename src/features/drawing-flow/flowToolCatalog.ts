export const FLOW_FASTENING_TOOLS = [
  ...[2.5, 3, 4, 5, 6, 8, 10].map(v => ({ k: `hex${v}`, f: 'hex', v, ko: `육각 렌치 ${v} mm` })),
  ...[10, 13, 17, 19].map(v => ({ k: `sp${v}`, f: 'sp', v, ko: `스패너 ${v} mm` })),
  { k: 'torque0', f: 'torque', v: 0, ko: '토크 렌치' },
  { k: 'ph2', f: 'ph', v: 2, ko: '십자 드라이버 PH2' },
  { k: 'torx0', f: 'torx', v: 0, ko: 'Torx 비트 (규격 확인)' },
];

export const drawingToolKey = (key: string) => key === 'torque0' ? 'torque' : key === 'ph2' ? 'driver' : key;

export function findFlowFasteningTool(key?: string, label?: string) {
  return FLOW_FASTENING_TOOLS.find(tool => tool.k === key) ?? FLOW_FASTENING_TOOLS.find(tool => tool.ko === label);
}

export function trainingToolShape(key?: string, label?: string) {
  const tool = findFlowFasteningTool(key, label);
  if (!tool) return label;
  if (tool.f === 'hex') return 'hex';
  return tool.f === 'ph' || tool.f === 'torx' ? 'driver' : 'wrench';
}
