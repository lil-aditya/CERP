import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, Trash2, UserPlus, BarChart3, RefreshCw } from 'lucide-react';

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
    superadmin: 'bg-red-100 text-red-700',
    admin: 'bg-amber-100 text-amber-700',
    user: 'bg-blue-100 text-blue-700',
  };

  const tabs = [
    { id: 'stats', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'scraper', label: 'Scraper', icon: RefreshCw },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Panel</h1>
          <p className="text-xs text-slate-400">
            Logged in as <span className={`px-1.5 py-0.5 rounded-full ${roleBadge[user.role]}`}>{user.role}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
          ) : stats && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Users', value: stats.users, color: 'bg-blue-50 text-blue-600' },
                { label: 'Clubs', value: stats.clubs, color: 'bg-green-50 text-green-600' },
                { label: 'Events', value: stats.events, color: 'bg-purple-50 text-purple-600' },
                { label: 'Publications', value: stats.publications, color: 'bg-amber-50 text-amber-600' },
                { label: 'Announcements', value: stats.announcements, color: 'bg-pink-50 text-pink-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                  <p className="text-3xl font-bold text-slate-800">{value}</p>
                  <p className={`text-xs font-medium mt-1 px-2 py-0.5 rounded-full inline-block ${color}`}>{label}</p>
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
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition">
                <UserPlus className="w-4 h-4" /> Create User
              </button>
            </div>
          )}

          {showNewUser && isSuperAdmin && (
            <form onSubmit={createUser} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
              <h3 className="font-semibold text-slate-800">Create New User</h3>
              <div className="grid md:grid-cols-4 gap-3">
                <input type="text" placeholder="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
                <input type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
                <input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <button type="submit" className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition">
                Create
              </button>
            </form>
          )}

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Role</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Joined</th>
                    {isSuperAdmin && <th className="text-right px-5 py-3 text-xs font-medium text-slate-500">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3 text-sm text-slate-800">{u.name}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{u.email}</td>
                      <td className="px-5 py-3">
                        {isSuperAdmin && u.id !== user.id ? (
                          <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${roleBadge[u.role]}`}>
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                            <option value="superadmin">superadmin</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge[u.role]}`}>{u.role}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400">
                        {new Date(u.created_at).toLocaleDateString('en-IN')}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-5 py-3 text-right">
                          {u.id !== user.id && (
                            <button onClick={() => deleteUser(u.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition">
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
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-2">Manual Scraping</h3>
            <p className="text-sm text-slate-500 mb-4">Trigger a manual scrape to update research publications and club announcements. Automatic scraping runs every 6 hours.</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => runScraper('all')} disabled={scraping}
                className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition disabled:opacity-50">
                {scraping ? 'Scraping...' : 'Scrape All'}
              </button>
              <button onClick={() => runScraper('research')} disabled={scraping}
                className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition disabled:opacity-50">
                Research Only
              </button>
              <button onClick={() => runScraper('clubs')} disabled={scraping}
                className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 transition disabled:opacity-50">
                Clubs Only
              </button>
            </div>
            {scrapeMsg && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-700">{scrapeMsg}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
