import { useEffect, useState } from 'react';
import api from '../api';
import { Search, BookOpen, Quote, ExternalLink } from 'lucide-react';

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

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Research Discovery</h1>
        <p className="text-slate-500 text-sm mt-1">Explore faculty research publications at IIT Jodhpur</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search by title, author, keywords..."
              value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <select value={filters.domain_id} onChange={(e) => setFilters({ ...filters, domain_id: e.target.value })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Research Areas</option>
            {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filters.professor_id} onChange={(e) => setFilters({ ...filters, professor_id: e.target.value })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Professors</option>
            {professors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input type="number" placeholder="Year from" value={filters.year_from}
            onChange={(e) => setFilters({ ...filters, year_from: e.target.value })}
            className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <input type="number" placeholder="Year to" value={filters.year_to}
            onChange={(e) => setFilters({ ...filters, year_to: e.target.value })}
            className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <input type="number" placeholder="Min citations" value={filters.min_citations}
            onChange={(e) => setFilters({ ...filters, min_citations: e.target.value })}
            className="w-36 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <select value={filters.sort_by} onChange={(e) => setFilters({ ...filters, sort_by: e.target.value })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="publication_year">Sort by Year</option>
            <option value="citation_count">Sort by Citations</option>
            <option value="title">Sort by Title</option>
          </select>
          <select value={filters.order} onChange={(e) => setFilters({ ...filters, order: e.target.value })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : publications.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No publications found. Try adjusting filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">{publications.length} publications found</p>
          {publications.map((pub) => (
            <div key={pub.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-slate-800 leading-snug">{pub.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{pub.authors}</p>
                  {pub.abstract && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{pub.abstract}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    {pub.journal && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">{pub.journal}</span>
                    )}
                    {pub.publication_year && (
                      <span className="text-xs text-slate-400">{pub.publication_year}</span>
                    )}
                    {pub.domain_name && (
                      <span className="px-2 py-0.5 bg-primary-50 text-primary-600 text-xs rounded-full">{pub.domain_name}</span>
                    )}
                    {pub.department && (
                      <span className="text-xs text-slate-400">{pub.department}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-primary-600">
                    <Quote className="w-3.5 h-3.5" />
                    <span className="text-lg font-bold">{pub.citation_count}</span>
                  </div>
                  <p className="text-xs text-slate-400">citations</p>
                  {pub.url && (
                    <a href={pub.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-primary-600 hover:text-primary-700">
                      <ExternalLink className="w-3 h-3" /> View
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
