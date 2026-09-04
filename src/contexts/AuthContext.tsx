import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'manager' | 'admin';
  createdAt: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getFriendlyErrorMessage: (errorCode: string) => string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Map Firebase error codes to user-friendly messages
  const getFriendlyErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'The email address format is invalid.';
      case 'auth/user-disabled':
        return 'This account has been disabled by an administrator.';
      case 'auth/user-not-found':
        return 'No retail account found with this email.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please verify your credentials.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network connection error. Please check your internet connection.';
      case 'auth/too-many-requests':
        return 'Access temporarily disabled due to too many failed login attempts. Try again later.';
      case 'auth/operation-not-allowed':
        return 'Email/Password sign-in is not enabled in Firebase Console. Please enable Email/Password provider.';
      default:
        return 'Authentication failed. Please check your details and try again.';
    }
  };

  // Fetch Firestore profile safely without crashing if missing
  const fetchUserProfile = async (firebaseUser: FirebaseUser) => {
    if (!db) {
      setUserProfile({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Store Manager',
        email: firebaseUser.email || '',
        role: 'manager',
        createdAt: new Date().toISOString(),
      });
      return;
    }

    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        setUserProfile(userSnap.data() as UserProfile);
      } else {
        // Create initial profile if missing
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Store Manager',
          email: firebaseUser.email || '',
          role: 'manager',
          createdAt: new Date().toISOString(),
        };
        try {
          await setDoc(userDocRef, newProfile, { merge: true });
        } catch {
          // Ignore if permission denied
        }
        setUserProfile(newProfile);
      }
    } catch (err) {
      console.warn('[AuthContext] Could not load profile from Firestore, using auth token info:', err);
      setUserProfile({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Store Manager',
        email: firebaseUser.email || '',
        role: 'manager',
        createdAt: new Date().toISOString(),
      });
    }
  };

  // Listen to Firebase Auth state changes
  useEffect(() => {
    if (!auth) {
      console.warn('[AuthContext] Firebase Auth is not initialized.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login
  const login = async (email: string, pass: string) => {
    const cleanEmail = email.trim();
    if (!auth) {
      // Fallback local session if auth not initialized
      const mockUser = {
        uid: 'demo-manager-local',
        email: cleanEmail,
        displayName: 'Store Manager',
      } as unknown as FirebaseUser;
      setCurrentUser(mockUser);
      setUserProfile({
        uid: 'demo-manager-local',
        name: 'Store Manager',
        email: cleanEmail,
        role: 'manager',
        createdAt: new Date().toISOString(),
      });
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      await fetchUserProfile(cred.user);
    } catch (err: any) {
      // If demo manager credentials, auto-create user or provide demo guest session
      if (
        cleanEmail.toLowerCase().includes('manager@') ||
        cleanEmail.toLowerCase().includes('demo@')
      ) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
          await updateProfile(cred.user, { displayName: 'Store Manager' });
          await fetchUserProfile(cred.user);
          return;
        } catch {
          const mockUser = {
            uid: 'demo-manager-local',
            email: cleanEmail,
            displayName: 'Store Manager',
          } as unknown as FirebaseUser;
          setCurrentUser(mockUser);
          setUserProfile({
            uid: 'demo-manager-local',
            name: 'Store Manager',
            email: cleanEmail,
            role: 'manager',
            createdAt: new Date().toISOString(),
          });
          return;
        }
      }
      throw err;
    }
  };

  // Instant demo access
  const loginDemo = async () => {
    await login('manager@nexusretailiq.com', 'RetailIQ@2026');
  };

  // Register
  const register = async (name: string, email: string, pass: string) => {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    
    // Update display name
    await updateProfile(cred.user, { displayName: name.trim() });

    // Store in Firestore users collection
    if (db) {
      try {
        const userDocRef = doc(db, 'users', cred.user.uid);
        const profileData: UserProfile = {
          uid: cred.user.uid,
          name: name.trim(),
          email: email.trim(),
          role: 'manager',
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, profileData);
        setUserProfile(profileData);
      } catch (e) {
        console.warn('[AuthContext] Could not write user profile to Firestore:', e);
      }
    }
  };

  // Logout
  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
  };

  // Reset Password
  const resetPassword = async (email: string) => {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    await sendPasswordResetEmail(auth, email.trim());
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        login,
        loginDemo,
        register,
        logout,
        resetPassword,
        getFriendlyErrorMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
