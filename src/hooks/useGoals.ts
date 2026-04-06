import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import type { Goal } from '@/types';

const LEGACY_STORAGE_KEY = 'dailygoal_goals';
const GUEST_USER_ID = 'guest_user';

export function useGoals() {
  const { user, guestMode } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrated, setMigrated] = useState(false);

  const effectiveUserId = user?.uid || (guestMode ? GUEST_USER_ID : null);

  // Load from localStorage - always try to load first as backup
  useEffect(() => {
    const storageKey = `${LEGACY_STORAGE_KEY}_${GUEST_USER_ID}`;
    const savedGoals = localStorage.getItem(storageKey) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    
    if (savedGoals) {
      try {
        const parsed = JSON.parse(savedGoals);
        const activeGoals = parsed.filter((g: Goal) => !g.deletedAt);
        setGoals(activeGoals);
      } catch {
        setGoals([]);
      }
    } else {
      setGoals([]);
    }
    setLoading(false);
  }, []);

  // Subscribe to Firestore goals (for logged in users, as supplement)
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
      collection(db, 'goals'),
      where('userId', '==', user.uid),
      where('deletedAt', '==', null)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const goalsData: Goal[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        goalsData.push({
          id: doc.id,
          ...data,
          userId: data.userId,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          deletedAt: data.deletedAt?.toDate() || undefined,
        } as Goal);
      });
      // Merge Firestore data with localStorage data
      if (goalsData.length > 0) {
        setGoals(goalsData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Migration from localStorage
  useEffect(() => {
    if (!user || migrated || goals.length > 0) return;

    const migrateData = async () => {
      const savedGoals = localStorage.getItem(`${LEGACY_STORAGE_KEY}_${user.uid}`) ?? 
                        localStorage.getItem(LEGACY_STORAGE_KEY);
      
      if (!savedGoals) {
        setMigrated(true);
        return;
      }

      try {
        const parsed = JSON.parse(savedGoals);
        const batch = writeBatch(db);

        parsed.forEach((goal: any) => {
          if (!goal.userId || goal.userId === user.uid) {
            const goalRef = doc(collection(db, 'goals'));
            batch.set(goalRef, {
              ...goal,
              id: goalRef.id,
              userId: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        });

        await batch.commit();
        setMigrated(true);
      } catch (error) {
        console.error('Migration error:', error);
        setMigrated(true);
      }
    };

    migrateData();
  }, [user, migrated, goals.length]);

  // Helper to save to localStorage (for guest mode)
  const saveToLocalStorage = useCallback((newGoals: Goal[]) => {
    const storageKey = `${LEGACY_STORAGE_KEY}_${GUEST_USER_ID}`;
    localStorage.setItem(storageKey, JSON.stringify(newGoals));
  }, []);

  const addGoal = useCallback(async (goalData: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    console.log('addGoal called:', { user: !!user, guestMode, goalData });
    
    const newGoal: Goal = {
      ...goalData,
      id: crypto.randomUUID(),
      userId: effectiveUserId || GUEST_USER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (user) {
      try {
        const newGoalRef = doc(collection(db, 'goals'));
        await setDoc(newGoalRef, {
          ...goalData,
          dependencies: goalData.dependencies || [],
          deletedAt: null,
          id: newGoalRef.id,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log('Goal saved to Firestore:', newGoalRef.id);
      } catch (err) {
        console.error('Firestore error:', err);
      }
    }
    
    // Always save to localStorage as backup
    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    saveToLocalStorage(updatedGoals);
    console.log('Goal saved to localStorage:', newGoal.id);
  }, [user, effectiveUserId, goals, saveToLocalStorage]);

  const updateGoal = useCallback(async (goalId: string, updates: Partial<Goal>) => {
    if (user) {
      // Firestore for logged in users
      const goalRef = doc(db, 'goals', goalId);
      await setDoc(goalRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
    
    // Always save to localStorage as backup
    const updatedGoals = goals.map(g => 
      g.id === goalId ? { ...g, ...updates, updatedAt: new Date() } : g
    );
    setGoals(updatedGoals);
    saveToLocalStorage(updatedGoals);
  }, [user, goals, saveToLocalStorage]);

  const deleteGoal = useCallback(async (goalId: string) => {
    if (user) {
      // Firestore for logged in users
      const goalRef = doc(db, 'goals', goalId);
      await setDoc(goalRef, {
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
    
    // Always save to localStorage as backup - soft delete
    const updatedGoals = goals.map(g => 
      g.id === goalId ? { ...g, deletedAt: new Date(), updatedAt: new Date() } : g
    );
    setGoals(updatedGoals.filter(g => !g.deletedAt));
    saveToLocalStorage(updatedGoals);
  }, [user, goals, saveToLocalStorage]);

  return {
    goals,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
  };
}
