import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGoals } from '@/hooks/useGoals';
import { useDailyProgress } from '@/hooks/useDailyProgress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Save, FolderOpen, Trash2 } from 'lucide-react';
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
  Timer,
  Edit2,
  Calendar,
  Bell,
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
const motivationalMessages = [
  "Cố lên, bạn đang làm rất tốt!",
  "Tiếp tục nào, thành công đang chờ bạn!",
  "Bạn thật tuyệt vời, đừng bỏ cuộc!",
  "Một bước nhỏ, thành công lớn!",
  "Bạn có thể làm được, tin vào bản thân!",
  "Thời gian trôi qua, bạn đang tiến bộ!",
  "Giữ vững phong độ, bạn sắp hoàn thành!",
  "Làm tốt lắm, hãy tiếp tục phát huy!",
];

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getTimeStatus = (deadline: string | undefined, currentDate: Date) => {
  if (!deadline) return null;
  const deadlineDate = new Date(deadline + 'T23:59:59');
  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
  
  const diffTime = deadlineDay.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { type: 'overdue', text: `Trễ ${Math.abs(diffDays)} ngày`, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' };
  } else if (diffDays === 0) {
    return { type: 'today', text: 'Hôm nay', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' };
  } else if (diffDays === 1) {
    return { type: 'tomorrow', text: 'Ngày mai', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' };
  } else {
    return { type: 'future', text: `Còn ${diffDays} ngày`, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' };
  }
};

const playTickSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    
    // Resume context if suspended (needed for some browsers)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // Tăng frequency và thay đổi type để có tiếng "tick" rõ ràng hơn
    oscillator.frequency.value = 1200;
    oscillator.type = 'square';
    
    // Tăng volume và tạo envelope ngắn gọn cho tiếng tick
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.05);
    
    oscillator.onended = () => {
      audioCtx.close();
    };
  } catch (e) {
    // Silent fail nếu audio không được hỗ trợ
  }
};

const speakAnnouncement = (elapsedSeconds: number) => {
  try {
    if (!('speechSynthesis' in window)) return;
    
    // Resume speech synthesis if suspended (important for inactive tabs)
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    let timeStr = '';
    if (minutes > 0) {
      timeStr = `${minutes} phút ${seconds} giây`;
    } else {
      timeStr = `${seconds} giây`;
    }
    
    const motivation = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    const message = `Bạn đã làm việc được ${timeStr}. ${motivation}`;
    
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    
    // Force voice selection
    const voices = window.speechSynthesis.getVoices();
    const vietnameseVoice = voices.find(v => v.lang.includes('vi'));
    if (vietnameseVoice) {
      utterance.voice = vietnameseVoice;
    }
    
    // Use a short silent audio to keep audio context alive
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.001; // Nearly silent
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.001);
        setTimeout(() => ctx.close(), 100);
      }
    } catch (e) {
      // Silent fail
    }
    
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    // Silent fail
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

export function TodayTab() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [followToday, setFollowToday] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { goals, loading: goalsLoading } = useGoals();
  const { progress, loading: progressLoading, toggleGoalCompletion, addChecklistItem, toggleChecklistItem, removeChecklistItem, updateChecklistItemText, updateChecklistItemDeadline, updateChecklistItemReminder } = useDailyProgress(selectedDate);
  const [showConfetti, setShowConfetti] = useState(false);
  const [orderGoalIds, setOrderGoalIds] = useState<string[]>([]);
  const [orderLoaded, setOrderLoaded] = useState(false);
  const [draggingGoalId, setDraggingGoalId] = useState<string | null>(null);
  const [openGoalIds, setOpenGoalIds] = useState<Record<string, boolean>>({});
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});
  const [newChecklistText, setNewChecklistText] = useState<Record<string, string>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemText, setEditItemText] = useState('');
  const [itemData, setItemData] = useState<Record<string, ItemData>>({});
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionGoalId, setTransactionGoalId] = useState<string | null>(null);
  const [transactionItemIndex, setTransactionItemIndex] = useState<number | null>(null);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDesc, setTransactionDesc] = useState('');
  const [transactionModalType, setTransactionModalType] = useState<'income' | 'expense'>('income');

  const formatNumberInput = (value: string): string => {
    const num = value.replace(/[^\d]/g, '');
    if (!num) return '';
    return parseInt(num, 10).toLocaleString('vi-VN');
  };

  const parseFormattedNumber = (value: string): number => {
    return parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
  };

  const saveChecklistTemplate = (goalId: string, name: string) => {
    const goal = goals.find(g => g.id === goalId);
    const goalProgress = progressByGoalId.get(goalId);
    const checklist = goalProgress?.checklist ?? [];
    
    const template = {
      goalTitle: goal?.title || '',
      checklist: checklist.map(item => ({ text: item.text, done: false })),
      createdAt: Date.now(),
    };
    
    const templates = JSON.parse(localStorage.getItem(`dailygoal_templates_${user?.uid}`) || '[]');
    templates.push({ id: `template_${Date.now()}`, goalId, name, ...template });
    localStorage.setItem(`dailygoal_templates_${user?.uid}`, JSON.stringify(templates));
    setTemplateName('');
    setSaveDialogOpen(false);
  };

  const loadChecklistTemplate = (goalId: string, template: any) => {
    template.checklist.forEach((item: any) => {
      addChecklistItem(goalId, item.text);
    });
    setLoadDialogOpen(false);
  };

  const deleteChecklistTemplate = (templateId: string) => {
    const templates = JSON.parse(localStorage.getItem(`dailygoal_templates_${user?.uid}`) || '[]');
    const filtered = templates.filter((t: any) => t.id !== templateId);
    localStorage.setItem(`dailygoal_templates_${user?.uid}`, JSON.stringify(filtered));
  };

  const getTemplatesForGoal = (goalId: string) => {
    return JSON.parse(localStorage.getItem(`dailygoal_templates_${user?.uid}`) || '[]').filter((t: any) => t.goalId === goalId);
  };

  // Timer functions
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

  // Update current time every second for live timer display (separate from audio)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Play tick sound every second for running timers
  useEffect(() => {
    const interval = setInterval(() => {
      Object.values(itemData).forEach((data) => {
        if (data.timerRunning) {
          playTickSound();
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [itemData]);

  // Voice announcements every 30 seconds for running timers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      Object.entries(itemData).forEach(([, data]) => {
        if (data.timerRunning) {
          const elapsed = now - data.timerStartTime + data.timerElapsedWhenPaused;
          const elapsedSeconds = Math.floor(elapsed / 1000);
          
          if (elapsedSeconds > 0 && elapsedSeconds % 30 === 0) {
            speakAnnouncement(elapsedSeconds);
          }
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [itemData]);

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
      
      const elapsed = now - data.timerStartTime + data.timerElapsedWhenPaused;
      const elapsedSeconds = Math.floor(elapsed / 1000);
      
      const costPerSecond = parseFloat(localStorage.getItem(`dailygoal_cost_per_second_${user?.uid}`) || '0');
      const timeCost = Math.round(costPerSecond * elapsedSeconds);
      
      const newTransactions = [...data.financialTransactions];
      if (timeCost > 0) {
        newTransactions.push({
          id: `tx_${now}`,
          type: 'expense',
          amount: timeCost,
          description: 'Chi phí thời gian',
          date: format(new Date(), 'yyyy-MM-dd'),
        });
      }
      
      return {
        ...prev,
        [itemIdKey]: {
          ...data,
          timerRunning: false,
          timerStartTime: 0,
          timerElapsedWhenPaused: 0,
          pauseTime: undefined,
          financialTransactions: newTransactions,
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
      setOrderLoaded(true);
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      setOrderGoalIds(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
    } catch {
      setOrderGoalIds([]);
    }
    setOrderLoaded(true);
  }, [orderStorageKey]);

  useEffect(() => {
    if (!orderStorageKey) return;
    localStorage.setItem(orderStorageKey, JSON.stringify(orderGoalIds));
  }, [orderGoalIds, orderStorageKey]);

  useEffect(() => {
    if (!orderLoaded) return;
    const activeIds = goalsForSelectedDate.map(g => g.id);
    setOrderGoalIds(prev => {
      const filtered = prev.filter(id => activeIds.includes(id));
      const appended = activeIds.filter(id => !filtered.includes(id));
      const next = [...filtered, ...appended];
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev;
      return next;
    });
  }, [goalsForSelectedDate, orderLoaded]);

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
    <div className="space-y-1 pb-20">
      {/* Date Navigator */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-6 w-6 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30">
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        
        <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
          <DialogTrigger asChild>
            <button type="button" className="flex-1 py-1 px-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-center text-xs font-medium">
              {isToday ? 'Hôm nay' : format(selectedDate, 'dd/MM', { locale: vi })}
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-sm mx-auto p-4 bg-white dark:bg-gray-900 rounded-xl">
            <CustomCalendar selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setFollowToday(format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')); setCalendarOpen(false); }} />
          </DialogContent>
        </Dialog>
        
        <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-6 w-6 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30">
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1.5 px-0.5">
        <Trophy className="w-3.5 h-3.5 text-violet-500" />
        <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" initial={{ width: 0 }} animate={{ width: `${totals.completionRate}%` }} transition={{ duration: 0.5 }} />
        </div>
        <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{totals.completedUnits}/{totals.totalUnits}</span>
      </div>

      {/* Goals List */}
      <div className="space-y-1.5">
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
          <AnimatePresence mode="sync">
            {orderedGoals.map((goal) => {
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  layout
                >
                  <Card 
                    className={`border-0 shadow-lg rounded-xl transition-all hover:shadow-xl active:scale-[0.99] group ${
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
                    <CardContent className="p-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => {
                            setDraggingGoalId(goal.id);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', goal.id);
                          }}
                          onDragEnd={() => setDraggingGoalId(null)}
                          className="text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                        <div 
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isCompleted ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500' : 'bg-gray-100 dark:bg-gray-700'
                          }`}
                        >
                          <IconComponent />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm break-words ${
                          isCompleted ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'
                        }`}>
                            {goal.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{doneCount}/{totalCount}</span>
                            {isCompleted && <span className="text-green-600">✓</span>}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setOpenGoalIds(prev => ({ ...prev, [goal.id]: !prev[goal.id] }))}
                          className={`h-7 w-7 ${isOpen ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400'} ${!goal.hasSubtasks ? 'hidden' : ''}`}
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleGoalCompletion(goal.id)}
                          className={`h-7 w-7 ${isCompleted ? 'text-violet-500' : 'text-gray-400'}`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </Button>
                      </div>

                      {isOpen && goal.hasSubtasks && (
                        <div className="mt-2 space-y-2">
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
                              ? currentTime - data.timerStartTime + data.timerElapsedWhenPaused
                              : data.timerElapsedWhenPaused;
                            
                            const itemTotalMoney = data.financialTransactions.reduce((acc, tx) => {
                              return acc + (tx.type === 'income' ? tx.amount : -tx.amount);
                            }, 0);
                            
                            const itemTotalTime = data.timerSessions.reduce((acc, session) => acc + (session.endTime ? session.endTime - session.startTime : 0), 0) 
                              + (data.timerRunning ? currentTime - data.timerStartTime + data.timerElapsedWhenPaused : data.timerElapsedWhenPaused);
                            
                            const isItemExpanded = expandedItemIds[itemIdKey] || false;
                            
                            return (
                              <div key={item.id} className={`rounded-xl shadow-lg transition-all ${isItemExpanded ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/60'}`}>
                                {/* Header Row - Always Visible */}
                                <div 
                                  className="flex items-center p-3 gap-3"
                                  onClick={() => setExpandedItemIds(prev => ({ ...prev, [itemIdKey]: !prev[itemIdKey] }))}
                                >
                                  <Checkbox
                                    checked={item.done}
                                    onCheckedChange={() => toggleChecklistItem(goal.id, item.id)}
                                    className="h-5 w-5 border-gray-300 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${item.done ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                                      {item.text}
                                    </p>
                                    {(() => {
                                      const timeStatus = getTimeStatus(item.deadline, selectedDate);
                                      if (!timeStatus || item.done) return null;
                                      return (
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${timeStatus.color}`}>
                                          {timeStatus.text}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                  {/* Stats - Right aligned */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    {itemTotalTime > 0 && (
                                      <span className="text-xs text-violet-600 font-mono bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded">
                                        ⏱ {formatTime(itemTotalTime)}
                                      </span>
                                    )}
                                    {itemTotalMoney !== 0 && (
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${itemTotalMoney >= 0 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20'}`}>
                                        {itemTotalMoney >= 0 ? '+' : ''}{formatCurrency(itemTotalMoney)}
                                      </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isItemExpanded ? 'rotate-180 text-violet-500' : ''}`} />
                                  </div>
                                </div>
                                
                                {isItemExpanded && (
                                  <div className="px-3 pb-3 space-y-2">
                                    {/* Timer Row - Controls only on same line */}
                                    <div className="flex items-center gap-2">
                                      <button onClick={(e) => { e.stopPropagation(); startTimer(goal.id, checklistIndex); }} disabled={data.timerRunning} className="px-2 py-1 bg-violet-500 text-white text-xs rounded-lg hover:bg-violet-600 disabled:opacity-50 shadow-sm">▶</button>
                                      <button onClick={(e) => { e.stopPropagation(); pauseTimer(goal.id, checklistIndex); }} disabled={!data.timerRunning} className="px-2 py-1 bg-yellow-500 text-white text-xs rounded-lg hover:bg-yellow-600 disabled:opacity-50 shadow-sm">⏸</button>
                                      <button onClick={(e) => { e.stopPropagation(); resumeTimer(goal.id, checklistIndex); }} disabled={data.timerRunning || !data.pauseTime} className="px-2 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 disabled:opacity-50 shadow-sm">▶▶</button>
                                      <button onClick={(e) => { e.stopPropagation(); stopTimer(goal.id, checklistIndex); }} disabled={!data.timerRunning && data.timerElapsedWhenPaused === 0} className="px-2 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 disabled:opacity-50 shadow-sm">⏹</button>
                                      <span className="text-sm font-mono text-violet-600 font-bold ml-1">{formatTime(elapsed)}</span>
                                    </div>
                                     
                                    {/* Financial Input - Opens Modal */}
                                    <button 
                                      type="button"
                                      onClick={(e) => { 
                                        e.stopPropagation();
                                        setTransactionGoalId(goal.id);
                                        setTransactionItemIndex(checklistIndex);
                                        setTransactionAmount('');
                                        setTransactionDesc('');
                                        setTransactionModalType('income');
                                        setTransactionModalOpen(true);
                                      }}
                                      className="w-full flex items-center justify-center gap-2 h-8 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs"
                                    >
                                      <span className="text-green-500">+</span>
                                      <span className="text-red-500">-</span>
                                      <span>Thu/Chi</span>
                                    </button>
                                    
                                    {/* Transaction Records */}
                                    {data.financialTransactions.length > 0 && (
                                      <div className="space-y-1">
                                        {data.financialTransactions.slice(-3).map((tx) => (
                                          <div key={tx.id} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800/50 rounded px-2 py-1">
                                            <span className="truncate flex-1 min-w-0 text-gray-600 dark:text-gray-400 mr-2">{tx.description}</span>
                                            <span className={`font-medium shrink-0 ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Timer Sessions Summary */}
                                    {(data.timerSessions.length > 0 || data.timerElapsedWhenPaused > 0) && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 bg-violet-50 dark:bg-violet-900/20 rounded-lg p-2">
                                        <div className="flex items-center justify-between">
                                          <span>Tổng thời gian: <span className="font-medium text-violet-600">{formatTime(itemTotalTime)}</span></span>
                                          <span className="text-gray-400">{data.timerSessions.length} phiên</span>
                                        </div>
                                        {data.timerSessions.length > 0 && (
                                          <div className="mt-1 text-gray-400 text-[10px]">
                                            {data.timerSessions.slice(-3).map((s) => (
                                              <div key={s.id} className="truncate">
                                                {format(new Date(s.startTime), 'HH:mm')} - {s.endTime ? format(new Date(s.endTime), 'HH:mm') : 'đang chạy'}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Edit/Delete Actions */}
                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                      {editingItemId === item.id ? (
                                        <>
                                          <Input
                                            value={editItemText}
                                            onChange={(e) => setEditItemText(e.target.value)}
                                            className="flex-1 h-8 text-sm"
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                updateChecklistItemText(goal.id, item.id, editItemText);
                                                setEditingItemId(null);
                                              }
                                              if (e.key === 'Escape') {
                                                setEditingItemId(null);
                                              }
                                            }}
                                          />
                                          <Button
                                            size="sm"
                                            className="h-8 px-2 bg-violet-500 text-white"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateChecklistItemText(goal.id, item.id, editItemText);
                                              setEditingItemId(null);
                                            }}
                                          >
                                            Lưu
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 px-2"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingItemId(null);
                                            }}
                                          >
                                            Hủy
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingItemId(item.id);
                                              setEditItemText(item.text);
                                            }}
                                            className="flex items-center gap-1 px-2 py-1 text-xs text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                            Sửa
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (confirm('Xóa việc con này?')) {
                                                removeChecklistItem(goal.id, item.id);
                                              }
                                            }}
                                            className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            Xóa
                                          </button>
                                        </>
                                      )}
                                    </div>

                                    {/* Deadline & Reminder Settings */}
                                    <div className="flex items-center gap-2 pt-2">
                                      <div className="flex items-center gap-1 flex-1">
                                        <Calendar className="w-3 h-3 text-gray-400" />
                                        <Input
                                          type="date"
                                          value={item.deadline || ''}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            updateChecklistItemDeadline(goal.id, item.id, e.target.value || undefined);
                                          }}
                                          className="h-7 text-xs flex-1"
                                          placeholder="Deadline"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                      <div className="flex items-center gap-1 flex-1">
                                        <Bell className="w-3 h-3 text-gray-400" />
                                        <Input
                                          type="time"
                                          value={item.reminderTime || ''}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            updateChecklistItemReminder(goal.id, item.id, e.target.value || undefined);
                                          }}
                                          className="h-7 text-xs flex-1"
                                          placeholder="Nhắc nhở"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                            {/* Add New Checklist Item Form */}
                          <div className="pt-1.5 mt-1.5 border-t border-dashed border-gray-200 dark:border-gray-700">
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const text = newChecklistText[goal.id] ?? '';
                                if (!text.trim()) return;
                                await addChecklistItem(goal.id, text);
                                setNewChecklistText(prev => ({ ...prev, [goal.id]: '' }));
                              }}
                            >
                              <div className="flex items-center gap-2 border-t-2 border-dashed border-gray-200 dark:border-gray-700 pt-3 mt-3">
                                <Input
                                  value={newChecklistText[goal.id] ?? ''}
                                  onChange={(e) => setNewChecklistText(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                  placeholder="+ Thêm việc con mới..."
                                  className="flex-1 h-8 text-sm bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-lg px-3"
                                />
                                {newChecklistText[goal.id]?.trim() && (
                                  <Button 
                                    type="submit" 
                                    className="h-8 px-3 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </form>
                            
                            {/* Save/Load Template - Show only icon */}
                            {checklist.length > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 text-gray-400 hover:text-violet-500"
                                      onClick={() => { setSaveDialogOpen(true); }}
                                    >
                                      <Save className="w-3 h-3" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-sm mx-auto">
                                    <DialogHeader>
                                      <DialogTitle>Lưu mẫu việc con</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-3">
                                      <Input
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        placeholder="Đặt tên mẫu..."
                                        className="h-9"
                                      />
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Sẽ lưu {checklist.length} việc con: {checklist.slice(0, 2).map(c => c.text).join(', ')}{checklist.length > 2 ? '...' : ''}
                                      </div>
                                      <Button 
                                        className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                        onClick={() => { if (templateName.trim()) saveChecklistTemplate(goal.id, templateName); }}
                                        disabled={!templateName.trim()}
                                      >
                                        Lưu
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                
                                <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 text-gray-400 hover:text-blue-500"
                                      onClick={() => { setLoadDialogOpen(true); }}
                                    >
                                      <FolderOpen className="w-3 h-3" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-sm mx-auto">
                                    <DialogHeader>
                                      <DialogTitle>Chọn mẫu việc con</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                      {getTemplatesForGoal(goal.id).length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-4">Chưa có mẫu nào được lưu</p>
                                      ) : (
                                        getTemplatesForGoal(goal.id).map((template: any) => (
                                          <div key={template.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium truncate">{template.name}</p>
                                              <p className="text-xs text-gray-500">{template.checklist.length} việc con</p>
                                            </div>
                                            <div className="flex gap-1">
                                              <Button
                                                size="sm"
                                                className="h-7 bg-violet-500 text-xs"
                                                onClick={() => loadChecklistTemplate(goal.id, template)}
                                              >
                                                Tải
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 text-red-500"
                                                onClick={() => deleteChecklistTemplate(template.id)}
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            )}
                          </div>
                          
                          {/* Goal Total Summary */}
                          {(() => {
                            let totalTime = 0;
                            let totalMoney = 0;
                            checklist.forEach((_, idx) => {
                              const itemKey = `${goal.id}-${idx}`;
                              const itemDataValue = itemData[itemKey];
                              if (itemDataValue) {
                                totalTime += itemDataValue.timerSessions.reduce((acc, session) => acc + (session.endTime ? session.endTime - session.startTime : 0), 0);
                                if (itemDataValue.timerRunning) {
                                  totalTime += currentTime - itemDataValue.timerStartTime + itemDataValue.timerElapsedWhenPaused;
                                } else {
                                  totalTime += itemDataValue.timerElapsedWhenPaused;
                                }
                                totalMoney += itemDataValue.financialTransactions.reduce((acc, tx) => acc + (tx.type === 'income' ? tx.amount : -tx.amount), 0);
                              }
                            });
                            return (totalTime > 0 || totalMoney !== 0) ? (
                              <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-gray-200 dark:border-gray-700 text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Tổng:</span>
                                <div className="flex items-center gap-1.5">
                                  {totalTime > 0 && (
                                    <span className="flex items-center gap-0.5 text-violet-600">
                                      <Timer className="w-2.5 h-2.5" />
                                      {formatTime(totalTime)}
                                    </span>
                                  )}
                                  {totalMoney !== 0 && (
                                    <span className={`font-medium ${totalMoney >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {totalMoney >= 0 ? '+' : ''}{formatCurrency(totalMoney)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : null;
                          })()}
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
      {/* Transaction Modal */}
      <Dialog open={transactionModalOpen} onOpenChange={setTransactionModalOpen}>
        <DialogContent className="max-w-sm mx-auto p-4 bg-white dark:bg-gray-900 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">Thu / Chi</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const amount = parseFormattedNumber(transactionAmount);
            const desc = transactionDesc.trim();
            if (amount > 0 && desc) {
              addFinancialTransaction(transactionGoalId!, transactionItemIndex!, transactionModalType, amount, desc);
              setTransactionModalOpen(false);
            }
          }} className="space-y-4">
            <div className="flex gap-1">
              <button 
                type="button"
                onClick={() => setTransactionModalType('income')}
                className={`flex-1 h-10 text-sm font-medium rounded-lg border transition-colors ${transactionModalType === 'income' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-300 dark:bg-gray-800 dark:border-gray-600'}`}
              >
                + Thu
              </button>
              <button 
                type="button"
                onClick={() => setTransactionModalType('expense')}
                className={`flex-1 h-10 text-sm font-medium rounded-lg border transition-colors ${transactionModalType === 'expense' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-300 dark:bg-gray-800 dark:border-gray-600'}`}
              >
                - Chi
              </button>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Số tiền</label>
              <Input 
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(formatNumberInput(e.target.value))}
                placeholder="0"
                className="h-10 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Mô tả</label>
              <Input 
                value={transactionDesc}
                onChange={(e) => setTransactionDesc(e.target.value)}
                placeholder="Nhập mô tả..."
                className="h-10 text-sm"
              />
            </div>
            <Button 
              type="submit" 
              className={`w-full h-10 text-sm font-medium ${transactionModalType === 'income' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              Lưu
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
