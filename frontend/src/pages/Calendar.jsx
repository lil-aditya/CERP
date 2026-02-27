import { useEffect, useState } from 'react';
import api from '../api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    Technical: 'bg-blue-500',
    Cultural: 'bg-pink-500',
    Academic: 'bg-green-500',
    Sports: 'bg-orange-500',
    Creative: 'bg-purple-500',
    Professional: 'bg-amber-500',
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Calendar</h1>
        <p className="text-slate-500 text-sm mt-1">Club schedule and campus events overview</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">{MONTHS[month]} {year}</h2>
            <div className="flex items-center gap-2">
              <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition">
                Today
              </button>
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-px">
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
                      ? 'border-primary-300 bg-primary-50'
                      : today
                      ? 'border-primary-200 bg-primary-50/50'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-xs font-medium ${today ? 'bg-primary-500 text-white px-1.5 py-0.5 rounded-full' : 'text-slate-700'}`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div key={e.id} className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${categoryDotColor[e.category] || 'bg-slate-400'}`} />
                        <span className="text-[10px] text-slate-600 truncate">{e.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-primary-600 font-medium">+{dayEvents.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
            {Object.entries(categoryDotColor).map(([cat, color]) => (
              <div key={cat} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-xs text-slate-500">{cat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Day Events */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4">
            {selectedDate
              ? `${MONTHS[month]} ${selectedDate}, ${year}`
              : 'Select a date'}
          </h3>

          {!selectedDate ? (
            <p className="text-sm text-slate-400">Click on a date to see events</p>
          ) : selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-400">No events on this date</p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((event) => (
                <div key={event.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${categoryDotColor[event.category] || 'bg-slate-400'}`} />
                    <span className="text-xs font-medium text-slate-400">{event.category}</span>
                  </div>
                  <h4 className="text-sm font-medium text-slate-800">{event.title}</h4>
                  {event.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-3">{event.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span>{new Date(event.event_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    {event.location && <span>📍 {event.location}</span>}
                  </div>
                  {event.club_name && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-full">
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
