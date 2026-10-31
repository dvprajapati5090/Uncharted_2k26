import React, { useState, useEffect, useRef } from 'react';
import '../landing.css';

export default function LandingPage({
  onEnterApp,
  onEnterDemo,
  onOpenAuth,
  allTeams = [],
  teamMembers = [],
  activeTeam,
  activeUser,
  onLogin
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const pageRef = useRef(null);
  const videoRef = useRef(null);

  // Manage body classes and viewport locks
  useEffect(() => {
    document.documentElement.classList.add('landing-active');
    document.body.classList.add('landing-active');
    document.title = 'SynapseMem 2.0 — Agentic Memory & Consensus Engine';

    return () => {
      document.documentElement.classList.remove('landing-active');
      document.body.classList.remove('landing-active');
      document.body.classList.remove('menu-open');
    };
  }, []);

  // Sync menuOpen state to body.menu-open
  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
  }, [menuOpen]);

  // Entrance motion animationend handling and double-rAF fallback
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;

    const appearElements = root.querySelectorAll('.appear, .hero-photo');

    appearElements.forEach((el) => {
      const handleAnimEnd = () => {
        el.classList.add('is-in');
      };
      el.addEventListener('animationend', handleAnimEnd, { once: true });
    });

    let raf1, raf2;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        appearElements.forEach((el) => {
          if (typeof el.getAnimations === 'function') {
            const anims = el.getAnimations();
            if (!anims || anims.length === 0) {
              el.classList.add('is-in');
            }
          } else {
            el.classList.add('is-in');
          }
        });
      });
    });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 901) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div ref={pageRef} className="landing-root">
      {/* 1. Grain overlay */}
      <div className="grain" aria-hidden="true" />

      {/* 2. Ambient background photo/video scrim */}
      <div className="hero-photo appear">
        <video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      </div>

      {/* 3. Page container */}
      <div className="page">
        {/* Mobile menu backdrop */}
        <div
          className="menu-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Minimal clean header */}
        <header className="header">
          {/* Left: Brand */}
          <a
            href="#top"
            className="logo appear appear--scale"
            style={{ '--d': '0.08s' }}
            aria-label="SynapseMem 2.0"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <svg
              className="logo-mark"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <g transform="rotate(-30 12 12)">
                <circle cx="7.3" cy="3.2" r="1.45" />
                <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <circle cx="16.7" cy="20.8" r="1.45" />
              </g>
            </svg>
            <span>
              Synapse<span className="logo-suffix font-normal text-white/70">Mem</span>
            </span>
          </a>


          {/* Right: Clean Auth CTA & Mobile burger */}
          <div className="flex items-center gap-3 justify-self-end">
            <button
              type="button"
              onClick={onOpenAuth}
              className="btn btn-solid header-cta appear appear--scale"
              style={{ '--d': '0.34s' }}
            >
              Sign In
            </button>

            <button
              type="button"
              className="burger appear appear--scale"
              style={{ '--d': '0.34s' }}
              aria-controls="site-nav"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="burger-bar" />
              <span className="burger-bar" />
              <span className="burger-bar" />
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <main className="hero" id="top">
          <div className="hero-copy">
            {/* Clean Status Badge */}
            <div className="badge appear appear--pop" style={{ '--d': '0.22s' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>MongoDB Atlas Agentic Memory Layer</span>
            </div>

            {/* Headline */}
            <h1 className="hero-headline">
              <span className="headline-line appear appear--mask" style={{ '--d': '0.42s' }}>
                Structured memory for
              </span>
              <span className="headline-line appear appear--mask" style={{ '--d': '0.62s' }}>
                autonomous engineering teams.
              </span>
            </h1>

            {/* Concise Value Proposition */}
            <p
              className="lede appear appear--soft"
              style={{ '--d': '0.82s', animationDuration: '1.1s' }}
            >
              Autonomous team memory with <strong className="text-emerald-400 font-semibold">GitHub Guardian</strong> — scans every Pull Request for architecture violations, synchronizes Living ADRs, and grounds LLM responses with zero chat bloat.
            </p>

            {/* Focused Action CTAs */}
            <div className="hero-actions">
              <button
                type="button"
                onClick={onEnterDemo}
                className="btn btn-solid hero-btn appear appear--btn"
                style={{ '--d': '0.96s' }}
              >
                Guided Architecture Demo &rarr;
              </button>
              <button
                type="button"
                onClick={onOpenAuth}
                className="btn btn-ghost-hero hero-btn appear appear--side"
                style={{ '--d': '1.08s' }}
              >
                Sign In to Workspace
              </button>
            </div>
          </div>
        </main>

        {/* Footer Metrics */}
        <footer className="stats">
          <div className="stat appear appear--stat" style={{ '--d': '1.12s' }}>
            <svg className="stat-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span>86.4% Token Reduction vs Chat Bloat</span>
          </div>

          <div className="stat appear appear--stat" style={{ '--d': '1.24s' }}>
            <svg className="stat-icon text-emerald-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="18" cy="18" r="3" />
              <circle cx="6" cy="6" r="3" />
              <path d="M13 6h3a2 2 0 0 1 2 2v7" />
              <line x1="6" y1="9" x2="6" y2="21" />
            </svg>
            <span className="text-white"><strong className="text-emerald-300">GitHub Guardian:</strong> Autonomous PR Linter &amp; ADR Sync</span>
          </div>

          <div className="stat appear appear--stat" style={{ '--d': '1.36s' }}>
            <svg className="stat-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Multi-Agent Consensus &amp; Quorum Shield</span>
          </div>
        </footer>
      </div>

    </div>
  );
}
