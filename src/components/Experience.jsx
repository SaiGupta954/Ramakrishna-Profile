import { useLayoutEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { experience } from '../data/content';

gsap.registerPlugin(ScrollTrigger);

function TiltCard({ children, className = '', style, hover = 'hover' }) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-10, 10]), { stiffness: 150, damping: 18 });
  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);
  return (
    <motion.article
      className={`tilt ${className}`}
      data-hover={hover}
      style={{ ...style, rotateX: rx, rotateY: ry, '--gx': gx, '--gy': gy }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        mx.set(0.5);
        my.set(0.5);
      }}
    >
      {children}
    </motion.article>
  );
}
export { TiltCard };

export function Experience() {
  const section = useRef();
  const track = useRef();

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 980px)', () => {
      const distance = () => track.current.scrollWidth - window.innerWidth + 80;
      const tween = gsap.to(track.current, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section.current,
          start: 'top top',
          end: () => '+=' + distance(),
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
      // cards lift in as they enter the viewport horizontally
      gsap.utils.toArray('.exp-slot').forEach((card) => {
        gsap.from(card, {
          opacity: 0.25,
          scale: 0.92,
          rotateY: -18,
          scrollTrigger: {
            trigger: card,
            containerAnimation: tween,
            start: 'left 95%',
            end: 'left 55%',
            scrub: true,
          },
        });
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section className="exp" id="experience" ref={section} data-chapter="2">
      <div className="exp__track" ref={track}>
        <div className="exp__intro">
          <div className="section__label mono">[02] stack trace</div>
          <h2 className="display">
            Where I've
            <br />
            <em>shipped</em> &amp;
            <br />
            debugged.
          </h2>
          <p className="muted mono small">
            at Jabil.debug()
            <br />
            at MAK.build3D()
            <br />
            at UC.research()
            <br />
            at MassMutual.ship()
          </p>
        </div>
        {experience.map((job, i) => (
          <div className="exp-slot" key={job.company}>
          <TiltCard className="exp-card" style={{ '--c': job.color }}>
            <div className="exp-card__top mono">
              <span>#{String(experience.length - i).padStart(2, '0')}</span>
              <span className="exp-card__code">{job.code}</span>
            </div>
            <div className="exp-card__period mono">{job.period}</div>
            <h3>{job.role}</h3>
            <div className="exp-card__company">@ {job.company}</div>
            <ul>
              {job.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <div className="chips">
              {job.tags.map((t) => (
                <span className="chip" key={t}>
                  {t}
                </span>
              ))}
            </div>
            <div className="exp-card__glow" />
          </TiltCard>
          </div>
        ))}
        <div className="exp__end mono">
          <span>EOF</span>
          <p className="muted">exit code 0 — every bug closed with a root cause.</p>
        </div>
      </div>
    </section>
  );
}
