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

export type TabType = 'today' | 'stats' | 'settings';
