import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Eye, EyeOff, Sparkles, UserPlus, Rocket } from 'lucide-react';

// Animated particles for register page
function RegisterParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(25)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            background: i % 3 === 0 ? '#00f5ff' : i % 3 === 1 ? '#bf00ff' : '#00ff88',
            animation: `particle-float ${6 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 8}s`,
            opacity: 0.4,
          }}
        />
      ))}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-gradient p-4 relative overflow-hidden">
      <RegisterParticles />
      
      <div className="w-full max-w-md animate-slide-up relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 flex items-center justify-center mb-4 mx-auto animate-float">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -inset-2 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-2xl blur-xl opacity-50 -z-10 animate-pulse" />
            <Rocket className="absolute -top-2 -right-2 w-6 h-6 text-green-400 animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">Join CERP</h1>
          <p className="text-slate-400 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Create your account
          </p>
        </div>

        {/* Form */}
        <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
          {/* Glow effect */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl" />

          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-400" />
            Sign Up
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg animate-fade-in">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="input-cyber w-full"
                placeholder="Your full name" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-cyber w-full"
                placeholder="your.email@iitj.ac.in" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="input-cyber w-full pr-10"
                  placeholder="Minimum 6 characters" required />
                <button type="button" onClick={() => setShowPass(!showPass)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-purple-400 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-cyber w-full" style={{ background: 'linear-gradient(135deg, #bf00ff, #00f5ff)' }}>
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="cyber-loader w-5 h-5 border-2" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Create Account
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
            Already have an account?{' '}
            <Link to="/login" className="text-purple-400 font-medium hover:text-purple-300 hover-line transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
