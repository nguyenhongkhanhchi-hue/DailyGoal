export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  hasSubtasks?: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
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
