import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { UserProfile, AuthState, PublicScreen } from '../types';
import { authService, isFirebaseConfigured } from '../services/firebase';

interface AuthContextType {
  user: UserProfile | null;
  authState: AuthState;
  currentPublicScreen: PublicScreen;
  setCurrentPublicScreen: (screen: PublicScreen) => void;
  authError: string | null;
  clearError: () => void;
  login: (email: string, pass: string) => Promise<boolean>;
  signUp: (name: string, email: string, pass: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isFirebaseLive: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const formatAuthError = (err: unknown): string => {
  if (!err) return 'An unexpected error occurred. Please try again.';
  if (typeof err === 'string') return err;
  
  const anyErr = err as { code?: string; message?: string };
  const code = anyErr.code || '';
  
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify and try again.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please wait a few moments and try again.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    default:
      return anyErr.message || 'Authentication failed. Please check your information and try again.';
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authState, setAuthState] = useState<AuthState>('INITIALIZING');
  const [currentPublicScreen, setCurrentPublicScreen] = useState<PublicScreen>('landing');
  const [authError, setAuthError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Listen to Firebase authentication state lifecycle
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setAuthState(currentUser ? 'SIGNED_IN' : 'SIGNED_OUT');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    clearError();
    setAuthState('SIGNING_IN');
    try {
      const loggedUser = await authService.signIn(email.trim(), pass);
      setUser(loggedUser);
      setAuthState('SIGNED_IN');
      return true;
    } catch (err) {
      const friendlyMsg = formatAuthError(err);
      setAuthError(friendlyMsg);
      setAuthState('ERROR');
      return false;
    }
  };

  const signUp = async (name: string, email: string, pass: string): Promise<boolean> => {
    clearError();
    setAuthState('SIGNING_IN');
    try {
      const newUser = await authService.signUp(name.trim(), email.trim(), pass);
      setUser(newUser);
      setAuthState('SIGNED_UP');
      return true;
    } catch (err) {
      const friendlyMsg = formatAuthError(err);
      setAuthError(friendlyMsg);
      setAuthState('ERROR');
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    clearError();
    try {
      await authService.resetPassword(email.trim());
      return true;
    } catch (err) {
      const friendlyMsg = formatAuthError(err);
      setAuthError(friendlyMsg);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    clearError();
    setAuthState('SIGNING_OUT');
    try {
      await authService.signOut();
      setUser(null);
      setAuthState('SIGNED_OUT');
      setCurrentPublicScreen('landing');
    } catch (err) {
      console.error('Logout error:', err);
      setUser(null);
      setAuthState('SIGNED_OUT');
      setCurrentPublicScreen('landing');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authState,
        currentPublicScreen,
        setCurrentPublicScreen,
        authError,
        clearError,
        login,
        signUp,
        resetPassword,
        logout,
        isFirebaseLive: isFirebaseConfigured
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
