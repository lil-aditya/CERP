import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { CalendarDays, BookOpen, Megaphone, Users, TrendingUp, Clock, Mail } from 'lucide-react';

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
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-accent-500 rounded-2xl p-8 text-white">
        <h1 className="text-2xl lg:text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
        <p className="mt-2 text-primary-100">Your campus engagement dashboard at IIT Jodhpur</p>
        <div className="flex gap-4 mt-6">
          <Link to="/preferences" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition">
            Customize Feed
          </Link>
          <Link to="/calendar" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition">
            View Calendar
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{upcomingEvents.length}</p>
              <p className="text-xs text-slate-500">Upcoming Events</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{recentAnnouncements.length}</p>
              <p className="text-xs text-slate-500">Announcements</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{recentPapers.length}</p>
              <p className="text-xs text-slate-500">Recent Papers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{user?.clubs?.length || 0}</p>
              <p className="text-xs text-slate-500">My Clubs</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-500" /> Upcoming Events
            </h2>
            <Link to="/events" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {upcomingEvents.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">No upcoming events</p>
            ) : (
              upcomingEvents.map((event) => (
                <div key={event.id} className="px-6 py-3 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{event.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {event.club_name || 'University Event'} · {event.location}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-3">{formatDate(event.event_date)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-purple-500" /> Recent Announcements
            </h2>
            <Link to="/announcements" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentAnnouncements.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">No announcements</p>
            ) : (
              recentAnnouncements.map((ann) => (
                <div key={ann.id} className="px-6 py-3 hover:bg-slate-50 transition">
                  <p className="text-sm font-medium text-slate-800">{ann.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{ann.club_name} · {formatDate(ann.published_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Gmail Feed (only if connected) */}
      {gmailConnected && gmailFeed.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Mail className="w-4 h-4 text-red-500" /> From Your Inbox
            </h2>
            <Link to="/preferences" className="text-xs text-primary-600 hover:text-primary-700 font-medium">Manage →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {gmailFeed.map((email) => (
              <div key={email.id} className="px-6 py-3 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {email.category && email.category !== 'General' && (
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full font-medium truncate max-w-[140px]">
                          {email.category}
                        </span>
                      )}
                      {email.is_event === 1 && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded-full font-medium">Event</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-800 truncate">{email.subject}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{email.from_name} · {email.snippet?.substring(0, 80)}...</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                    {email.received_at ? formatDate(email.received_at) : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Research */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" /> Recent Research Publications
          </h2>
          <Link to="/research" className="text-xs text-primary-600 hover:text-primary-700 font-medium">Browse all →</Link>
        </div>
        <div className="divide-y divide-slate-50">
          {recentPapers.map((paper) => (
            <div key={paper.id} className="px-6 py-3 hover:bg-slate-50 transition">
              <p className="text-sm font-medium text-slate-800">{paper.title}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-500">{paper.professor_name}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">{paper.journal}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-primary-600">{paper.citation_count} citations</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
