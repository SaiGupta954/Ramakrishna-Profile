import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, useScroll, useVelocity, useSpring, useTransform, useMotionValue, useAnimationFrame, useInView } from 'framer-motion';
import { skills, skillColors, profile, experience, projects, education } from '../data/content';
import { Magnetic } from './Chrome';
import { isTouch } from '../store';
import { Reveal } from './Hero';
import { playKey, playEnter } from '../sound';

const SkillSphere = lazy(() => import('../three/SkillSphere'));

/* ---------------- Velocity marquee ---------------- */
const wrap = (min, max, v) => {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
};
function MarqueeRow({ items, base = 3 }) {
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const vel = useVelocity(scrollY);
  const smooth = useSpring(vel, { damping: 50, stiffness: 400 });
  const factor = useTransform(smooth, [-1500, 0, 1500], [-4, 0, 4], { clamp: false });
  const skew = useTransform(smooth, [-2000, 2000], [8, -8]);
  const dir = useRef(1);
  const pct = useTransform(x, (v) => `${wrap(-50, 0, v)}%`);
  useAnimationFrame((_, delta) => {
    let move = dir.current * base * (delta / 1000);
    if (factor.get() < 0) dir.current = -1;
    else if (factor.get() > 0) dir.current = 1;
    move += dir.current * move * Math.abs(factor.get());
    x.set(x.get() + move);
  });
  const row = [...items, ...items];
  return (
    <div className="marquee__row">
      <motion.div className="marquee__inner" style={{ x: pct, skewX: skew }}>
        {row.map((t, i) => (
          <span key={i}>
            {t} <i>✳</i>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
export function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <MarqueeRow items={['React', 'Three.js', 'TypeScript', 'Node.js', 'C# / .NET', 'Python', 'Kafka', 'Docker', 'Kubernetes']} base={2.5} />
      <MarqueeRow items={['LLMs', 'RAG', 'TensorFlow', 'Linux', 'Root Cause Analysis', 'PostgreSQL', 'Azure', 'GCP', 'AWS']} base={-2.5} />
    </div>
  );
}

/* ---------------- Skills ---------------- */
export function Skills() {
  const [focus, setFocus] = useState(null);
  const ref = useRef();
  const near = useInView(ref, { margin: '300px 0px' });
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (near) setMounted(true); // create the WebGL context once, then keep it
  }, [near]);
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    (document.fonts?.ready || Promise.resolve()).then(() => setFontsReady(true));
  }, []);
  return (
    <section className="section skills" id="skills" data-chapter="4" ref={ref}>
      <div className="section__label mono">[04] modules loaded</div>
      <div className="skills__grid">
        <div>
          <h2 className="display">
            The <em>toolkit</em>
          </h2>
          <p className="muted">{isTouch ? 'Tap a category to light up its modules.' : 'Drag the globe. Hover a module to light up its category.'}</p>
          <div className="skills__legend">
            {Object.entries(skills).map(([g, list]) => (
              <button
                key={g}
                className={`legend ${focus === g ? 'is-on' : ''}`}
                style={{ '--c': skillColors[g] }}
                onClick={() => setFocus((f) => (f === g ? null : g))}
                onMouseEnter={() => setFocus(g)}
                onMouseLeave={() => setFocus(null)}
                onFocus={() => setFocus(g)}
                onBlur={() => setFocus(null)}
              >
                <i />
                <span>{g}</span>
                <span className="mono muted">{String(list.length).padStart(2, '0')}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="skills__canvas" data-hover={isTouch ? undefined : 'drag'}>
          {mounted && fontsReady && (
            <Suspense fallback={null}>
              <SkillSphere focus={focus} setFocus={setFocus} active={near} />
            </Suspense>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Interactive terminal ---------------- */
const HELP = [
  ['whoami', 'who is this guy'],
  ['experience', 'work history'],
  ['projects', 'selected builds'],
  ['skills', 'loaded modules'],
  ['education', 'degrees'],
  ['contact', 'how to reach me'],
  ['neofetch', 'system info'],
  ['clear', 'wipe the screen'],
];

function run(cmd) {
  const c = cmd.trim().toLowerCase();
  if (!c) return [];
  switch (c) {
    case 'help':
      return ['available commands:', ...HELP.map(([k, d]) => `  ${k.padEnd(12)} ${d}`), '  …and maybe a hidden one.'];
    case 'whoami':
    case 'about':
      return [`${profile.first} ${profile.last} — ${profile.roles.join(' / ')}`, profile.summary];
    case 'experience':
    case 'exp':
      return experience.map((e) => `• ${e.period.padEnd(20)} ${e.role} @ ${e.company}`);
    case 'projects':
    case 'ls projects':
      return projects.map((p) => `• ${p.title}  [${p.metrics.map((m) => m.join(' ')).join(', ')}]`);
    case 'skills':
      return Object.entries(skills).map(([g, l]) => `${g.padEnd(20)} ${l.join(', ')}`);
    case 'education':
      return [`${education.degree} — ${education.school}`, `GPA ${education.gpa} · ${education.period}`];
    case 'contact':
      return [`email     ${profile.email}`, `linkedin  ${profile.linkedin}`, `github    ${profile.github}`];
    case 'neofetch':
      return [
        '   ██████╗  ██████╗     ramakrishna@portfolio',
        '   ██╔══██╗██╔════╝     ---------------------',
        '   ██████╔╝██║  ███╗    OS: Linux (debug build)',
        '   ██╔══██╗██║   ██║    Uptime: 4+ years',
        '   ██║  ██║╚██████╔╝    Shell: bash / python',
        '   ╚═╝  ╚═╝ ╚═════╝     GPA: 3.96 / 4.0',
        '                        Stack: React · Node · .NET · AI',
      ];
    case 'sudo hire-me':
    case 'sudo hire me':
      return ['[sudo] password for recruiter: ********', 'access granted ✓', `→ opening channel: ${profile.email}`, 'scroll down to #contact — I reply fast.'];
    case 'ls':
      return ['about/  experience/  projects/  skills/  contact/  resume.pdf'];
    case 'cat resume.pdf':
      return ['binary file — try `experience` or `projects` instead :)'];
    case 'rm -rf /':
      return ['nice try. root cause: curiosity.'];
    default:
      return [`command not found: ${c} — type 'help'`];
  }
}

export function Terminal({ visitor }) {
  const user = (visitor || 'guest').toLowerCase().replace(/[^a-z0-9]/g, '') || 'guest';
  const [lines, setLines] = useState([
    { t: 'sys', v: 'ramakrishna-os v4.0 — interactive shell' },
    { t: 'sys', v: "type 'help' to list commands" },
  ]);
  const [val, setVal] = useState('');
  const [hist, setHist] = useState([]);
  const [hi, setHi] = useState(-1);
  const body = useRef();
  const input = useRef();

  useEffect(() => {
    body.current.scrollTop = body.current.scrollHeight;
  }, [lines]);

  const submit = (e) => {
    e.preventDefault();
    playEnter();
    if (val.trim().toLowerCase() === 'clear') {
      setLines([]);
    } else {
      setLines((l) => [...l, { t: 'in', v: val }, ...run(val).map((v) => ({ t: 'out', v }))]);
    }
    if (val.trim()) setHist((h) => [val, ...h]);
    setHi(-1);
    setVal('');
  };

  const quick = (cmd) => {
    setLines((l) => [...l, { t: 'in', v: cmd }, ...run(cmd).map((v) => ({ t: 'out', v }))]);
  };

  return (
    <section className="section shell" id="shell" data-chapter="4">
      <div className="section__label mono">[05] interactive shell</div>
      <Reveal>
        <h2 className="display">
          Prefer the <em>command line?</em>
        </h2>
      </Reveal>
      <Reveal delay={0.1}>
        <div className="term" onClick={() => input.current?.focus({ preventScroll: true })}>
          <div className="term__bar mono">
            <span className="term__dots">
              <i />
              <i />
              <i />
            </span>
            <span>{user}@ramakrishna: ~</span>
            <span className="muted">bash</span>
          </div>
          <div className="term__body mono" ref={body} data-lenis-prevent>
            {lines.map((l, i) => (
              <div key={i} className={`term__line term__line--${l.t}`}>
                {l.t === 'in' && <span className="term__prompt">➜ ~ </span>}
                {l.v}
              </div>
            ))}
            <form onSubmit={submit} className="term__form">
              <span className="term__prompt">➜ ~ </span>
              <input
                ref={input}
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key.length === 1 || e.key === 'Backspace') playKey();
                  if (e.key === 'ArrowUp' && hist.length) {
                    e.preventDefault();
                    const n = Math.min(hi + 1, hist.length - 1);
                    setHi(n);
                    setVal(hist[n]);
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const n = Math.max(hi - 1, -1);
                    setHi(n);
                    setVal(n === -1 ? '' : hist[n]);
                  }
                }}
                spellCheck={false}
                autoComplete="off"
                aria-label="Terminal input"
              />
            </form>
          </div>
          <div className="term__quick mono">
            {['whoami', 'projects', 'neofetch', 'sudo hire-me'].map((c) => (
              <button
                key={c}
                onClick={(e) => {
                  e.stopPropagation();
                  quick(c);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------------- Contact ---------------- */
export function Contact() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied('fail');
    }
  };
  const ref = useRef();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  return (
    <section className="contact" id="contact" ref={ref} data-chapter="4">
      <div className="section__label mono">[06] open a connection</div>
      <motion.h2 className="contact__title" style={{ scale }}>
        Let's debug
        <br />
        <span className="outline">something</span> <em>great.</em>
      </motion.h2>
      <div className="contact__row">
        <Magnetic strength={0.25}>
          <button className="contact__email" onClick={copy} data-hover="hover">
            <span className="mono muted">{copied === true ? 'copied to clipboard ✓' : copied === 'fail' ? 'select & copy:' : 'click to copy'}</span>
            <span className="contact__addr">{profile.email}</span>
          </button>
        </Magnetic>
        <div className="contact__links">
          <Magnetic>
            <a className="btn" href={profile.linkedin} target="_blank" rel="noreferrer">
              LinkedIn ↗
            </a>
          </Magnetic>
          <Magnetic>
            <a className="btn" href={profile.github} target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
          </Magnetic>
          <Magnetic>
            <a className="btn btn--solid" href={`mailto:${profile.email}`}>
              Email ↗
            </a>
          </Magnetic>
        </div>
      </div>
      <footer className="footer mono">
        <span>© {new Date().getFullYear()} Ramakrishna Gampa</span>
        <span>{profile.location} · open to software engineering roles</span>
        <span>built with React Three Fiber · GLSL · GSAP · Framer Motion</span>
      </footer>
    </section>
  );
}
