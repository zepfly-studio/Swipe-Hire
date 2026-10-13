import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { clearAllDrafts } from '../hooks/useDraft';

const AuthContext = createContext(null);

export function homePath(user, profile) {
  if (!user) return '/auth';
  if (user.role === 'candidate') return profile?.step >= 3 ? '/candidate' : '/candidate/onboarding';
  return profile?.completed ? '/company/swipe' : '/company/onboarding';
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, profile: null, offline: false });

  // The login cookie is httpOnly, so asking the API is the only way to know who's signed in.
  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, offline: false }));
    try {
      const { data } = await api.get('/auth/me');
      setState({ loading: false, user: data.user, profile: data.profile, offline: false });
    } catch (err) {
      // Only a rejected login logs the user out; network/server hiccups keep the session.
      if (err.response?.status === 401) {
        setState({ loading: false, user: null, profile: null, offline: false });
      } else {
        setState({ loading: false, user: null, profile: null, offline: true });
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // The API has already set the login cookie by the time this runs.
  const signIn = useCallback(({ user, profile }) => {
    setState({ loading: false, user, profile, offline: false });
  }, []);

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => {});
    clearAllDrafts();
    setState({ loading: false, user: null, profile: null, offline: false });
  }, []);

  // After account edits the API returns { user, profile }; merge whatever came back.
  const updateSession = useCallback((data) => {
    setState((s) => ({ ...s, user: data.user ?? s.user, profile: data.profile ?? s.profile }));
  }, []);

  const setProfile = useCallback((next) => {
    setState((s) => ({ ...s, profile: typeof next === 'function' ? next(s.profile) : next }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, refresh, signIn, logout, setProfile, updateSession }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
