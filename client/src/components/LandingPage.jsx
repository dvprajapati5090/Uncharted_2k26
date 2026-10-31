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
  const [activeModal, setActiveModal] = useState(null); // 'architecture' | 'consensus' | 'vector-search' | null

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
        setActiveModal(null);
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

  const handleNavClick = (section) => {
    setMenuOpen(false);
    setActiveModal(section);
  };

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

          {/* Center: Simplified Navigation Pills */}
          <nav id="site-nav" className="nav" aria-label="Primary">
            <button
              type="button"
              onClick={() => handleNavClick('architecture')}
              className="nav-pill appear appear--scale"
              style={{ '--d': '0.16s' }}
            >
              Architecture
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('consensus')}
              className="nav-pill appear appear--soft"
              style={{ '--d': '0.28s' }}
            >
              Quorum Consensus
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('vector-search')}
              className="nav-pill appear appear--scale"
              style={{ '--d': '0.40s' }}
            >
              Vector Grounding
            </button>
          </nav>

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
              SynapseMem captures architectural decisions and technical constraints directly in MongoDB with 1024D vector embeddings. With conflict resolution, temporal expiry, and multi-agent consensus, LLMs reference verified decisions instead of noisy chat logs.
            </p>

            {/* Focused Action CTAs */}
            <div className="hero-actions">
              <button
                type="button"
                onClick={onOpenAuth}
                className="btn btn-solid hero-btn appear appear--btn"
                style={{ '--d': '0.96s' }}
              >
                Sign In to Workspace &rarr;
              </button>
              <button
                type="button"
                onClick={onEnterDemo}
                className="btn btn-ghost-hero hero-btn appear appear--side"
                style={{ '--d': '1.08s' }}
              >
                Guided Architecture Demo
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
            <svg className="stat-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Automated Lineage &amp; Temporal TTL</span>
          </div>

          <div className="stat appear appear--stat" style={{ '--d': '1.36s' }}>
            <svg className="stat-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Multi-Agent Consensus &amp; Quorum Shield</span>
          </div>
        </footer>
      </div>

      {/* Project Architecture & Tech Modals */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-white/15 bg-neutral-950 p-6 shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, #111111 0%, #080808 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 35px rgba(255, 255, 255, 0.05)'
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white shadow-sm shadow-white/50" />
                <h3 className="text-base font-semibold text-white tracking-tight">
                  {activeModal === 'architecture' && 'Autonomous Architecture Memory'}
                  {activeModal === 'consensus' && 'Quorum Consensus & Quorum Arbiter'}
                  {activeModal === 'vector-search' && '1024D Dense Vector Grounding'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-white text-lg px-2 py-1 rounded transition"
              >
                &times;
              </button>
            </div>

            <div className="py-4 text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              {activeModal === 'architecture' && (
                <>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <span className="text-emerald-400">1. Structured Directives</span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      When architectural agreements are stated in team channels, SynapseMem records authoritative structured memory documents with topic, directive, rationale, and owner.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <span className="text-amber-400">2. Superseding &amp; Expiry</span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Conflicting directives create bidirectional lineage links where outdated guidelines are marked superseded, and sprint-bound constraints expire after their target deadline.
                    </p>
                  </div>
                </>
              )}

              {activeModal === 'consensus' && (
                <>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-white font-semibold">3-Agent Democratic Quorum</div>
                    <p className="text-xs text-neutral-400">
                      Before permanent architectural changes are ratified into the memory ledger, proposals pass through Atlas Architect, Sentinel Guard, and Pipeline Marshal agents with threshold verification.
                    </p>
                  </div>
                </>
              )}

              {activeModal === 'vector-search' && (
                <>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-white font-semibold">Zero-History Injection</div>
                    <p className="text-xs text-neutral-400">
                      Instead of stuffing thousands of lines of conversational history into prompts, SynapseMem queries active memory vectors using high-dimensional cosine similarity for precise citations.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="btn btn-ghost text-xs px-3 py-1.5"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  onOpenAuth();
                }}
                className="btn btn-solid text-xs px-4 py-2"
              >
                Sign In to Workspace &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
