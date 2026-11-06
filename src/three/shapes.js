// Target shapes the particle field morphs between, one per scroll chapter.
// Each returns a Float32Array of xyz positions with `count` points.

const TAU = Math.PI * 2;

export function sphere(count, radius = 1.85) {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const shell = radius * (Math.random() < 0.82 ? 1 + (Math.random() - 0.5) * 0.06 : 0.35 + Math.random() * 0.6);
    out[i * 3] = Math.cos(th) * r * shell;
    out[i * 3 + 1] = y * shell;
    out[i * 3 + 2] = Math.sin(th) * r * shell;
  }
  return out;
}

export function torusKnot(count, p = 2, q = 3, scale = 0.78) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = Math.random() * TAU;
    const r = Math.cos(q * t) + 2;
    const x = r * Math.cos(p * t);
    const y = r * Math.sin(p * t);
    const z = -Math.sin(q * t);
    // random offset inside a tube
    const u = Math.random() * TAU;
    const v = Math.acos(2 * Math.random() - 1);
    const tube = 0.32 * Math.cbrt(Math.random());
    out[i * 3] = (x + tube * Math.sin(v) * Math.cos(u)) * scale;
    out[i * 3 + 1] = (y + tube * Math.sin(v) * Math.sin(u)) * scale;
    out[i * 3 + 2] = (z + tube * Math.cos(v)) * scale;
  }
  return out;
}

// Three server racks, each split into stacked units, drawn as box edges plus LED rows.
export function serverRacks(count) {
  const out = new Float32Array(count * 3);
  const W = 1.05, D = 0.9, UNITS = 9, UH = 0.36, GAP = 0.35;
  const totalH = UNITS * UH;
  for (let i = 0; i < count; i++) {
    const rack = Math.floor(Math.random() * 3);
    const ox = (rack - 1) * (W + GAP);
    const unit = Math.floor(Math.random() * UNITS);
    const oy = -totalH / 2 + unit * UH;
    let x, y, z;
    if (Math.random() < 0.22) {
      // LED row on the front face
      x = ox - W / 2 + 0.12 + Math.random() * 0.3;
      y = oy + UH * 0.5;
      z = D / 2 + 0.01;
    } else {
      // pick one of 12 edges of the unit box
      const e = Math.floor(Math.random() * 12);
      const t = Math.random();
      const sx = e & 1 ? 1 : -1;
      const sy = e & 2 ? 1 : 0;
      if (e < 4) { x = ox + (t - 0.5) * W; y = oy + sy * UH; z = (sx * D) / 2; }
      else if (e < 8) { x = ox + (sx * W) / 2; y = oy + t * UH; z = ((e & 2 ? 1 : -1) * D) / 2; }
      else { x = ox + (sx * W) / 2; y = oy + sy * UH; z = (t - 0.5) * D; }
    }
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

// A signal plane (sound / sensor waves) — the shader animates its height.
export function signalPlane(count) {
  const out = new Float32Array(count * 3);
  const side = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < count; i++) {
    const gx = (i % side) / side;
    const gz = Math.floor(i / side) / side;
    out[i * 3] = (gx - 0.5) * 8.5;
    out[i * 3 + 1] = -0.4;
    out[i * 3 + 2] = (gz - 0.5) * 5.5;
  }
  return out;
}

export function galaxy(count, arms = 4) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = Math.pow(Math.random(), 0.6) * 3.8 + 0.15;
    const arm = (i % arms) * (TAU / arms);
    const spin = r * 1.25;
    const spread = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5 * r * 0.4;
    const a = arm + spin + spread;
    out[i * 3] = Math.cos(a) * r + (Math.random() - 0.5) * 0.12;
    out[i * 3 + 1] = (Math.random() - 0.5) * 0.25 * (1.2 - r / 4);
    out[i * 3 + 2] = Math.sin(a) * r + (Math.random() - 0.5) * 0.12;
  }
  return out;
}
