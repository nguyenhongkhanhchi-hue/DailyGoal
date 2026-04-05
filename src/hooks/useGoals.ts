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

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrated, setMigrated] = useState(false);

  // Subscribe to Firestore goals
  useEffect(() => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }

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
      setGoals(goalsData);
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

  const addGoal = useCallback(async (goalData: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('User not authenticated');

    const newGoalRef = doc(collection(db, 'goals'));
    await setDoc(newGoalRef, {
      ...goalData,
      id: newGoalRef.id,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }, [user]);

  const updateGoal = useCallback(async (goalId: string, updates: Partial<Goal>) => {
    if (!user) throw new Error('User not authenticated');

    const goalRef = doc(db, 'goals', goalId);
    await setDoc(goalRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, [user]);

  const deleteGoal = useCallback(async (goalId: string) => {
    if (!user) throw new Error('User not authenticated');

    const goalRef = doc(db, 'goals', goalId);
    await setDoc(goalRef, {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, [user]);

  return {
    goals,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
  };
}
