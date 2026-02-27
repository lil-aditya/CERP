import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Search, ExternalLink } from 'lucide-react';

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ club_id: '', search: '' });
  const [feedMode, setFeedMode] = useState(false);

  useEffect(() => {
    api.get('/clubs').then(res => setClubs(res.data));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadAnnouncements, 300);
    return () => clearTimeout(timeout);
  }, [filters, feedMode]);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      if (feedMode) {
        const res = await api.get('/announcements/feed');
        setAnnouncements(res.data);
      } else {
        const params = {};
        if (filters.club_id) params.club_id = filters.club_id;
        if (filters.search) params.search = filters.search;
        const res = await api.get('/announcements', { params });
        setAnnouncements(res.data);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
          <p className="text-slate-500 text-sm mt-1">Latest updates from clubs and departments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFeedMode(false)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${!feedMode ? 'bg-primary-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
            All
          </button>
          <button onClick={() => setFeedMode(true)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${feedMode ? 'bg-primary-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
            My Feed
          </button>
        </div>
      </div>

      {/* Filters */}
      {!feedMode && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search announcements..."
                value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <select value={filters.club_id} onChange={(e) => setFilters({ ...filters, club_id: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">All Clubs</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Announcements List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Megaphone className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>{feedMode ? 'No announcements from your subscribed clubs. Update your preferences!' : 'No announcements found.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <div key={ann.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {ann.club_name && (
                      <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-full font-medium">{ann.club_name}</span>
                    )}
                    <span className="text-xs text-slate-400">{formatDate(ann.published_at)}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">{ann.title}</h3>
                  {ann.content && (
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{ann.content}</p>
                  )}
                </div>
                {ann.source_url && (
                  <a href={ann.source_url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 p-2 text-slate-400 hover:text-primary-600 transition">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
