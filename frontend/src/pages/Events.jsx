import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Search, MapPin, Clock, Tag, CalendarDays, Plus, AlertTriangle, X } from 'lucide-react';

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
    Technical: 'bg-blue-100 text-blue-700',
    Cultural: 'bg-pink-100 text-pink-700',
    Academic: 'bg-green-100 text-green-700',
    Sports: 'bg-orange-100 text-orange-700',
    Creative: 'bg-purple-100 text-purple-700',
    Professional: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Events</h1>
          <p className="text-slate-500 text-sm mt-1">Browse and filter all campus events</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition">
            {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showCreate ? 'Cancel' : 'Create Event'}
          </button>
        )}
      </div>

      {/* Clash Warning Banner */}
      {clashes.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">{clashes.length} event clash{clashes.length > 1 ? 'es' : ''} detected</p>
            <p className="text-xs text-amber-600 mt-0.5">Conflicting events are highlighted with a red border below.</p>
          </div>
        </div>
      )}

      {/* Create Event Form */}
      {showCreate && isAdmin && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-slate-800">New Event</h3>
          {createError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{createError}</div>}
          {createWarning && <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{createWarning} Event was still created.</div>}
          <div className="grid md:grid-cols-2 gap-3">
            <input type="text" placeholder="Event Title *" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" required />
            <input type="text" placeholder="Location" value={createForm.location} onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <div>
              <label className="block text-xs text-slate-500 mb-1">Start Date/Time *</label>
              <input type="datetime-local" value={createForm.event_date} onChange={(e) => setCreateForm({ ...createForm, event_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">End Date/Time</label>
              <input type="datetime-local" value={createForm.end_date} onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <select value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Category</option>
              {['Technical', 'Cultural', 'Academic', 'Sports', 'Creative', 'Professional'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={createForm.club_id} onChange={(e) => setCreateForm({ ...createForm, club_id: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">No Club (University)</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <textarea placeholder="Description" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_uni" checked={createForm.is_university_event} onChange={(e) => setCreateForm({ ...createForm, is_university_event: e.target.checked })} />
            <label htmlFor="is_uni" className="text-sm text-slate-600">University Event</label>
          </div>
          <button type="submit" className="px-5 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition">
            Create Event
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" placeholder="Search events..."
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
          <div>
            <label className="block text-xs text-slate-500 mb-1">From</label>
            <input type="date" value={filters.from_date} onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To</label>
            <input type="date" value={filters.to_date} onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          {(filters.search || filters.category || filters.club_id || filters.is_university || filters.from_date || filters.to_date) && (
            <button onClick={() => setFilters({ search: '', category: '', club_id: '', is_university: '', from_date: '', to_date: '' })}
              className="px-3 py-2 text-sm text-red-600 hover:text-red-700 font-medium">
              Clear
            </button>
          )}
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
          {events.map((event) => {
            const isClashing = clashingIds.has(event.id);
            return (
              <div key={event.id} className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden ${isClashing ? 'border-2 border-red-400 ring-1 ring-red-200' : 'border border-slate-100'}`}>
                <div className={`h-1.5 ${event.is_university_event ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-primary-400 to-accent-400'}`} />
                <div className="p-5">
                  {isClashing && (
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-red-600 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" /> Scheduling Conflict
                    </div>
                  )}
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
                    {event.end_date && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Until {formatDate(event.end_date)} · {formatTime(event.end_date)}</span>
                      </div>
                    )}
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
                  {event.is_university_event ? (
                    <span className="inline-block mt-3 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full font-medium">
                      University Event
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
