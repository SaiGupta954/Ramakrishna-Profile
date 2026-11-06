// Shared mutable state read inside the render loop (no React re-renders).
export const scrollState = {
  progress: 0, // 0..1 over the whole page
  velocity: 0,
  chapter: 0, // continuous: 0..4 driven by section positions
  pulse: 0, // spikes to 1 on each spoken word of the welcome voice
  speaking: false,
  splash: false, // true while the welcome splash is on screen → sphere centres behind the name
};

export const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
export const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
