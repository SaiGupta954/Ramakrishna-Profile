import { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Scene from './three/Scene';
import { Preloader, Cursor, Nav, WelcomeSplash } from './components/Chrome';
import { Hero, About } from './components/Hero';
import { Experience } from './components/Experience';
import { Projects } from './components/Projects';
import { Marquee, Skills, Terminal, Contact } from './components/Lower';
import { scrollState, prefersReducedMotion } from './store';
import { installUiSounds } from './sound';

gsap.registerPlugin(ScrollTrigger);

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Map scroll position → continuous chapter index (0..4) from [data-chapter] anchors.
function computeChapter() {
  const anchors = [...document.querySelectorAll('[data-chapter]')];
  const center = window.scrollY + window.innerHeight * 0.55;
  const firsts = [];
  anchors.forEach((el) => {
    const c = +el.dataset.chapter;
    // pinned sections are wrapped in a GSAP pin-spacer whose position stays stable
    const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
    const top = box.getBoundingClientRect().top + window.scrollY;
    if (firsts[c] === undefined || top < firsts[c]) firsts[c] = top;
  });
  for (let i = firsts.length - 1; i >= 0; i--) {
    if (center >= firsts[i]) {
      const next = firsts[i + 1];
      if (next === undefined) return i;
      const f = (center - firsts[i]) / (next - firsts[i]);
      return i + smoothstep(0.6, 1, f);
    }
  }
  return 0;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [visitor, setVisitor] = useState('');
  const lenis = useRef(null);
  // gate → personalised welcome splash → portfolio
  const onDone = useCallback(({ name } = {}) => {
    setVisitor(name || '');
    setEntered(true);
  }, []);
  const onSplashDone = useCallback(() => setReady(true), []);

  useEffect(() => {
    const update = (velocity = 0) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollState.progress = max > 0 ? window.scrollY / max : 0;
      scrollState.velocity = velocity;
      scrollState.chapter = computeChapter();
    };

    if (prefersReducedMotion) {
      const onScroll = () => update(0);
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }

    const l = new Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true, anchors: { duration: 1.6 } });
    lenis.current = l;
    l.on('scroll', (e) => {
      ScrollTrigger.update();
      update(e.velocity * 60);
    });
    const raf = (time) => l.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    // velocity decays when idle
    const decay = gsap.ticker.add(() => {
      scrollState.velocity *= 0.92;
    });
    return () => {
      gsap.ticker.remove(raf);
      gsap.ticker.remove(decay);
      l.destroy();
    };
  }, []);

  useEffect(() => installUiSounds(), []);

  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => ScrollTrigger.refresh(), 300);
    return () => clearTimeout(id);
  }, [ready]);

  // lock scroll during preload
  useEffect(() => {
    if (ready) lenis.current?.start();
    else lenis.current?.stop();
    document.documentElement.classList.toggle('is-loading', !ready);
  }, [ready]);

  return (
    <>
      <Preloader onDone={onDone} />
      <AnimatePresence>{entered && !ready && <WelcomeSplash key="splash" name={visitor} onFinish={onSplashDone} />}</AnimatePresence>
      <Cursor />
      <Scene />
      <Nav lenis={lenis} />
      <main>
        <Hero ready={ready} visitor={visitor} />
        <About />
        <Marquee />
        <Experience />
        <Projects />
        <Skills />
        <Terminal visitor={visitor} />
        <Contact />
      </main>
    </>
  );
}
