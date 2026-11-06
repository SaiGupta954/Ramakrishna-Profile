import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { damp3 } from 'maath/easing';
import ParticleField from './ParticleField';
import { scrollState, isTouch } from '../store';

function CameraRig() {
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, delta) => {
    // pointer parallax + a gentle dolly that follows overall page progress
    target.set(state.pointer.x * 0.45, state.pointer.y * 0.3, 7.2 - Math.sin(scrollState.progress * Math.PI) * 0.8);
    damp3(state.camera.position, target, 0.5, delta);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

function DriftingStars() {
  const ref = useRef();
  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.006;
    ref.current.rotation.x = scrollState.progress * 0.6;
  });
  return (
    <group ref={ref}>
      <Stars radius={60} depth={40} count={isTouch ? 1500 : 4000} factor={3} saturation={0} fade speed={0.6} />
    </group>
  );
}

function ChromaticShift() {
  const offset = useMemo(() => new THREE.Vector2(0.0003, 0.0003), []);
  useFrame(() => {
    const v = Math.min(Math.abs(scrollState.velocity) * 0.00004, 0.004);
    offset.x = THREE.MathUtils.lerp(offset.x, 0.0003 + v, 0.1);
    offset.y = offset.x;
  });
  return <ChromaticAberration offset={offset} blendFunction={BlendFunction.NORMAL} radialModulation={false} />;
}

export default function Scene() {
  const [dpr, setDpr] = useState(1.5);
  return (
    <div className="webgl" aria-hidden="true">
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 0, 7.2], fov: 45, near: 0.1, far: 200 }}
        gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
        onCreated={({ gl }) => gl.setClearColor('#05060a')}
        eventSource={typeof document !== 'undefined' ? document.body : undefined}
        eventPrefix="client"
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(2, window.devicePixelRatio))} />
        <AdaptiveDpr pixelated />
        <fog attach="fog" args={['#05060a', 10, 40]} />
        <CameraRig />
        <DriftingStars />
        <ParticleField />
        <EffectComposer disableNormalPass multisampling={0}>
          <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.22} luminanceSmoothing={0.4} radius={0.75} />
          <ChromaticShift />
          <Noise opacity={0.045} premultiply />
          <Vignette eskil={false} offset={0.2} darkness={0.85} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
