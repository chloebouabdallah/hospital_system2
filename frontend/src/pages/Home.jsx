import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicNav from '../components/PublicNav';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import useCountUp from '../hooks/useCountUp';
import useReveal from '../hooks/useReveal';
import './Home.css';

import symptomImg from '../assets/hosp4.jpg';
import nearbyImg from '../assets/hosp2.jpg';
import bookingImg from '../assets/hosp3.jpg';
import wellnessImg from '../assets/hosp5.jpg';

// Feature cards. Set `image:` to an imported path or a URL to use a real image;
// leave it null to fall back to the emoji icon.
const FEATURES = [
  {
    image: symptomImg,
    title: 'Smart symptom check',
    short: 'Answer a few questions and get clear guidance.',
    text: 'Answer a few plain questions. A rule engine rates how urgent it is and suggests the right kind of specialist.',
    color: 'var(--p)',
  },
  {
    image: nearbyImg,
    title: 'Care close to you',
    short: 'See hospitals ranked by distance.',
    text: 'See hospitals ranked by distance and which specialists work at each one.',
    color: 'var(--k)',
  },
  {
    image: bookingImg,
    title: 'Booking that just works',
    short: 'Pick a slot, get confirmed, review your doctor.',
    text: 'Pick a free 45-minute slot, get a confirmation, and review your doctor afterwards.',
    color: 'var(--v)',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Tell us how you feel',
    text: 'Pick your main symptom and answer a few short follow-up questions — no medical jargon.',
    color: '#008cfd',
  },
  {
    num: '02',
    title: 'See how urgent it is',
    text: 'Our rule engine rates your answers as low, moderate, or urgent so you know whether to wait or act fast.',
    color: '#7b5cf0',
  },
  {
    num: '03',
    title: 'Find the right doctor',
    text: 'We suggest a specialty and show hospitals near you with a matching specialist on staff.',
    color: '#6d28d9',
  },
  {
    num: '04',
    title: 'Book, visit, review',
    text: 'Pick a free 45-minute slot, get a confirmation, and rate your visit afterwards.',
    color: '#8b5cf6',
  },
];

const FALLBACK_STATS = { specialties: 5, hospitals: 3, doctors: 2 };

// Wraps any block so it fades in based on direction.
// variant: 'up' | 'left' | 'right' | 'scale'
function Reveal({ children, className = '', variant = 'up' }) {
  const [ref, visible] = useReveal();
  const classes = [
    'reveal',
    `reveal-${variant}`,
    visible ? 'is-visible' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <div ref={ref} className={classes}>
      {children}
    </div>
  );
}

function StatTile({ value, label, icon }) {
  const [ref, n] = useCountUp(value);
  return (
    <div className="hm-stat" ref={ref}>
      <span className="hm-stat-icon" aria-hidden="true">{icon}</span>
      <b>{n}</b>
      <small>{label}</small>
    </div>
  );
}

export default function Home() {
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState(null);

  // Ask the backend who we are so the nav can switch to "Open dashboard".
  useEffect(() => {
    if (!user) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live numbers from the public endpoints, with sensible fallbacks.
  useEffect(() => {
    let off = false;
    Promise.allSettled([api.getSpecialties(), api.getHospitals(), api.getDoctors()]).then(([s, h, d]) => {
      if (off) return;
      setStats({
        specialties: s.value?.specialties?.length ?? FALLBACK_STATS.specialties,
        hospitals: h.value?.hospitals?.length ?? FALLBACK_STATS.hospitals,
        doctors: d.value?.doctors?.length ?? FALLBACK_STATS.doctors,
      });
    });
    return () => { off = true; };
  }, []);

  return (
    <div className="home">
      <PublicNav />

      <header className="hm-hero">
        <div className="hm-blob hm-blob-a" />
        <div className="hm-blob hm-blob-b" />
        <div className="hm-hero-copy">
          <span className="hm-pill">Your pocket-sized health guide</span>
          <h1>Feeling off? Let's work out what comes next.</h1>
          <p>
            GuideCare turns "something's wrong" into a clear plan: how urgent it is, which specialist
            to see, which hospital is closest, and a time that fits.
          </p>
          <div className="hm-row">
            <Link to="/register" className="btn btn-primary btn-lg">Get started free</Link>
            <a href="#how" className="btn btn-lg">See how it works</a>
          </div>
        </div>

        <div className="hm-art-wrap">
          <svg className="hm-art" viewBox="0 0 420 400" role="img" aria-label="A heart with a heartbeat line">
            <defs>
              <linearGradient id="hm-heart" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#008CFD" />
                <stop offset=".55" stopColor="#7B5CF0" />
                <stop offset="1" stopColor="#A78BFA" />
              </linearGradient>
            </defs>
            <path
              d="M210 345C85 262 55 186 92 128c34-48 92-30 118 14 26-44 84-62 118-14 37 58 7 134-118 217z"
              fill="url(#hm-heart)"
            />
            <path
              className="hm-ecg"
              d="M62 205h92l20-48 30 92 26-62 18 18h110"
              fill="none"
              stroke="#fff"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </header>

      <Reveal variant="up">
        <section className="hm-sec">
          <h2>What is GuideCare?</h2>
          <div className="hm-feat-grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="hm-feat" style={{ '--accent': f.color }}>
                <div className="hm-feat-img">
                  {f.image ? (
                    <img src={f.image} alt="" />
                  ) : (
                    <span className="hm-feat-emoji" aria-hidden="true">{f.icon}</span>
                  )}
                </div>
                <div className="hm-feat-body">
                  <h3>{f.title}</h3>
                  <p className="hm-feat-teaser">{f.short}</p>
                </div>
                <div className="hm-feat-overlay">
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal variant="scale">
        <section className="hm-sec">
          <div className="hm-statblock">
            <StatTile value={stats?.specialties ?? null} label="specialties covered" icon="🧬" />
            <StatTile value={stats?.hospitals ?? null} label="hospitals mapped" icon="🏥" />
            <StatTile value={stats?.doctors ?? null} label="doctors on board" icon="🩺" />
            <StatTile value={45} label="minutes per visit" icon="⏱️" />
          </div>
        </section>
      </Reveal>

      <Reveal variant="left">
        <section className="hm-sec" id="how">
          <h2>How it works</h2>
          <div className="hm-steps">
            {STEPS.map((s) => (
              <article key={s.num} className="hm-steppanel" style={{ '--accent': s.color }}>
                <span className="hm-stepnum">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal variant="right">
        <section className="hm-wellness">
          <div className="hm-wellness-img">
            <img src={wellnessImg} alt="A calm scene representing self-care" />
          </div>
          <div className="hm-wellness-copy">
            <span className="hm-pill">Why it matters</span>
            <h2>Your symptoms are telling you something. Listen.</h2>
            <p>
              Most of us brush off a persistent headache, a nagging cough, or a stomach ache that
              keeps coming back. We tell ourselves it'll pass. We wait for it to get worse before
              we act.
            </p>
            <p>
              But your body is the first — and often the only — warning system you have. Small
              signals, noticed early, are the easiest things in the world to treat. Ignored,
              they become the hardest.
            </p>
            <p>
              GuideCare helps you <strong>understand what you're feeling in plain language</strong>,
              decide how urgent it really is, and connect you with the right specialist nearby —
              before "just a headache" has a chance to become something harder.
            </p>
            <Link to="/register" className="btn btn-primary btn-lg">
              Start a symptom check
            </Link>
          </div>
        </section>
      </Reveal>

      <Reveal variant="up">
        <section className="hm-cta">
          <h2>Ready to feel sure about your next step?</h2>
          <Link to="/register" className="btn btn-lg">Create your free account</Link>
        </section>
      </Reveal>

      <footer className="hm-foot">
        GuideCare does not provide a medical diagnosis. It helps you decide what kind of care to seek.
        If symptoms are severe or getting worse, get medical attention immediately.
      </footer>
    </div>
  );
}