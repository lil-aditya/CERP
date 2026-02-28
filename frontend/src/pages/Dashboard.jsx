import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { CalendarDays, BookOpen, Megaphone, Users, TrendingUp, Clock, Mail, Sparkles, Zap, ArrowRight, ExternalLink } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [recentPapers, setRecentPapers] = useState([]);
  const [gmailFeed, setGmailFeed] = useState([]);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [eventsRes, annRes, researchRes] = await Promise.all([
        api.get('/events', { params: { from_date: new Date().toISOString() } }),
        api.get('/announcements', { params: { limit: 5 } }),
        api.get('/research', { params: { sort_by: 'publication_year', order: 'desc' } }),
      ]);
      setUpcomingEvents(eventsRes.data.slice(0, 5));
      setRecentAnnouncements(annRes.data);
      setRecentPapers(researchRes.data.slice(0, 5));

      // Load Gmail feed (silently — won't fail if not connected)
      try {
        const gmailStatusRes = await api.get('/gmail/status');
        if (gmailStatusRes.data.connected) {
          setGmailConnected(true);
          const gmailRes = await api.get('/gmail/feed', { params: { limit: 10 } });
          setGmailFeed(gmailRes.data);
        }
      } catch (err) { /* Gmail not connected — that's fine */ }
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="cyber-loader" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl p-8 glass-card">
        {/* Background glow effects */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-32 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
            <span className="badge badge-cyan">Welcome back</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            Hello, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>! 
            <span className="ml-2 animate-float inline-block">👋</span>
          </h1>
          <p className="text-slate-400 max-w-xl">
            Your campus engagement dashboard at <span className="text-cyan-400">IIT Jodhpur</span>. 
            Stay connected with events, research, and announcements.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/preferences" className="btn-ghost text-sm flex items-center gap-2 group">
              <Zap className="w-4 h-4 text-cyan-400" />
              Customize Feed
              <ArrowRight className="w-3 h-3 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
            </Link>
            <Link to="/calendar" className="btn-ghost text-sm flex items-center gap-2 group">
              <CalendarDays className="w-4 h-4 text-purple-400" />
              View Calendar
              <ArrowRight className="w-3 h-3 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card cyan animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{upcomingEvents.length}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Upcoming Events</p>
            </div>
          </div>
        </div>
        <div className="stat-card purple animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{recentAnnouncements.length}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Announcements</p>
            </div>
          </div>
        </div>
        <div className="stat-card green animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{recentPapers.length}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Recent Papers</p>
            </div>
          </div>
        </div>
        <div className="stat-card orange animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{user?.clubs?.length || 0}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">My Clubs</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" /> Upcoming Events
            </h2>
            <Link to="/events" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 group">
              View all 
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {upcomingEvents.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center">No upcoming events</p>
            ) : (
              upcomingEvents.map((event, index) => (
                <div key={event.id} className="px-6 py-4 hover:bg-white/5 transition-all group" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">{event.title}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span className="badge badge-purple text-[10px]">{event.club_name || 'University'}</span>
                        <span>{event.location}</span>
                      </p>
                    </div>
                    <span className="text-xs text-cyan-400/60 whitespace-nowrap ml-3 font-mono">{formatDate(event.event_date)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-purple-400" /> Recent Announcements
            </h2>
            <Link to="/announcements" className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 group">
              View all 
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentAnnouncements.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center">No announcements</p>
            ) : (
              recentAnnouncements.map((ann, index) => (
                <div key={ann.id} className="px-6 py-4 hover:bg-white/5 transition-all group">
                  <p className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">{ann.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="text-purple-400/60">{ann.club_name}</span> · {formatDate(ann.published_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Gmail Feed (only if connected) */}
      {gmailConnected && gmailFeed.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-red-400" /> From Your Inbox
            </h2>
            <Link to="/preferences" className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1 group">
              Manage 
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {gmailFeed.map((email) => (
              <div key={email.id} className="px-6 py-4 hover:bg-white/5 transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {email.category && email.category !== 'General' && (
                        <span className="badge badge-pink text-[10px]">{email.category}</span>
                      )}
                      {email.is_event === 1 && (
                        <span className="badge badge-orange text-[10px]">Event</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">{email.subject}</p>
                    <p className="text-xs text-slate-500 mt-1 truncate">{email.from_name} · {email.snippet?.substring(0, 80)}...</p>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap ml-2 font-mono">
                    {email.received_at ? formatDate(email.received_at) : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Research */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" /> Recent Research Publications
          </h2>
          <Link to="/research" className="text-xs text-green-400 hover:text-green-300 font-medium flex items-center gap-1 group">
            Browse all 
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="divide-y divide-white/5">
          {recentPapers.map((paper, index) => (
            <div key={paper.id} className="px-6 py-4 hover:bg-white/5 transition-all group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white group-hover:text-green-400 transition-colors">{paper.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs text-cyan-400">{paper.professor_name}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs text-slate-500">{paper.journal}</span>
                    <span className="text-slate-600">·</span>
                    <span className="badge badge-green text-[10px]">{paper.citation_count} citations</span>
                  </div>
                </div>
                {paper.url && (
                  <a href={paper.url} target="_blank" rel="noopener noreferrer" 
                    className="text-slate-500 hover:text-cyan-400 transition-colors shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
