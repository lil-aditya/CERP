import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, CalendarDays, BookOpen, Users, Megaphone,
  Settings, LogOut, Shield, GraduationCap, Menu, X, Sparkles, Zap
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/events', icon: CalendarDays, label: 'Events' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/research', icon: BookOpen, label: 'Research' },
  { to: '/clubs', icon: Users, label: 'Clubs' },
  { to: '/announcements', icon: Megaphone, label: 'Announcements' },
  { to: '/preferences', icon: Settings, label: 'Preferences' },
];

// Floating particles component
function Particles() {
  return (
    <div className="particles">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${6 + Math.random() * 4}s`,
            opacity: 0.3 + Math.random() * 0.4,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            background: i % 3 === 0 ? 'var(--neon-cyan)' : i % 3 === 1 ? 'var(--neon-purple)' : 'var(--neon-pink)',
          }}
        />
      ))}
    </div>
  );
}

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleBadgeClass = {
    superadmin: 'badge-pink',
    admin: 'badge-orange',
    user: 'badge-cyan',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-cyber-gradient">
      <Particles />
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-fade-in" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 glass-sidebar transform transition-all duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full relative">
          {/* Neon accent line */}
          <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />
          
          {/* Logo */}
          <div className="flex items-center gap-4 px-6 py-6 border-b border-white/5">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 flex items-center justify-center animate-float">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 rounded-xl blur-lg opacity-40 -z-10" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">CERP</h1>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" /> IIT Jodhpur
              </p>
            </div>
            <button className="ml-auto lg:hidden text-slate-400 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navItems.map(({ to, icon: Icon, label, end }, index) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setSidebarOpen(false)}
                style={{ animationDelay: `${index * 50}ms` }}
                className={({ isActive }) =>
                  `nav-link animate-slide-in ${isActive ? 'active' : ''}`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </NavLink>
            ))}

            {isAdmin && (
              <>
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />
                <NavLink
                  to="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  style={{ '--neon-cyan': 'var(--neon-pink)' }}
                >
                  <Shield className="w-5 h-5" />
                  <span>Admin Panel</span>
                  <Zap className="w-4 h-4 ml-auto text-pink-400" />
                </NavLink>
              </>
            )}
          </nav>

          {/* User */}
          <div className="px-4 py-5 border-t border-white/5">
            <div className="glass-card rounded-xl p-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#12121a]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                  <span className={`badge ${roleBadgeClass[user?.role] || 'badge-cyan'} mt-1`}>
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-300 group"
            >
              <LogOut className="w-4 h-4 group-hover:animate-pulse" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {/* Top bar (mobile) */}
        <div className="sticky top-0 z-30 lg:hidden glass px-4 py-4 flex items-center gap-4 border-b border-white/5">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white transition-colors">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold gradient-text">CERP</h1>
        </div>
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
