import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithPassword: (password: string) => boolean;
  logout: () => void;
}

const CORRECT_PASSWORD = 'colennghiemoi';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('dailygoal_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const loginWithPassword = (password: string): boolean => {
    if (password === CORRECT_PASSWORD) {
      const newUser = {
        uid: 'user_' + Date.now(),
        email: 'user@dailygoal.app',
        displayName: 'Bạn',
        photoURL: null,
      };
      setUser(newUser);
      localStorage.setItem('dailygoal_user', JSON.stringify(newUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dailygoal_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithPassword, logout }}>
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
