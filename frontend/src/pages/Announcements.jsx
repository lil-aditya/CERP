import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Search, ExternalLink, Mail, Sparkles, Filter, Zap, Rss } from 'lucide-react';

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ club_id: '', search: '' });
  const [feedMode, setFeedMode] = useState(false);
  const [gmailMode, setGmailMode] = useState(false);
  const [gmailEmails, setGmailEmails] = useState([]);
  const [gmailConnected, setGmailConnected] = useState(false);

  useEffect(() => {
    api.get('/clubs').then(res => setClubs(res.data));
    api.get('/gmail/status').then(res => setGmailConnected(res.data.connected)).catch(() => {});
  }, []);

  useEffect(() => {
    if (gmailMode) {
      loadGmailEmails();
    } else {
      const timeout = setTimeout(loadAnnouncements, 300);
      return () => clearTimeout(timeout);
    }
  }, [filters, feedMode, gmailMode]);

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

  const loadGmailEmails = async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (filters.club_id) params.club_id = filters.club_id;
      if (feedMode) params.preferred_only = 'true';
      const res = await api.get('/gmail/emails', { params });
      setGmailEmails(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Announcements
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            </h1>
            <p className="text-slate-400 text-sm">Latest updates from clubs and departments</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setFeedMode(false); setGmailMode(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!feedMode && !gmailMode ? 'btn-cyber' : 'btn-ghost'}`}>
            <span className="flex items-center gap-2"><Rss className="w-4 h-4" /> All</span>
          </button>
          <button onClick={() => { setFeedMode(true); setGmailMode(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${feedMode && !gmailMode ? 'btn-cyber' : 'btn-ghost'}`}>
            <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> My Feed</span>
          </button>
          {gmailConnected && (
            <button onClick={() => { setGmailMode(true); setFeedMode(false); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${gmailMode ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'btn-ghost'}`}>
              <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> Gmail</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {!feedMode && (
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-4">
            <Filter className="w-4 h-4 text-purple-400" />
            Filters
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Search announcements..."
                value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input-cyber w-full pl-11" />
            </div>
            <select value={filters.club_id} onChange={(e) => setFilters({ ...filters, club_id: e.target.value })}
              className="input-cyber min-w-[150px]">
              <option value="">All Clubs</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Announcements / Gmail List */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="cyber-loader" /></div>
      ) : gmailMode ? (
        gmailEmails.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-xl">
            <Mail className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 text-lg">No Gmail emails found</p>
            <p className="text-slate-500 text-sm mt-1">Try syncing from Preferences</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gmailEmails.map((email, index) => (
              <div key={email.id} className="glass-card rounded-xl p-5 transition-all hover:scale-[1.01] animate-slide-up" style={{ animationDelay: `${Math.min(index * 30, 200)}ms` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="badge badge-pink flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Gmail
                      </span>
                      {email.category && email.category !== 'General' && (
                        <span className="badge badge-purple">{email.category}</span>
                      )}
                      {email.is_event === 1 && (
                        <span className="badge badge-orange">📅 Event</span>
                      )}
                      {email.confidence > 0 && (
                        <span className={`badge ${
                          email.confidence >= 0.7 ? 'badge-green' :
                          email.confidence >= 0.4 ? 'badge-orange' :
                          'bg-white/10 text-slate-400 border border-white/10'
                        }`}>{Math.round(email.confidence * 100)}% match</span>
                      )}
                      <span className="text-xs text-slate-500 font-mono">{formatDate(email.received_at)}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white">{email.subject}</h3>
                    <p className="text-xs text-cyan-400/60 mt-1">From: {email.from_name} ({email.from_email})</p>
                    {email.snippet && (
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{email.snippet}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : announcements.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-xl">
          <Megaphone className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 text-lg">{feedMode ? 'No announcements from your subscribed clubs' : 'No announcements found'}</p>
          <p className="text-slate-500 text-sm mt-1">{feedMode ? 'Update your preferences to follow clubs' : 'Try adjusting your filters'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann, index) => (
            <div key={ann.id} className="glass-card rounded-xl p-5 transition-all hover:scale-[1.01] animate-slide-up" style={{ animationDelay: `${Math.min(index * 30, 200)}ms` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {ann.club_name && (
                      <span className="badge badge-purple">{ann.club_name}</span>
                    )}
                    <span className="text-xs text-slate-500 font-mono">{formatDate(ann.published_at)}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{ann.title}</h3>
                  {ann.content && (
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{ann.content}</p>
                  )}
                </div>
                {ann.source_url && (
                  <a href={ann.source_url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 p-2 text-slate-500 hover:text-cyan-400 transition-colors">
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
