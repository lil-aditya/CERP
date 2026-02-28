import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Check, Save, Mail, MailX, RefreshCw, Loader2, Sparkles } from 'lucide-react';

export default function Preferences() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clubs, setClubs] = useState([]);
  const [domains, setDomains] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Gmail state
  const [gmailStatus, setGmailStatus] = useState({ connected: false, email: null });
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailSyncing, setGmailSyncing] = useState(false);
  const [gmailRecategorizing, setGmailRecategorizing] = useState(false);
  const [gmailMessage, setGmailMessage] = useState(null);

  useEffect(() => {
    loadData();
    checkGmailStatus();

    // Handle Gmail OAuth callback params
    const gmailParam = searchParams.get('gmail');
    if (gmailParam === 'connected') {
      const email = searchParams.get('email');
      setGmailStatus({ connected: true, email });
      setGmailMessage({ type: 'success', text: `Gmail connected: ${email}` });
      setSearchParams({}, { replace: true }); // clean URL
    } else if (gmailParam === 'error') {
      const reason = searchParams.get('reason');
      setGmailMessage({ type: 'error', text: `Gmail connection failed: ${reason}` });
      setSearchParams({}, { replace: true });
    }
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

  const checkGmailStatus = async () => {
    try {
      const res = await api.get('/gmail/status');
      setGmailStatus(res.data);
    } catch (err) { console.error('Gmail status check failed:', err); }
  };

  const connectGmail = async () => {
    setGmailLoading(true);
    try {
      const res = await api.get('/gmail/auth-url');
      // Open Google consent in same window (will redirect back)
      window.location.href = res.data.url;
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to start Gmail connection';
      setGmailMessage({ type: 'error', text: msg });
      setGmailLoading(false);
    }
  };

  const disconnectGmail = async () => {
    if (!confirm('Disconnect Gmail? This will remove all cached email data.')) return;
    setGmailLoading(true);
    try {
      await api.delete('/gmail/disconnect');
      setGmailStatus({ connected: false, email: null });
      setGmailMessage({ type: 'success', text: 'Gmail disconnected.' });
    } catch (err) {
      setGmailMessage({ type: 'error', text: 'Failed to disconnect Gmail.' });
    }
    setGmailLoading(false);
  };

  const syncGmail = async () => {
    setGmailSyncing(true);
    try {
      const res = await api.post('/gmail/sync');
      setGmailMessage({
        type: 'success',
        text: `Synced! ${res.data.fetched} emails checked, ${res.data.new_emails} new.`,
      });
    } catch (err) {
      const msg = err.response?.data?.error || 'Sync failed';
      setGmailMessage({ type: 'error', text: msg });
      if (err.response?.status === 401) {
        setGmailStatus({ connected: false, email: null });
      }
    }
    setGmailSyncing(false);
  };

  const recategorizeGmail = async () => {
    setGmailRecategorizing(true);
    try {
      const res = await api.post('/gmail/recategorize');
      setGmailMessage({
        type: 'success',
        text: `Smart re-categorization done! ${res.data.updated} emails updated with NLP.`,
      });
    } catch (err) {
      const msg = err.response?.data?.error || 'Re-categorization failed';
      setGmailMessage({ type: 'error', text: msg });
    }
    setGmailRecategorizing(false);
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

      // Auto re-categorize cached Gmail emails when preferences change
      if (gmailStatus.connected) {
        try {
          const res = await api.post('/gmail/recategorize');
          console.log(`Re-categorized ${res.data.updated} emails after preference update`);
        } catch (err) { console.log('Recategorize skipped:', err.message); }
      }
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="cyber-loader" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 max-w-4xl">
      {/* Header */}
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl" />
        <div className="relative glass-card rounded-2xl p-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Preferences
          </h1>
          <p className="text-slate-400 text-sm mt-2">Configure your personalized experience and integrations</p>
        </div>
      </div>

      {/* Gmail Connection */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/25">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Gmail Integration</h2>
            <p className="text-xs text-slate-500">Connect your institute Gmail for automatic updates</p>
          </div>
        </div>

        {gmailMessage && (
          <div className={`mt-4 px-4 py-3 rounded-xl text-sm border ${
            gmailMessage.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            {gmailMessage.text}
          </div>
        )}

        {gmailStatus.connected ? (
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
              <span className="text-sm text-emerald-400 font-medium">Connected: {gmailStatus.email}</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={syncGmail} disabled={gmailSyncing}
                className="btn-primary flex items-center gap-2">
                {gmailSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {gmailSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button onClick={recategorizeGmail} disabled={gmailRecategorizing}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50">
                {gmailRecategorizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {gmailRecategorizing ? 'Analyzing...' : 'Re-categorize (AI)'}
              </button>
              <button onClick={disconnectGmail} disabled={gmailLoading}
                className="btn-ghost flex items-center gap-2 text-red-400 hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/10">
                <MailX className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button onClick={connectGmail} disabled={gmailLoading}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 disabled:opacity-50">
            {gmailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {gmailLoading ? 'Connecting...' : 'Connect Gmail'}
          </button>
        )}
      </div>

      {/* Clubs Selection */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <span className="text-lg">🎯</span>
          </div>
          <div>
            <h2 className="font-semibold text-white">Clubs</h2>
            <p className="text-xs text-slate-500">Select clubs for personalized feeds</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {clubs.map((club) => {
            const selected = selectedClubs.includes(club.id);
            return (
              <button key={club.id} onClick={() => toggleClub(club.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all border ${
                  selected
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                }`}>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                  selected ? 'bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30' : 'border border-slate-600'
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
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <span className="text-lg">🔬</span>
          </div>
          <div>
            <h2 className="font-semibold text-white">Research Domains</h2>
            <p className="text-xs text-slate-500">Select domains to discover relevant publications</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {domains.map((domain) => {
            const selected = selectedDomains.includes(domain.id);
            return (
              <button key={domain.id} onClick={() => toggleDomain(domain.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all border ${
                  selected
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-lg shadow-purple-500/10'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                }`}>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                  selected ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30' : 'border border-slate-600'
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
          className="btn-neon flex items-center gap-2 px-8 py-3">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
        {saved && (
          <span className="text-sm text-emerald-400 flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4" /> 
            <span className="font-medium">Preferences saved!</span>
          </span>
        )}
      </div>
    </div>
  );
}
