import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Goal } from '@/types';

const LEGACY_STORAGE_KEY = 'dailygoal_goals';
const getStorageKey = (userId: string) => `${LEGACY_STORAGE_KEY}_${userId}`;

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const storageKey = getStorageKey(user.uid);
    const savedGoals = localStorage.getItem(storageKey) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (savedGoals) {
      const parsed = JSON.parse(savedGoals);
      const filtered = parsed.filter((g: Goal) => !g.userId || g.userId === user.uid);
      const hydrated = filtered.map((g: any) => ({
        ...g,
        userId: g.userId ?? user.uid,
        createdAt: new Date(g.createdAt),
        updatedAt: new Date(g.updatedAt),
        deletedAt: g.deletedAt ? new Date(g.deletedAt) : undefined,
      }));

      setGoals(hydrated);

      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, JSON.stringify(hydrated));
      }
    } else {
      setGoals([]);
    }
    setLoading(false);
  }, [user]);

  const saveGoals = useCallback((newGoals: Goal[]) => {
    if (!user) return;
    localStorage.setItem(getStorageKey(user.uid), JSON.stringify(newGoals));
    setGoals(newGoals);
  }, [user]);

  const addGoal = useCallback(async (goalData: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('User not authenticated');

    const newGoal: Goal = {
      ...goalData,
      id: 'goal_' + Date.now(),
      userId: user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedGoals = [...goals, newGoal];
    saveGoals(updatedGoals);
  }, [user, goals, saveGoals]);

  const updateGoal = useCallback(async (goalId: string, updates: Partial<Goal>) => {
    if (!user) throw new Error('User not authenticated');

    const updatedGoals = goals.map(g => 
      g.id === goalId 
        ? { ...g, ...updates, updatedAt: new Date() }
        : g
    );
    saveGoals(updatedGoals);
  }, [user, goals, saveGoals]);

  const deleteGoal = useCallback(async (goalId: string) => {
    if (!user) throw new Error('User not authenticated');

    const updatedGoals = goals.map(g =>
      g.id === goalId ? { ...g, deletedAt: new Date(), updatedAt: new Date() } : g
    );
    saveGoals(updatedGoals);
  }, [user, goals, saveGoals]);

  return {
    goals,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
  };
}
