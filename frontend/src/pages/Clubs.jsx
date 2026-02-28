import { useEffect, useState } from 'react';
import api from '../api';
import { Users, Globe, Search, Code, Palette, Trophy, Briefcase, Beaker, ChevronDown, ChevronUp } from 'lucide-react';

// Board definitions matching IIT Jodhpur structure
const BOARDS = [
  {
    name: 'Board of Co-curricular Activity',
    color: 'from-blue-600 to-indigo-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
    icon: Code,
    clubNames: ['PClub', 'RAID', 'Robotics Society', 'Nexus', 'GDSC IIT Jodhpur', 'Devlup Labs', 'Boltheads', 'Quiz Society', 'Pheme', 'LitSoc'],
  },
  {
    name: 'Board of Art and Culture',
    color: 'from-pink-500 to-rose-600',
    bgLight: 'bg-pink-50',
    textColor: 'text-pink-700',
    icon: Palette,
    clubNames: ['Dramebaaz', 'Ateliers', 'Raw', 'Sangam', 'Designerds', 'Framex', 'The Groove Theory', 'Inside'],
  },
  {
    name: 'Board of Student Sports',
    color: 'from-orange-500 to-amber-600',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-700',
    icon: Trophy,
    clubNames: [
      'Sports Council', 'Cricket Society', 'Basketball Society', 'Football Society',
      'Badminton Society', 'Hockey Society', 'Chess Society', 'Volleyball Society',
      'Lawn Tennis Society', 'Table Tennis Society', 'Athletic Society', 'Kabaddi Society',
      'Squash Society', 'E-Sports Society', 'Weightlifting Society', 'Self Defence Club',
    ],
  },
  {
    name: 'Professional Clubs',
    color: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    icon: Briefcase,
    clubNames: ['E-Cell', 'Quant Club'],
  },
];

// Short tag / abbreviation shown beside name
const CLUB_TAGS = {
  'PClub': 'Programming Club',
  'RAID': 'AI & Data Science',
  'Nexus': 'Astronomy',
  'GDSC IIT Jodhpur': 'Google DSC',
  'Devlup Labs': 'Open Source',
  'Boltheads': 'Electronics',
  'LitSoc': 'Literary Society',
  'Pheme': 'Public Speaking',
  'Dramebaaz': 'Drama Society',
  'Ateliers': 'Sketching & Art',
  'Raw': 'Music Production',
  'Sangam': 'Cultural Society',
  'Designerds': 'Design Club',
  'Framex': 'Film & Photography',
  'The Groove Theory': 'Dance',
  'Inside': 'Journalism',
  'E-Cell': 'Entrepreneurship',
  'Quant Club': 'Finance',
};

// Generate a nice gradient for each club card icon
const ICON_COLORS = [
  'from-blue-400 to-blue-600',
  'from-indigo-400 to-indigo-600',
  'from-violet-400 to-violet-600',
  'from-purple-400 to-purple-600',
  'from-pink-400 to-pink-600',
  'from-rose-400 to-rose-600',
  'from-red-400 to-red-600',
  'from-orange-400 to-orange-600',
  'from-amber-400 to-amber-600',
  'from-yellow-400 to-yellow-600',
  'from-lime-400 to-lime-600',
  'from-green-400 to-green-600',
  'from-emerald-400 to-emerald-600',
  'from-teal-400 to-teal-600',
  'from-cyan-400 to-cyan-600',
  'from-sky-400 to-sky-600',
];

export default function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [collapsedBoards, setCollapsedBoards] = useState({});

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/clubs');
      setClubs(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const toggleBoard = (boardName) => {
    setCollapsedBoards(prev => ({ ...prev, [boardName]: !prev[boardName] }));
  };

  // Filter clubs by search
  const filteredClubs = search
    ? clubs.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase()) ||
        (CLUB_TAGS[c.name] || '').toLowerCase().includes(search.toLowerCase())
      )
    : clubs;

  // Organize clubs into boards
  const boardData = BOARDS.map(board => ({
    ...board,
    clubs: board.clubNames
      .map(name => filteredClubs.find(c => c.name === name))
      .filter(Boolean),
  }));

  // Clubs not in any board (fallback)
  const allBoardClubNames = BOARDS.flatMap(b => b.clubNames);
  const otherClubs = filteredClubs.filter(c => !allBoardClubNames.includes(c.name));

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Clubs & Societies</h1>
        <p className="text-slate-500 text-sm mt-1">Explore student organizations at IIT Jodhpur</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search clubs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-8">
          {boardData.map((board) => {
            if (board.clubs.length === 0) return null;
            const collapsed = collapsedBoards[board.name];
            const BoardIcon = board.icon;
            return (
              <div key={board.name}>
                {/* Board header */}
                <button
                  onClick={() => toggleBoard(board.name)}
                  className={`w-full flex items-center justify-between gap-3 px-5 py-3 rounded-xl bg-gradient-to-r ${board.color} text-white shadow-md hover:shadow-lg transition-shadow mb-4`}
                >
                  <div className="flex items-center gap-3">
                    <BoardIcon className="w-5 h-5" />
                    <h2 className="font-bold text-sm tracking-wide">{board.name}</h2>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">{board.clubs.length}</span>
                  </div>
                  {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>

                {/* Club cards */}
                {!collapsed && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {board.clubs.map((club, idx) => {
                      const colorIdx = (club.id || idx) % ICON_COLORS.length;
                      return (
                        <div key={club.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden group">
                          <div className={`h-1.5 bg-gradient-to-r ${board.color}`} />
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${ICON_COLORS[colorIdx]} flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm`}>
                                {club.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-bold text-slate-800 truncate">{club.name}</h3>
                                {CLUB_TAGS[club.name] && (
                                  <span className={`text-[11px] font-medium ${board.textColor}`}>{CLUB_TAGS[club.name]}</span>
                                )}
                              </div>
                            </div>
                            {club.description && (
                              <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">{club.description}</p>
                            )}
                            {club.website_url && (
                              <a href={club.website_url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-2.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
                                <Globe className="w-3 h-3" /> Visit website
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Other clubs not in any board */}
          {otherClubs.length > 0 && (
            <div>
              <h2 className="font-bold text-slate-700 text-sm mb-3 px-1">Other Organizations</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {otherClubs.map((club, idx) => (
                  <div key={club.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white font-bold text-base shrink-0`}>
                        {club.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{club.name}</h3>
                        <span className="text-[11px] text-slate-400">{club.category}</span>
                      </div>
                    </div>
                    {club.description && <p className="text-xs text-slate-500 mt-2.5 line-clamp-2">{club.description}</p>}
                    {club.website_url && (
                      <a href={club.website_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
                        <Globe className="w-3 h-3" /> Visit website
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredClubs.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No clubs found matching "{search}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
