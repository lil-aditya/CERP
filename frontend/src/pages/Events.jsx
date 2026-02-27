import { useEffect, useState } from 'react';
import api from '../api';
import { Search, Filter, MapPin, Clock, Tag } from 'lucide-react';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', category: '', club_id: '', is_university: '' });

  useEffect(() => {
    loadClubs();
    loadEvents();
  }, []);

  const loadClubs = async () => {
    try {
      const res = await api.get('/clubs');
      setClubs(res.data);
    } catch (err) { console.error(err); }
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.club_id) params.club_id = filters.club_id;
      if (filters.is_university) params.is_university = filters.is_university;
      const res = await api.get('/events', { params });
      setEvents(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => {
    const timeout = setTimeout(loadEvents, 300);
    return () => clearTimeout(timeout);
  }, [filters]);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const categoryColors = {
    Technical: 'bg-blue-100 text-blue-700',
    Cultural: 'bg-pink-100 text-pink-700',
    Academic: 'bg-green-100 text-green-700',
    Sports: 'bg-orange-100 text-orange-700',
    Creative: 'bg-purple-100 text-purple-700',
    Professional: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Events</h1>
        <p className="text-slate-500 text-sm mt-1">Browse and filter all campus events</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Categories</option>
            {['Technical', 'Cultural', 'Academic', 'Sports', 'Creative', 'Professional'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={filters.club_id} onChange={(e) => setFilters({ ...filters, club_id: e.target.value })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Clubs</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.is_university} onChange={(e) => setFilters({ ...filters, is_university: e.target.value })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Types</option>
            <option value="true">University Events</option>
          </select>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No events found. Try adjusting filters.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className={`h-1.5 ${event.is_university_event ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-primary-400 to-accent-400'}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-800 leading-snug">{event.title}</h3>
                  {event.category && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${categoryColors[event.category] || 'bg-slate-100 text-slate-600'}`}>
                      {event.category}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{event.description}</p>
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(event.event_date)} · {formatTime(event.event_date)}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.club_name && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{event.club_name}</span>
                    </div>
                  )}
                </div>
                {event.is_university_event && (
                  <span className="inline-block mt-3 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full font-medium">
                    University Event
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
