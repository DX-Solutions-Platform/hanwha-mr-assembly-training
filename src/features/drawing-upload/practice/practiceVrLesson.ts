import { Quaternion, Vector3 } from 'three';
import type { StepAssemblyPart } from '../../drawing-upload-dev/model/stepAssemblyParts';
import { modelScale } from '../../drawing-upload-dev/model/stepModel';
import type { StepModel, VectorTuple } from '../../drawing-upload-dev/model/stepTypes';
import type { AssemblyInstruction } from '../instructions/assemblyInstructions';
import { getPracticeGroupBounds, type PracticeSequence, type PracticeStage } from './stepPracticeSequence';
import type { PracticeTraySettings } from './practiceTrayLayout';
import { getPracticeToolKind } from './practiceToolGeometry';

const identity = [0, 0, 0, 1] as const;
const reversePort = new Quaternion(0, 1, 0, 0);
const front = new Vector3(0, 0, 1);
const locale = (ko: string, en = ko) => ({ ko, en });
const scene = { anchorPolicy: 'user_front_floor_v1', offsetPose: { positionM: [0, 0.85, -1.05], rotationXyzw: identity } };

export function mmToLessonAxes([x, y, z]: VectorTuple) {
  return new Vector3(x, z, -y).multiplyScalar(0.001);
}

const membersOf = (stage: PracticeStage) => stage.kind === 'join' ? stage.members : [stage.target.partNumber];
const partKey = (stage: PracticeStage) => stage.kind === 'join' ? `group-${[...stage.members].sort((a, b) => a - b).join('-')}` : `part-${stage.target.partNumber}`;

export function createPracticeVrLesson(model: StepModel, parts: StepAssemblyPart[], sequence: PracticeSequence,
  instructions: AssemblyInstruction[], settings: Pick<PracticeTraySettings, 'captions' | 'cards'>, contentVersion: string) {
  if (sequence.initialPart !== undefined || sequence.stages.length < 2) throw new Error('제품 전체실습에서 조립 부품 두 개 이상을 준비해 주세요.');
  const title = model.manifest.name.replace(/\.st(?:e)?p$/i, '');
  const slug = title.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36) || 'product';
  const trainingId = `web-${slug}-${model.manifest.sha256.slice(0, 8)}`;
  const modelCenter = new Vector3(...model.bounds.min).lerp(new Vector3(...model.bounds.max), 0.5);
  const origin = modelCenter.clone().setZ(model.bounds.min[2]);
  const mmPerWorldUnit = 1 / modelScale(model.bounds);
  const productSpan = mmPerWorldUnit * 0.002;
  const rootScale = 0.6 / productSpan;
  const instructionByPart = new Map(instructions.map((step) => [step.partNumber, step]));
  const main = sequence.stages.filter((step) => !step.workArea);
  const areas = [...new Map(sequence.stages.flatMap((step) => step.workArea ? [[step.workArea.id, step.workArea] as const] : [])).values()];

  function buildArea(stages: PracticeStage[], assetId: string, module: boolean) {
    const path = `assets/models/${assetId}.glb`;
    const hasFastening = stages.some((step) => step.kind === 'fasten');
    const geometry = stages.map((stage) => {
      const members = membersOf(stage).map((number) => parts[number - 1]);
      const bounds = getPracticeGroupBounds(members);
      const pivot = new Vector3(...bounds.min).lerp(new Vector3(...bounds.max), 0.5);
      const position = mmToLessonAxes(pivot.clone().sub(origin).toArray());
      return { id: partKey(stage), members, pivot, position, bounds, stage };
    });
    const assets = [{ id: assetId, kind: 'model', path }];
    const lessonParts = geometry.map(({ id, members, position, bounds, stage }, index) => {
      const name = stage.kind === 'join' ? stage.name : members[0].name;
      const start = position.clone();
      if (index > 0) {
        const lane = (index - 1) % 4, row = Math.floor((index - 1) / 4);
        const direction = lane < 2 ? 1 : -1;
        start.x += direction * productSpan * (0.57 + 0.18 * (lane % 2));
        start.z += productSpan * (0.15 + 0.17 * row);
        start.y = (bounds.max[2] - bounds.min[2]) * 0.0005;
      }
      return { id, assetId, nodeName: id, name: locale(name),
        description: locale(instructionByPart.get(stage.target.partNumber)?.description || name), fixed: index === 0,
        assembledPose: { positionM: position.toArray(), rotationXyzw: identity },
        initialPose: { positionM: start.toArray(), rotationXyzw: identity } };
    });
    const ports = [], connections = [], steps = [];
    const tools = new Map<string, { id: string; appToolKey: string; name: ReturnType<typeof locale> }>();
    for (let index = 1; index < geometry.length; index++) {
      const entry = geometry[index], stage = entry.stage;
      const support = stage.kind === 'mount' ? stage.support : undefined;
      const receiver = (support && geometry.slice(0, index).find(({ members }) => members.some(({ number }) => number === support.partNumber))) ?? geometry[0];
      const point = new Vector3(...stage.target.pick.point).multiplyScalar(mmPerWorldUnit).add(modelCenter);
      const normal = mmToLessonAxes(stage.target.pick.normal).normalize();
      const orientation = new Quaternion().setFromUnitVectors(front, normal.lengthSq() ? normal : front);
      const id = `step-${index}`, connectionId = `connection-${index}`;
      const sourcePortId = `${connectionId}-moving`, targetPortId = `${connectionId}-fixed`;
      ports.push(
        { id: sourcePortId, partId: entry.id, fitClass: 'integration-generic', pose: {
          positionM: mmToLessonAxes(point.clone().sub(entry.pivot).toArray()).toArray(), rotationXyzw: orientation.toArray() } },
        { id: targetPortId, partId: receiver.id, fitClass: 'integration-generic', pose: {
          positionM: mmToLessonAxes(point.clone().sub(receiver.pivot).toArray()).toArray(), rotationXyzw: orientation.clone().multiply(reversePort).toArray() } },
      );
      connections.push({ id: connectionId, sourcePortId, targetPortId, guide: { approachModelM: productSpan * 0.13 },
        acceptance: { distanceWorldM: 0.035, angleDeg: 15 } });
      const attachId = `${id}-attach`;
      const modeIds = module ? ['module-precision'] : hasFastening ? ['basic', 'precision'] : ['basic'];
      const actions: object[] = [{ id: attachId, kind: 'attach', modeIds, connectionId }];
      if (stage.kind === 'fasten') {
        const kind = getPracticeToolKind(stage.tool, entry.members[0].name);
        const toolId = /토크|torque/i.test(stage.tool) ? 'torque' : kind === 'hex-key' || kind === 'socket' ? 'spanner' : 'driver';
        if (!tools.has(toolId)) tools.set(toolId, { id: toolId, appToolKey: toolId, name: locale(stage.tool) });
        const boltId = `${id}-bolt`;
        actions.push({ id: `${id}-fasten`, kind: 'fasten', modeIds: module ? ['module-precision'] : ['precision'], connectionId,
          afterActionId: attachId, toolId, bolts: [{ id: boltId, pose: { positionM: [0, 0, 0], rotationXyzw: identity } }], order: [boltId],
          turn: { direction: 'clockwise_viewed_from_head', requiredRotationDeg: 540 },
          torqueDisplay: { valueNm: stage.torque, basis: 'educational_simulation' }, completedWhen: 'all_bolts_reach_rotation' });
      }
      const name = lessonParts[index].name.ko;
      const custom = settings.captions[entry.id];
      const instruction = instructionByPart.get(stage.target.partNumber);
      const checkpoints = Object.values(settings.cards[entry.id] ?? {}).map(({ title, text }) => [title, text].filter(Boolean).join(' · ')).filter(Boolean);
      steps.push({ id, prerequisiteStepIds: index > 1 ? [`step-${index - 1}`] : [], actions,
        manual: { title: locale(name), instruction: locale(custom || (instruction?.isConfirmed && instruction.description) || `${name}을 조립 위치에 맞춰 장착하세요.`),
          checkpoints: checkpoints.map((line) => locale(line)), caution: locale('교육용 조립 데이터입니다. 실제 작업은 승인된 작업지시서를 따르세요.') },
        completedWhen: 'all_enabled_actions' });
    }
    return { model: { path, nodes: geometry }, data: { scene: { ...scene, rootScale }, assets, parts: lessonParts, ports, connections,
      tools: [...tools.values()], steps, stepOrder: steps.map(({ id }) => id) } };
  }

  const root = buildArea(main, 'product', false);
  const modules = areas.flatMap(({ id, name }) => {
    const stages = sequence.stages.filter((stage) => stage.workArea?.id === id);
    if (stages.length < 2) return [];
    const numbers = new Set(stages.flatMap(membersOf));
    const overviewPartIds = main.filter((stage) => membersOf(stage).some((number) => numbers.has(number))).map(partKey);
    if (!overviewPartIds.length) return [];
    return [{ id: `area-${id}`, name, overviewPartIds, ...buildArea(stages, `area-${id}`, true) }];
  });
  if (!modules.length && main.length > 1) modules.push({ id: 'product', name: '제품 전체 조립',
    overviewPartIds: main.map(partKey), ...buildArea(main, 'product', true) });
  if (!root.data.steps.length && !modules.length) throw new Error('패키지에서 실행할 조립 단계를 만들 수 없습니다.');

  const baseCapabilities = ['static-glb.v1', 'overview.v1', 'attach-ports.v1', 'mode-routing.v1'];
  const modes = [
    ...(root.data.steps.length ? [{ id: 'basic', name: locale('기본 조립', 'Basic assembly'), requiredCapabilities: baseCapabilities }] : []),
    ...(root.data.tools.length ? [{ id: 'precision', name: locale('정밀 조립', 'Precision assembly'), requiredCapabilities: [...baseCapabilities, 'fasten-bolts.v1'] }] : []),
    ...(modules.length ? [{ id: 'module-precision', name: locale('모듈 조립', 'Module assembly'), requiredCapabilities: [
      ...baseCapabilities, 'module-select.v1', ...(modules.some(({ data }) => data.tools.length) ? ['fasten-bolts.v1'] : [])] }] : []),
  ];
  const lesson = { trainingId, contentVersion, title: locale(title), summary: locale(`${title} 조립 교육`),
    learningGoals: [locale('부품의 위치와 조립 순서를 확인하고 조립합니다.')], defaultLocale: 'ko', fallbackLocales: ['en'],
    defaultModeId: modes[0].id, modes, ...root.data, scene: { ...root.data.scene, startView: 'overview' },
    dataQuality: { engineeringVerified: false, connectionGeometry: 'integration_estimate', note: 'STEP 조립 좌표에서 만든 교육 앱 연동용 데이터입니다.' },
    modules: modules.map(({ id, name, overviewPartIds, data }) => ({ id, name: locale(name), description: locale(`${name} 실습`),
      overviewPartIds, estimatedMinutes: Math.max(1, Math.ceil(data.steps.length / 2)), detail: data })) };
  return { lesson, models: [root.model, ...modules.map(({ model }) => model).filter(({ path }) => path !== root.model.path)] };
}
