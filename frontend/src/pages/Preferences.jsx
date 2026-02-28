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
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="animate-fade-in space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Preferences</h1>
        <p className="text-slate-500 text-sm mt-1">Choose the clubs and research domains you're interested in</p>
      </div>

      {/* Gmail Connection */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-1">
          <Mail className="w-5 h-5 text-red-500" />
          <h2 className="font-semibold text-slate-800">Gmail Integration</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Connect your institute Gmail to automatically pull club announcements, events, and updates into CERP based on your preferences.
        </p>

        {gmailMessage && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${
            gmailMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {gmailMessage.text}
          </div>
        )}

        {gmailStatus.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-700 font-medium">Connected: {gmailStatus.email}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={syncGmail} disabled={gmailSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
                {gmailSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {gmailSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button onClick={recategorizeGmail} disabled={gmailRecategorizing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
                {gmailRecategorizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {gmailRecategorizing ? 'Analyzing...' : 'Re-categorize (AI)'}
              </button>
              <button onClick={disconnectGmail} disabled={gmailLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition disabled:opacity-50">
                <MailX className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button onClick={connectGmail} disabled={gmailLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
            {gmailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {gmailLoading ? 'Connecting...' : 'Connect Gmail'}
          </button>
        )}
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
