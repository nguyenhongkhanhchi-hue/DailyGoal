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
import type { ChecklistItem, DailyProgress } from '@/types';
import { format, subDays } from 'date-fns';

const LEGACY_STORAGE_KEY = 'dailygoal_progress';

export function useDailyProgress(date: Date = new Date()) {
  const { user, guestMode } = useAuth();
  const [progress, setProgress] = useState<DailyProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrated, setMigrated] = useState(false);

  const dateString = format(date, 'yyyy-MM-dd');
  const userId = user?.uid || 'guest_user';
  
  // Get localStorage key for guest mode
  const getStorageKey = useCallback(() => {
    return `${LEGACY_STORAGE_KEY}_${userId}`;
  }, [userId]);

  // Load from localStorage - always try to load first as backup
  useEffect(() => {
    const savedProgress = localStorage.getItem(getStorageKey());
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setProgress(parsed);
      } catch (e) {
        console.error('Failed to parse progress from localStorage', e);
      }
    }
    setLoading(false);
  }, [getStorageKey]);

  const createChecklistItemId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Subscribe to Firestore progress (only for authenticated users)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'progress'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const progressData: DailyProgress[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        progressData.push({
          id: docSnap.id,
          ...data,
          userId: data.userId,
          completedAt: data.completedAt?.toDate() || undefined,
          checklist: Array.isArray(data.checklist) ? data.checklist : undefined,
        } as DailyProgress);
      });
      // Only update from Firestore if there are actual results
      // Otherwise keep existing progress (from localStorage)
      if (progressData.length > 0) {
        setProgress(progressData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Migration from localStorage
  useEffect(() => {
    if (!user || migrated || progress.length > 0) return;

    const migrateData = async () => {
      const savedProgress = localStorage.getItem(`${LEGACY_STORAGE_KEY}_${user.uid}`) ?? 
                           localStorage.getItem(LEGACY_STORAGE_KEY);
      
      if (!savedProgress) {
        setMigrated(true);
        return;
      }

      try {
        const parsed = JSON.parse(savedProgress);
        const batch = writeBatch(db);
        let count = 0;

        parsed.forEach((p: any) => {
          if ((!p.userId || p.userId === user.uid) && count < 500) {
            const progressRef = doc(collection(db, 'progress'));
            batch.set(progressRef, {
              ...p,
              id: progressRef.id,
              userId: user.uid,
            });
            count++;
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
  }, [user, migrated, progress.length]);

  const saveProgress = useCallback(async (_newProgress: DailyProgress[]) => {
    if (!user) return;
    // Firestore realtime subscription sẽ tự cập nhật state
    // Hàm này giữ lại để tương thích với code cũ nếu cần
  }, [user]);

  // Auto-copy overdue checklist items from yesterday to today
  useEffect(() => {
    if (!user || loading) return;

    const yesterdayString = format(subDays(date, 1), 'yyyy-MM-dd');
    
    // Find yesterday's progress with overdue checklist items (has deadline but not done)
    const yesterdayProgress = progress.filter(p => 
      p.date === yesterdayString && 
      p.userId === user.uid &&
      p.checklist && 
      p.checklist.some(item => item.deadline && !item.done)
    );

    if (yesterdayProgress.length === 0) return;

    // Check if today's progress already exists for these goals
    const todayProgress = progress.filter(p => p.date === dateString);
    const todayGoalIds = new Set(todayProgress.map(p => p.goalId));

    let hasChanges = false;
    const newProgressItems: DailyProgress[] = [];

    yesterdayProgress.forEach(yesterday => {
      if (todayGoalIds.has(yesterday.goalId)) {
        // Today's progress exists, check if we need to add overdue items
        const todayGoalProgress = todayProgress.find(p => p.goalId === yesterday.goalId);
        const todayChecklistIds = new Set((todayGoalProgress?.checklist || []).map(c => c.id));
        
        const overdueItems = yesterday.checklist!.filter(item => 
          item.deadline && !item.done && !todayChecklistIds.has(item.id)
        );

        if (overdueItems.length > 0) {
          // Add overdue items to today's checklist
          hasChanges = true;
          const updatedTodayProgress: DailyProgress = {
            ...todayGoalProgress!,
            checklist: [...(todayGoalProgress?.checklist || []), ...overdueItems],
          };
          newProgressItems.push(updatedTodayProgress);
        }
      } else {
        // No progress for today, create new with only overdue items
        const overdueItems = yesterday.checklist!.filter(item => item.deadline && !item.done);
        if (overdueItems.length > 0) {
          hasChanges = true;
          newProgressItems.push({
            id: 'progress_' + Date.now() + '_' + yesterday.goalId,
            userId: user.uid,
            goalId: yesterday.goalId,
            date: dateString,
            checklist: overdueItems,
            completed: false,
          });
        }
      }
    });

    if (hasChanges) {
      // Update progress with new items
      const updatedProgress = [...progress];
      newProgressItems.forEach(newItem => {
        const existingIndex = updatedProgress.findIndex(
          p => p.goalId === newItem.goalId && p.date === newItem.date
        );
        if (existingIndex >= 0) {
          updatedProgress[existingIndex] = newItem;
        } else {
          updatedProgress.push(newItem);
        }
      });
      saveProgress(updatedProgress);
    }
  }, [dateString, user, loading, progress, saveProgress]);

  const upsertProgressForGoalAndDate = useCallback(async (goalId: string, updater: (current: DailyProgress | undefined) => DailyProgress) => {
    const existing = progress.find(p => p.goalId === goalId && p.date === dateString);
    const next = updater(existing);
    
    // Update local state
    setProgress(prev => {
      const index = prev.findIndex(p => p.goalId === goalId && p.date === dateString);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = next;
        return updated;
      }
      return [...prev, next];
    });
    
    // Always save to localStorage as backup (regardless of auth status)
    {
      const savedProgress = localStorage.getItem(getStorageKey());
      const parsed = savedProgress ? JSON.parse(savedProgress) : [];
      const index = parsed.findIndex((p: DailyProgress) => p.goalId === goalId && p.date === dateString);
      if (index >= 0) {
        parsed[index] = next;
      } else {
        parsed.push(next);
      }
      localStorage.setItem(getStorageKey(), JSON.stringify(parsed));
    }
    
    // Save to Firestore if authenticated (and not guest mode)
    if (user && !guestMode) {
      const progressRef = doc(db, 'progress', next.id);
      await setDoc(progressRef, {
        ...next,
        userId: user.uid,
        updatedAt: serverTimestamp(),
      });
    }
  }, [dateString, progress, user, guestMode, getStorageKey]);

  const computeCompletionFromChecklist = (checklist: ChecklistItem[] | undefined) => {
    if (!checklist || checklist.length === 0) return { completed: false, completedAt: undefined as Date | undefined };
    const completed = checklist.every(i => i.done);
    return { completed, completedAt: completed ? new Date() : undefined };
  };

  const toggleGoalCompletion = useCallback(async (goalId: string) => {
    upsertProgressForGoalAndDate(goalId, (current) => {
      const currentChecklist = current?.checklist;
      const hasChecklist = Array.isArray(currentChecklist) && currentChecklist.length > 0;

      if (hasChecklist) {
        const shouldCompleteAll = !current?.completed;
        const nextChecklist = currentChecklist.map(i => ({ ...i, done: shouldCompleteAll }));
        const nextCompletion = computeCompletionFromChecklist(nextChecklist);
        return {
          id: current?.id ?? 'progress_' + Date.now(),
          userId: userId,
          goalId,
          date: dateString,
          checklist: nextChecklist,
          ...nextCompletion,
        };
      }

      const nextCompleted = !(current?.completed ?? false);
      return {
        id: current?.id ?? 'progress_' + Date.now(),
        userId: userId,
        goalId,
        date: dateString,
        checklist: current?.checklist,
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date() : undefined,
      };
    });
  }, [upsertProgressForGoalAndDate, userId, dateString]);

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
    const trimmed = text.trim();
    if (!trimmed) return;

    upsertProgressForGoalAndDate(goalId, (current) => {
      const nextChecklist = [...(current?.checklist ?? []), { id: createChecklistItemId(), text: trimmed, done: false, createdAt: Date.now() }];
      const nextCompletion = computeCompletionFromChecklist(nextChecklist);
      return {
        id: current?.id ?? 'progress_' + Date.now(),
        userId: userId,
        goalId,
        date: dateString,
        checklist: nextChecklist,
        ...nextCompletion,
      };
    });
  }, [createChecklistItemId, dateString, upsertProgressForGoalAndDate, userId]);

  const toggleChecklistItem = useCallback(async (goalId: string, itemId: string) => {
    upsertProgressForGoalAndDate(goalId, (current) => {
      const currentChecklist = current?.checklist ?? [];
      const nextChecklist = currentChecklist.map(i => (i.id === itemId ? { ...i, done: !i.done } : i));
      const nextCompletion = computeCompletionFromChecklist(nextChecklist);
      return {
        id: current?.id ?? 'progress_' + Date.now(),
        userId: userId,
        goalId,
        date: dateString,
        checklist: nextChecklist,
        ...nextCompletion,
      };
    });
  }, [dateString, upsertProgressForGoalAndDate, userId]);

  const removeChecklistItem = useCallback(async (goalId: string, itemId: string) => {
    upsertProgressForGoalAndDate(goalId, (current) => {
      const currentChecklist = current?.checklist ?? [];
      const nextChecklist = currentChecklist.filter(i => i.id !== itemId);
      const nextCompletion = computeCompletionFromChecklist(nextChecklist);
      return {
        id: current?.id ?? 'progress_' + Date.now(),
        userId: userId,
        goalId,
        date: dateString,
        checklist: nextChecklist.length > 0 ? nextChecklist : [],
        ...nextCompletion,
      };
    });
  }, [dateString, upsertProgressForGoalAndDate, userId]);

  const updateChecklistItemText = useCallback(async (goalId: string, itemId: string, newText: string) => {
    const trimmed = newText.trim();
    if (!trimmed) return;

    upsertProgressForGoalAndDate(goalId, (current) => {
      const currentChecklist = current?.checklist ?? [];
      const nextChecklist = currentChecklist.map(i => (i.id === itemId ? { ...i, text: trimmed } : i));
      const nextCompletion = computeCompletionFromChecklist(nextChecklist);
      return {
        id: current?.id ?? 'progress_' + Date.now(),
        userId: userId,
        goalId,
        date: dateString,
        checklist: nextChecklist,
        ...nextCompletion,
      };
    });
  }, [dateString, upsertProgressForGoalAndDate, userId]);

  const updateChecklistItemDeadline = useCallback(async (goalId: string, itemId: string, deadline: string | undefined) => {
    upsertProgressForGoalAndDate(goalId, (current) => {
      const currentChecklist = current?.checklist ?? [];
      const nextChecklist = currentChecklist.map(i => (i.id === itemId ? { ...i, deadline } : i));
      return {
        id: current?.id ?? 'progress_' + Date.now(),
        userId: userId,
        goalId,
        date: dateString,
        checklist: nextChecklist,
        completed: current?.completed ?? false,
        completedAt: current?.completedAt,
      };
    });
  }, [dateString, upsertProgressForGoalAndDate, userId]);

  const updateChecklistItemReminder = useCallback(async (goalId: string, itemId: string, reminderTime: string | undefined) => {
    upsertProgressForGoalAndDate(goalId, (current) => {
      const currentChecklist = current?.checklist ?? [];
      const nextChecklist = currentChecklist.map(i => (i.id === itemId ? { ...i, reminderTime } : i));
      return {
        id: current?.id ?? 'progress_' + Date.now(),
        userId: userId,
        goalId,
        date: dateString,
        checklist: nextChecklist,
        completed: current?.completed ?? false,
        completedAt: current?.completedAt,
      };
    });
  }, [dateString, upsertProgressForGoalAndDate, userId]);

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
    updateChecklistItemText,
    updateChecklistItemDeadline,
    updateChecklistItemReminder,
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

    const q = query(
      collection(db, 'progress'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const progressData: DailyProgress[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        progressData.push({
          id: docSnap.id,
          ...data,
          userId: data.userId,
          completedAt: data.completedAt?.toDate() || undefined,
          checklist: Array.isArray(data.checklist) ? data.checklist : undefined,
        } as DailyProgress);
      });
      
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      
      const filtered = progressData.filter((p: DailyProgress) => 
        p.date >= startStr && p.date <= endStr
      );
      
      setHistory(filtered);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, startDate, endDate]);

  return { history, loading };
}
