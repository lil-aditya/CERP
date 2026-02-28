import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Calendar from './pages/Calendar';
import Research from './pages/Research';
import Clubs from './pages/Clubs';
import Announcements from './pages/Announcements';
import Preferences from './pages/Preferences';
import AdminPanel from './pages/AdminPanel';
import { ShieldX } from 'lucide-react';

function Unauthorized() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 animate-fade-in">
      <ShieldX className="w-16 h-16 text-red-400 mb-4" />
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Unauthorized</h1>
      <p className="text-slate-500 mb-6">You do not have permission to access this page.</p>
      <Link to="/" className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition font-medium text-sm">
        Go to Dashboard
      </Link>
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false, superOnly = false }) {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Unauthorized />;
  if (superOnly && !isSuperAdmin) return <Unauthorized />;

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="events" element={<Events />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="research" element={<Research />} />
        <Route path="clubs" element={<Clubs />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="preferences" element={<Preferences />} />
        <Route path="admin" element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
