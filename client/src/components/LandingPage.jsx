import React, { useState, useEffect, useRef } from 'react';
import '../landing.css';

export default function LandingPage({ onEnterApp, onEnterDemo }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'benefits' | 'how-it-works' | 'faqs' | 'pricing' | null
  const pageRef = useRef(null);
  const videoRef = useRef(null);

  // Manage body classes and viewport locks
  useEffect(() => {
    document.documentElement.classList.add('landing-active');
    document.body.classList.add('landing-active');
    document.title = 'Vesper.ai — Operational AI Infrastructure';

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

    // Double rAF fallback
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
            // Older browser fallback
            el.classList.add('is-in');
          }
        });
      });
    });

    // Escape key closes menu or modals
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setActiveModal(null);
      }
    };

    // Resize >=901px closes mobile menu
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
      {/* 4. Grain at z-index: 100 */}
      <div className="grain" aria-hidden="true" />

      {/* 2. Hero photo background with video + scrim */}
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

        {/* Header — 3-column grid */}
        <header className="header">
          {/* Left: Logo */}
          <a
            href="#top"
            className="logo appear appear--scale"
            style={{ '--d': '0.08s' }}
            aria-label="Vesper.ai"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <svg
              className="logo-mark"
              width="22"
              height="22"
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
              Vesper<span className="logo-suffix">.ai</span>
            </span>
          </a>

          {/* Center: Navigation Pills */}
          <nav id="site-nav" className="nav" aria-label="Primary">
            <button
              type="button"
              onClick={() => handleNavClick('benefits')}
              className="nav-pill appear appear--scale"
              style={{ '--d': '0.16s' }}
            >
              Benefits
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('how-it-works')}
              className="nav-pill appear appear--soft"
              style={{ '--d': '0.28s' }}
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('faqs')}
              className="nav-pill appear appear--scale"
              style={{ '--d': '0.40s' }}
            >
              FAQs
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('pricing')}
              className="nav-pill appear appear--soft"
              style={{ '--d': '0.52s' }}
            >
              Pricing
            </button>
          </nav>

          {/* Right: Header CTA and Mobile Burger */}
          <div className="flex items-center gap-3 justify-self-end">
            <button
              type="button"
              onClick={onEnterApp}
              className="btn btn-solid header-cta appear appear--scale"
              style={{ '--d': '0.34s' }}
            >
              Start for Free
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

        {/* Hero Section — bottom-centered */}
        <main className="hero" id="top">
          <div className="hero-copy">
            {/* Badge */}
            <div className="badge appear appear--pop" style={{ '--d': '0.22s' }}>
              <svg
                className="badge-star"
                width="18"
                height="20"
                viewBox="0 0 24 24"
                fill="#ffffff"
                aria-hidden="true"
              >
                <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
              </svg>
              <span>Operational AI Infrastructure</span>
            </div>

            {/* H1 — 2 masked lines */}
            <h1 className="hero-headline">
              <span className="headline-line appear appear--mask" style={{ '--d': '0.42s' }}>
                Train <em className="serif-agent">AI agents</em> on your
              </span>
              <span className="headline-line appear appear--mask" style={{ '--d': '0.62s' }}>
                workflows in minutes.
              </span>
            </h1>

            {/* Lede paragraph */}
            <p
              className="lede appear appear--soft"
              style={{ '--d': '0.82s', animationDuration: '1.25s' }}
            >
              Deploy adaptive AI agents that learn, execute, and scale operational tasks across your business.
            </p>

            {/* Actions */}
            <div className="hero-actions">
              <button
                type="button"
                onClick={onEnterApp}
                className="btn btn-solid hero-btn appear appear--btn"
                style={{ '--d': '0.96s' }}
              >
                Start for Free
              </button>
              <button
                type="button"
                onClick={onEnterDemo}
                className="btn btn-ghost-hero hero-btn appear appear--side"
                style={{ '--d': '1.10s' }}
              >
                See it in action
              </button>
            </div>
          </div>
        </main>

        {/* Stats Footer — 3 columns */}
        <footer className="stats">
          {/* Stat 1: Dual-pill / workflow icon */}
          <div className="stat appear appear--stat" style={{ '--d': '1.12s' }}>
            <svg
              className="stat-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="pillGrad1" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#3a3a3a" stopOpacity="0.62" />
                </linearGradient>
                <linearGradient id="pillGrad2" x1="13" y1="2" x2="24" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#3a3a3a" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.62" />
                </linearGradient>
              </defs>
              <rect x="3.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#pillGrad1)" />
              <rect x="13.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#pillGrad2)" />
              <rect x="9.2" y="10.9" width="5.6" height="2.2" rx="1.1" fill="#4a4a4a" />
            </svg>
            <span>4.2M+ workflows automated</span>
          </div>

          {/* Stat 2: Download tile */}
          <div className="stat appear appear--stat" style={{ '--d': '1.28s' }}>
            <svg
              className="stat-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="6.2" fill="#ffffff" />
              <path d="M12 7.1v7.4" stroke="#111111" strokeWidth="1.85" strokeLinecap="round" />
              <path
                d="M8.15 12.35L12 16.2l3.85-3.85"
                stroke="#111111"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>92% reduction in manual operations</span>
          </div>

          {/* Stat 3: Three avatars */}
          <div className="stat appear appear--stat" style={{ '--d': '1.44s' }}>
            <svg
              className="stat-icon-wide"
              width="38"
              height="21"
              viewBox="0 0 40 22"
              fill="none"
              aria-hidden="true"
            >
              {/* Avatar 1 */}
              <circle cx="10.2" cy="11" r="9.2" fill="#2b2b2b" />
              <path d="M7 3.5L8.5 6L6 6Z" fill="#2b2b2b" />
              <path d="M13.4 3.5L14.4 6L11.9 6Z" fill="#2b2b2b" />
              <ellipse cx="10.2" cy="12.1" rx="4.15" ry="3.7" fill="#f4f4f4" />
              <circle cx="8.8" cy="11.5" r="0.7" fill="#1a1a1a" />
              <circle cx="11.6" cy="11.5" r="0.7" fill="#1a1a1a" />

              {/* Avatar 2 */}
              <circle cx="20.2" cy="11" r="9.2" fill="#ffffff" />
              <circle cx="17.7" cy="10" r="1.7" fill="#111111" />
              <circle cx="22.7" cy="10" r="1.7" fill="#111111" />
              <ellipse cx="20.2" cy="12.2" rx="1.2" ry="0.9" fill="#111111" />
              <path
                d="M17.8 14.2c1.2 1.3 3.6 1.3 4.8 0"
                stroke="#111111"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
              />

              {/* Avatar 3 */}
              <circle cx="30.2" cy="11" r="9.2" fill="#f26b1d" />
              <text
                x="30.2"
                y="15.1"
                fontFamily="'Inter', sans-serif"
                fontWeight="700"
                fontSize="12.5"
                fill="#ffffff"
                textAnchor="middle"
              >
                e
              </text>
            </svg>
            <span>180+ operational teams onboarded</span>
          </div>
        </footer>
      </div>

      {/* Liquid Glass Interactive Modal for Nav Links */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/20 bg-neutral-950/95 p-6 shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, #111111 0%, #080808 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 255, 255, 0.08)'
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm shadow-white/50" />
                <h3 className="text-base font-semibold text-white tracking-tight capitalize">
                  {activeModal === 'how-it-works' ? 'How Vesper.ai Works' : activeModal}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-white text-lg px-2 py-1 rounded transition"
              >
                ✕
              </button>
            </div>

            <div className="py-4 text-sm text-neutral-300 space-y-3 leading-relaxed">
              {activeModal === 'benefits' && (
                <>
                  <p>
                    <strong className="text-white">Zero Memory Hallucination:</strong> Ground agent reasoning in MongoDB Atlas vector embeddings with temporal superseding and immutable decision ledgers.
                  </p>
                  <p>
                    <strong className="text-white">Sub-100ms Atlas Vector Recall:</strong> Retrieve authoritative architectural constraints across team channels with multi-tenant privacy boundaries.
                  </p>
                  <p>
                    <strong className="text-white">DPO & Consensus Alignment:</strong> Automatically steer models using Direct Preference Optimization pairs and multi-agent quorum voting.
                  </p>
                </>
              )}

              {activeModal === 'how-it-works' && (
                <>
                  <p>
                    1. <strong className="text-white">Ingest & Structure:</strong> Engineering decisions communicated in Slack/Discord channels are extracted, normalized, and embedded into 1024D vectors.
                  </p>
                  <p>
                    2. <strong className="text-white">Detect Conflicts & Supersede:</strong> When new directives arrive (e.g. "We will use DynamoDB instead of MongoDB"), older records are flagged as superseded with complete lineage graphs.
                  </p>
                  <p>
                    3. <strong className="text-white">Live Grounding:</strong> Questions asked to Gemini 3 Flash or Claude 3.5 Sonnet inject strictly grounded active decisions with zero hallucination.
                  </p>
                </>
              )}

              {activeModal === 'faqs' && (
                <>
                  <p>
                    <strong className="text-white">Q: Does this require fine-tuning?</strong><br />
                    No. Vesper.ai operates at the memory infrastructure layer via MongoDB Atlas Vector Search, with optional DPO alignment export.
                  </p>
                  <p>
                    <strong className="text-white">Q: What models are supported?</strong><br />
                    Google Gemini 3 Flash, Gemini 3.1 Flash Lite, Anthropic Claude 3.5 Sonnet, and our built-in local deterministic grounding engine.
                  </p>
                  <p>
                    <strong className="text-white">Q: Can team decisions expire?</strong><br />
                    Yes. Time-bound decisions utilize MongoDB Atlas TTL indexes to automatically sunset after their expiration date.
                  </p>
                </>
              )}

              {activeModal === 'pricing' && (
                <>
                  <p>
                    <strong className="text-white">Hackathon Free Tier:</strong> Full access to SynapseMem 2.0 operational console, Atlas Vector Search engine, Consensus Quorum, and DPO training export.
                  </p>
                  <p className="text-xs text-neutral-400">
                    Enterprise tier includes dedicated Atlas clusters, custom VPC peering, and multi-region replication.
                  </p>
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
                  onEnterApp();
                }}
                className="btn btn-solid text-xs px-4 py-2"
              >
                Launch Console →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
