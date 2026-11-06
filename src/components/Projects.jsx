import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { projects } from '../data/content';
import { TiltCard } from './Experience';
import { sound, startProjectSound, enable as enableSound, playEnter } from '../sound';
import { isTouch } from '../store';

// Small generative canvases, one per project.
function Visual({ kind, accent, activity }) {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext('2d');
    let raf;
    let w, h;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const resize = () => {
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // seeds
    const clusters = [
      [0.28, 0.4, accent],
      [0.62, 0.3, '#ff6b35'],
      [0.55, 0.72, '#c4f25a'],
    ];
    const pts = Array.from({ length: 140 }, (_, i) => {
      const k = clusters[i % 3];
      const a = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.7) * 0.13;
      return { k, a, r, s: 0.4 + Math.random() };
    });
    const cells = Array.from({ length: 260 }, () => ({
      x: Math.random(),
      y: Math.random(),
      tx: 0,
      ty: 0,
      g: Math.floor(Math.random() * 4),
    }));
    const centers = [
      [0.25, 0.3],
      [0.72, 0.28],
      [0.3, 0.75],
      [0.75, 0.72],
    ];
    const cellCols = [accent, '#6ee7ff', '#ff6b35', '#b69cff'];

    let clock = 0;
    let last = performance.now();
    let speed = 1;
    const draw = (now) => {
      // hovering with sound speeds the animation up, following the pointer
      const a = activity.current;
      speed += ((a.on ? 1.6 + a.x * 2.4 : 1) - speed) * 0.06;
      clock += ((now - last) / 1000) * speed;
      last = now;
      let t = clock;
      ctx.clearRect(0, 0, w, h);
      if (kind === 'clusters') {
        // segmentation clusters orbiting their centroids
        pts.forEach((p) => {
          const a = p.a + t * 0.4 * p.s;
          const x = (p.k[0] + Math.cos(a) * p.r) * w;
          const y = (p.k[1] + Math.sin(a) * p.r * 1.3) * h;
          ctx.fillStyle = p.k[2];
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#f2efe9';
        ctx.setLineDash([3, 5]);
        clusters.forEach((k) => {
          ctx.beginPath();
          ctx.arc(k[0] * w, k[1] * h, 0.16 * w * (1 + Math.sin(t * 2) * 0.03), 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.setLineDash([]);
        // chat bubble
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(242,239,233,0.08)';
        ctx.strokeStyle = accent;
        ctx.beginPath();
        ctx.roundRect(w * 0.06, Math.min(h * 0.62, h - 84), w * 0.5, 24, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f2efe9';
        ctx.font = '11px JetBrains Mono, monospace';
        const msg = '> which customers will churn?';
        ctx.fillText(msg.slice(0, Math.floor((t * 12) % (msg.length + 20))), w * 0.06 + 12, Math.min(h * 0.62, h - 84) + 16);
      } else if (kind === 'wave') {
        // raw noisy signal vs. reduced signal
        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          ctx.strokeStyle = pass ? accent : 'rgba(242,239,233,0.35)';
          ctx.lineWidth = pass ? 2 : 1;
          for (let x = 0; x <= w; x += 2) {
            const u = x / w;
            const base = Math.sin(u * 22 + t * 4) * 0.5 + Math.sin(u * 51 - t * 7) * 0.3;
            const noise = pass ? 0.35 : 1;
            const y = h * 0.5 + base * h * 0.28 * noise + (pass ? 0 : Math.sin(u * 133 + t * 13) * h * 0.06);
            x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        // propeller
        const cx = w * 0.84, cy = h * 0.2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * 9);
        ctx.fillStyle = accent;
        for (let b = 0; b < 2; b++) {
          ctx.rotate(Math.PI);
          ctx.beginPath();
          ctx.ellipse(13, 0, 13, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else {
        // cells drifting from noise into clusters (normalization)
        const phase = (Math.sin(t * 0.6) + 1) / 2;
        cells.forEach((p) => {
          const [cx, cy] = centers[p.g];
          const x = (p.x * (1 - phase) + (cx + (p.x - 0.5) * 0.22) * phase) * w;
          const y = (p.y * (1 - phase) + (cy + (p.y - 0.5) * 0.22) * phase) * h;
          ctx.fillStyle = cellCols[p.g];
          ctx.globalAlpha = 0.35 + phase * 0.6;
          ctx.beginPath();
          ctx.arc(x, y, 2.4, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(draw);
    };
    // only animate while visible
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      if (e.isIntersecting) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    });
    io.observe(c);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [kind, accent, activity]);
  return <canvas className="proj__canvas" ref={ref} />;
}

function useSoundOn() {
  const [on, setOn] = useState(sound.enabled);
  useEffect(() => sound.subscribe(setOn), []);
  return on;
}

// only one project soundscape at a time
let stopActive = null;

function ProjectCard({ p }) {
  const activity = useRef({ on: false, x: 0.5, y: 0.5 });
  const ctrl = useRef(null);
  const wrap = useRef(null);
  const lastPointer = useRef('mouse');
  const [playing, setPlaying] = useState(false);
  const soundOn = useSoundOn();

  const stop = () => {
    ctrl.current?.stop();
    ctrl.current = null;
    activity.current.on = false;
    if (stopActive === stop) stopActive = null;
    setPlaying(false);
  };
  const start = () => {
    if (ctrl.current) return;
    if (stopActive && stopActive !== stop) stopActive();
    ctrl.current = startProjectSound(p.visual);
    if (ctrl.current) {
      stopActive = stop;
      activity.current.on = true;
      setPlaying(true);
    }
  };
  // keep the latest closures for observers / unmount
  const stopRef = useRef(stop);
  stopRef.current = stop;

  useEffect(() => {
    if (!soundOn) stop();
  }, [soundOn]);
  useEffect(() => () => stopRef.current(), []);
  // stop when the card scrolls out of view (touch devices never fire a real "leave")
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) stopRef.current();
    }, { threshold: 0.2 });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  const track = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    activity.current.x = x;
    activity.current.y = y;
    ctrl.current?.set(x, y);
  };

  return (
    <div
      ref={wrap}
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType;
        track(e);
      }}
      // mouse: hover plays, leaving stops. Touch: tap toggles (phones also emit
      // compatibility mouse events, so hover handling is off on touch-first devices).
      onPointerEnter={(e) => !isTouch && e.pointerType === 'mouse' && start()}
      onPointerMove={track}
      onPointerLeave={(e) => !isTouch && e.pointerType === 'mouse' && stop()}
      onClick={() => {
        if (isTouch || lastPointer.current !== 'mouse') ctrl.current ? stop() : start();
      }}
    >
      <TiltCard className={`proj ${playing ? 'is-playing' : ''}`} style={{ '--c': p.accent }} hover="listen">
        <div className="proj__visual">
          <Visual kind={p.visual} accent={p.accent} activity={activity} />
          <span className="proj__index">{p.index}</span>
          <div className="proj__sound mono">
            {soundOn ? (
              <>
                <span className={`bars ${playing ? 'is-on' : ''}`}>
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  {playing ? `now playing: ${p.sound}` : isTouch ? 'tap to hear it' : `hover to hear: ${p.sound}`}
                  {playing && !isTouch && <em> · {p.soundHint}</em>}
                </span>
              </>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  enableSound();
                  playEnter();
                  setTimeout(() => {
                    // sound is now on: start immediately (the effect above won't stop it)
                    ctrl.current = null;
                    start();
                  }, 150);
                }}
              >
                🔇 {isTouch ? 'tap for sound' : `turn on sound to hear the ${p.sound}`}
              </button>
            )}
          </div>
        </div>
        <div className="proj__body">
          <h3>{p.title}</h3>
          <p className="muted">{p.blurb}</p>
          <div className="proj__metrics">
            {p.metrics.map(([v, l]) => (
              <div key={l}>
                <strong>{v}</strong>
                <span className="mono">{l}</span>
              </div>
            ))}
          </div>
          <div className="chips">
            {p.stack.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="exp-card__glow" />
      </TiltCard>
    </div>
  );
}

export function Projects() {
  return (
    <section className="section projects" id="projects" data-chapter="3">
      <div className="section__label mono">[03] builds</div>
      <div className="projects__head">
        <h2 className="display">
          Selected <em>builds</em>
        </h2>
        <p className="muted">Machine learning, data pipelines and LLM features — each shipped with numbers to show for it. Hover (or tap) a card to hear it.</p>
      </div>
      <div className="projects__list">
        {projects.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 1.1, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            style={{ perspective: 1200 }}
          >
            <ProjectCard p={p} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
