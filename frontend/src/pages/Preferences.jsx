import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Check, Save } from 'lucide-react';

export default function Preferences() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [domains, setDomains] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clubsRes, domainsRes, prefsRes] = await Promise.all([
        api.get('/clubs'),
        api.get('/research/domains'),
        api.get('/users/preferences'),
      ]);
      setClubs(clubsRes.data);
      setDomains(domainsRes.data);
      setSelectedClubs(prefsRes.data.clubs?.map(c => c.id) || []);
      setSelectedDomains(prefsRes.data.domains?.map(d => d.id) || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const toggleClub = (id) => {
    setSelectedClubs(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
    setSaved(false);
  };

  const toggleDomain = (id) => {
    setSelectedDomains(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/preferences', {
        clubIds: selectedClubs,
        domainIds: selectedDomains,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="animate-fade-in space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Preferences</h1>
        <p className="text-slate-500 text-sm mt-1">Choose the clubs and research domains you're interested in</p>
      </div>

      {/* Clubs Selection */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-1">Clubs</h2>
        <p className="text-xs text-slate-400 mb-4">Select clubs to get personalized event feeds and announcements</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {clubs.map((club) => {
            const selected = selectedClubs.includes(club.id);
            return (
              <button key={club.id} onClick={() => toggleClub(club.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition border ${
                  selected
                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                  selected ? 'bg-primary-500' : 'border border-slate-300'
                }`}>
                  {selected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="truncate">{club.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Domains Selection */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-1">Research Domains</h2>
        <p className="text-xs text-slate-400 mb-4">Select domains to discover relevant faculty research publications</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {domains.map((domain) => {
            const selected = selectedDomains.includes(domain.id);
            return (
              <button key={domain.id} onClick={() => toggleDomain(domain.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition border ${
                  selected
                    ? 'bg-accent-50 border-accent-200 text-accent-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                  selected ? 'bg-accent-500' : 'border border-slate-300'
                }`}>
                  {selected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="truncate">{domain.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium rounded-lg transition disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-1 animate-fade-in">
            <Check className="w-4 h-4" /> Preferences saved!
          </span>
        )}
      </div>
    </div>
  );
}
