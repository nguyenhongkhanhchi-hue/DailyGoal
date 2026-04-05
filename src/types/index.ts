export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type ScheduleType = 'daily' | 'weekly' | 'specific';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  hasSubtasks?: boolean;
  scheduleType?: ScheduleType;
  specificDate?: string;
  weekDays?: number[];
  dependencies?: string[]; // IDs of goals that must be completed before this one
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface TimerSession {
  id: string;
  checklistItemId: string;
  date: string; // YYYY-MM-DD format
  startTime: number; // timestamp
  pauseTime?: number; // timestamp when paused
  resumeTime?: number; // timestamp when resumed
  endTime?: number; // timestamp when ended
  isRunning: boolean;
  totalPausedDuration: number; // total time paused in milliseconds
}

export interface FinancialTransaction {
  id: string;
  checklistItemId: string;
  date: string; // YYYY-MM-DD format
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category?: string;
  createdAt: Date;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  deadline?: string; // ISO date string (YYYY-MM-DD)
  reminderTime?: string; // HH:mm format
  timerSessions?: TimerSession[];
  financialTransactions?: FinancialTransaction[];
}

export interface DailyProgress {
  id: string;
  userId: string;
  goalId: string;
  date: string; // YYYY-MM-DD format
  completed: boolean;
  completedAt?: Date;
  checklist?: ChecklistItem[];
}

export interface DailyStats {
  date: string;
  totalGoals: number;
  completedGoals: number;
  completionRate: number;
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  dailyStats: DailyStats[];
  averageCompletion: number;
}

export interface MonthlyStats {
  month: string; // YYYY-MM format
  totalGoals: number;
  completedGoals: number;
  completionRate: number;
  dailyBreakdown: DailyStats[];
}

export type ViewMode = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type TabType = 'today' | 'stats' | 'settings' | 'plans';

// Plan: Cấp độ cao hơn Goal, chứa nhiều goals
export interface Plan {
  id: string;
  userId: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  goalIds: string[]; // IDs of goals in this plan
  isTrainingMode: boolean; // Bật chế độ rèn luyện
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Training Mode: Streak tracking và unlock conditions
export interface GoalStreak {
  goalId: string;
  currentStreak: number; // Số ngày/tuần liên tiếp hiện tại
  longestStreak: number;
  lastCompletedAt?: Date;
  streakHistory: StreakRecord[];
}

export interface StreakRecord {
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export interface UnlockCondition {
  type: 'streak' | 'goal_completed' | 'days_passed';
  targetGoalId?: string; // Goal cần đạt streak (nếu type='streak')
  requiredStreak?: number; // Số ngày/tuần cần đạt
  requiredGoalId?: string; // Goal cần hoàn thành (nếu type='goal_completed')
  requiredDays?: number; // Số ngày cần trôi qua (nếu type='days_passed')
}

export interface TrainingGoal {
  goalId: string;
  planId: string;
  order: number; // Thứ tự trong kế hoạch (1, 2, 3...)
  unlockConditions: UnlockCondition[]; // Điều kiện mở khóa
  isUnlocked: boolean;
  unlockedAt?: Date;
  minStreakToUnlock: number; // Số streak tối thiểu để mở khóa
  dependsOnGoalId?: string; // Goal phụ thuộc trước đó
}
