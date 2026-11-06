import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useInView, animate } from 'framer-motion';
import { profile, stats, education } from '../data/content';
import { Magnetic } from './Chrome';

const ease = [0.16, 1, 0.3, 1];

// Letters that scramble through glyphs before settling.
function Scramble({ text, delay = 0, className }) {
  const [out, setOut] = useState(text.replace(/./g, ' '));
  useEffect(() => {
    const glyphs = '!<>-_\\/[]{}=+*^?#01';
    let raf;
    const start = performance.now() + delay * 1000;
    const perChar = 55; // ms per settled letter — time-based so slow devices finish on time
    const tick = (now) => {
      if (now < start) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const done = Math.floor((now - start) / perChar);
      setOut(
        text
          .split('')
          .map((ch, i) => (i < done ? ch : ch === ' ' ? ' ' : glyphs[Math.floor(Math.random() * glyphs.length)]))
          .join('')
      );
      if (done < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, delay]);
  return <span className={className}>{out}</span>;
}

function RoleTicker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % profile.roles.length), 2400);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="ticker">
      <AnimatePresence mode="wait">
        <motion.span
          key={i}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          {profile.roles[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Hero({ ready, visitor }) {
  const ref = useRef();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '35%']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const letters = profile.first.split('');

  return (
    <section className="hero" id="top" ref={ref} data-chapter="0">
      <motion.div className="hero__inner" style={{ y, opacity }}>
        <motion.p
          className="mono eyebrow"
          initial={{ opacity: 0, y: 20 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.8, ease }}
        >
          <span className="dot" />
          <span>
            {visitor ? (
              <>
                [00] hello, <b className="visitor">{visitor}</b> — welcome aboard · {profile.location}
              </>
            ) : (
              <>[00] boot sequence complete — {profile.location}</>
            )}
          </span>
        </motion.p>

        <h1 className="hero__name" aria-label={`${profile.first} ${profile.last}`}>
          <span className="hero__line">
            {letters.map((l, i) => (
              <motion.span
                key={i}
                className="hero__char"
                initial={{ y: '110%', rotateX: -80 }}
                animate={ready ? { y: '0%', rotateX: 0 } : {}}
                transition={{ delay: 0.25 + i * 0.045, duration: 1.1, ease }}
                whileHover={{ y: '-12%', color: '#ff6b35', transition: { duration: 0.2 } }}
              >
                {l}
              </motion.span>
            ))}
          </span>
          <span className="hero__line hero__line--outline">
            {ready && <Scramble text={profile.last} delay={0.9} />}
            <motion.span
              className="hero__tag mono"
              initial={{ opacity: 0, x: -20 }}
              animate={ready ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 1.4, duration: 0.8, ease }}
            >
              &lt;engineer /&gt;
            </motion.span>
          </span>
        </h1>

        <motion.div
          className="hero__meta"
          initial={{ opacity: 0, y: 30 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.1, duration: 1, ease }}
        >
          <p className="hero__role">
            <span className="mono muted">currently →</span> <RoleTicker />
          </p>
          <p className="hero__lede">
            I build full-stack products and AI features, and I hunt production bugs down to their root cause.
          </p>
          <div className="hero__ctas">
            <Magnetic>
              <a className="btn btn--solid" href="#projects" data-hover="hover">
                See the builds <span>↗</span>
              </a>
            </Magnetic>
            <Magnetic>
              <a className="btn" href="#contact" data-hover="hover">
                Get in touch
              </a>
            </Magnetic>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="hero__scroll mono"
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : {}}
        transition={{ delay: 2 }}
      >
        <span>scroll to morph</span>
        <i />
      </motion.div>
    </section>
  );
}

function Counter({ value, suffix, decimals = 0 }) {
  const ref = useRef();
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, { duration: 2.2, ease: [0.16, 1, 0.3, 1], onUpdate: setV });
    return () => c.stop();
  }, [inView, value]);
  return (
    <span ref={ref}>
      {v.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function Reveal({ children, delay = 0, y = 40, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 1, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

// Word-by-word reveal tied to scroll position.
function ScrollText({ text }) {
  const ref = useRef();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 45%'] });
  const words = text.split(' ');
  return (
    <p className="about__big" ref={ref}>
      {words.map((w, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {w}
        </Word>
      ))}
    </p>
  );
}
function Word({ children, progress, range }) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  const accent = /\d|React|AI|root|Linux|LLM/.test(children);
  return (
    <motion.span style={{ opacity }} className={accent ? 'accent' : ''}>
      {children}{' '}
    </motion.span>
  );
}

export function About() {
  return (
    <section className="section about" id="about" data-chapter="1">
      <div className="section__label mono">[01] whoami</div>
      <div className="about__grid">
        <div className="about__copy">
          <ScrollText text={profile.summary} />
        </div>
        <div className="about__side">
          <div className="stats">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08} className="stat">
                <div className="stat__value">
                  <Counter value={s.value} suffix={s.suffix} decimals={s.decimals} />
                </div>
                <div className="stat__label mono">{s.label}</div>
              </Reveal>
            ))}
          </div>
          <Reveal className="edu" delay={0.2}>
            <div className="mono muted">education.json</div>
            <h3>{education.degree}</h3>
            <p>
              {education.school} · GPA {education.gpa} · {education.period}
            </p>
            <div className="chips">
              {education.coursework.map((c) => (
                <span key={c} className="chip">
                  {c}
                </span>
              ))}
            </div>
            <p className="edu__lead muted">{education.leadership}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
