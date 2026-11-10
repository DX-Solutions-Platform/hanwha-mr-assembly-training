import { Box3, MathUtils, Quaternion, Vector3 } from 'three';
import type { PreviewAction, PreviewPart } from './lessonPreviewData';
import { motionPhase, motionRange, smoothMotion, turnProgress } from './lessonMotion';
import { LessonContactTool, LessonFastenerTool, LessonGrip, LessonInspectionLight } from './LessonPreviewTools';
import { approachTransform } from './lessonApproach';

export type WorldPose = { point: Vector3; orientation: Quaternion };
export type MotionPart = { part: PreviewPart; origin: Vector3; rotation: Quaternion; bounds: Box3 };
export type ThreadGrip = { center: Vector3; radial: Vector3; tangent: Vector3; reach: (number | undefined)[] };
export type ActionAnchors = {
  source?: WorldPose;
  target?: WorldPose;
  inspection?: WorldPose;
  bolts: (WorldPose & { index: number })[];
  points: WorldPose[];
  moving?: MotionPart;
  threadGrip?: ThreadGrip;
  scale: number;
  start?: Vector3;
};

const zAxis = new Vector3(0, 0, 1);
const up = new Vector3(0, 1, 0);
const right = new Vector3(1, 0, 0);
const axisAt = (pose: WorldPose) => zAxis.clone().applyQuaternion(pose.orientation);
const toolOrientation = (normal: Vector3) => new Quaternion().setFromUnitVectors(zAxis, normal);
const ease = (value: number, start: number, end: number) => smoothMotion(motionRange(value, start, end));

export function partMotion(action: PreviewAction, anchors: ActionAnchors, progress: number) {
  const { moving, source, target, scale } = anchors;
  if (!moving) return;
  const { part, origin, rotation } = moving;
  const normal = target ? axisAt(target) : up;
  if (action.kind === 'attach') {
    const custom = action.approach && target && source ? approachTransform(action.approach, target.orientation, origin, source.point) : undefined;
    if (!custom && (!part.initial || !part.assembled)) return;
    const offset = custom ? custom.position.clone().sub(origin)
      : new Vector3(...part.initial!.position).sub(new Vector3(...part.assembled!.position));
    const alignment = normal.clone().multiplyScalar(Math.min(offset.length() * .23, scale * 1.4));
    const displacement = progress <= .68 ? offset.lerp(alignment, ease(progress, .18, .68)) : alignment.multiplyScalar(1 - ease(progress, .68, .88));
    const delta = custom?.turn ?? (part.initial?.rotation && part.assembled?.rotation
      ? new Quaternion(...part.initial.rotation).normalize().multiply(new Quaternion(...part.assembled.rotation).normalize().invert())
      : new Quaternion());
    const turn = delta.slerp(new Quaternion(), ease(progress, .18, .75));
    return { position: origin.clone().add(displacement), rotation: turn.clone().multiply(rotation), turn, normal };
  }
  if (action.kind !== 'thread' || !target) return;
  const amount = turnProgress(action, progress);
  const angle = MathUtils.degToRad(action.rotationDeg ?? 0) * (action.clockwise ? -1 : 1) * (amount - 1);
  const turn = new Quaternion().setFromAxisAngle(normal, angle);
  const pivot = source?.point ?? origin;
  const travel = Math.max(0, action.travelM ?? 0) * (1 - amount);
  return { position: origin.clone().sub(pivot).applyQuaternion(turn).add(pivot).addScaledVector(normal, travel),
    rotation: turn.clone().multiply(rotation), turn, normal };
}

export function LessonActionMotion({ action, anchors, progress }: { action: PreviewAction; anchors: ActionAnchors; progress: number }) {
  const { target, bolts, points, inspection, moving, scale } = anchors;
  const movement = partMotion(action, anchors, progress);
  if (movement && moving) {
    const { position, normal, turn } = movement;
    const gripCenter = anchors.threadGrip?.center.clone() ?? moving.bounds.getCenter(new Vector3());
    const center = gripCenter.sub(moving.origin).applyQuaternion(turn).add(position);
    const halfSize = moving.bounds.getSize(new Vector3()).multiplyScalar(.5);
    const reverseTurn = turn.clone().invert();
    const handSize = scale * .9;
    const outward = progress < .18 ? 1 - ease(progress, 0, .18) : ease(progress, .88, 1);
    const grips = action.kind === 'thread' ? Math.min(10, Math.max(1, Math.ceil(Math.abs(action.rotationDeg ?? 0) / 160))) : 1;
    const wrist = motionPhase(motionRange(progress, .15, .87), grips).local;
    const wristReset = ease(wrist, .72, 1);
    const regrip = action.kind === 'thread' ? Math.sin(wristReset * Math.PI) : 0;
    const side = Math.abs(normal.x) < .8 ? right.clone() : zAxis.clone();
    side.addScaledVector(normal, -side.dot(normal)).normalize();
    if (action.kind === 'thread') side.applyAxisAngle(normal, MathUtils.degToRad(action.rotationDeg ?? 0) / grips
      * (action.clockwise ? -1 : 1) * (ease(wrist, .05, .72) - wristReset));
    const closed = Math.max(0, 1 - outward - regrip);
    return <>{(action.twoHanded ? [1, -1] : [1]).map((sign) => {
      const direction = side.clone().multiplyScalar(sign);
      const boxDirection = direction.clone().applyQuaternion(reverseTurn);
      let surface = Math.abs(boxDirection.x) * halfSize.x + Math.abs(boxDirection.y) * halfSize.y + Math.abs(boxDirection.z) * halfSize.z;
      if (anchors.threadGrip) {
        const { radial, tangent, reach } = anchors.threadGrip;
        const angle = Math.atan2(boxDirection.dot(tangent), boxDirection.dot(radial));
        const sample = (angle / (2 * Math.PI) + 1) % 1 * reach.length;
        const before = reach[Math.floor(sample)], after = reach[(Math.floor(sample) + 1) % reach.length];
        if (before !== undefined || after !== undefined) surface = Math.max(before ?? 0, after ?? 0) + handSize * .03;
      }
      const gripPoint = center.clone().addScaledVector(direction, surface + handSize * (outward * 1.4 + regrip * .28));
      if (target) {
        const height = gripPoint.clone().sub(target.point).dot(normal);
        const clearance = Math.max(0, handSize * .34 - height);
        gripPoint.addScaledVector(normal, clearance * (action.kind === 'thread' ? 1 : ease(progress, .54, .75)));
      }
      return <LessonGrip key={sign} point={gripPoint} outward={direction} wrist={normal} size={handSize} closed={closed} mirrored={sign < 0} />;
    })}</>;
  }

  if (action.kind === 'fasten' && target) {
    const { index, local } = motionPhase(progress, Math.max(1, action.boltOrder.length));
    const bolt = bolts.find((item) => item.index === index) ?? target;
    const approach = local < .22 ? 1 - ease(local, 0, .22) : ease(local, .82, 1);
    const angle = MathUtils.degToRad(action.rotationDeg ?? 90) * (action.clockwise ? -1 : 1) * turnProgress(action, progress);
    return <group position={bolt.point} quaternion={bolt.orientation} scale={scale}>
      <group position={[action.tool === 'spanner' ? approach * 1.15 : 0, 0, approach * (action.tool === 'spanner' ? .35 : 1.6)]}>
        <group rotation={[0, 0, angle]}>
          <LessonFastenerTool tool={action.tool} toolName={action.toolName} />
        </group>
      </group>
    </group>;
  }

  if (action.kind === 'inspect' && inspection && action.surface) {
    const { inner, outer } = action.surface;
    const sweep = motionRange(progress, .12, .9);
    const angle = sweep * Math.PI * 2;
    const radius = (inner + outer) / 2;
    const height = scale * (1.38 + (1 - ease(progress, 0, .12) + ease(progress, .9, 1)) * 1.2);
    const beamRadius = Math.min(outer * .22, Math.max((outer - inner) * .36, scale * .26));
    return <group position={inspection.point} quaternion={inspection.orientation}>
      <group position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}>
        <group position={[0, 0, height]} scale={scale}>
          <LessonInspectionLight />
          <LessonGrip point={new Vector3(0, .2, .87)} outward={up} wrist={zAxis} size={.7} closed={.88} />
        </group>
        {progress >= .12 && progress <= .9 && <>
          <mesh rotation={alongBeam} position={[0, 0, height / 2]} renderOrder={4}>
            <cylinderGeometry args={[scale * .29, beamRadius, height, 28, 1, true]} />
            <meshBasicMaterial color="#c5edff" transparent opacity={.14} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0, scale * .025]} renderOrder={5}>
            <circleGeometry args={[beamRadius, 28]} /><meshBasicMaterial color="#d7f6ff" transparent opacity={.5} depthWrite={false} />
          </mesh>
        </>}
      </group>
    </group>;
  }

  if (action.kind === 'touch' && points.length) {
    const { index, local } = motionPhase(progress, points.length);
    const current = points[index], previous = points[Math.max(0, index - 1)];
    const position = previous.point.clone().lerp(current.point, ease(local, 0, .2));
    const normal = axisAt(current);
    const brush = action.tool === 'brush', pen = action.tool === 'pen';
    const applying = local >= .32 && local <= .86;
    const contact = motionRange(local, .32, .86);
    const stroke = brush ? Math.sin(contact * Math.PI * 4) * .18 : pen ? (contact - .5) * .23 : 0;
    const lift = local < .32 ? 1 - ease(local, .2, .32) : ease(local, .86, 1);
    return <group position={position} quaternion={toolOrientation(normal)} scale={scale}>
      <group position={[applying ? stroke : 0, 0, lift * .72]}>
        <LessonContactTool tool={action.tool} />
        <LessonGrip point={new Vector3(0, brush ? .068 : pen ? .098 : .09, .73)} outward={up} wrist={zAxis} size={.65} closed={.9} />
      </group>
      {applying && <mesh position={[stroke, 0, .012]} renderOrder={4}>
        <ringGeometry args={[.1, .145, 24]} /><meshBasicMaterial color="#ffd27d" transparent opacity={.88} depthWrite={false} />
      </mesh>}
    </group>;
  }
  return null;
}

const alongBeam = [Math.PI / 2, 0, 0] as const;
