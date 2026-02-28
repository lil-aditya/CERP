import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Eye, EyeOff, Sparkles, Zap, Code2, Terminal } from 'lucide-react';

// Animated particles for login page
function LoginParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            background: i % 3 === 0 ? '#00f5ff' : i % 3 === 1 ? '#bf00ff' : '#ff00a8',
            animation: `particle-float ${6 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 8}s`,
            opacity: 0.4,
          }}
        />
      ))}
      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/5 rounded-full blur-3xl" />
    </div>
  );
}

// Code rain effect
function CodeRain() {
  const chars = '01アイウエオカキクケコサシスセソタチツテト';
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute text-cyan-400 font-mono text-xs"
          style={{
            left: `${i * 7}%`,
            animation: `slideInUp ${5 + Math.random() * 5}s linear infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        >
          {[...Array(20)].map((_, j) => (
            <div key={j} style={{ opacity: 1 - j * 0.05 }}>
              {chars[Math.floor(Math.random() * chars.length)]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-gradient p-4 relative overflow-hidden">
      <LoginParticles />
      <CodeRain />
      
      <div className="w-full max-w-md animate-slide-up relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 flex items-center justify-center mb-4 mx-auto animate-float">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -inset-2 bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50 -z-10 animate-pulse" />
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">Welcome to CERP</h1>
          <p className="text-slate-400 flex items-center justify-center gap-2">
            <Code2 className="w-4 h-4 text-purple-400" />
            Campus Engagement & Research Portal
          </p>
          <p className="text-sm text-cyan-400/60 flex items-center justify-center gap-1 mt-1">
            <Terminal className="w-3 h-3" /> IIT Jodhpur
          </p>
        </div>

        {/* Form */}
        <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
          {/* Glow effect */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
          
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            Sign In
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-cyber w-full"
                placeholder="your.email@iitj.ac.in"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-cyber w-full pr-10"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-cyber w-full relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="cyber-loader w-5 h-5 border-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#12121a] text-slate-500">or</span>
            </div>
          </div>

          <p className="text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-cyan-400 font-medium hover:text-cyan-300 hover-line transition-colors">
              Create one
            </Link>
          </p>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 glass-card rounded-xl p-4 text-sm animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <p className="font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Demo Credentials
          </p>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
              <span className="badge badge-pink shrink-0">Super Admin</span>
              <div className="text-slate-400">
                <p>superadmin@iitj.ac.in</p>
                <p className="text-cyan-400/60">SuperAdmin@CERP2026</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
              <span className="badge badge-orange shrink-0">Admin</span>
              <div className="text-slate-400">
                <p>admin@iitj.ac.in</p>
                <p className="text-cyan-400/60">Admin@CERP2026</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
