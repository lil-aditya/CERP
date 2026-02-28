import { useEffect, useState } from 'react';
import api from '../api';
import { Search, BookOpen, Quote, ExternalLink, Sparkles, Filter, SortAsc, TrendingUp, Award, GraduationCap } from 'lucide-react';

export default function Research() {
  const [publications, setPublications] = useState([]);
  const [domains, setDomains] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '', domain_id: '', professor_id: '', department: '',
    year_from: '', year_to: '', min_citations: '', sort_by: 'publication_year', order: 'desc'
  });

  useEffect(() => {
    Promise.all([
      api.get('/research/domains'),
      api.get('/research/professors'),
    ]).then(([domainsRes, profsRes]) => {
      setDomains(domainsRes.data);
      setProfessors(profsRes.data);
    });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadPublications, 300);
    return () => clearTimeout(timeout);
  }, [filters]);

  const loadPublications = async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/research', { params });
      setPublications(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const departments = [...new Set(professors.map(p => p.department))].filter(Boolean);

  // Get stats
  const totalCitations = publications.reduce((acc, p) => acc + (p.citation_count || 0), 0);
  const avgCitations = publications.length ? Math.round(totalCitations / publications.length) : 0;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden glass-card rounded-2xl p-8">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                Research Discovery
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
              </h1>
              <p className="text-slate-400 text-sm">Explore faculty research publications at IIT Jodhpur</p>
            </div>
          </div>
          
          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 glass rounded-lg">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span className="text-white font-semibold">{publications.length}</span>
              <span className="text-slate-400 text-sm">Publications</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 glass rounded-lg">
              <Quote className="w-4 h-4 text-purple-400" />
              <span className="text-white font-semibold">{totalCitations.toLocaleString()}</span>
              <span className="text-slate-400 text-sm">Total Citations</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 glass rounded-lg">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-white font-semibold">{avgCitations}</span>
              <span className="text-slate-400 text-sm">Avg Citations</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 glass rounded-lg">
              <GraduationCap className="w-4 h-4 text-orange-400" />
              <span className="text-white font-semibold">{professors.length}</span>
              <span className="text-slate-400 text-sm">Professors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          Filters & Search
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Search by title, author, keywords..."
              value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input-cyber w-full pl-11" />
          </div>
          <select value={filters.domain_id} onChange={(e) => setFilters({ ...filters, domain_id: e.target.value })}
            className="input-cyber min-w-[160px]">
            <option value="">All Research Areas</option>
            {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            className="input-cyber min-w-[160px]">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filters.professor_id} onChange={(e) => setFilters({ ...filters, professor_id: e.target.value })}
            className="input-cyber min-w-[160px]">
            <option value="">All Professors</option>
            {professors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input type="number" placeholder="Year from" value={filters.year_from}
            onChange={(e) => setFilters({ ...filters, year_from: e.target.value })}
            className="input-cyber w-32" />
          <input type="number" placeholder="Year to" value={filters.year_to}
            onChange={(e) => setFilters({ ...filters, year_to: e.target.value })}
            className="input-cyber w-32" />
          <input type="number" placeholder="Min citations" value={filters.min_citations}
            onChange={(e) => setFilters({ ...filters, min_citations: e.target.value })}
            className="input-cyber w-36" />
          <div className="flex items-center gap-2 ml-auto">
            <SortAsc className="w-4 h-4 text-slate-500" />
            <select value={filters.sort_by} onChange={(e) => setFilters({ ...filters, sort_by: e.target.value })}
              className="input-cyber">
              <option value="publication_year">Sort by Year</option>
              <option value="citation_count">Sort by Citations</option>
              <option value="title">Sort by Title</option>
            </select>
            <select value={filters.order} onChange={(e) => setFilters({ ...filters, order: e.target.value })}
              className="input-cyber w-28">
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="cyber-loader" />
        </div>
      ) : publications.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-xl">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 text-lg">No publications found</p>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400" />
            Showing <span className="text-cyan-400 font-semibold">{publications.length}</span> publications
          </p>
          {publications.map((pub, index) => (
            <div 
              key={pub.id} 
              className="pub-card animate-slide-up"
              style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white leading-relaxed group-hover:text-cyan-400 transition-colors">
                    {pub.title}
                  </h3>
                  <p className="text-xs text-cyan-400/70 mt-2 font-medium">{pub.authors}</p>
                  {pub.abstract && (
                    <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">{pub.abstract}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    {pub.journal && (
                      <span className="badge badge-purple">{pub.journal}</span>
                    )}
                    {pub.publication_year && (
                      <span className="badge badge-cyan">{pub.publication_year}</span>
                    )}
                    {pub.domain_name && (
                      <span className="badge badge-green">{pub.domain_name}</span>
                    )}
                    {pub.department && (
                      <span className="text-xs text-slate-500 px-2 py-1 rounded-full bg-white/5">{pub.department}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-3">
                  <div className="glass px-4 py-3 rounded-xl">
                    <div className="flex items-center gap-2 text-purple-400">
                      <Quote className="w-4 h-4" />
                      <span className="text-2xl font-bold text-white">{pub.citation_count}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">citations</p>
                  </div>
                  {pub.url && (
                    <a href={pub.url} target="_blank" rel="noopener noreferrer"
                      className="btn-ghost text-xs px-4 py-2 flex items-center gap-2 group">
                      <ExternalLink className="w-3 h-3" /> 
                      <span>View Paper</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
