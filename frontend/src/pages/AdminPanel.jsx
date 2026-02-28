import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, Trash2, UserPlus, BarChart3, RefreshCw, Zap, Database, Activity } from 'lucide-react';

export default function AdminPanel() {
  const { user, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState('');

  // New user form
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });

  useEffect(() => {
    if (activeTab === 'stats') loadStats();
    if (activeTab === 'users') loadUsers();
  }, [activeTab]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const changeRole = async (userId, role) => {
    if (!isSuperAdmin) return;
    try {
      await api.put(`/admin/users/${userId}/role`, { role });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  const deleteUser = async (userId) => {
    if (!isSuperAdmin) return;
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', newUser);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      setShowNewUser(false);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create user');
    }
  };

  const runScraper = async (type) => {
    setScraping(true);
    setScrapeMsg('');
    try {
      const res = await api.post('/scraper/run', { type });
      setScrapeMsg(res.data.message);
    } catch (err) {
      setScrapeMsg('Scraping failed: ' + (err.response?.data?.error || err.message));
    }
    setScraping(false);
  };

  const roleBadge = {
    superadmin: 'bg-red-500/10 text-red-400 border border-red-500/20',
    admin: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    user: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  };

  const tabs = [
    { id: 'stats', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'scraper', label: 'Scraper', icon: RefreshCw },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-amber-500/20 rounded-2xl blur-xl" />
        <div className="relative glass-card rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                Admin Panel
              </h1>
              <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                Logged in as 
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge[user.role]}`}>{user.role}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 glass-card rounded-xl p-2 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === id 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25' 
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="cyber-loader" />
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Users', value: stats.users, gradient: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/20', icon: Users },
                { label: 'Clubs', value: stats.clubs, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20', icon: Zap },
                { label: 'Events', value: stats.events, gradient: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-500/20', icon: Activity },
                { label: 'Publications', value: stats.publications, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20', icon: Database },
                { label: 'Announcements', value: stats.announcements, gradient: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-500/20', icon: BarChart3 },
              ].map(({ label, value, gradient, shadow, icon: Icon }) => (
                <div key={label} className={`glass-card rounded-xl p-5 hover:scale-105 transition-all duration-300 hover:shadow-lg ${shadow}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${shadow}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full bg-gradient-to-r ${gradient} text-white`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-4xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {isSuperAdmin && (
            <div className="flex justify-end">
              <button onClick={() => setShowNewUser(!showNewUser)}
                className="btn-primary flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Create User
              </button>
            </div>
          )}

          {showNewUser && isSuperAdmin && (
            <form onSubmit={createUser} className="glass-card rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                Create New User
              </h3>
              <div className="grid md:grid-cols-4 gap-4">
                <input type="text" placeholder="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all" required />
                <input type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all" required />
                <input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all" required />
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all">
                  <option value="user" className="bg-slate-900">User</option>
                  <option value="admin" className="bg-slate-900">Admin</option>
                  <option value="superadmin" className="bg-slate-900">Super Admin</option>
                </select>
              </div>
              <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all">
                Create User
              </button>
            </form>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="cyber-loader" />
            </div>
          ) : (
            <div className="glass-card rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</th>
                    {isSuperAdmin && <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/5 transition-all">
                      <td className="px-6 py-4 text-sm text-white font-medium">{u.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{u.email}</td>
                      <td className="px-6 py-4">
                        {isSuperAdmin && u.id !== user.id ? (
                          <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer bg-transparent ${roleBadge[u.role]}`}>
                            <option value="user" className="bg-slate-900">user</option>
                            <option value="admin" className="bg-slate-900">admin</option>
                            <option value="superadmin" className="bg-slate-900">superadmin</option>
                          </select>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleBadge[u.role]}`}>{u.role}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(u.created_at).toLocaleDateString('en-IN')}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4 text-right">
                          {u.id !== user.id && (
                            <button onClick={() => deleteUser(u.id)}
                              className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Scraper Tab */}
      {activeTab === 'scraper' && (
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Manual Scraping</h3>
                <p className="text-xs text-slate-500">Trigger updates for research publications and announcements</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-6 pl-13">
              Automatic scraping runs every 6 hours. Use these buttons to trigger manual updates.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => runScraper('all')} disabled={scraping}
                className="btn-neon flex items-center gap-2 disabled:opacity-50">
                {scraping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {scraping ? 'Scraping...' : 'Scrape All'}
              </button>
              <button onClick={() => runScraper('research')} disabled={scraping}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Research Only
              </button>
              <button onClick={() => runScraper('clubs')} disabled={scraping}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Clubs Only
              </button>
            </div>
            {scrapeMsg && (
              <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400">
                {scrapeMsg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
