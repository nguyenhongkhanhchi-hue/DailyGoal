import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGoals } from '@/hooks/useGoals';
import { useDailyProgress } from '@/hooks/useDailyProgress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { CustomCalendar } from './CustomCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CheckCircle2, 
  Circle, 
  Trophy, 
  ChevronLeft,
  ChevronRight,
  Target,
  GripVertical,
  ChevronDown,
  Plus,
  X,
  Timer,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { format, addDays, subDays, endOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { DailyProgress } from '@/types';

const iconMap: Record<string, React.ElementType> = {
  droplets: () => <span className="text-xl">💧</span>,
  book: () => <span className="text-xl">📚</span>,
  dumbbell: () => <span className="text-xl">💪</span>,
  moon: () => <span className="text-xl">🌙</span>,
  sun: () => <span className="text-xl">☀️</span>,
  heart: () => <span className="text-xl">❤️</span>,
  star: () => <span className="text-xl">⭐</span>,
  zap: () => <span className="text-xl">⚡</span>,
  target: () => <span className="text-xl">🎯</span>,
  default: () => <span className="text-xl">✨</span>,
};

interface TimerSession {
  id: string;
  startTime: number;
  pauseTime?: number;
  resumeTime?: number;
  endTime?: number;
  isRunning: boolean;
}

interface FinancialTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
}

interface ItemData {
  timerSessions: TimerSession[];
  financialTransactions: FinancialTransaction[];
  timerRunning: boolean;
  timerStartTime: number;
  timerElapsedWhenPaused: number;
  pauseTime?: number;
}

// Helper functions
const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function TodayTab() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [followToday, setFollowToday] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { goals, loading: goalsLoading } = useGoals();
  const { progress, loading: progressLoading, toggleGoalCompletion, addChecklistItem, toggleChecklistItem, removeChecklistItem } = useDailyProgress(selectedDate);
  const [showConfetti, setShowConfetti] = useState(false);
  const [orderGoalIds, setOrderGoalIds] = useState<string[]>([]);
  const [draggingGoalId, setDraggingGoalId] = useState<string | null>(null);
  const [openGoalIds, setOpenGoalIds] = useState<Record<string, boolean>>({});
  const [newChecklistText, setNewChecklistText] = useState<Record<string, string>>({});
  const [itemData, setItemData] = useState<Record<string, ItemData>>({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for live timer display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load item data from localStorage
  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(`dailygoal_itemdata_${user.uid}`);
    if (stored) {
      try {
        setItemData(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse item data', e);
      }
    }
  }, [user]);

  // Save item data to localStorage
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`dailygoal_itemdata_${user.uid}`, JSON.stringify(itemData));
  }, [itemData, user]);

  // Timer functions
  const startTimer = (goalId: string, index: number) => {
    const itemIdKey = `${goalId}-${index}`;
    setItemData(prev => ({
      ...prev,
      [itemIdKey]: {
        ...(prev[itemIdKey] ?? { timerSessions: [], financialTransactions: [], timerRunning: false, timerStartTime: 0, timerElapsedWhenPaused: 0 }),
        timerRunning: true,
        timerStartTime: Date.now(),
      }
    }));
  };

  const pauseTimer = (goalId: string, index: number) => {
    const itemIdKey = `${goalId}-${index}`;
    setItemData(prev => {
      const data = prev[itemIdKey];
      if (!data || !data.timerRunning) return prev;
      const now = Date.now();
      return {
        ...prev,
        [itemIdKey]: {
          ...data,
          timerRunning: false,
          pauseTime: now,
          timerElapsedWhenPaused: now - data.timerStartTime + data.timerElapsedWhenPaused,
        }
      };
    });
  };

  const resumeTimer = (goalId: string, index: number) => {
    const itemIdKey = `${goalId}-${index}`;
    setItemData(prev => {
      const data = prev[itemIdKey];
      if (!data || data.timerRunning) return prev;
      return {
        ...prev,
        [itemIdKey]: {
          ...data,
          timerRunning: true,
          timerStartTime: Date.now(),
        }
      };
    });
  };

  const stopTimer = (goalId: string, index: number) => {
    const itemIdKey = `${goalId}-${index}`;
    setItemData(prev => {
      const data = prev[itemIdKey];
      if (!data) return prev;
      const now = Date.now();
      
      return {
        ...prev,
        [itemIdKey]: {
          ...data,
          timerRunning: false,
          timerStartTime: 0,
          timerElapsedWhenPaused: 0,
          pauseTime: undefined,
          timerSessions: [
            ...data.timerSessions,
            {
              id: `session_${now}`,
              startTime: data.timerStartTime,
              endTime: now,
              isRunning: false,
            }
          ]
        }
      };
    });
  };

  // Financial transaction functions
  const addFinancialTransaction = (goalId: string, index: number, type: 'income' | 'expense', amount: number, description: string) => {
    const itemIdKey = `${goalId}-${index}`;
    setItemData(prev => ({
      ...prev,
      [itemIdKey]: {
        ...(prev[itemIdKey] ?? { timerSessions: [], financialTransactions: [], timerRunning: false, timerStartTime: 0, timerElapsedWhenPaused: 0 }),
        financialTransactions: [
          ...(prev[itemIdKey]?.financialTransactions || []),
          {
            id: `tx_${Date.now()}`,
            type,
            amount,
            description,
            date: format(new Date(), 'yyyy-MM-dd'),
          }
        ]
      }
    }));
  };

  const removeFinancialTransaction = (goalId: string, index: number, transactionId: string) => {
    const itemIdKey = `${goalId}-${index}`;
    setItemData(prev => ({
      ...prev,
      [itemIdKey]: {
        ...prev[itemIdKey],
        financialTransactions: (prev[itemIdKey]?.financialTransactions || []).filter(tx => tx.id !== transactionId)
      }
    }));
  };

  useEffect(() => {
    if (!followToday) return;

    let timeoutId: number | undefined;

    const schedule = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timeoutId = window.setTimeout(() => {
        setSelectedDate(new Date());
        schedule();
      }, nextMidnight.getTime() - now.getTime() + 1000);
    };

    schedule();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [followToday]);

  const selectedDateKey = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  const currentWeekDay = selectedDate.getDay();
  
  const goalsForSelectedDate = useMemo(() => {
    const dayEnd = endOfDay(selectedDate);
    return goals.filter(g => {
      if (g.createdAt > dayEnd) return false;
      if (g.deletedAt && g.deletedAt <= dayEnd) return false;
      
      const scheduleType = g.scheduleType || 'daily';
      
      if (scheduleType === 'daily') return true;
      
      if (scheduleType === 'specific') {
        return g.specificDate === selectedDateKey;
      }
      
      if (scheduleType === 'weekly') {
        const weekDays = g.weekDays || [];
        return weekDays.includes(currentWeekDay);
      }
      
      return true;
    });
  }, [goals, selectedDate, selectedDateKey, currentWeekDay]);

  const progressByGoalId = useMemo(() => {
    const map = new Map<string, DailyProgress>();
    progress.filter(p => p.date === selectedDateKey).forEach(p => map.set(p.goalId, p));
    return map;
  }, [progress, selectedDateKey]);

  const orderStorageKey = useMemo(() => {
    if (!user) return null;
    return `dailygoal_today_order_${user.uid}_${selectedDateKey}`;
  }, [selectedDateKey, user]);

  useEffect(() => {
    if (!orderStorageKey) return;
    const saved = localStorage.getItem(orderStorageKey);
    if (!saved) {
      setOrderGoalIds([]);
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      setOrderGoalIds(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
    } catch {
      setOrderGoalIds([]);
    }
  }, [orderStorageKey]);

  useEffect(() => {
    if (!orderStorageKey) return;
    localStorage.setItem(orderStorageKey, JSON.stringify(orderGoalIds));
  }, [orderGoalIds, orderStorageKey]);

  useEffect(() => {
    const activeIds = goalsForSelectedDate.map(g => g.id);
    setOrderGoalIds(prev => {
      const filtered = prev.filter(id => activeIds.includes(id));
      const appended = activeIds.filter(id => !filtered.includes(id));
      const next = [...filtered, ...appended];
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev;
      return next;
    });
  }, [goalsForSelectedDate]);

  const orderedGoals = useMemo(() => {
    if (orderGoalIds.length === 0) return goalsForSelectedDate;
    const goalMap = new Map(goalsForSelectedDate.map(g => [g.id, g] as const));
    const ordered = orderGoalIds.map(id => goalMap.get(id)).filter(Boolean) as typeof goalsForSelectedDate;
    const remaining = goalsForSelectedDate.filter(g => !orderGoalIds.includes(g.id));
    return [...ordered, ...remaining];
  }, [goalsForSelectedDate, orderGoalIds]);

  const totals = useMemo(() => {
    let totalUnits = 0;
    let completedUnits = 0;

    goalsForSelectedDate.forEach(goal => {
      const goalProgress = progressByGoalId.get(goal.id);
      const checklist = goalProgress?.checklist ?? [];

      if (checklist.length > 0) {
        totalUnits += checklist.length;
        completedUnits += checklist.filter(i => i.done).length;
      } else {
        totalUnits += 1;
        completedUnits += goalProgress?.completed ? 1 : 0;
      }
    });

    const completionRate = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
    return { totalUnits, completedUnits, completionRate };
  }, [goalsForSelectedDate, progressByGoalId]);

  // Trigger confetti when 100% completed
  useEffect(() => {
    if (totals.completionRate === 100 && totals.totalUnits > 0 && !showConfetti) {
      setShowConfetti(true);
      
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#8b5cf6', '#ec4899', '#f59e0b', '#22c55e']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#8b5cf6', '#ec4899', '#f59e0b', '#22c55e']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      
      frame();
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6']
      });
    } else if (totals.completionRate < 100) {
      setShowConfetti(false);
    }
  }, [showConfetti, totals.completionRate, totals.totalUnits]);

  const handlePrevDay = () => {
    setFollowToday(false);
    setSelectedDate(prev => subDays(prev, 1));
  };
  const handleNextDay = () => {
    setFollowToday(false);
    setSelectedDate(prev => addDays(prev, 1));
  };
  const handleToday = () => {
    setFollowToday(true);
    setSelectedDate(new Date());
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  if (goalsLoading || progressLoading) {
    return (
      <div className="space-y-2 pb-20">
        <div className="h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 animate-pulse" />
        <div className="h-8 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 pb-20">
      {/* Date Navigator */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-7 w-7 text-violet-600 dark:text-violet-400">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
          <DialogTrigger asChild>
            <button type="button" className="flex-1 py-1.5 px-3 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-center text-sm font-medium shadow-md">
              {isToday ? 'Hôm nay' : format(selectedDate, 'EEEE, dd/MM', { locale: vi })}
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-sm mx-auto p-6 bg-white dark:bg-gray-900 rounded-2xl">
            <CustomCalendar selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setFollowToday(format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')); setCalendarOpen(false); }} />
          </DialogContent>
        </Dialog>
        
        <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-7 w-7 text-violet-600 dark:text-violet-400">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 px-1">
        <Trophy className="w-4 h-4 text-violet-500" />
        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" initial={{ width: 0 }} animate={{ width: `${totals.completionRate}%` }} transition={{ duration: 0.5 }} />
        </div>
        <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{totals.completedUnits}/{totals.totalUnits} · {totals.completionRate}%</span>
      </div>

      {/* Goals List */}
      <div className="space-y-2">
        {goalsForSelectedDate.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="border-0 shadow-md dark:bg-gray-800/80">
              <CardContent className="p-10 text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 flex items-center justify-center">
                    <Target className="w-10 h-10 text-violet-400" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </motion.div>
                </div>
                <p className="text-gray-600 dark:text-gray-300 font-medium text-lg mb-2">Chưa có mục tiêu nào</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">Vào mục Cài đặt để thêm mục tiêu đầu tiên của bạn</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {orderedGoals.map((goal, index) => {
              const goalProgress = progressByGoalId.get(goal.id);
              const checklist = goalProgress?.checklist ?? [];
              const doneCount = checklist.length > 0 ? checklist.filter(i => i.done).length : (goalProgress?.completed ? 1 : 0);
              const totalCount = checklist.length > 0 ? checklist.length : 1;
              const isCompleted = checklist.length > 0 ? doneCount === totalCount : Boolean(goalProgress?.completed);
              const isOpen = Boolean(openGoalIds[goal.id]);
              const IconComponent = iconMap[goal.icon || 'default'] || iconMap.default;

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <Card 
                    className={`border-0 shadow-md transition-all hover:shadow-lg active:scale-[0.99] group ${
                      isCompleted 
                        ? 'bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20' 
                        : 'dark:bg-gray-800 bg-white'
                    }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceId = draggingGoalId ?? e.dataTransfer.getData('text/plain');
                      if (!sourceId || sourceId === goal.id) return;
                      setOrderGoalIds(prev => {
                        const base = prev.length > 0 ? [...prev] : goalsForSelectedDate.map(g => g.id);
                        const without = base.filter(id => id !== sourceId);
                        const targetIndex = without.indexOf(goal.id);
                        if (targetIndex === -1) return base;
                        without.splice(targetIndex, 0, sourceId);
                        return without;
                      });
                      setDraggingGoalId(null);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => {
                            setDraggingGoalId(goal.id);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', goal.id);
                          }}
                          onDragEnd={() => setDraggingGoalId(null)}
                          className="text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        >
                          <GripVertical className="w-5 h-5" />
                        </button>
                        <div 
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isCompleted ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500' : 'bg-gray-100 dark:bg-gray-700'
                          }`}
                        >
                          <IconComponent />
                        </div>

                        <div className="flex-1">
                          <p className={`font-medium break-words ${
                          isCompleted ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {goal.title}
                        </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{doneCount}/{totalCount}</p>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setOpenGoalIds(prev => ({ ...prev, [goal.id]: !prev[goal.id] }))}
                          className={`h-9 w-9 ${isOpen ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400'} hover:bg-gray-100/60 dark:hover:bg-gray-700/40 ${!goal.hasSubtasks ? 'hidden' : ''}`}
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleGoalCompletion(goal.id)}
                          className="h-9 w-9 hover:bg-gray-100/60 dark:hover:bg-gray-700/40"
                        >
                          <motion.div
                            animate={{ scale: isCompleted ? 1.2 : 1 }}
                            transition={{ type: 'spring', stiffness: 400 }}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-6 h-6 text-violet-500" />
                            ) : (
                              <Circle className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                            )}
                          </motion.div>
                        </Button>
                      </div>

                      {isOpen && goal.hasSubtasks && (
                        <div className="mt-4 space-y-4">
                          {checklist.map((item, checklistIndex) => {
                            const itemIdKey = `${goal.id}-${checklistIndex}`;
                            const data = itemData[itemIdKey] ?? {
                              timerSessions: [],
                              financialTransactions: [],
                              timerRunning: false,
                              timerStartTime: 0,
                              timerElapsedWhenPaused: 0,
                            };
                            const elapsed = data.timerRunning
                                              ? Date.now() - data.timerStartTime + data.timerElapsedWhenPaused
                                              : data.timerElapsedWhenPaused;
                            
                            return (
                              <div key={item.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 flex items-center">
                                    <Checkbox
                                      checked={item.done}
                                      onCheckedChange={() => toggleChecklistItem(goal.id, item.id)}
                                      className="h-5 w-5 border-gray-300 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                                    />
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-baseline gap-2">
                                      <h3 className="font-medium text-gray-900 dark:text-gray-100 break-words">
                                        {item.text}
                                      </h3>
                                      <span className={`text-xs ${item.done ? 'text-gray-400 line-through' : 'text-gray-500'}`}>
                                        {item.done ? 'Hoàn thành' : 'Chưa làm'}
                                      </span>
                                    </div>
                                    
                                    {/* Timer Section */}
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                      <div className="flex items-center gap-2">
                                        <Timer className="w-4 h-4 text-violet-500" />
                                        <span className="font-mono">{formatTime(elapsed)}</span>
                                      </div>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => startTimer(goal.id, checklistIndex)}
                                          disabled={data.timerRunning}
                                          className="px-2 py-1 bg-violet-100 text-violet-800 text-xs rounded hover:bg-violet-200 disabled:opacity-50 dark:bg-violet-900/20 dark:text-violet-200 dark:hover:bg-violet-800/30"
                                        >
                                          Bắt đầu
                                        </button>
                                        <button
                                          onClick={() => pauseTimer(goal.id, checklistIndex)}
                                          disabled={!data.timerRunning}
                                          className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded hover:bg-yellow-200 disabled:opacity-50 dark:bg-yellow-900/20 dark:text-yellow-200 dark:hover:bg-yellow-800/30"
                                        >
                                          Tạm dừng
                                        </button>
                                        <button
                                          onClick={() => resumeTimer(goal.id, checklistIndex)}
                                          disabled={data.timerRunning || !data.pauseTime}
                                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded hover:bg-blue-200 disabled:opacity-50 dark:bg-blue-900/20 dark:text-blue-200 dark:hover:bg-blue-800/30"
                                        >
                                          Tiếp tục
                                        </button>
                                        <button
                                          onClick={() => stopTimer(goal.id, checklistIndex)}
                                          disabled={!data.timerRunning && data.timerElapsedWhenPaused === 0}
                                          className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-200 dark:hover:bg-red-800/30"
                                        >
                                          Kết thúc
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {/* Timer Sessions History */}
                                    {data.timerSessions.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1 text-sm">Lịch sử phiên</h4>
                                        <div className="space-y-1">
                                          {data.timerSessions.map((session, sessionIndex) => (
                                            <div key={sessionIndex} className="text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                                              <span>
                                                {formatDate(session.startTime)} - {session.endTime ? formatDate(session.endTime) : 'Đang chạy'}
                                              </span>
                                              <span className="font-mono">
                                                {formatDuration(session.endTime ? session.endTime - session.startTime : currentTime - session.startTime)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Financial Transactions Section */}
                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 text-sm">Thu/Chi</h4>
                                      {data.financialTransactions.length > 0 && (
                                        <div className="space-y-1 mb-2">
                                          {data.financialTransactions.map((tx) => (
                                            <div key={tx.id} className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-800/50 rounded text-sm">
                                              <span className={`w-5 h-5 rounded-full ${tx.type === 'income' ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-red-100 dark:bg-red-900/20 text-red-600'} flex items-center justify-center text-xs`}>
                                                {tx.type === 'income' ? '+' : '-'}
                                              </span>
                                              <span className="flex-1 text-gray-700 dark:text-gray-200 truncate">{tx.description}</span>
                                              <span className={`font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                              </span>
                                              <button
                                                onClick={() => removeFinancialTransaction(goal.id, checklistIndex, tx.id)}
                                                className="text-gray-400 hover:text-red-500"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <form
                                        className="flex gap-2"
                                        onSubmit={(e) => {
                                          e.preventDefault();
                                          const formData = new FormData(e.target);
                                          const type = formData.get('type') as 'income' | 'expense';
                                          const amount = parseFloat(formData.get('amount') as string);
                                          const description = formData.get('description') as string;
                                          
                                          if (isNaN(amount) || amount <= 0 || !description.trim()) return;
                                          
                                          addFinancialTransaction(goal.id, checklistIndex, type, amount, description);
                                          (e.target as HTMLFormElement).reset();
                                        }}
                                      >
                                        <select
                                          name="type"
                                          className="px-2 py-1 bg-white border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600"
                                        >
                                          <option value="income">Thu</option>
                                          <option value="expense">Chi</option>
                                        </select>
                                        <input
                                          name="amount"
                                          type="number"
                                          min="0"
                                          step="1000"
                                          placeholder="Số tiền"
                                          className="w-24 px-2 py-1 bg-white border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600"
                                        />
                                        <input
                                          name="description"
                                          type="text"
                                          placeholder="Mô tả"
                                          className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600"
                                        />
                                        <button
                                          type="submit"
                                          className="px-2 py-1 bg-violet-500 text-white rounded text-sm hover:bg-violet-600"
                                        >
                                          +
                                        </button>
                                      </form>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Add New Checklist Item Form */}
                          <form
                            className="pt-3 border-t border-dashed border-gray-200 dark:border-gray-600"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const text = newChecklistText[goal.id] ?? '';
                              if (!text.trim()) return;
                              await addChecklistItem(goal.id, text);
                              setNewChecklistText(prev => ({ ...prev, [goal.id]: '' }));
                            }}
                          >
                            <div className="flex gap-2">
                              <Input
                                value={newChecklistText[goal.id] ?? ''}
                                onChange={(e) => setNewChecklistText(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                placeholder="Thêm việc con..."
                                className="flex-1 h-9 text-sm"
                              />
                              <Button 
                                type="submit" 
                                size="sm"
                                className="h-9 bg-gradient-to-r from-violet-500 to-fuchsia-500"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </form>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* 100% Celebration */}
      {totals.completionRate === 100 && totals.totalUnits > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring' }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-400 to-orange-500 text-white">
            <CardContent className="p-4 text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              >
                <Trophy className="w-10 h-10 mx-auto mb-2" />
              </motion.div>
              <p className="text-lg font-bold">Hoàn thành! 🎉</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
