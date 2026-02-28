import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Search, ExternalLink, Mail } from 'lucide-react';

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
          <p className="text-slate-500 text-sm mt-1">Latest updates from clubs and departments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setFeedMode(false); setGmailMode(false); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${!feedMode && !gmailMode ? 'bg-primary-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
            All
          </button>
          <button onClick={() => { setFeedMode(true); setGmailMode(false); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${feedMode && !gmailMode ? 'bg-primary-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
            My Feed
          </button>
          {gmailConnected && (
            <button onClick={() => { setGmailMode(true); setFeedMode(false); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${gmailMode ? 'bg-red-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
              <Mail className="w-3.5 h-3.5" /> Gmail
            </button>
          )}
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

      {/* Announcements / Gmail List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : gmailMode ? (
        gmailEmails.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No Gmail emails found. Try syncing from Preferences.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gmailEmails.map((email) => (
              <div key={email.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full font-medium flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Gmail
                      </span>
                      {email.category && email.category !== 'General' && (
                        <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-full font-medium">{email.category}</span>
                      )}
                      {email.is_event === 1 && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-medium">📅 Event</span>
                      )}
                      {email.confidence > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          email.confidence >= 0.7 ? 'bg-green-50 text-green-600' :
                          email.confidence >= 0.4 ? 'bg-yellow-50 text-yellow-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>{Math.round(email.confidence * 100)}% match</span>
                      )}
                      <span className="text-xs text-slate-400">{formatDate(email.received_at)}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800">{email.subject}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">From: {email.from_name} ({email.from_email})</p>
                    {email.snippet && (
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{email.snippet}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
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
