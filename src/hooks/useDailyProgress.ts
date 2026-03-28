import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { ChecklistItem, DailyProgress } from '@/types';
import { format } from 'date-fns';

const LEGACY_STORAGE_KEY = 'dailygoal_progress';
const getStorageKey = (userId: string) => `${LEGACY_STORAGE_KEY}_${userId}`;

export function useDailyProgress(date: Date = new Date()) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<DailyProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const dateString = format(date, 'yyyy-MM-dd');

  const createChecklistItemId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `item_${Date.now()}`;
  };

  useEffect(() => {
    if (!user) {
      setProgress([]);
      setLoading(false);
      return;
    }

    const storageKey = getStorageKey(user.uid);
    const savedProgress = localStorage.getItem(storageKey) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (savedProgress) {
      const parsed = JSON.parse(savedProgress);
      const filtered = parsed.filter((p: DailyProgress) => !p.userId || p.userId === user.uid);
      const hydrated = filtered.map((p: any) => ({
        ...p,
        userId: p.userId ?? user.uid,
        completedAt: p.completedAt ? new Date(p.completedAt) : undefined,
        checklist: Array.isArray(p.checklist) ? p.checklist : undefined,
      }));

      setProgress(hydrated);

      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, JSON.stringify(hydrated));
      }
    } else {
      setProgress([]);
    }
    setLoading(false);
  }, [user, dateString]);

  const saveProgress = useCallback((newProgress: DailyProgress[]) => {
    if (!user) return;
    localStorage.setItem(getStorageKey(user.uid), JSON.stringify(newProgress));
    setProgress(newProgress);
  }, [user]);

  const upsertProgressForGoalAndDate = useCallback((goalId: string, updater: (current: DailyProgress | undefined) => DailyProgress) => {
    const existing = progress.find(p => p.goalId === goalId && p.date === dateString);
    const next = updater(existing);
    const withoutExisting = progress.filter(p => !(p.goalId === goalId && p.date === dateString));
    saveProgress([...withoutExisting, next]);
  }, [dateString, progress, saveProgress]);

  const computeCompletionFromChecklist = (checklist: ChecklistItem[] | undefined) => {
    if (!checklist || checklist.length === 0) return { completed: false, completedAt: undefined as Date | undefined };
    const completed = checklist.every(i => i.done);
    return { completed, completedAt: completed ? new Date() : undefined };
  };

  const toggleGoalCompletion = useCallback(async (goalId: string) => {
    if (!user) throw new Error('User not authenticated');

    upsertProgressForGoalAndDate(goalId, (current) => {
      const currentChecklist = current?.checklist;
      const hasChecklist = Array.isArray(currentChecklist) && currentChecklist.length > 0;

      if (hasChecklist) {
        const shouldCompleteAll = !current?.completed;
        const nextChecklist = currentChecklist.map(i => ({ ...i, done: shouldCompleteAll }));
        const nextCompletion = computeCompletionFromChecklist(nextChecklist);
        return {
          id: current?.id ?? 'progress_' + Date.now(),
          userId: user.uid,
          goalId,
          date: dateString,
          checklist: nextChecklist,
          ...nextCompletion,
        };
      }

      const nextCompleted = !(current?.completed ?? false);
      return {
        id: current?.id ?? 'progress_' + Date.now(),
        userId: user.uid,
        goalId,
        date: dateString,
        checklist: current?.checklist,
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date() : undefined,
      };
    });
  }, [upsertProgressForGoalAndDate, user]);

  const getProgressForGoal = useCallback((goalId: string): boolean => {
    return progress.find(p => p.goalId === goalId && p.date === dateString)?.completed || false;
  }, [progress, dateString]);

  const getCompletionRate = useCallback((totalGoals: number): number => {
    if (totalGoals === 0) return 0;
    const completed = progress.filter(p => p.date === dateString && p.completed).length;
    return Math.round((completed / totalGoals) * 100);
  }, [progress, dateString]);

  const getChecklistForGoal = useCallback((goalId: string): ChecklistItem[] => {
    const checklist = progress.find(p => p.goalId === goalId && p.date === dateString)?.checklist;
    return Array.isArray(checklist) ? checklist : [];
  }, [progress, dateString]);

  const addChecklistItem = useCallback(async (goalId: string, text: string) => {
    if (!user) throw new Error('User not authenticated');
    const trimmed = text.trim();
    if (!trimmed) return;

    upsertProgressForGoalAndDate(goalId, (current) => {
      const nextChecklist = [...(current?.checklist ?? []), { id: createChecklistItemId(), text: trimmed, done: false, createdAt: Date.now() }];
      const nextCompletion = computeCompletionFromChecklist(nextChecklist);
      return {
        id: current?.id ?? 'progress_' + Date.now(),
        userId: user.uid,
        goalId,
        date: dateString,
        checklist: nextChecklist,
        ...nextCompletion,
      };
    });
  }, [createChecklistItemId, dateString, upsertProgressForGoalAndDate, user]);

  const toggleChecklistItem = useCallback(async (goalId: string, itemId: string) => {
    if (!user) throw new Error('User not authenticated');

    upsertProgressForGoalAndDate(goalId, (current) => {
      const currentChecklist = current?.checklist ?? [];
      const nextChecklist = currentChecklist.map(i => (i.id === itemId ? { ...i, done: !i.done } : i));
      const nextCompletion = computeCompletionFromChecklist(nextChecklist);
      return {
        id: current?.id ?? 'progress_' + Date.now(),
        userId: user.uid,
        goalId,
        date: dateString,
        checklist: nextChecklist,
        ...nextCompletion,
      };
    });
  }, [dateString, upsertProgressForGoalAndDate, user]);

  const removeChecklistItem = useCallback(async (goalId: string, itemId: string) => {
    if (!user) throw new Error('User not authenticated');

    upsertProgressForGoalAndDate(goalId, (current) => {
      const currentChecklist = current?.checklist ?? [];
      const nextChecklist = currentChecklist.filter(i => i.id !== itemId);
      const nextCompletion = computeCompletionFromChecklist(nextChecklist);
      return {
        id: current?.id ?? 'progress_' + Date.now(),
        userId: user.uid,
        goalId,
        date: dateString,
        checklist: nextChecklist.length > 0 ? nextChecklist : [],
        ...nextCompletion,
      };
    });
  }, [dateString, upsertProgressForGoalAndDate, user]);

  return {
    progress,
    loading,
    toggleGoalCompletion,
    getProgressForGoal,
    getCompletionRate,
    getChecklistForGoal,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
  };
}

// Hook for getting progress history
export function useProgressHistory(startDate: Date, endDate: Date) {
  const { user } = useAuth();
  const [history, setHistory] = useState<DailyProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const storageKey = getStorageKey(user.uid);
    const savedProgress = localStorage.getItem(storageKey) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (savedProgress) {
      const parsed = JSON.parse(savedProgress);
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      
      const filtered = parsed.filter((p: DailyProgress) => 
        (!p.userId || p.userId === user.uid) && p.date >= startStr && p.date <= endStr
      );
      
      setHistory(filtered.map((p: any) => ({
        ...p,
        userId: p.userId ?? user.uid,
        completedAt: p.completedAt ? new Date(p.completedAt) : undefined,
        checklist: Array.isArray(p.checklist) ? p.checklist : undefined,
      })));
      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, JSON.stringify(filtered));
      }
    }
    setLoading(false);
  }, [user, startDate, endDate]);

  return { history, loading };
}
