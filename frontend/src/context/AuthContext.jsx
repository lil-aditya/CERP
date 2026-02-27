import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cerp_token');
    const savedUser = localStorage.getItem('cerp_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Refresh user data
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
          localStorage.setItem('cerp_user', JSON.stringify(res.data));
        })
        .catch(() => {
          localStorage.removeItem('cerp_token');
          localStorage.removeItem('cerp_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('cerp_token', res.data.token);
    localStorage.setItem('cerp_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('cerp_token', res.data.token);
    localStorage.setItem('cerp_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('cerp_token');
    localStorage.removeItem('cerp_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, isAdmin, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
