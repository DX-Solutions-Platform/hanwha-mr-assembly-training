type Data = Record<string, unknown>;
export type Position = [number, number, number];
type Rotation = [number, number, number, number];
export type PreviewPose = { position: Position; rotation?: Rotation };
export type LessonApproach = { directionDeg: number; tiltDeg: number; distanceM: number };
export type PreviewPart = { id: string; assetId: string; nodeName: string; name: string; initial?: PreviewPose; assembled?: PreviewPose };
type PreviewPort = { id: string; partId: string; pose?: PreviewPose };
export type PreviewAction = {
  key: string; kind: string; label: string; fields: [string, string][]; partIds: string[];
  source?: PreviewPort; target?: PreviewPort; movingId?: string;
  surface?: { pose: PreviewPose; outer: number; inner: number; sectors: number };
  points: Position[]; bolts: { id: string; pose: PreviewPose }[]; boltOrder: string[]; rotationDeg?: number; clockwise: boolean;
  tool: string; toolName: string; travelM?: number; dwellS?: number; radiusM?: number; twoHanded: boolean;
  approach?: LessonApproach; approachDistance?: number;
  raw: Data;
};

export function lessonRecord(value: unknown): Data {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Data : {};
}
const record = lessonRecord;

function rows(value: unknown) {
  return Array.isArray(value) ? value.map(record) : [];
}

function id(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function tuple(value: unknown, length: number): value is number[] {
  return Array.isArray(value) && value.length === length && value.every((entry) => number(entry) !== undefined);
}

function pose(value: unknown): PreviewPose | undefined {
  const item = record(value);
  if (!tuple(item.positionM, 3)) return undefined;
  return { position: item.positionM as Position, rotation: tuple(item.rotationXyzw, 4) ? item.rotationXyzw as Rotation : undefined };
}

export function lessonText(value: unknown, locale: string): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((item) => lessonText(item, locale)).filter(Boolean).join('\n');
  const text = record(value);
  const translated = text[locale] ?? text.ko ?? text.en;
  return typeof translated === 'string' ? translated : '';
}

export function previewAssets(value: unknown) {
  return rows(value).flatMap((item) => {
    const path = id(item.path);
    const assetId = id(item.id);
    return assetId && path.toLowerCase().endsWith('.glb') ? [{ id: assetId, path }] : [];
  });
}

export function previewParts(value: unknown, locale: string): PreviewPart[] {
  return rows(value).flatMap((part) => {
    const partId = id(part.id), assetId = id(part.assetId), nodeName = id(part.nodeName);
    return partId && assetId && nodeName ? [{ id: partId, assetId, nodeName,
      name: lessonText(part.name, locale) || partId, initial: pose(part.initialPose), assembled: pose(part.assembledPose) }] : [];
  });
}

const actionLabels: Record<string, string> = { attach: '부품 장착', fasten: '볼트 체결', thread: '손 체결', inspect: '표면 검사', touch: '접촉 작업' };
const toolLabels: Record<string, string> = { brush: '브러시', wipe: '와이퍼', gauge: '게이지', pen: '마커', torque: '토크 렌치', driver: '드라이버', spanner: '스패너', hammer: '해머' };
const completionLabels: Record<string, string> = {
  all_enabled_actions: '활성 동작을 모두 완료', all_bolts_reach_rotation: '모든 볼트가 지정 회전량에 도달',
};

export function completionText(value: unknown) {
  const key = id(value);
  return completionLabels[key] ?? key;
}

export function previewActions(step: unknown, area: unknown, modeList: unknown, parts: PreviewPart[], locale: string): PreviewAction[] {
  const scope = record(area);
  const ports = new Map(rows(scope.ports).map((item) => [id(item.id), { id: id(item.id), partId: id(item.partId), pose: pose(item.pose) }]));
  const connections = new Map(rows(scope.connections).map((item) => [id(item.id), item]));
  const modes = new Map(rows(modeList).map((item) => [id(item.id), lessonText(item.name, locale)]));
  const tools = new Map(rows(scope.tools).map((item) => [id(item.id), item]));
  const partNames = new Map(parts.map((part) => [part.id, part.name]));

  const actions = rows(record(step).actions);
  return actions.map((action, index) => {
    const kind = id(action.kind);
    const connection = record(connections.get(id(action.connectionId)));
    const source = ports.get(id(connection.sourcePortId)), target = ports.get(id(connection.targetPortId));
    const direct = id(action.partId), held = id(record(action.hold).partId);
    const movingId = kind === 'attach' || kind === 'thread' ? source?.partId || direct || undefined : undefined;
    const partIds = [...new Set([direct, source?.partId, target?.partId, held].filter((part): part is string => !!part))];
    const fields: [string, string][] = [];
    const add = (label: string, value?: string) => { if (value) fields.push([label, value]); };
    const addNumber = (label: string, value: unknown, unit: string, factor = 1) => {
      const amount = number(value);
      if (amount !== undefined) add(label, (amount * factor).toLocaleString('ko-KR', { maximumFractionDigits: 3 }) + unit);
    };
    const partName = (part?: string) => part ? partNames.get(part) ?? part : '';
    add('작업 부품', partName(direct || source?.partId));
    add('맞물리는 부품', partName(target?.partId));
    add('고정할 부품', partName(held));
    const tool = id(action.toolId) || id(action.tool);
    const toolData = tools.get(tool);
    const toolName = lessonText(toolData?.name, locale) || toolLabels[tool] || tool;
    add('공구', toolName);
    const turn = record(action.turn);
    const direction = id(turn.direction);
    add('회전 방향', direction === 'clockwise_viewed_from_head' ? '머리 쪽에서 시계 방향'
      : direction === 'counterclockwise_viewed_from_head' ? '머리 쪽에서 반시계 방향' : direction);
    addNumber('필요 회전량', turn.requiredRotationDeg, '°');
    const torque = record(action.torqueDisplay);
    addNumber(torque.basis === 'educational_simulation' ? '교육용 표시 토크' : '표시 토크', torque.valueNm, ' N·m');
    add('체결 차수', lessonText(action.passLabel, locale));
    const bolts = rows(action.bolts).flatMap((bolt) => {
      const boltId = id(bolt.id), boltPose = pose(bolt.pose);
      return boltId && boltPose ? [{ id: boltId, pose: boltPose }] : [];
    });
    const boltOrder = Array.isArray(action.order) ? action.order.map(id).filter(Boolean) : bolts.map((bolt) => bolt.id);
    if (boltOrder.length) add('체결 순서', boltOrder.join(' → '));
    const fit = record(action.fit), acceptance = record(connection.acceptance);
    const guide = record(connection.guide);
    const approachDistance = number(guide.approachModelM);
    const authored = record(action.approach);
    const directionDeg = number(authored.directionDeg), tiltDeg = number(authored.tiltDeg), distanceM = number(authored.distanceM);
    const approach = directionDeg !== undefined && tiltDeg !== undefined && distanceM !== undefined && distanceM > 0 && tiltDeg >= 0 && tiltDeg <= 90
      ? { directionDeg, tiltDeg, distanceM } : undefined;
    if (kind === 'attach') {
      addNumber('진입 방향', approach?.directionDeg, '°');
      addNumber('진입 기울기', approach?.tiltDeg, '°');
      addNumber('진입 가이드 거리', approach?.distanceM ?? approachDistance, ' mm', 1000);
    }
    add('잡는 방식', fit.grip === 'one-hand' ? '한 손' : fit.grip === 'two-hand' ? '두 손' : id(fit.grip));
    addNumber('삽입 위치 허용 오차', fit.positionToleranceM ?? acceptance.distanceWorldM, ' mm', 1000);
    addNumber('삽입 기울기 허용 오차', fit.tiltToleranceDeg ?? acceptance.angleDeg, '°');
    addNumber('회전 정렬 허용 오차', fit.clockingToleranceDeg, '°');
    addNumber('나사 이동 거리', action.travelM, ' mm', 1000);
    const rawSurface = record(action.surface), surfacePose = pose(rawSurface.pose);
    const outer = number(rawSurface.radiusOuterM) ?? 0;
    const sectors = Math.min(64, Math.max(1, Math.floor(number(rawSurface.sectors) ?? 1)));
    const surface = surfacePose && outer > 0 ? { pose: surfacePose, outer,
      inner: Math.min(outer * .99, Math.max(0, number(rawSurface.radiusInnerM) ?? 0)), sectors } : undefined;
    addNumber('검사 구역', rawSurface.sectors, '개');
    addNumber('검사 바깥 반지름', rawSurface.radiusOuterM, ' mm', 1000);
    addNumber('검사 안쪽 반지름', rawSurface.radiusInnerM, ' mm', 1000);
    const points = rows(action.points).flatMap((point) => tuple(point.positionM, 3) ? [point.positionM as Position] : []);
    if (points.length) add('접촉 위치', points.length + '곳');
    addNumber('지점당 접촉 시간', action.dwellS, '초');
    addNumber('접촉 반경', action.radiusM, ' mm', 1000);
    const prerequisite = id(action.afterActionId);
    const prerequisiteIndex = actions.findIndex((item) => id(item.id) === prerequisite);
    if (prerequisite) add('선행 동작', prerequisiteIndex < 0 ? prerequisite
      : (prerequisiteIndex + 1) + '. ' + (actionLabels[id(actions[prerequisiteIndex].kind)] ?? id(actions[prerequisiteIndex].kind)));
    if (Array.isArray(action.modeIds)) add('교육 모드', action.modeIds.map(id).filter(Boolean).map((key) => modes.get(key) || key).join(' · '));
    add('완료 조건', completionText(action.completedWhen));
    return { key: id(action.id) || String(index), kind, label: actionLabels[kind] ?? (kind || '동작'), fields, partIds, source, target, movingId,
      surface, points, bolts, boltOrder, rotationDeg: number(turn.requiredRotationDeg), clockwise: direction !== 'counterclockwise_viewed_from_head', approach, approachDistance,
      tool: id(toolData?.appToolKey) || tool, toolName, travelM: number(action.travelM), dwellS: number(action.dwellS),
      radiusM: number(action.radiusM), twoHanded: fit.grip === 'two-hand', raw: action };
  });
}
