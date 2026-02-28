import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Search, MapPin, Clock, Tag, CalendarDays, Plus, AlertTriangle, X, Sparkles, Filter, Zap } from 'lucide-react';

export default function Events() {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [clashes, setClashes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', category: '', club_id: '', is_university: '', from_date: '', to_date: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', event_date: '', end_date: '', location: '', club_id: '', category: '', is_university_event: false });
  const [createError, setCreateError] = useState('');
  const [createWarning, setCreateWarning] = useState('');

  useEffect(() => {
    loadClubs();
    loadClashes();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadEvents, 300);
    return () => clearTimeout(timeout);
  }, [filters]);

  const loadClubs = async () => {
    try { const res = await api.get('/clubs'); setClubs(res.data); } catch (err) { console.error(err); }
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.club_id) params.club_id = filters.club_id;
      if (filters.is_university) params.is_university = filters.is_university;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      const res = await api.get('/events', { params });
      setEvents(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadClashes = async () => {
    try {
      const res = await api.get('/events/clashes');
      setClashes(res.data.clashes || []);
    } catch (err) { /* user might not be authenticated for this */ }
  };

  // Build a set of clashing event IDs for quick lookup
  const clashingIds = new Set();
  clashes.forEach(c => { clashingIds.add(c.event_a_id); clashingIds.add(c.event_b_id); });

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateWarning('');
    try {
      const payload = { ...createForm, is_university_event: createForm.is_university_event };
      if (createForm.club_id) payload.club_id = parseInt(createForm.club_id);
      const res = await api.post('/events', payload);
      if (res.data.warning) setCreateWarning(res.data.warning);
      else setShowCreate(false);
      setCreateForm({ title: '', description: '', event_date: '', end_date: '', location: '', club_id: '', category: '', is_university_event: false });
      loadEvents();
      loadClashes();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create event.');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const categoryColors = {
    Technical: 'badge-cyan',
    Cultural: 'badge-pink',
    Academic: 'badge-green',
    Sports: 'badge-orange',
    Creative: 'badge-purple',
    Professional: 'badge-orange',
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Events
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            </h1>
            <p className="text-slate-400 text-sm">Browse and filter all campus events</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(!showCreate)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${showCreate ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'btn-cyber'}`}>
            {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showCreate ? 'Cancel' : 'Create Event'}</span>
          </button>
        )}
      </div>

      {/* Clash Warning Banner */}
      {clashes.length > 0 && (
        <div className="flex items-start gap-3 p-4 glass-card rounded-xl border-l-4 border-l-orange-500">
          <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 shrink-0 animate-pulse" />
          <div>
            <p className="text-sm font-medium text-orange-400">{clashes.length} event clash{clashes.length > 1 ? 'es' : ''} detected</p>
            <p className="text-xs text-slate-500 mt-0.5">Conflicting events are highlighted with a red glow below.</p>
          </div>
        </div>
      )}

      {/* Create Event Form */}
      {showCreate && isAdmin && (
        <form onSubmit={handleCreate} className="glass-card rounded-xl p-6 space-y-4 animate-slide-up">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" /> New Event
          </h3>
          {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">{createError}</div>}
          {createWarning && <div className="p-3 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm rounded-lg flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{createWarning} Event was still created.</div>}
          <div className="grid md:grid-cols-2 gap-3">
            <input type="text" placeholder="Event Title *" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              className="input-cyber" required />
            <input type="text" placeholder="Location" value={createForm.location} onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
              className="input-cyber" />
            <div>
              <label className="block text-xs text-slate-400 mb-1">Start Date/Time *</label>
              <input type="datetime-local" value={createForm.event_date} onChange={(e) => setCreateForm({ ...createForm, event_date: e.target.value })}
                className="input-cyber w-full" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">End Date/Time</label>
              <input type="datetime-local" value={createForm.end_date} onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                className="input-cyber w-full" />
            </div>
            <select value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
              className="input-cyber">
              <option value="">Category</option>
              {['Technical', 'Cultural', 'Academic', 'Sports', 'Creative', 'Professional'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={createForm.club_id} onChange={(e) => setCreateForm({ ...createForm, club_id: e.target.value })}
              className="input-cyber">
              <option value="">No Club (University)</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <textarea placeholder="Description" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} rows={2}
            className="input-cyber w-full" />
          <div className="flex items-center gap-3">
            <input type="checkbox" id="is_uni" checked={createForm.is_university_event} onChange={(e) => setCreateForm({ ...createForm, is_university_event: e.target.checked })} 
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500" />
            <label htmlFor="is_uni" className="text-sm text-slate-300">University Event</label>
          </div>
          <button type="submit" className="btn-cyber">
            <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Create Event</span>
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-4">
          <Filter className="w-4 h-4 text-cyan-400" />
          Filters
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text" placeholder="Search events..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input-cyber w-full pl-11"
            />
          </div>
          <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="input-cyber min-w-[140px]">
            <option value="">All Categories</option>
            {['Technical', 'Cultural', 'Academic', 'Sports', 'Creative', 'Professional'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={filters.club_id} onChange={(e) => setFilters({ ...filters, club_id: e.target.value })}
            className="input-cyber min-w-[140px]">
            <option value="">All Clubs</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.is_university} onChange={(e) => setFilters({ ...filters, is_university: e.target.value })}
            className="input-cyber">
            <option value="">All Types</option>
            <option value="true">University Events</option>
          </select>
          <div>
            <label className="block text-xs text-slate-500 mb-1">From</label>
            <input type="date" value={filters.from_date} onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
              className="input-cyber" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To</label>
            <input type="date" value={filters.to_date} onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
              className="input-cyber" />
          </div>
          {(filters.search || filters.category || filters.club_id || filters.is_university || filters.from_date || filters.to_date) && (
            <button onClick={() => setFilters({ search: '', category: '', club_id: '', is_university: '', from_date: '', to_date: '' })}
              className="px-4 py-2 text-sm text-red-400 hover:text-red-300 font-medium hover:bg-red-500/10 rounded-lg transition-all">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="cyber-loader" /></div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-xl">
          <CalendarDays className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 text-lg">No events found</p>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event, index) => {
            const isClashing = clashingIds.has(event.id);
            return (
              <div 
                key={event.id} 
                className={`glass-card rounded-xl overflow-hidden animate-slide-up transition-all hover:scale-[1.02] ${isClashing ? 'ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : ''}`}
                style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
              >
                <div className={`h-1 ${event.is_university_event ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500'}`} />
                <div className="p-5">
                  {isClashing && (
                    <div className="flex items-center gap-1.5 mb-3 text-xs text-red-400 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> Scheduling Conflict
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white leading-snug flex-1">{event.title}</h3>
                    {event.category && (
                      <span className={`badge ${categoryColors[event.category] || 'badge-cyan'} ml-2 shrink-0 text-[10px]`}>
                        {event.category}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">{event.description}</p>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{formatDate(event.event_date)} · {formatTime(event.event_date)}</span>
                    </div>
                    {event.end_date && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span>Until {formatDate(event.end_date)}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-pink-400" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.club_name && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Tag className="w-3.5 h-3.5 text-orange-400" />
                        <span>{event.club_name}</span>
                      </div>
                    )}
                  </div>
                  {event.is_university_event && (
                    <span className="inline-block mt-4 badge badge-green">
                      University Event
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
