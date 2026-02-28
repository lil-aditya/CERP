import { useEffect, useState } from 'react';
import api from '../api';
import { Users, Globe, Search, Code, Palette, Trophy, Briefcase, Beaker, ChevronDown, ChevronUp, Sparkles, Zap } from 'lucide-react';

// Board definitions matching IIT Jodhpur structure
const BOARDS = [
  {
    name: 'Board of Co-curricular Activity',
    gradient: 'from-cyan-500 to-blue-600',
    neonColor: 'cyan',
    icon: Code,
    clubNames: ['PClub', 'RAID', 'Robotics Society', 'Nexus', 'GDSC IIT Jodhpur', 'Devlup Labs', 'Boltheads', 'Quiz Society', 'Pheme', 'LitSoc'],
  },
  {
    name: 'Board of Art and Culture',
    gradient: 'from-pink-500 to-purple-600',
    neonColor: 'pink',
    icon: Palette,
    clubNames: ['Dramebaaz', 'Ateliers', 'Raw', 'Sangam', 'Designerds', 'Framex', 'The Groove Theory', 'Inside'],
  },
  {
    name: 'Board of Student Sports',
    gradient: 'from-orange-500 to-red-600',
    neonColor: 'orange',
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
    gradient: 'from-green-500 to-emerald-600',
    neonColor: 'green',
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
  'from-cyan-400 to-cyan-600',
  'from-blue-400 to-blue-600',
  'from-indigo-400 to-indigo-600',
  'from-violet-400 to-violet-600',
  'from-purple-400 to-purple-600',
  'from-pink-400 to-pink-600',
  'from-rose-400 to-rose-600',
  'from-red-400 to-red-600',
  'from-orange-400 to-orange-600',
  'from-amber-400 to-amber-600',
  'from-green-400 to-green-600',
  'from-emerald-400 to-emerald-600',
  'from-teal-400 to-teal-600',
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Clubs & Societies
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
          </h1>
          <p className="text-slate-400 text-sm">Explore student organizations at IIT Jodhpur</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search clubs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-cyber w-full pl-11"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="cyber-loader" /></div>
      ) : (
        <div className="space-y-8">
          {boardData.map((board, boardIndex) => {
            if (board.clubs.length === 0) return null;
            const collapsed = collapsedBoards[board.name];
            const BoardIcon = board.icon;
            return (
              <div key={board.name} className="animate-slide-up" style={{ animationDelay: `${boardIndex * 100}ms` }}>
                {/* Board header */}
                <button
                  onClick={() => toggleBoard(board.name)}
                  className={`w-full flex items-center justify-between gap-3 px-6 py-4 rounded-xl bg-gradient-to-r ${board.gradient} text-white shadow-lg hover:shadow-xl transition-all mb-4 group`}
                  style={{ boxShadow: `0 10px 40px -10px rgba(0, 0, 0, 0.3)` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <BoardIcon className="w-5 h-5" />
                    </div>
                    <h2 className="font-bold text-sm tracking-wide">{board.name}</h2>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">{board.clubs.length}</span>
                  </div>
                  {collapsed ? <ChevronDown className="w-5 h-5 transition-transform" /> : <ChevronUp className="w-5 h-5 transition-transform" />}
                </button>

                {/* Club cards */}
                {!collapsed && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {board.clubs.map((club, idx) => {
                      const colorIdx = (club.id || idx) % ICON_COLORS.length;
                      return (
                        <div 
                          key={club.id} 
                          className="glass-card rounded-xl overflow-hidden transition-all hover:scale-[1.02] animate-slide-up group"
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <div className={`h-1 bg-gradient-to-r ${board.gradient}`} />
                          <div className="p-5">
                            <div className="flex items-start gap-3">
                              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ICON_COLORS[colorIdx]} flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg`}>
                                {club.name.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors">{club.name}</h3>
                                {CLUB_TAGS[club.name] && (
                                  <span className="text-[11px] font-medium text-slate-400">{CLUB_TAGS[club.name]}</span>
                                )}
                              </div>
                            </div>
                            {club.description && (
                              <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">{club.description}</p>
                            )}
                            {club.website_url && (
                              <a href={club.website_url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-3 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
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
              <h2 className="font-bold text-slate-300 text-sm mb-4 px-1 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" /> Other Organizations
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {otherClubs.map((club, idx) => (
                  <div key={club.id} className="glass-card rounded-xl p-5 transition-all hover:scale-[1.02]">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {club.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{club.name}</h3>
                        <span className="text-[11px] text-slate-500">{club.category}</span>
                      </div>
                    </div>
                    {club.description && <p className="text-xs text-slate-500 mt-3 line-clamp-2">{club.description}</p>}
                    {club.website_url && (
                      <a href={club.website_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-3 text-xs text-cyan-400 hover:text-cyan-300 font-medium">
                        <Globe className="w-3 h-3" /> Visit website
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredClubs.length === 0 && (
            <div className="text-center py-20 glass-card rounded-xl">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400 text-lg">No clubs found matching "{search}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
