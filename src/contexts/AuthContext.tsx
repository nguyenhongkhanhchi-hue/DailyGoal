import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/config';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  guestMode: boolean;
  enableGuestMode: () => void;
  loginWithPassword: (email: string, password: string) => Promise<boolean>;
  registerWithPassword: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapFirebaseUser(fbUser: FirebaseUser): User {
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName,
    photoURL: fbUser.photoURL,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setUser(mapFirebaseUser(fbUser));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const enableGuestMode = () => {
    setGuestMode(true);
  };

  const loginWithPassword = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const registerWithPassword = async (email: string, password: string): Promise<boolean> => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      console.log('Starting Google sign-in...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Google sign-in success:', result.user.email);
      return true;
    } catch (error: any) {
      console.error('Google login error details:', {
        code: error.code,
        message: error.message,
        fullError: error,
      });
      
      // Log cụ thể từng loại lỗi
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('User closed popup');
      } else if (error.code === 'auth/popup-blocked') {
        console.log('Popup was blocked by browser');
      } else if (error.code === 'auth/unauthorized-domain') {
        console.log('Domain not authorized in Firebase');
      } else if (error.code === 'auth/api-key-not-valid') {
        console.log('Firebase API key invalid');
      }
      
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, guestMode, enableGuestMode, loginWithPassword, registerWithPassword, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
