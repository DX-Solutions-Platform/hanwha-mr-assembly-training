import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CurvePath, LineCurve3, QuadraticBezierCurve3, Quaternion, Shape, Vector2, Vector3, type Group } from 'three';
import type { StepPick } from '../../drawing-upload-dev/model/stepTypes';
import type { PracticeToolKind, PracticeToolShape } from './practiceToolGeometry';
import { getPracticeResistance } from './stepPracticeMotion';

const alongZ = [Math.PI / 2, 0, 0] as const;
const alongX = [0, 0, -Math.PI / 2] as const;
const steel = { color: '#aeb9c4', metalness: 0.86, roughness: 0.28 };
const blackSteel = { color: '#535d67', metalness: 0.82, roughness: 0.34 };
const rubber = { color: '#29343e', roughness: 0.82 };
const accent = { color: '#bf561c', roughness: 0.46 };

function TurnedPiece({ profile, material }: {
  profile: readonly (readonly [radius: number, height: number])[];
  material: typeof steel | typeof rubber;
}) {
  return <mesh rotation={alongZ}>
    <latheGeometry args={[profile.map(([radius, height]) => new Vector2(radius, height)), 32]} />
    <meshStandardMaterial {...material} />
  </mesh>;
}

function polygon(points: Vector2[]) {
  const outline = new Shape(points);
  outline.closePath();
  return outline;
}

const HexKey = memo(function HexKey({ shape }: { shape: PracticeToolShape }) {
  const { drive, depth, shaft, grip } = shape;
  const bend = drive * 1.8;
  const corners = Array.from({ length: 6 }, (_, index) => {
    const angle = index * Math.PI / 3;
    return new Vector2(Math.cos(angle) * drive, Math.sin(angle) * drive);
  });
  const outline = polygon(corners.flatMap((point, index) => [
    point.clone().lerp(corners[(index + 5) % 6], 0.065),
    point.clone().lerp(corners[(index + 1) % 6], 0.065),
  ]));
  const path = new CurvePath<Vector3>();
  const tip = new Vector3(0, 0, -depth), startBend = new Vector3(0, 0, shaft - bend);
  const endBend = new Vector3(bend, 0, shaft);
  path.add(new LineCurve3(tip, startBend));
  path.add(new QuadraticBezierCurve3(startBend, new Vector3(0, 0, shaft), endBend));
  path.add(new LineCurve3(endBend, new Vector3(grip, 0, shaft)));

  return <mesh>
    <extrudeGeometry args={[outline, { extrudePath: path, steps: 72, bevelEnabled: false }]} />
    <meshStandardMaterial {...blackSteel} />
  </mesh>;
});

function driverTip(kind: PracticeToolKind, radius: number) {
  if (kind === 'phillips') {
    return polygon([[-0.28, -1], [0.28, -1], [0.28, -0.28], [1, -0.28], [1, 0.28], [0.28, 0.28],
      [0.28, 1], [-0.28, 1], [-0.28, 0.28], [-1, 0.28], [-1, -0.28], [-0.28, -0.28]]
      .map(([x, y]) => new Vector2(x * radius, y * radius)));
  }
  if (kind === 'slotted') {
    return polygon([[-1, -0.22], [1, -0.22], [1, 0.22], [-1, 0.22]].map(([x, y]) => new Vector2(x * radius, y * radius)));
  }
  return polygon(Array.from({ length: 48 }, (_, index) => {
    const angle = index * Math.PI / 24;
    const edge = kind === 'torx' ? radius * (0.82 + 0.18 * Math.cos(angle * 6)) : radius * 0.66;
    return new Vector2(Math.cos(angle) * edge, Math.sin(angle) * edge);
  }));
}

const Driver = memo(function Driver({ kind, shape }: { kind: PracticeToolKind; shape: PracticeToolShape }) {
  const { radius, drive, depth, shaft, grip } = shape;
  const bitEnd = drive * 2.2;
  const body = radius * 1.28;
  const neck = radius * 0.52;

  return <>
    <mesh position={[0, 0, -depth]}>
      <extrudeGeometry args={[driverTip(kind, drive), { depth: bitEnd + depth, bevelEnabled: false }]} />
      <meshStandardMaterial {...blackSteel} />
    </mesh>
    <TurnedPiece material={steel} profile={[[0, bitEnd], [drive * 0.81, bitEnd],
      [drive * 0.81, shaft * 0.89], [neck, shaft * 0.94], [neck, shaft], [0, shaft]]} />
    <group position={[0, 0, shaft]}>
      <TurnedPiece material={rubber} profile={[[0, 0], [neck, 0], [body * 0.64, grip * 0.1]]} />
      <TurnedPiece material={accent} profile={[[body * 0.64, grip * 0.1], [body * 0.79, grip * 0.14], [body * 0.87, grip * 0.2]]} />
      <TurnedPiece material={rubber} profile={[[body * 0.87, grip * 0.2], [body * 0.94, grip * 0.24],
        [body, grip * 0.42], [body, grip * 0.78], [body * 0.94, grip * 0.89]]} />
      <TurnedPiece material={accent} profile={[[body * 0.94, grip * 0.89], [body * 0.87, grip * 0.95],
        [body * 0.63, grip], [0, grip]]} />
      {Array.from({ length: 8 }, (_, index) => {
        const angle = index * Math.PI / 4;
        return <mesh key={index} position={[Math.cos(angle) * body * 0.9, Math.sin(angle) * body * 0.9, grip * 0.57]} rotation={alongZ}>
          <capsuleGeometry args={[body * 0.14, grip * 0.38, 4, 8]} /><meshStandardMaterial color="#171f27" roughness={0.9} />
        </mesh>;
      })}
    </group>
  </>;
});

const Socket = memo(function Socket({ shape }: { shape: PracticeToolShape }) {
  const { radius, depth, grip } = shape;
  return <>
    <TurnedPiece material={steel} profile={[[radius * 1.03, -depth], [radius * 1.22, -depth], [radius * 1.36, -depth + radius * 0.18],
      [radius * 1.36, radius * 0.84], [radius * 1.17, radius], [0, radius], [0, radius * 0.45],
      [radius * 1.03, radius * 0.45], [radius * 1.03, -depth]]} />
    <mesh position={[0, 0, radius * 1.47]} rotation={alongZ}>
      <cylinderGeometry args={[radius * 1.22, radius * 1.3, radius * 0.9, 32]} /><meshStandardMaterial {...blackSteel} />
    </mesh>
    <mesh position={[0, 0, radius * 1.96]} rotation={alongZ}>
      <cylinderGeometry args={[radius * 0.47, radius * 0.5, radius * 0.16, 24]} /><meshStandardMaterial {...steel} />
    </mesh>
    <mesh position={[grip * 0.38, 0, radius * 1.48]} rotation={alongX}>
      <cylinderGeometry args={[radius * 0.29, radius * 0.41, grip * 0.76, 16]} /><meshStandardMaterial {...steel} />
    </mesh>
    <mesh position={[grip * 0.73, 0, radius * 1.48]} rotation={alongX}>
      <capsuleGeometry args={[radius * 0.44, grip * 0.43, 5, 12]} /><meshStandardMaterial {...rubber} />
    </mesh>
  </>;
});

export function PracticeToolModel({ kind, shape }: { kind: PracticeToolKind; shape: PracticeToolShape }) {
  return kind === 'hex-key' ? <HexKey shape={shape} /> : kind === 'socket' ? <Socket shape={shape} /> : <Driver kind={kind} shape={shape} />;
}

export function PracticeFasteningTool({ pick, kind, shape, turn }: {
  pick: StepPick; kind: PracticeToolKind; shape: PracticeToolShape; turn: { progress: number; rotation: number; excess: number };
}) {
  const approach = useRef<Group>(null);
  const grip = useRef<Group>(null);
  const elapsed = useRef(0);
  const pulse = useRef({ elapsed: 0, strength: 0 });
  const invalidate = useThree((state) => state.invalidate);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const quaternion = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...pick.normal).normalize()), [pick.normal]);

  useEffect(() => {
    if (reducedMotion || turn.progress < 0.76) return;
    pulse.current = { elapsed: 0, strength: turn.progress === 1 ? 0.04 : getPracticeResistance(turn.progress) * 0.028 };
    invalidate();
  }, [invalidate, reducedMotion, turn.progress, turn.rotation, turn.excess]);

  useFrame(({ clock }, delta) => {
    const frame = Math.min(delta, 1 / 30);
    if (!reducedMotion && approach.current && elapsed.current < 0.24) {
      elapsed.current = turn.rotation ? 0.24 : Math.min(0.24, elapsed.current + frame);
      approach.current.position.z = shape.standoff * (1 - elapsed.current / 0.24) ** 3;
      if (elapsed.current < 0.24) invalidate();
    }
    const vibration = pulse.current;
    if (!grip.current || vibration.strength === 0) return;
    vibration.elapsed += frame;
    const fade = Math.max(0, 1 - vibration.elapsed / 0.18);
    grip.current.rotation.z = Math.sin(clock.elapsedTime * 108) * vibration.strength * fade;
    if (fade > 0) invalidate();
    else vibration.strength = 0;
  });

  return <group position={pick.point} quaternion={quaternion}>
    <group ref={approach} position={[0, 0, reducedMotion ? 0 : shape.standoff]}>
      <group rotation={[0, 0, -turn.rotation]}>
        <group ref={grip}>
          <PracticeToolModel kind={kind} shape={shape} />
        </group>
      </group>
    </group>
  </group>;
}
