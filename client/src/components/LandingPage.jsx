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
  const [activeModal, setActiveModal] = useState(null); // 'core-engine' | 'how-it-works' | 'token-guard' | 'why-not-chat' | null
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Teams & Users resolution
  const defaultTeams = [
    { id: 'ws_core', name: 'Apollo Core Engineering', description: 'Architecture, DB & Distributed Systems' },
    { id: 'ws_sprint', name: 'Alpha Hackathon Sprint', description: 'Collaborative sprint team with token collision radar' }
  ];

  const defaultMembers = [
    { id: 'u_sarah', name: 'Sarah Jenkins', role: 'Tech Lead', avatar: 'SJ', desc: 'Sets architecture directives & database choices' },
    { id: 'u_cand_a', name: 'Candidate A', role: 'Sprint Developer', avatar: 'CA', desc: 'Claims coding tasks & implements modules' },
    { id: 'u_cand_b', name: 'Candidate B', role: 'Backend Engineer', avatar: 'CB', desc: 'Tests collaborative token collision guard' },
    { id: 'u_marcus', name: 'Marcus Chen', role: 'Product Manager', avatar: 'MC', desc: 'Manages deadlines & temporary sprint rules' },
    { id: 'u_alex', name: 'Alex Rivera', role: 'Backend Lead', avatar: 'AR', desc: 'Microservices & caching policies' },
    { id: 'u_elena', name: 'Elena Rostova', role: 'Frontend Dev', avatar: 'ER', desc: 'UI constraints & component standards' }
  ];

  const effectiveTeams = allTeams && allTeams.length > 0 ? allTeams : defaultTeams;
  const effectiveMembers = teamMembers && teamMembers.length > 0 ? teamMembers : defaultMembers;

  // Selected Login State
  const [selectedTeamId, setSelectedTeamId] = useState(() => activeTeam?.id || effectiveTeams[0]?.id || 'ws_core');
  const [selectedUserId, setSelectedUserId] = useState(() => activeUser?.id || 'u_cand_a');
  const [isCustomUser, setIsCustomUser] = useState(false);
  const [customUserName, setCustomUserName] = useState('');
  const [customUserRole, setCustomUserRole] = useState('Fullstack Developer');

  const pageRef = useRef(null);
  const videoRef = useRef(null);

  // Manage body classes and viewport locks
  useEffect(() => {
    document.documentElement.classList.add('landing-active');
    document.body.classList.add('landing-active');
    document.title = 'SynapseMem — Memory-Powered Assistant & Token Guard';

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
        setLoginModalOpen(false);
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

  const handleDoLogin = (e) => {
    if (e) e.preventDefault();
    const team = effectiveTeams.find((t) => t.id === selectedTeamId) || effectiveTeams[0];
    let user = null;

    if (isCustomUser && customUserName.trim()) {
      user = {
        id: `u_${Date.now()}`,
        name: customUserName.trim(),
        role: customUserRole.trim() || 'Software Engineer',
        avatar: customUserName.trim().slice(0, 2).toUpperCase()
      };
    } else {
      user = effectiveMembers.find((u) => u.id === selectedUserId) || effectiveMembers[0];
    }

    setLoginModalOpen(false);
    if (onLogin) {
      onLogin(team, user);
    } else {
      onEnterApp();
    }
  };

  const handleQuickLogin = (userId, teamId = 'ws_core') => {
    const team = effectiveTeams.find((t) => t.id === teamId) || effectiveTeams[0];
    const user = effectiveMembers.find((u) => u.id === userId) || effectiveMembers[0];
    if (onLogin) {
      onLogin(team, user);
    } else {
      onEnterApp();
    }
  };

  return (
    <div ref={pageRef} className="landing-root">
      {/* 1. Grain overlay */}
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
            aria-label="SynapseMem"
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

          {/* Center: Navigation Pills (Directly applicable to project!) */}
          <nav id="site-nav" className="nav" aria-label="Primary">
            <button
              type="button"
              onClick={() => handleNavClick('core-engine')}
              className="nav-pill appear appear--scale"
              style={{ '--d': '0.16s' }}
            >
              Core Engine
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
              onClick={() => handleNavClick('token-guard')}
              className="nav-pill appear appear--scale"
              style={{ '--d': '0.40s' }}
            >
              Token Guard
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('why-not-chat')}
              className="nav-pill appear appear--soft"
              style={{ '--d': '0.52s' }}
            >
              Why Not Chat?
            </button>
          </nav>

          {/* Right: Header CTA and Mobile Burger */}
          <div className="flex items-center gap-3 justify-self-end">
            <button
              type="button"
              onClick={onOpenAuth || (() => setLoginModalOpen(true))}
              className="btn btn-solid header-cta appear appear--scale"
              style={{ '--d': '0.34s' }}
            >
              Sign In to Team
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
              <span>The Honest Memory Layer for Engineering Teams</span>
            </div>

            {/* H1 — 2 masked lines */}
            <h1 className="hero-headline">
              <span className="headline-line appear appear--mask" style={{ '--d': '0.42s' }}>
                Never forget what your team
              </span>
              <span className="headline-line appear appear--mask" style={{ '--d': '0.62s' }}>
                decided in meetings & chats.
              </span>
            </h1>

            {/* Lede paragraph */}
            <p
              className="lede appear appear--soft"
              style={{ '--d': '0.82s', animationDuration: '1.25s' }}
            >
              Standard chatbots forget everything or dump noisy, conflicting chat logs into prompts. SynapseMem captures structured decisions in real time, auto-supersedes outdated choices (&ldquo;actually, we&rsquo;re using Mongo&rdquo;), expires temporary deadlines (&ldquo;demo is Friday&rdquo;), and guards collaborative coding tokens so teammates never duplicate work.
            </p>

            {/* Primary Actions */}
            <div className="hero-actions">
              <button
                type="button"
                onClick={onOpenAuth || (() => setLoginModalOpen(true))}
                className="btn btn-solid hero-btn appear appear--btn"
                style={{ '--d': '0.96s' }}
              >
                Sign In to Workspace →
              </button>
              <button
                type="button"
                onClick={onEnterDemo}
                className="btn btn-ghost-hero hero-btn appear appear--side"
                style={{ '--d': '1.10s' }}
              >
                Interactive Walkthrough
              </button>
            </div>

            {/* Standard Auth Prompt */}
            <div
              className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-300 appear appear--soft"
              style={{ '--d': '1.18s' }}
            >
              <button
                type="button"
                onClick={onOpenAuth}
                className="text-neutral-400 hover:text-white underline underline-offset-4 transition cursor-pointer"
              >
                Sign in with existing work email &amp; password →
              </button>
              <span className="text-neutral-600">&bull;</span>
              <button
                type="button"
                onClick={onOpenAuth}
                className="text-neutral-400 hover:text-white underline underline-offset-4 transition cursor-pointer"
              >
                Create a new team account
              </button>
            </div>
          </div>
        </main>

        {/* Stats Footer — 3 columns with real project metrics */}
        <footer className="stats">
          {/* Stat 1: Grounded Memory Record */}
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
                <linearGradient id="memPillGrad1" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#3a3a3a" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <rect x="3" y="4" width="18" height="16" rx="4" stroke="#ffffff" strokeWidth="1.6" />
              <path d="M7 9h10M7 13h6" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span>100% Grounded Memory (Zero Chat Bloat)</span>
          </div>

          {/* Stat 2: Honest Lifecycle & Superseding */}
          <div className="stat appear appear--stat" style={{ '--d': '1.28s' }}>
            <svg
              className="stat-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" stroke="#ffffff" strokeWidth="1.6" />
              <path d="M12 7v5l3 3" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span>Honest Lifecycle (Auto-Superseding & Expiry)</span>
          </div>

          {/* Stat 3: Collaborative Token Collision Radar */}
          <div className="stat appear appear--stat" style={{ '--d': '1.44s' }}>
            <svg
              className="stat-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9Z" stroke="#ffffff" strokeWidth="1.6" />
              <circle cx="12" cy="12" r="3" fill="#ffffff" />
              <path d="M12 12l5-5" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span>Candidate Token Guard (Zero Redundant Work)</span>
          </div>
        </footer>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: TEAM & MEMBER LOGIN MODAL                       */}
      {/* ======================================================== */}
      {loginModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setLoginModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-white/20 bg-neutral-950/95 p-6 shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, #121212 0%, #080808 100%)',
              boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.9), 0 0 40px rgba(255, 255, 255, 0.08)'
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    Team & Developer Sign In
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Select your team workspace and developer identity to enter.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLoginModalOpen(false)}
                className="text-neutral-400 hover:text-white text-lg px-2 py-1 rounded transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDoLogin} className="py-4 space-y-4 text-xs">
              {/* 1. Workspace Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                  1. Team Workspace
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {effectiveTeams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setSelectedTeamId(team.id)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        selectedTeamId === team.id
                          ? 'border-white bg-white/15 text-white shadow-md'
                          : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white">{team.name}</span>
                        {selectedTeamId === team.id && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 mt-1 line-clamp-1">
                        {team.description || 'Workspace'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Developer Profile Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">
                    2. Select Member Identity
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomUser(!isCustomUser)}
                    className="text-[10px] text-neutral-400 hover:text-white underline"
                  >
                    {isCustomUser ? '← Choose standard member' : '+ Custom user name'}
                  </button>
                </div>

                {!isCustomUser ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                    {effectiveMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setSelectedUserId(member.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                          selectedUserId === member.id
                            ? 'border-white bg-white/15 text-white shadow-md'
                            : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            selectedUserId === member.id
                              ? 'bg-white text-black'
                              : 'bg-white/10 text-neutral-300'
                          }`}
                        >
                          {member.avatar || member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-xs font-medium text-white truncate">{member.name}</div>
                          <div className="text-[10px] text-neutral-400 truncate">{member.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">Your Full Name</label>
                      <input
                        type="text"
                        value={customUserName}
                        onChange={(e) => setCustomUserName(e.target.value)}
                        placeholder="e.g. David Vance"
                        className="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">Your Role / Title</label>
                      <input
                        type="text"
                        value={customUserRole}
                        onChange={(e) => setCustomUserRole(e.target.value)}
                        placeholder="e.g. Senior Backend Engineer"
                        className="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Persona Suggestions */}
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between flex-wrap gap-2 text-[11px] text-neutral-300">
                <span className="text-neutral-400">Recommended for Testing:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeamId('ws_sprint');
                      setSelectedUserId('u_cand_a');
                      setIsCustomUser(false);
                    }}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white transition text-[10px]"
                  >
                    Candidate A
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeamId('ws_sprint');
                      setSelectedUserId('u_cand_b');
                      setIsCustomUser(false);
                    }}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white transition text-[10px]"
                  >
                    Candidate B (Token Guard)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeamId('ws_core');
                      setSelectedUserId('u_sarah');
                      setIsCustomUser(false);
                    }}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white transition text-[10px]"
                  >
                    Tech Lead (Sarah)
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(false)}
                  className="btn btn-ghost text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-solid text-xs px-5 py-2 flex items-center gap-2"
                >
                  <span>Enter Workspace</span>
                  <span>→</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: PROJECT DETAIL MODALS (APPLICABLE TO PROJECT!)  */}
      {/* ======================================================== */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-white/20 bg-neutral-950/95 p-6 shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, #111111 0%, #080808 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(255, 255, 255, 0.08)'
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm shadow-white/50" />
                <h3 className="text-base font-semibold text-white tracking-tight">
                  {activeModal === 'core-engine' && 'The 4 Pillars of Honest Team Memory'}
                  {activeModal === 'how-it-works' && 'How SynapseMem Ingests & Grounds Memories'}
                  {activeModal === 'token-guard' && 'Candidate Prompt Deduplication & Token Guard'}
                  {activeModal === 'why-not-chat' && 'Why Not Just Paste Chat History in Prompts?'}
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

            <div className="py-4 text-xs sm:text-sm text-neutral-300 space-y-3 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              {/* TAB 1: CORE ENGINE */}
              {activeModal === 'core-engine' && (
                <>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <span className="text-emerald-400">1. Remembers</span> &mdash; Structured Decision Extraction
                    </div>
                    <p className="text-xs text-neutral-400">
                      When someone writes <em>&ldquo;We&rsquo;re using Postgres because the team knows SQL&rdquo;</em>, SynapseMem extracts the structured memory tuple: <strong>Decision</strong> (&ldquo;We are using Postgres&rdquo;), <strong>Reason</strong> (&ldquo;Team knows SQL&rdquo;), <strong>Owner</strong> (Sarah Jenkins), and <strong>Date</strong>.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <span className="text-cyan-400">2. Recalls</span> &mdash; Grounded in Memory, Not Chat Logs
                    </div>
                    <p className="text-xs text-neutral-400">
                      Weeks later, asking <em>&ldquo;What database are we using and why?&rdquo;</em> answers directly from stored memory vectors. It never replays noisy chat history into the LLM context.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <span className="text-amber-400">3. Keeps Memory Honest</span> &mdash; Superseding & Expiry
                    </div>
                    <p className="text-xs text-neutral-400">
                      When someone says <em>&ldquo;Actually, we are switching to MongoDB&rdquo;</em>, the old Postgres memory is flagged as <code>SUPERSEDED</code> with bidirectional links. Short-lived assumptions like <em>&ldquo;demo is on Friday&rdquo;</em> automatically expire once that date passes.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <span className="text-purple-400">4. Explains Itself</span> &mdash; Transparent Inspect Panel
                    </div>
                    <p className="text-xs text-neutral-400">
                      An Inspect drawer reveals exact cosine similarity scores, applied filters, and memory records utilized for every answer.
                    </p>
                  </div>
                </>
              )}

              {/* TAB 2: HOW IT WORKS */}
              {activeModal === 'how-it-works' && (
                <>
                  <p>
                    1. <strong className="text-white">Continuous Ingestion:</strong> Conversations in channels (like <code>#architecture</code> or <code>#sprint-planning</code>) are scanned for technical decisions, constraints, and time commitments.
                  </p>
                  <p>
                    2. <strong className="text-white">Semantic Vector Indexing:</strong> Each extracted memory is projected into high-dimensional vector space with hybrid BM25 lexical weighting for exact keyword matches and conceptual synonyms.
                  </p>
                  <p>
                    3. <strong className="text-white">Conflict Arbitration:</strong> When a contradictory directive is posted, the Conflict Arbiter traces memory lineages, flags the superseded record, and ensures future prompts only reference current authoritative facts.
                  </p>
                  <p>
                    4. <strong className="text-white">Zero-Hallucination Recall:</strong> When queried in <code>#ask-assistant</code> or 1-on-1 Chatbot mode, candidate prompts are answered with citations to specific memory records.
                  </p>
                </>
              )}

              {/* TAB 3: TOKEN GUARD */}
              {activeModal === 'token-guard' && (
                <>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs">
                    ⚡ <strong>The Collaborative Coding Problem:</strong> When teammates or hackathon candidates code simultaneously, Candidate A and Candidate B routinely submit duplicate prompt requests (e.g. &ldquo;Create MongoDB connection pool in src/db/pool.js&rdquo;), burning 3,000+ tokens each.
                  </div>
                  <p>
                    <strong className="text-white">How Candidate Radar Works:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-neutral-300">
                    <li>Candidate A claims a task or sends a coding prompt. The task is logged with vector embeddings and affected target files.</li>
                    <li>Candidate B later submits a prompt for the same component. Token Guard calculates semantic similarity.</li>
                    <li>If overlap exceeds 70%, Token Guard intercepts Candidate B, alerts them that Candidate A is already handling this task, and allows Candidate B to adopt the code or claim a non-overlapping task.</li>
                    <li><strong>Result:</strong> Saves thousands of LLM tokens and prevents diverging implementations.</li>
                  </ul>
                </>
              )}

              {/* TAB 4: WHY NOT CHAT HISTORY? */}
              {activeModal === 'why-not-chat' && (
                <>
                  <p className="text-xs text-neutral-300">
                    Why can&rsquo;t teams just paste old chat history into the LLM system prompt?
                  </p>
                  <div className="space-y-2 mt-2">
                    <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/30 text-neutral-300">
                      <strong className="text-red-300 block mb-1">❌ Raw Chat History Injection:</strong>
                      <ul className="list-disc list-inside text-xs space-y-0.5 text-neutral-400">
                        <li>Explodes context windows ($$$ token waste and high latency).</li>
                        <li>Injects conflicting directives (&ldquo;Postgres&rdquo; vs &ldquo;Mongo&rdquo; mentioned across 500 lines).</li>
                        <li>Cannot determine when assumptions (e.g. &ldquo;demo Friday&rdquo;) have expired.</li>
                        <li>No auditability or explainability of why an answer was chosen.</li>
                      </ul>
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/30 text-neutral-300">
                      <strong className="text-emerald-300 block mb-1">✔ SynapseMem Structured Vector Memory:</strong>
                      <ul className="list-disc list-inside text-xs space-y-0.5 text-neutral-400">
                        <li>Only authoritative, active decisions are recalled (constant low token cost).</li>
                        <li>Superseded decisions are marked and excluded automatically.</li>
                        <li>Temporal expiry handles time-bound assumptions cleanly.</li>
                        <li>Complete Inspect Drawer showing similarity scores and citations.</li>
                      </ul>
                    </div>
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
                  setLoginModalOpen(true);
                }}
                className="btn btn-solid text-xs px-4 py-2"
              >
                Sign In to Workspace →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
