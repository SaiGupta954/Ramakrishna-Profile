import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { damp } from 'maath/easing';
import { sphere, torusKnot, serverRacks, signalPlane, galaxy } from './shapes';
import { scrollState, isTouch } from '../store';

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uVelocity;
  uniform float uPulse;
  uniform vec3 uMouse;
  attribute vec3 aP0;
  attribute vec3 aP1;
  attribute vec3 aP2;
  attribute vec3 aP3;
  attribute vec3 aP4;
  attribute float aRand;
  varying float vRand;
  varying float vGlow;

  vec3 pick(float i) {
    if (i < 0.5) return aP0;
    if (i < 1.5) return aP1;
    if (i < 2.5) return aP2;
    if (i < 3.5) return aP3;
    return aP4;
  }

  void main() {
    float m = clamp(uMorph, 0.0, 4.0);
    float f = floor(m);
    float fr = m - f;
    // each particle leaves at a slightly different moment → flowing transitions
    float t = smoothstep(0.0, 1.0, clamp((fr - aRand * 0.35) / 0.65, 0.0, 1.0));
    vec3 a = pick(f);
    vec3 b = pick(min(f + 1.0, 4.0));
    vec3 pos = mix(a, b, t);

    // swirl outwards mid-transition
    float tr = sin(t * 3.14159);
    float ang = tr * 1.6 * (aRand - 0.5);
    pos.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * pos.xz;
    pos += normalize(pos + 0.0001) * tr * 0.9 * aRand;

    // idle breathing
    pos += vec3(
      sin(uTime * 0.7 + aRand * 31.0),
      cos(uTime * 0.6 + aRand * 17.0),
      sin(uTime * 0.5 + aRand * 11.0)
    ) * (0.025 + abs(uVelocity) * 0.25);

    // voice pulse: the cloud breathes outward on each spoken word
    pos *= 1.0 + uPulse * (0.06 + aRand * 0.1);

    // signal plane ripple (chapter 3)
    float w3 = 1.0 - clamp(abs(m - 3.0), 0.0, 1.0);
    pos.y += (sin(pos.x * 1.5 + uTime * 1.9) * 0.45 + cos(pos.z * 2.1 - uTime * 1.3) * 0.25) * w3;

    vec4 world = modelMatrix * vec4(pos, 1.0);

    // pointer repulsion in world space
    vec3 d = world.xyz - uMouse;
    float dist = length(d);
    float push = smoothstep(1.4, 0.0, dist);
    world.xyz += normalize(d + 0.0001) * push * 0.75;

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.35 + aRand * 0.9) * uPixelRatio * (1.0 / -mv.z);

    vRand = aRand;
    vGlow = push + tr * 0.5 + uPulse * 0.6;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uColC;
  varying float vRand;
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float alpha = pow(1.0 - d * 2.0, 1.8);
    vec3 col = vRand < 0.55 ? mix(uColA, uColB, vRand / 0.55) : mix(uColB, uColC, (vRand - 0.55) / 0.45);
    col += vGlow * vec3(1.0, 0.85, 0.7) * 0.8;
    gl_FragColor = vec4(col * 0.8, alpha * 0.5);
  }
`;

// Where the cloud sits on screen for each chapter (keeps it opposite the text).
const OFFSETS = [
  [2.7, 0.1, -0.6],
  [-3.2, 0, -1.2],
  [0, 0.2, -1.5],
  [0, -0.6, -0.5],
  [0.6, -0.4, -2.2],
];

export default function ParticleField() {
  const count = isTouch ? 8000 : 22000;
  const points = useRef();
  const group = useRef();
  const morph = useRef(0);
  const mouse = useMemo(() => new THREE.Vector3(99, 99, 99), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const { gl, viewport } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p0 = sphere(count);
    g.setAttribute('position', new THREE.BufferAttribute(p0, 3));
    g.setAttribute('aP0', new THREE.BufferAttribute(p0, 3));
    g.setAttribute('aP1', new THREE.BufferAttribute(torusKnot(count), 3));
    g.setAttribute('aP2', new THREE.BufferAttribute(serverRacks(count), 3));
    g.setAttribute('aP3', new THREE.BufferAttribute(signalPlane(count), 3));
    g.setAttribute('aP4', new THREE.BufferAttribute(galaxy(count), 3));
    const r = new Float32Array(count);
    for (let i = 0; i < count; i++) r[i] = Math.random();
    g.setAttribute('aRand', new THREE.BufferAttribute(r, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uSize: { value: 58 },
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
      uVelocity: { value: 0 },
      uPulse: { value: 0 },
      uMouse: { value: mouse },
      uColA: { value: new THREE.Color('#ff6b35') },
      uColB: { value: new THREE.Color('#f2c6a0') },
      uColC: { value: new THREE.Color('#6ee7ff') },
    }),
    [gl, mouse]
  );

  const tmpOffset = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const u = points.current.material.uniforms;
    u.uTime.value = state.clock.elapsedTime;

    // ease the morph toward the scroll chapter
    damp(morph, 'current', scrollState.chapter, 0.35, delta);
    u.uMorph.value = morph.current;
    u.uPulse.value = THREE.MathUtils.lerp(u.uPulse.value, scrollState.pulse, 0.35);
    scrollState.pulse *= Math.pow(0.02, delta); // fast decay between words
    u.uVelocity.value = THREE.MathUtils.lerp(u.uVelocity.value, THREE.MathUtils.clamp(scrollState.velocity * 0.01, -1, 1), 0.1);

    // pointer → world (z = 0 plane)
    ray.setFromCamera(state.pointer, state.camera);
    ray.ray.intersectPlane(plane, mouse);

    // position the cloud for the current chapter, narrower screens stay centred
    const m = morph.current;
    const i0 = Math.floor(m), i1 = Math.min(i0 + 1, 4), f = m - i0;
    const wide = viewport.aspect > 1.1 ? 1 : 0;
    tmpOffset.set(
      THREE.MathUtils.lerp(OFFSETS[i0][0], OFFSETS[i1][0], f) * wide,
      THREE.MathUtils.lerp(OFFSETS[i0][1], OFFSETS[i1][1], f) + (wide ? 0 : 2.0),
      THREE.MathUtils.lerp(OFFSETS[i0][2], OFFSETS[i1][2], f) - (wide ? 0 : 3.2)
    );
    if (scrollState.splash) tmpOffset.set(0, wide ? 0 : 0.6, wide ? -0.8 : -2.4);
    group.current.position.lerp(tmpOffset, scrollState.splash ? 0.05 : 0.04);

    // slow spin + pointer parallax
    group.current.rotation.y += delta * (0.08 + Math.abs(u.uVelocity.value) * 0.6);
    const tiltX = m > 2.5 && m < 3.5 ? 0.35 : m > 3.5 ? 0.55 : 0;
    damp(group.current.rotation, 'x', tiltX + state.pointer.y * -0.15, 0.4, delta);
    damp(group.current.rotation, 'z', state.pointer.x * 0.08, 0.4, delta);
  });

  return (
    <group ref={group}>
      <points ref={points} geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
