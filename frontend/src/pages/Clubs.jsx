import { useEffect, useState } from 'react';
import api from '../api';
import { Users, Globe, Tag } from 'lucide-react';

export default function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClubs();
  }, [filterCategory]);

  const loadClubs = async () => {
    setLoading(true);
    try {
      const params = filterCategory ? { category: filterCategory } : {};
      const res = await api.get('/clubs', { params });
      setClubs(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const categoryColors = {
    Technical: 'from-blue-400 to-blue-600',
    Cultural: 'from-pink-400 to-pink-600',
    Science: 'from-green-400 to-green-600',
    Sports: 'from-orange-400 to-orange-600',
    Creative: 'from-purple-400 to-purple-600',
    Professional: 'from-amber-400 to-amber-600',
  };

  const categories = ['Technical', 'Cultural', 'Science', 'Sports', 'Creative', 'Professional'];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Clubs</h1>
        <p className="text-slate-500 text-sm mt-1">Explore student clubs at IIT Jodhpur</p>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterCategory('')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${!filterCategory ? 'bg-primary-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
          All
        </button>
        {categories.map((cat) => (
          <button key={cat} onClick={() => setFilterCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${filterCategory === cat ? 'bg-primary-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Clubs Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((club) => (
            <div key={club.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${categoryColors[club.category] || 'from-slate-400 to-slate-500'}`} />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${categoryColors[club.category] || 'from-slate-400 to-slate-500'} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                    {club.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">{club.name}</h3>
                    <span className="text-xs text-slate-400">{club.category}</span>
                  </div>
                </div>
                {club.description && (
                  <p className="text-xs text-slate-500 mt-3 line-clamp-2">{club.description}</p>
                )}
                {club.website_url && (
                  <a href={club.website_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-xs text-primary-600 hover:text-primary-700">
                    <Globe className="w-3 h-3" /> Visit website
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
