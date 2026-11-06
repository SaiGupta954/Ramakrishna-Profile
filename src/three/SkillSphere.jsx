import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { skills, skillColors } from '../data/content';
import { isTouch } from '../store';

// Draw each label into its own canvas texture — no remote fonts needed.
function makeLabel(text, color) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = '600 64px "JetBrains Mono", ui-monospace, monospace';
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 90;
  c.width = w;
  c.height = 120;
  ctx.font = font;
  ctx.fillStyle = 'rgba(8,9,14,0.72)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  const r = 56;
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, 112, r);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(44, 60, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2efe9';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 66, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: w / 120 };
}

function Tag({ item, position, onHover, active, dim }) {
  const ref = useRef();
  const [hovered, setHovered] = useState(false);
  const { tex, aspect } = useMemo(() => makeLabel(item.name, item.color), [item]);
  const wp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const target = hovered || active ? 1.3 : 1;
    const s = THREE.MathUtils.lerp(ref.current.scale.y, 0.3 * target, 0.15);
    ref.current.scale.set(s * aspect, s, 1);
    // labels on the far side of the globe fade back
    ref.current.getWorldPosition(wp);
    const depth = THREE.MathUtils.mapLinear(wp.z, -3.4, 3.4, 0.22, 1);
    const goal = dim ? 0.1 : hovered || active ? 1 : depth;
    ref.current.material.opacity = THREE.MathUtils.lerp(ref.current.material.opacity, goal, 0.12);
    ref.current.renderOrder = Math.round(wp.z * 10);
  });
  return (
    <sprite
      ref={ref}
      position={position}
      scale={[0.3 * aspect, 0.3, 1]}
      onPointerOver={(e) => {
        if (e.pointerType === 'touch') return;
        e.stopPropagation();
        setHovered(true);
        onHover(item.group);
        document.body.dataset.cursor = 'hover';
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
        delete document.body.dataset.cursor;
      }}
    >
      <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

function Cloud({ focus, setFocus, radius = 3.3 }) {
  const items = useMemo(() => {
    const flat = Object.entries(skills).flatMap(([group, list]) =>
      list.map((name) => ({ name, group, color: skillColors[group] }))
    );
    const n = flat.length;
    const golden = Math.PI * (3 - Math.sqrt(5));
    return flat.map((item, i) => {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      return { item, pos: [Math.cos(th) * r * radius, y * radius, Math.sin(th) * r * radius] };
    });
  }, [radius]);

  const group = useRef();
  const { camera, size } = useThree();
  useEffect(() => {
    camera.position.z = size.width / size.height < 1 ? 12.5 : 9.2;
  }, [camera, size]);
  useFrame((state, delta) => {
    group.current.rotation.y += delta * (focus ? 0.03 : 0.12);
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[radius * 0.92, 2]} />
        <meshBasicMaterial color="#6ee7ff" wireframe transparent opacity={0.06} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshBasicMaterial color="#ff6b35" />
      </mesh>
      <pointLight color="#ff6b35" intensity={4} />
      {items.map(({ item, pos }) => (
        <Tag
          key={item.name}
          item={item}
          position={pos}
          onHover={setFocus}
          active={focus === item.group}
          dim={focus && focus !== item.group}
        />
      ))}
    </group>
  );
}

export default function SkillSphere({ focus, setFocus }) {
  return (
    <Canvas camera={{ position: [0, 0, 9.2], fov: 45 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
      <Cloud focus={focus} setFocus={setFocus} />
      <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.6} autoRotate={false} />
    </Canvas>
  );
}
