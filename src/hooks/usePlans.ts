import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import type { Plan, GoalStreak, TrainingGoal, DailyProgress } from '@/types';

export function usePlans() {
  const { user, guestMode } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [streaks, setStreaks] = useState<Record<string, GoalStreak>>({});
  const [trainingGoals, setTrainingGoals] = useState<Record<string, TrainingGoal>>({});
  const [loading, setLoading] = useState(true);

  // LocalStorage keys for guest mode
  const getStorageKey = useCallback((type: string) => {
    const userId = user?.uid || 'guest_user';
    return `dailygoal_${type}_${userId}`;
  }, [user]);

  // Load from localStorage (guest mode)
  useEffect(() => {
    if (user || guestMode) {
      const savedPlans = localStorage.getItem(getStorageKey('plans'));
      const savedStreaks = localStorage.getItem(getStorageKey('streaks'));
      const savedTrainingGoals = localStorage.getItem(getStorageKey('training_goals'));
      
      if (savedPlans) {
        try {
          const parsed = JSON.parse(savedPlans);
          setPlans(parsed.map((p: Plan) => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
            deletedAt: p.deletedAt ? new Date(p.deletedAt) : undefined,
          })));
        } catch (e) {
          console.error('Failed to parse plans', e);
        }
      }
      
      if (savedStreaks) {
        try {
          setStreaks(JSON.parse(savedStreaks));
        } catch (e) {
          console.error('Failed to parse streaks', e);
        }
      }
      
      if (savedTrainingGoals) {
        try {
          setTrainingGoals(JSON.parse(savedTrainingGoals));
        } catch (e) {
          console.error('Failed to parse training goals', e);
        }
      }
    }
  }, [user, guestMode, getStorageKey]);

  // Subscribe to Firestore (authenticated mode)
  useEffect(() => {
    if (!user || guestMode) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'plans'),
      where('userId', '==', user.uid),
      where('deletedAt', '==', null),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const plansData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          deletedAt: data.deletedAt?.toDate() || undefined,
        } as Plan;
      });
      setPlans(plansData);
      setLoading(false);
    }, (error) => {
      console.error('Plans subscription error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, guestMode]);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (plans.length > 0) {
      localStorage.setItem(getStorageKey('plans'), JSON.stringify(plans));
    }
    if (Object.keys(streaks).length > 0) {
      localStorage.setItem(getStorageKey('streaks'), JSON.stringify(streaks));
    }
    if (Object.keys(trainingGoals).length > 0) {
      localStorage.setItem(getStorageKey('training_goals'), JSON.stringify(trainingGoals));
    }
  }, [plans, streaks, trainingGoals, getStorageKey]);

  // Calculate streak for a goal based on progress
  const calculateStreak = useCallback((goalId: string, progress: DailyProgress[]) => {
    const today = new Date();
    const sortedProgress = progress
      .filter(p => p.goalId === goalId && p.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sortedProgress.length === 0) {
      return { currentStreak: 0, longestStreak: 0, lastCompletedAt: undefined };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    // Calculate current streak (consecutive days up to today or yesterday)
    for (let i = 0; i < sortedProgress.length; i++) {
      const progressDate = new Date(sortedProgress[i].date);
      const daysDiff = lastDate 
        ? Math.floor((lastDate.getTime() - progressDate.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((today.getTime() - progressDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 1) {
        currentStreak++;
      } else {
        break;
      }
      lastDate = progressDate;
    }

    // Calculate longest streak
    lastDate = null;
    for (const p of sortedProgress) {
      const progressDate = new Date(p.date);
      const daysDiff = lastDate 
        ? Math.floor((lastDate.getTime() - progressDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      if (daysDiff === 1 || daysDiff === 0) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
      lastDate = progressDate;
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return {
      currentStreak,
      longestStreak,
      lastCompletedAt: sortedProgress[0]?.completedAt,
    };
  }, []);

  // Update streaks based on progress
  const updateStreaks = useCallback((progress: DailyProgress[]) => {
    const goalIds = [...new Set(progress.map(p => p.goalId))];
    const newStreaks: Record<string, GoalStreak> = {};

    goalIds.forEach(goalId => {
      const streak = calculateStreak(goalId, progress);
      newStreaks[goalId] = {
        goalId,
        ...streak,
        streakHistory: progress
          .filter(p => p.goalId === goalId)
          .map(p => ({
            date: p.date,
            completed: p.completed,
          })),
      };
    });

    setStreaks(prev => ({ ...prev, ...newStreaks }));
  }, [calculateStreak]);

  // Check if a goal is unlocked in training mode
  const isGoalUnlocked = useCallback((goalId: string, _planId: string): boolean => {
    const trainingGoal = trainingGoals[goalId];
    if (!trainingGoal) return true; // Not in training mode
    
    // Check if already unlocked
    if (trainingGoal.isUnlocked) return true;

    // Check unlock conditions
    return trainingGoal.unlockConditions.every(condition => {
      switch (condition.type) {
        case 'streak': {
          if (!condition.targetGoalId || !condition.requiredStreak) return false;
          const targetStreak = streaks[condition.targetGoalId];
          return (targetStreak?.currentStreak || 0) >= condition.requiredStreak;
        }
        case 'goal_completed': {
          if (!condition.requiredGoalId) return false;
          // This would need progress data passed in
          return true; // Simplified for now
        }
        case 'days_passed': {
          if (!condition.requiredDays || !trainingGoal.dependsOnGoalId) return false;
          const prevGoal = trainingGoals[trainingGoal.dependsOnGoalId];
          if (!prevGoal?.unlockedAt) return false;
          const daysSince = Math.floor(
            (new Date().getTime() - prevGoal.unlockedAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysSince >= condition.requiredDays;
        }
        default:
          return false;
      }
    });
  }, [trainingGoals, streaks]);

  // Add a new plan
  const addPlan = useCallback(async (data: Omit<Plan, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => {
    const userId = user?.uid || 'guest_user';
    const planData = {
      ...data,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    if (user && !guestMode) {
      try {
        const docRef = await addDoc(collection(db, 'plans'), {
          ...planData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return docRef.id;
      } catch (error) {
        console.error('Error adding plan:', error);
        throw error;
      }
    } else {
      // Guest mode - localStorage only
      const newPlan = { ...planData, id: `plan_${Date.now()}`, deletedAt: undefined };
      setPlans(prev => [newPlan as Plan, ...prev]);
      return newPlan.id;
    }
  }, [user, guestMode]);

  // Update a plan
  const updatePlan = useCallback(async (planId: string, data: Partial<Plan>) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const updatedData = {
      ...data,
      updatedAt: new Date(),
    };

    if (user && !guestMode && !planId.startsWith('plan_')) {
      try {
        const planRef = doc(db, 'plans', planId);
        await updateDoc(planRef, {
          ...updatedData,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error updating plan:', error);
        throw error;
      }
    } else {
      // Guest mode or local plan
      setPlans(prev => prev.map(p => 
        p.id === planId ? { ...p, ...updatedData } as Plan : p
      ));
    }
  }, [plans, user, guestMode]);

  // Delete a plan
  const deletePlan = useCallback(async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    if (user && !guestMode && !planId.startsWith('plan_')) {
      try {
        const planRef = doc(db, 'plans', planId);
        await updateDoc(planRef, {
          deletedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error deleting plan:', error);
        throw error;
      }
    } else {
      // Guest mode - actually delete from localStorage
      setPlans(prev => prev.filter(p => p.id !== planId));
    }
  }, [plans, user, guestMode]);

  // Toggle training mode for a plan
  const toggleTrainingMode = useCallback(async (planId: string, enabled: boolean) => {
    await updatePlan(planId, { isTrainingMode: enabled });
    
    if (enabled) {
      // Initialize training goals when enabling training mode
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        const newTrainingGoals: Record<string, TrainingGoal> = {};
        plan.goalIds.forEach((goalId, index) => {
          const isFirstGoal = index === 0;
          newTrainingGoals[goalId] = {
            goalId,
            planId,
            order: index + 1,
            unlockConditions: isFirstGoal 
              ? [] // First goal is always unlocked
              : [{ 
                  type: 'streak', 
                  targetGoalId: plan.goalIds[index - 1],
                  requiredStreak: 7 // Require 7-day streak on previous goal
                }],
            isUnlocked: isFirstGoal,
            minStreakToUnlock: 7,
            dependsOnGoalId: isFirstGoal ? undefined : plan.goalIds[index - 1],
          };
        });
        setTrainingGoals(prev => ({ ...prev, ...newTrainingGoals }));
      }
    }
  }, [plans, updatePlan]);

  // Get goals for a plan ordered by training sequence
  const getOrderedPlanGoals = useCallback((planId: string, allGoals: any[]) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return [];

    if (plan.isTrainingMode) {
      // Return ordered by training order
      return plan.goalIds
        .map(goalId => {
          const goal = allGoals.find(g => g.id === goalId);
          const trainingGoal = trainingGoals[goalId];
          return goal ? { ...goal, trainingOrder: trainingGoal?.order || 999 } : null;
        })
        .filter(Boolean)
        .sort((a, b) => (a?.trainingOrder || 0) - (b?.trainingOrder || 0));
    }

    // Normal mode - return in order
    return plan.goalIds
      .map(goalId => allGoals.find(g => g.id === goalId))
      .filter(Boolean);
  }, [plans, trainingGoals]);

  return {
    plans,
    streaks,
    trainingGoals,
    loading,
    addPlan,
    updatePlan,
    deletePlan,
    toggleTrainingMode,
    updateStreaks,
    isGoalUnlocked,
    getOrderedPlanGoals,
  };
}
