// Global UI chrome: preloader, custom cursor, nav, scroll progress, magnetic wrapper.
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useScroll } from 'framer-motion';
import { isTouch, scrollState } from '../store';
import { sound, toggle, enable as enableSound, playIntro } from '../sound';

const BOOT = [
  'mounting webgl context',
  'compiling particle shaders',
  'loading 22,000 particles',
  'resolving stack trace',
  'attaching debugger',
  'root cause: none. all systems nominal',
];

export function Preloader({ onDone }) {
  const [n, setN] = useState(0);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    // time-based so slow devices never get stuck on the loader (~1.8s total)
    const t0 = performance.now();
    const id = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / 1800);
      setN(Math.floor(100 * (1 - Math.pow(1 - p, 2.2))));
      if (p >= 1) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, []);

  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('rg-visitor') || '';
    } catch {
      return '';
    }
  });
  const returning = useRef(!!name);
  // Audio may only start from a click, so the visitor chooses how to enter.
  const enter = (withSound) => {
    const clean = name.replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 24);
    try {
      if (clean) localStorage.setItem('rg-visitor', clean);
    } catch {}
    if (withSound) {
      enableSound();
      playIntro();
    }
    setGone(true);
    onDone?.({ name: clean, withSound });
  };

  const lines = BOOT.slice(0, Math.ceil((n / 100) * BOOT.length));
  const loaded = n >= 100;
  return (
    <AnimatePresence>
      {!gone && (
        <motion.div
          className="preloader"
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="preloader__log mono">
            {lines.map((l, i) => (
              <div key={l}>
                <span className="ok">[ ok ]</span> {l}
                {i === lines.length - 1 && !loaded && <span className="blink">_</span>}
              </div>
            ))}
          </div>
          <div className="preloader__bottom">
            <AnimatePresence>
              {loaded && (
                <motion.div
                  className="preloader__enter"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      enter(true);
                    }}
                  >
                    <label className="mono muted" htmlFor="visitor-name">
                      {returning.current ? 'welcome back — still you?' : "before we start — what's your name?"}
                    </label>
                    <div className="name-field">
                      <span className="mono">&gt;</span>
                      <input
                        id="visitor-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="type your name"
                        maxLength={24}
                        autoComplete="given-name"
                        autoFocus
                        spellCheck={false}
                        enterKeyHint="go"
                      />
                    </div>
                    <div className="gate-meta mono muted small">
                      <span>best experienced with sound on 🎧</span>
                    </div>
                    <div className="preloader__btns">
                      <button type="submit" className="btn btn--solid btn--big">
                        <SoundBars on /> {name.trim() ? `Let's go, ${name.trim().split(' ')[0]}` : 'Enter with sound'}
                      </button>
                      <button type="button" className="btn" onClick={() => enter(false)}>
                        Enter silently
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="preloader__count">
              {String(n).padStart(3, '0')}
              <span>%</span>
            </div>
          </div>
          <div className="preloader__bar">
            <motion.i animate={{ scaleX: n / 100 }} transition={{ ease: 'linear', duration: 0.1 }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SoundBars({ on }) {
  return (
    <span className={`bars ${on ? 'is-on' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function SoundToggle() {
  const [on, setOn] = useState(sound.enabled);
  useEffect(() => sound.subscribe(setOn), []);
  return (
    <button className="sound-toggle mono" onClick={toggle} aria-label={on ? 'Mute sound' : 'Turn sound on'} data-hover="hover">
      <SoundBars on={on} />
      <span className="st-full">{on ? 'sound on' : 'sound off'}</span>
      <span className="st-short">{on ? 'on' : 'off'}</span>
    </button>
  );
}

export function Cursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 260, damping: 26, mass: 0.6 });
  const ry = useSpring(y, { stiffness: 260, damping: 26, mass: 0.6 });
  const [mode, setMode] = useState('');
  useEffect(() => {
    if (isTouch) return;
    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target.closest?.('a, button, [data-hover], input');
      setMode(t ? (t.dataset.hover || 'hover') : document.body.dataset.cursor || '');
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [x, y]);
  if (isTouch) return null;
  return (
    <>
      <motion.div className="cursor-dot" style={{ x, y }} />
      <motion.div className={`cursor-ring ${mode ? 'is-' + mode : ''}`} style={{ x: rx, y: ry }}>
        {mode === 'view' && <span>VIEW</span>}
        {mode === 'drag' && <span>DRAG</span>}
        {mode === 'listen' && <span>♪ LISTEN</span>}
      </motion.div>
    </>
  );
}

export function Magnetic({ children, strength = 0.35, className = '' }) {
  const ref = useRef(null);
  const x = useSpring(0, { stiffness: 200, damping: 15 });
  const y = useSpring(0, { stiffness: 200, damping: 15 });
  return (
    <motion.div
      ref={ref}
      className={`magnetic ${className}`}
      style={{ x, y }}
      onPointerMove={(e) => {
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

function Clock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const f = () =>
      setT(
        new Date().toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    f();
    const id = setInterval(f, 1000);
    return () => clearInterval(id);
  }, []);
  return <span>CIN {t}</span>;
}

const LINKS = [
  ['about', '01'],
  ['experience', '02'],
  ['projects', '03'],
  ['skills', '04'],
  ['shell', '05'],
  ['contact', '06'],
];

export function Nav({ lenis }) {
  const { scrollYProgress } = useScroll();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // freeze page scroll while the mobile menu is open
    if (open) lenis.current?.stop();
    else lenis.current?.start();
    document.documentElement.classList.toggle('menu-open', open);
  }, [open, lenis]);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const go = (id) => (e) => {
    e.preventDefault();
    setOpen(false);
    const el = document.getElementById(id);
    // wait a tick so scrolling is unlocked before we glide
    requestAnimationFrame(() => {
      if (lenis.current) lenis.current.scrollTo(el, { offset: 0, duration: 1.6, force: true });
      else el?.scrollIntoView({ behavior: 'smooth' });
    });
  };
  return (
    <>
      <motion.div className="progress" style={{ scaleX: scrollYProgress }} />
      <header className="nav">
        <a href="#top" className="nav__logo" onClick={go('top')} data-hover="hover">
          <span className="nav__mark">RG</span>
          <span className="mono nav__status">
            <i /> debugging @ Jabil
          </span>
        </a>
        <nav className="nav__links mono" aria-label="Sections">
          {LINKS.map(([id, n]) => (
            <a key={id} href={`#${id}`} onClick={go(id)}>
              <sup>{n}</sup>
              {id}
            </a>
          ))}
        </nav>
        <div className="nav__right mono">
          <SoundToggle />
          <Clock />
          <button
            className={`nav__burger ${open ? 'is-open' : ''}`}
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            <span />
            <span />
          </button>
        </div>
      </header>
      <AnimatePresence>
        {open && (
          <motion.nav
            className="mobile-menu"
            aria-label="Sections"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          >
            {LINKS.map(([id, n], i) => (
              <motion.a
                key={id}
                href={`#${id}`}
                onClick={go(id)}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <sup className="mono">{n}</sup>
                {id}
              </motion.a>
            ))}
            <p className="mono muted mobile-menu__foot">Cincinnati, OH · open to software engineering roles</p>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}

// Full-screen greeting shown right after the visitor enters: their name lands in big
// letters on the beat of the opening sound, then the portfolio opens.
export function WelcomeSplash({ name, onFinish }) {
  const finished = useRef(false);
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish(); // portfolio starts animating in while the splash fades out (exit below)
  }, [onFinish]);
  useEffect(() => {
    scrollState.splash = true;
    const id = setTimeout(finish, 4000);
    return () => {
      clearTimeout(id);
      scrollState.splash = false;
    };
  }, [finish]);
  const first = name ? name.split(' ')[0] : '';
  const big = first || 'friend';
  // colour each letter along an ink → orange → cyan ramp (solid colours render cleanly
  // while letters flip in 3D; gradient-clipped text glitches in Chrome)
  const ramp = ['#f2efe9', '#ffb38f', '#ff6b35', '#ff8a5c', '#9fe9f5', '#6ee7ff'];
  const colorAt = (i, n) => {
    const t = n <= 1 ? 0 : (i / (n - 1)) * (ramp.length - 1);
    const a = ramp[Math.floor(t)], b = ramp[Math.min(ramp.length - 1, Math.ceil(t))], f = t - Math.floor(t);
    const mix = (k) => Math.round(parseInt(a.slice(k, k + 2), 16) * (1 - f) + parseInt(b.slice(k, k + 2), 16) * f);
    return `rgb(${mix(1)}, ${mix(3)}, ${mix(5)})`;
  };
  const ease = [0.16, 1, 0.3, 1];
  return (
    <motion.div
      className="splash"
      onClick={finish}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06, filter: 'blur(14px)' }}
      transition={{ duration: 0.9, ease }}
    >
      <motion.p
        className="splash__eyebrow mono"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6, ease }}
      >
        <span className="dot" /> access granted
      </motion.p>
      <motion.p
        className="splash__welcome"
        initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ delay: 0.9, duration: 0.8, ease }}
      >
        Welcome,
      </motion.p>
      <h2
        className="splash__name"
        aria-label={big}
        style={{ fontSize: `min(14rem, ${Math.round(150 / Math.max(big.length, 4))}vw)` }}
      >
        {big.split('').map((ch, i) => (
          <span className="splash__clip" key={i}>
            <motion.span
              className="splash__char"
              style={{ color: colorAt(i, big.length) }}
              initial={{ y: '115%', rotateX: -90, opacity: 0 }}
              animate={{ y: '0%', rotateX: 0, opacity: 1 }}
              transition={{ delay: 1.55 + i * 0.045, duration: 0.9, ease }}
            >
              {ch === ' ' ? '\u00a0' : ch}
            </motion.span>
          </span>
        ))}
      </h2>
      <motion.div
        className="splash__flash"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.4, 1.8] }}
        transition={{ delay: 1.6, duration: 1.1, ease: 'easeOut' }}
      />
      <motion.p
        className="splash__sub mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.3, duration: 0.6 }}
      >
        {name ? `glad you're here, ${name}` : 'glad you\'re here'} — let's go to my details ↓
      </motion.p>
      <motion.span
        className="splash__skip mono muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 1 }}
      >
        click to skip
      </motion.span>
    </motion.div>
  );
}
