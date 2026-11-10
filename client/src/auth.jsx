import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('connectsphere-token');
    if (!token) {
      setReady(true);
      return;
    }
    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem('connectsphere-token'))
      .finally(() => setReady(true));
  }, []);

  const signIn = useCallback((data) => {
    localStorage.setItem('connectsphere-token', data.token);
    setUser(data.user);
  }, []);
  const signOut = useCallback(() => {
    localStorage.removeItem('connectsphere-token');
    setUser(null);
  }, []);
  const value = useMemo(() => ({ user, ready, signIn, signOut }), [user, ready, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
