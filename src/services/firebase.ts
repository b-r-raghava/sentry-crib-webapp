import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { UserProfile } from '../types';

// Read Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.authDomain &&
  firebaseConfig.apiKey !== 'your_api_key_here'
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    authInstance = getAuth(app);
  } catch (err) {
    console.warn('[SentryCrib Auth] Error initializing Firebase:', err);
  }
} else {
  console.info(
    '[SentryCrib Auth] Note: Live Firebase environment variables not detected. Operating with local storage auth session.'
  );
}

export const auth = authInstance;

// Helper to convert Firebase User to UserProfile
export const mapFirebaseUser = (user: User | null): UserProfile | null => {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Caregiver',
    photoURL: user.photoURL
  };
};

// Fallback session key
const LOCAL_SESSION_KEY = 'sentrycrib_local_auth_session';

export const getLocalSession = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setLocalSession = (user: UserProfile | null) => {
  try {
    if (user) {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
  } catch {
    // ignore storage errors
  }
};

// Unified Auth Operations
export const authService = {
  async signIn(email: string, pass: string): Promise<UserProfile> {
    if (isFirebaseConfigured && authInstance) {
      const res = await signInWithEmailAndPassword(authInstance, email, pass);
      const userProfile = mapFirebaseUser(res.user)!;
      setLocalSession(userProfile);
      return userProfile;
    } else {
      // Local fallback auth
      if (!email || !pass) {
        throw new Error('Please enter both email and password.');
      }
      if (pass.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      const dummyUser: UserProfile = {
        uid: `usr-${Date.now()}`,
        email,
        displayName: email.split('@')[0] || 'Caregiver',
        photoURL: null
      };
      setLocalSession(dummyUser);
      return dummyUser;
    }
  },

  async signUp(name: string, email: string, pass: string): Promise<UserProfile> {
    if (isFirebaseConfigured && authInstance) {
      const res = await createUserWithEmailAndPassword(authInstance, email, pass);
      if (name && res.user) {
        await updateProfile(res.user, { displayName: name });
      }
      const userProfile: UserProfile = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: name || res.user.email?.split('@')[0] || 'Caregiver',
        photoURL: res.user.photoURL
      };
      setLocalSession(userProfile);
      return userProfile;
    } else {
      if (!email || !pass) {
        throw new Error('Please enter all required fields.');
      }
      if (pass.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      const dummyUser: UserProfile = {
        uid: `usr-${Date.now()}`,
        email,
        displayName: name || email.split('@')[0] || 'Caregiver',
        photoURL: null
      };
      setLocalSession(dummyUser);
      return dummyUser;
    }
  },

  async resetPassword(email: string): Promise<void> {
    if (isFirebaseConfigured && authInstance) {
      await sendPasswordResetEmail(authInstance, email);
    } else {
      if (!email || !email.includes('@')) {
        throw new Error('Please provide a valid email address.');
      }
      // Simulated successful dispatch
      await new Promise(r => setTimeout(r, 600));
    }
  },

  async signOut(): Promise<void> {
    if (isFirebaseConfigured && authInstance) {
      await signOut(authInstance);
    }
    setLocalSession(null);
  },

  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    if (isFirebaseConfigured && authInstance) {
      return onAuthStateChanged(authInstance, user => {
        const profile = mapFirebaseUser(user);
        setLocalSession(profile);
        callback(profile);
      });
    } else {
      // Local fallback initial check
      const local = getLocalSession();
      callback(local);
      return () => {};
    }
  }
};
