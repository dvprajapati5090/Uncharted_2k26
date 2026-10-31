import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Building2,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  BrainCircuit,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Zap,
  Clock
} from 'lucide-react';

export default function AuthPage({ onLoginSuccess, onBackToLanding }) {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [role, setRole] = useState('Fullstack Developer');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister
        ? { email, password, name, role, teamName }
        : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      // Persist session token and details
      if (data.token) {
        try {
          localStorage.setItem('synapse_auth_token', data.token);
          localStorage.setItem('synapse_active_team_id', data.team?.id);
          localStorage.setItem('synapse_active_user_id', data.user?.id);
        } catch (_) {}
      }

      onLoginSuccess(data.team, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col lg:flex-row relative overflow-x-hidden font-sans select-none selection:bg-white selection:text-black">
      {/* Background radial gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-3xl transform -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-[700px] h-[700px] bg-white/[0.015] rounded-full blur-3xl transform translate-y-1/2" />
      </div>

      {/* ======================================================== */}
      {/* LEFT COLUMN: BRANDING, VALUE PROP, & LIVE PREVIEW       */}
      {/* ======================================================== */}
      <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 relative z-10 bg-neutral-950/40 backdrop-blur-sm">
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition group focus:outline-none cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 transition group-hover:-translate-x-1" />
              <span>Back to Overview</span>
            </button>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Atlas MongoDB Engine</span>
            </div>
          </div>

          {/* Logo & Headline */}
          <div className="mt-12 space-y-4 max-w-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-xl">
                <BrainCircuit className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Synapse<span className="font-normal text-white/70">Mem</span>
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white font-medium">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Grounded Team Memory & Token Guard</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Never lose what your team decided in meetings &amp; chat.
            </h1>

            <p className="text-sm sm:text-base text-neutral-400 leading-relaxed">
              Standard chatbots forget between sessions or dump noisy chat logs into prompts. SynapseMem captures structured decisions in real time, auto-supersedes outdated choices, expires temporary deadlines, and protects tokens so teammates never duplicate work.
            </p>
          </div>
        </div>

        {/* Live Memory Card Preview */}
        <div className="my-8 max-w-lg">
          <div className="rounded-2xl border border-white/15 bg-black/60 p-5 shadow-2xl space-y-3 relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.03] rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] bg-white/10 text-white px-2 py-0.5 rounded font-bold">
                  #a8f92b
                </span>
                <span className="font-semibold text-neutral-200">Database Architecture</span>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ACTIVE DIRECTIVE
              </span>
            </div>

            <div className="text-xs font-medium text-neutral-100 bg-white/[0.02] p-3 rounded-xl border border-white/5">
              &ldquo;MongoDB Atlas is our primary database for vector search. Do not introduce Redis without tech lead approval.&rdquo;
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
              <span>Owner: Your Team Lead</span>
              <span className="text-emerald-400 font-mono">100% Grounded • 0% Chat Bloat</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-4 max-w-lg text-xs text-neutral-300">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-neutral-300" />
              <span>Honest Lifecycle</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Superseded decisions flag automatically; sprint deadlines expire on wall-clock time.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-neutral-300" />
              <span>Candidate Token Guard</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Collision radar intercepts duplicate prompts across teammates, saving thousands of tokens.
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-6 border-t border-white/10 text-[11px] text-neutral-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-neutral-400" />
          <span>Multi-tenant MongoDB Atlas isolation &bull; Cryptographically salted authentication</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: LOGIN / REGISTER CARD                      */}
      {/* ======================================================== */}
      <div className="w-full lg:w-1/2 p-6 sm:p-12 lg:p-16 flex items-center justify-center relative z-10 bg-black">
        <div className="w-full max-w-md space-y-6">
          {/* Top Switcher Tabs */}
          <div className="flex items-center justify-center">
            <div className="p-1 rounded-xl bg-neutral-950 border border-white/15 flex items-center gap-1 w-full max-w-xs shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition text-center cursor-pointer ${
                  !isRegister
                    ? 'bg-white text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition text-center cursor-pointer ${
                  isRegister
                    ? 'bg-white text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Form Card */}
          <div
            className="rounded-3xl border border-white/20 p-6 sm:p-8 shadow-2xl relative space-y-6"
            style={{
              background: 'linear-gradient(145deg, #121212 0%, #080808 100%)',
              boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.95), 0 0 50px rgba(255, 255, 255, 0.05)'
            }}
          >
            {/* Header Titles */}
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {isRegister ? 'Create Your Team Workspace' : 'Sign in to SynapseMem'}
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {isRegister
                  ? 'Set up your developer profile and collaborative team workspace in MongoDB.'
                  : 'Enter your email and password to access your team decisions.'}
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* REGISTER ONLY FIELDS */}
              {isRegister && (
                <>
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-300">
                      Your Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe or Jane Smith"
                        className="w-full bg-black/60 border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition"
                      />
                    </div>
                  </div>

                  {/* Team Workspace Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-300">
                      Team / Workspace Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="e.g. Acme Corp, Alpha Engineering"
                        className="w-full bg-black/60 border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition"
                      />
                    </div>
                  </div>

                  {/* Role / Title */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-300">
                      Developer Role / Title
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g. Tech Lead, Candidate A, Backend Engineer"
                        className="w-full bg-black/60 border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* COMMON FIELDS: EMAIL */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Work Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-black/60 border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition"
                  />
                </div>
              </div>

              {/* COMMON FIELDS: PASSWORD */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-neutral-300">
                    Password
                  </label>
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => alert('Password reset link is sent to your registered email.')}
                      className="text-[11px] text-neutral-400 hover:text-white transition"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-black/60 border border-white/20 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-black bg-white hover:bg-neutral-200 transition duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? (
                  <span>Authenticating with MongoDB...</span>
                ) : (
                  <>
                    <span>{isRegister ? 'Create Team & Enter Workspace' : 'Sign In to Workspace'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Mode Switcher */}
            <div className="text-center text-xs text-neutral-400 pt-2 border-t border-white/10">
              {isRegister ? (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(false);
                      setError('');
                    }}
                    className="text-white font-semibold underline underline-offset-4 hover:text-neutral-300 transition cursor-pointer"
                  >
                    Sign In
                  </button>
                </span>
              ) : (
                <span>
                  Don&rsquo;t have a workspace yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setError('');
                    }}
                    className="text-white font-semibold underline underline-offset-4 hover:text-neutral-300 transition cursor-pointer"
                  >
                    Create a Team
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
