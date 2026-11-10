import { MathUtils, Quaternion, Vector3 } from 'three';
import type { LessonApproach, PreviewAction, PreviewPart, PreviewPose } from './lessonPreviewData';

export function poseRotation(pose?: PreviewPose) {
  return new Quaternion(...(pose?.rotation ?? [0, 0, 0, 1])).normalize();
}

export function approachTransform(approach: LessonApproach, targetRotation: Quaternion, partOrigin: Vector3, sourcePoint: Vector3) {
  const azimuth = MathUtils.degToRad(approach.directionDeg);
  const tilt = MathUtils.degToRad(approach.tiltDeg);
  const axis = new Vector3(0, 0, 1).applyQuaternion(targetRotation);
  const direction = new Vector3(Math.cos(azimuth) * Math.sin(tilt), Math.sin(azimuth) * Math.sin(tilt), Math.cos(tilt))
    .applyQuaternion(targetRotation);
  const turn = new Quaternion().setFromUnitVectors(axis, direction);
  const start = sourcePoint.clone().addScaledVector(direction, approach.distanceM);
  const position = partOrigin.clone().sub(sourcePoint).applyQuaternion(turn).add(start);
  return { position, start, turn };
}

export function editApproachPose(action: PreviewAction, parts: PreviewPart[], approach: LessonApproach): PreviewPose | undefined {
  const moving = parts.find((part) => part.id === action.movingId);
  const receiver = parts.find((part) => part.id === action.target?.partId);
  if (!moving?.assembled || !receiver?.assembled || !action.source?.pose || !action.target?.pose) return;
  const origin = new Vector3(...moving.assembled.position);
  const rotation = poseRotation(moving.assembled);
  const source = new Vector3(...action.source.pose.position).applyQuaternion(rotation).add(origin);
  const targetRotation = poseRotation(receiver.assembled).multiply(poseRotation(action.target.pose));
  const start = approachTransform(approach, targetRotation, origin, source);
  return { position: start.position.toArray(), rotation: start.turn.multiply(rotation).toArray() };
}

export function approachDistance(action: PreviewAction, parts: PreviewPart[]) {
  const part = parts.find((item) => item.id === action.movingId);
  const distance = part?.initial && part.assembled
    ? new Vector3(...part.initial.position).distanceTo(new Vector3(...part.assembled.position)) : 0;
  return action.approach?.distanceM || (action.approachDistance && action.approachDistance > 0 ? action.approachDistance : distance) || .05;
}
