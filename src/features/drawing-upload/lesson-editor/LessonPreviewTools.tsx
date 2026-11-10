import { memo, useMemo } from 'react';
import { Matrix4, Quaternion, Shape, Vector3 } from 'three';
import { PracticeToolModel } from '../practice/PracticeFasteningTool';
import { getPracticeToolKind, getPracticeToolShape } from '../practice/practiceToolGeometry';

const alongZ = [Math.PI / 2, 0, 0] as const;
const alongX = [0, 0, Math.PI / 2] as const;
const metal = { color: '#adbfcf', metalness: .76, roughness: .29 };
const grip = { color: '#293a49', roughness: .76 };
const glove = { color: '#385670', roughness: .68 };
const gloveTrim = { color: '#202c3a', roughness: .85 };
const digits = [-.28, -.095, .09, .275];
const fingerLengths = [.27, .34, .32, .25];
const knuckleAngle = (closed: number) => .12 + closed * .82;
const fingertipAngle = (closed: number) => closed * 1.05;

function LessonGlove({ closed, mirrored = false }: { closed: number; mirrored?: boolean }) {
  return <group scale={[mirrored ? -1 : 1, 1, 1]}>
    <mesh position={[0, 0, .48]} scale={[.4, .15, .38]}>
      <sphereGeometry args={[1, 20, 12]} /><meshStandardMaterial {...glove} />
    </mesh>
    <mesh position={[0, 0, .83]} rotation={alongZ} scale={[1, .61, 1]}>
      <cylinderGeometry args={[.28, .27, .23, 20]} /><meshStandardMaterial {...gloveTrim} />
    </mesh>
    <mesh position={[0, .085, .5]} scale={[.31, .083, .24]}>
      <sphereGeometry args={[1, 16, 10]} /><meshStandardMaterial color="#4f718d" roughness={.69} />
    </mesh>
    {digits.map((x, index) => {
      const length = fingerLengths[index];
      return <group key={x} position={[x, 0, .25]} rotation={[-knuckleAngle(closed), x * .48 * (1 - closed), 0]}>
        <mesh position={[0, 0, -length / 2]} rotation={alongZ}>
          <capsuleGeometry args={[.077, length, 4, 9]} /><meshStandardMaterial {...glove} />
        </mesh>
        <group position={[0, 0, -length]} rotation={[-fingertipAngle(closed), 0, 0]}>
          <mesh position={[0, 0, -.083]} rotation={alongZ}>
            <capsuleGeometry args={[.066, .16, 4, 9]} /><meshStandardMaterial {...gloveTrim} />
          </mesh>
        </group>
      </group>;
    })}
    <group position={[-.32, -.035, .5]} rotation={[-closed * .55, .99 - closed * .52, -.12]}>
      <mesh position={[0, 0, -.16]} rotation={alongZ}>
        <capsuleGeometry args={[.095, .25, 5, 12]} /><meshStandardMaterial {...glove} />
      </mesh>
      <mesh position={[0, -.045, -.29]} rotation={[1, 0, 0]}>
        <capsuleGeometry args={[.076, .12, 4, 9]} /><meshStandardMaterial {...gloveTrim} />
      </mesh>
    </group>
  </group>;
}

export function LessonGrip({ point, outward, wrist, size, closed, mirrored }: {
  point: Vector3; outward: Vector3; wrist: Vector3; size: number; closed: number; mirrored?: boolean;
}) {
  const normal = outward.clone().normalize();
  const tangent = wrist.clone().addScaledVector(normal, -wrist.dot(normal)).normalize();
  const basis = new Matrix4().makeBasis(new Vector3().crossVectors(normal, tangent), normal, tangent);
  const flex = knuckleAngle(closed);
  const firstFinger = Math.max(...fingerLengths) * Math.sin(flex);
  const fingertip = .163 * Math.sin(flex + fingertipAngle(closed)) + .066;
  const thumb = .17 + .21 * Math.sin(.55 * closed);
  // Keep the deepest part of the curled glove outside the contact plane.
  const setback = Math.max(firstFinger + .077, firstFinger + fingertip, thumb) + .02;
  return <group position={point.clone().addScaledVector(normal, size * setback)}
    quaternion={new Quaternion().setFromRotationMatrix(basis)} scale={size}>
    <LessonGlove closed={closed} mirrored={mirrored} />
  </group>;
}

const Spanner = memo(function Spanner() {
  const jaw = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(.13, .26);
    shape.bezierCurveTo(.42, .42, .74, .25, .72, .12);
    shape.lineTo(.39, .12);
    shape.lineTo(.31, 0);
    shape.lineTo(.39, -.12);
    shape.lineTo(.72, -.12);
    shape.bezierCurveTo(.7, -.32, .38, -.39, .13, -.25);
    shape.closePath();
    return shape;
  }, []);
  return <group rotation={[0, 0, Math.PI]} position={[.4, 0, 0]}>
    <mesh position={[0, 0, .085]}>
      <extrudeGeometry args={[jaw, { depth: .07, bevelEnabled: true, bevelSize: .025, bevelThickness: .02, bevelSegments: 2 }]} />
      <meshStandardMaterial {...metal} />
    </mesh>
    <mesh position={[-1.05, 0, .12]} rotation={alongX} scale={[1, 1, .6]}>
      <capsuleGeometry args={[.12, 2.24, 4, 12]} /><meshStandardMaterial {...metal} />
    </mesh>
    <mesh position={[-1.78, 0, .12]} rotation={alongX}>
      <capsuleGeometry args={[.135, .74, 4, 12]} /><meshStandardMaterial {...grip} />
    </mesh>
  </group>;
});

export const LessonFastenerTool = memo(function LessonFastenerTool({ tool, toolName }: { tool: string; toolName: string }) {
  if (tool === 'spanner') return <>
    <Spanner />
    <LessonGrip point={new Vector3(2.12, 0, .255)} outward={new Vector3(0, 0, 1)} wrist={new Vector3(1, 0, 0)} size={.67} closed={.93} />
  </>;
  const kind = tool === 'torque' ? 'socket' : getPracticeToolKind(toolName || tool, '');
  const head = { point: [0, 0, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number], radius: .31 };
  const shape = getPracticeToolShape(kind, head, 1);
  const { grip: length, radius, shaft, drive } = shape;
  const handle = kind === 'socket' ? new Vector3(length * .73, 0, radius * 1.92)
    : kind === 'hex-key' ? new Vector3(length * .67, 0, shaft + drive)
    : new Vector3(0, radius * 1.34, shaft + length * .56);
  const radial = kind === 'socket' || kind === 'hex-key';
  return <>
    <PracticeToolModel kind={kind} shape={shape} />
    <LessonGrip point={handle} outward={radial ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0)}
      wrist={radial ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1)} size={.65} closed={.93} />
  </>;
});

export const LessonContactTool = memo(function LessonContactTool({ tool }: { tool: string }) {
  if (tool === 'brush') return <>
    <mesh position={[0, 0, .67]} rotation={alongZ} scale={[1.3, 1, .7]}>
      <capsuleGeometry args={[.092, .86, 6, 18]} /><meshStandardMaterial color="#f29046" roughness={.54} />
    </mesh>
    <mesh position={[0, 0, .23]} rotation={alongZ} scale={[1.6, 1, .62]}>
      <cylinderGeometry args={[.098, .124, .19, 20]} /><meshStandardMaterial {...metal} />
    </mesh>
    {Array.from({ length: 11 }, (_, index) => <mesh key={index} position={[(index - 5) * .033, 0, .067]} rotation={alongZ}>
      <capsuleGeometry args={[.022, .108, 3, 7]} />
      <meshStandardMaterial color={index % 2 ? '#dcc28a' : '#9d773d'} roughness={.91} />
    </mesh>)}
  </>;
  if (tool === 'pen') return <>
    <mesh position={[0, 0, .12]} rotation={alongZ}>
      <cylinderGeometry args={[.074, .026, .2, 20]} /><meshStandardMaterial color="#f6d169" roughness={.57} />
    </mesh>
    <mesh position={[0, 0, .64]} rotation={alongZ}>
      <capsuleGeometry args={[.095, .89, 5, 20]} /><meshStandardMaterial {...grip} />
    </mesh>
    <mesh position={[0, 0, .99]} rotation={alongZ}>
      <cylinderGeometry args={[.098, .098, .13, 20]} /><meshStandardMaterial color="#f6d169" roughness={.48} />
    </mesh>
  </>;
  return <mesh position={[0, 0, .46]} rotation={alongZ}>
    <capsuleGeometry args={[.09, .76, 5, 16]} /><meshStandardMaterial {...metal} />
  </mesh>;
});

export const LessonInspectionLight = memo(function LessonInspectionLight() {
  return <>
    <mesh position={[0, 0, .27]} rotation={alongZ}>
      <cylinderGeometry args={[.23, .34, .52, 32]} /><meshStandardMaterial {...grip} />
    </mesh>
    <mesh position={[0, 0, .014]} rotation={alongZ}>
      <cylinderGeometry args={[.35, .35, .042, 32]} /><meshStandardMaterial {...metal} />
    </mesh>
    <mesh position={[0, 0, -.012]} rotation={[0, Math.PI, 0]}>
      <circleGeometry args={[.289, 32]} /><meshBasicMaterial color="#e3faff" />
    </mesh>
    <mesh position={[0, 0, .84]} rotation={alongZ}>
      <capsuleGeometry args={[.2, .75, 5, 22]} /><meshStandardMaterial color="#406073" roughness={.68} />
    </mesh>
  </>;
});
