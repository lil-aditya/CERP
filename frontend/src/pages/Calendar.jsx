import { useEffect, useState } from 'react';
import api from '../api';
import { ChevronLeft, ChevronRight, CalendarDays, Sparkles, Clock, MapPin } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    loadEvents();
  }, [year, month]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/events/calendar', { params: { year, month: month + 1 } });
      setEvents(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getEventsForDate = (day) => {
    return events.filter((e) => {
      const eventDate = new Date(e.event_date);
      return eventDate.getDate() === day && eventDate.getMonth() === month && eventDate.getFullYear() === year;
    });
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const categoryDotColor = {
    Technical: 'bg-cyan-400',
    Cultural: 'bg-pink-400',
    Academic: 'bg-green-400',
    Sports: 'bg-orange-400',
    Creative: 'bg-purple-400',
    Professional: 'bg-amber-400',
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
          <CalendarDays className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Calendar
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
          </h1>
          <p className="text-slate-400 text-sm">Club schedule and campus events overview</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">{MONTHS[month]} {year}</h2>
            <div className="flex items-center gap-2">
              <button onClick={goToday} className="px-4 py-2 text-xs font-medium text-cyan-400 bg-cyan-500/20 rounded-lg hover:bg-cyan-500/30 transition border border-cyan-500/30">
                Today
              </button>
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/5 transition border border-white/10">
                <ChevronLeft className="w-5 h-5 text-slate-400" />
              </button>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/5 transition border border-white/10">
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-slate-500 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 lg:h-24 rounded-lg" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDate(day);
              const today = isToday(day);
              const selected = selectedDate === day;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  className={`h-20 lg:h-24 p-1.5 rounded-lg cursor-pointer transition-all border ${
                    selected
                      ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_15px_rgba(0,245,255,0.2)]'
                      : today
                      ? 'border-cyan-500/30 bg-cyan-500/5'
                      : 'border-white/5 hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  <span className={`text-xs font-medium ${today ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-2 py-0.5 rounded-full' : 'text-slate-400'}`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div key={e.id} className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${categoryDotColor[e.category] || 'bg-slate-500'}`} />
                        <span className="text-[10px] text-slate-500 truncate">{e.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-cyan-400 font-medium">+{dayEvents.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-white/5">
            {Object.entries(categoryDotColor).map(([cat, color]) => (
              <div key={cat} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-xs text-slate-500">{cat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Day Events */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-cyan-400" />
            {selectedDate
              ? `${MONTHS[month]} ${selectedDate}, ${year}`
              : 'Select a date'}
          </h3>

          {!selectedDate ? (
            <p className="text-sm text-slate-500">Click on a date to see events</p>
          ) : selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No events on this date</p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((event) => (
                <div key={event.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${categoryDotColor[event.category] || 'bg-slate-500'}`} />
                    <span className="text-xs font-medium text-slate-500">{event.category}</span>
                  </div>
                  <h4 className="text-sm font-medium text-white">{event.title}</h4>
                  {event.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-3">{event.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      {new Date(event.event_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-pink-400" />
                        {event.location}
                      </span>
                    )}
                  </div>
                  {event.club_name && (
                    <span className="inline-block mt-3 badge badge-purple">
                      {event.club_name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
