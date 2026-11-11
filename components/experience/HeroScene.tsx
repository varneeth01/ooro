"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export function HeroScene({ progress, pointer }: { progress: React.RefObject<number>; pointer: React.RefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const array = new Float32Array(1800);
    let seed = 127;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < array.length; i += 3) {
      const angle = random() * Math.PI * 2;
      const radius = 1.2 + random() * 4.2;
      array[i] = Math.cos(angle) * radius;
      array[i + 1] = (random() - .5) * 4.7;
      array[i + 2] = Math.sin(angle) * radius - 1.2;
    }
    return array;
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const p = progress.current ?? 0;
    const targetX = pointer.current?.x ?? 0;
    const targetY = pointer.current?.y ?? 0;
    if (group.current) {
      group.current.rotation.y += (targetX * .16 + Math.sin(t * .12) * .025 - group.current.rotation.y) * Math.min(1, delta * 1.5);
      group.current.rotation.x += (targetY * .1 - group.current.rotation.x) * Math.min(1, delta * 1.5);
      group.current.position.y = -.18 - p * .45;
      group.current.scale.setScalar(1 - p * .14);
    }
    if (core.current) {
      core.current.rotation.x += delta * .075;
      core.current.rotation.y += delta * .12;
      core.current.rotation.z = p * .5;
    }
    if (points.current) points.current.rotation.y = t * .012 + p * .32;
    state.camera.position.x += (targetX * .3 - state.camera.position.x) * Math.min(1, delta * 1.2);
    state.camera.position.y += (targetY * .2 - state.camera.position.y) * Math.min(1, delta * 1.2);
    state.camera.position.z = 7.4 - p * .7;
    state.camera.lookAt(0, 0, 0);
  });

  return <>
    <ambientLight intensity={1.1} />
    <directionalLight position={[4, 5, 4]} intensity={2.4} color="#f3f3ef" />
    <pointLight position={[-3, 1, 2]} intensity={14} distance={9} color="#dfff00" />
    <group ref={group}>
      <mesh ref={core} position={[.55, .02, 0]}>
        <torusKnotGeometry args={[1.03, .29, 112, 10, 2, 5]} />
        <meshStandardMaterial color="#777d78" metalness={.94} roughness={.24} emissive="#293000" emissiveIntensity={.22} />
      </mesh>
      <mesh position={[.55, .02, 0]} scale={1.16}>
        <torusGeometry args={[1.54, .009, 4, 96]} />
        <meshBasicMaterial color="#dfff00" transparent opacity={.52} />
      </mesh>
      <points ref={points}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} count={positions.length / 3} array={positions} itemSize={3} /></bufferGeometry>
        <pointsMaterial color="#dfff00" size={.018} sizeAttenuation transparent opacity={.62} depthWrite={false} />
      </points>
    </group>
  </>;
}
