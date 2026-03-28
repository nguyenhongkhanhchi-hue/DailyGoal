import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGoals } from '@/hooks/useGoals';
import { useDailyProgress } from '@/hooks/useDailyProgress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CheckCircle2, 
  Circle, 
  Trophy, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Target,
  GripVertical,
  ChevronDown,
  Plus,
  X
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
  const goalsForSelectedDate = useMemo(() => {
    const dayEnd = endOfDay(selectedDate);
    return goals.filter(g => g.createdAt <= dayEnd && (!g.deletedAt || g.deletedAt > dayEnd));
  }, [goals, selectedDate]);

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
      
      // Multiple confetti bursts
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
      
      // Big burst in center
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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Date Navigator */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevDay}
              className="text-white/80 hover:text-white hover:bg-white/20"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-center hover:opacity-90 active:opacity-100 focus:outline-none"
                >
                  <p className="text-sm text-white/80">
                    {isToday ? 'Hôm nay' : format(selectedDate, 'EEE', { locale: vi })}
                  </p>
                  <p className="text-lg font-bold">
                    {format(selectedDate, 'dd/MM')}
                  </p>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <CalendarPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (!d) return;
                    setSelectedDate(d);
                    const nextIsToday = format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                    setFollowToday(nextIsToday);
                    setCalendarOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextDay}
              className="text-white/80 hover:text-white hover:bg-white/20"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {!isToday && (
            <Button
              onClick={handleToday}
              variant="secondary"
              size="sm"
              className="w-full mt-3 bg-white/20 text-white hover:bg-white/30 border-0"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Hôm nay
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      <Card className="border-0 shadow-lg dark:bg-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-violet-500" />
              <span className="font-medium">{totals.completedUnits}/{totals.totalUnits}</span>
            </div>
            <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
              {totals.completionRate}%
            </span>
          </div>
          
          <div className="relative">
            <Progress value={totals.completionRate} className="h-3 bg-gray-100 dark:bg-gray-700" />
            <motion.div
              className="absolute top-0 left-0 h-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              initial={{ width: 0 }}
              animate={{ width: `${totals.completionRate}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Goals List */}
      <div className="space-y-3">
        {goalsForSelectedDate.length === 0 ? (
          <Card className="border-0 shadow-md dark:bg-gray-800">
            <CardContent className="p-8 text-center">
              <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Chưa có mục tiêu cho ngày này</p>
            </CardContent>
          </Card>
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
                        <div className="mt-3 space-y-2 rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-white/50 dark:bg-gray-900/30 p-3">
                          {checklist.map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={item.done}
                                onCheckedChange={() => toggleChecklistItem(goal.id, item.id)}
                              />
                              <span className={`flex-1 text-sm break-words ${item.done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                {item.text}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-gray-400 hover:text-red-500"
                                onClick={() => removeChecklistItem(goal.id, item.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}

                          <form
                            className="flex gap-2 pt-1"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const text = newChecklistText[goal.id] ?? '';
                              await addChecklistItem(goal.id, text);
                              setNewChecklistText(prev => ({ ...prev, [goal.id]: '' }));
                            }}
                          >
                            <Input
                              value={newChecklistText[goal.id] ?? ''}
                              onChange={(e) => setNewChecklistText(prev => ({ ...prev, [goal.id]: e.target.value }))}
                              placeholder="Thêm checklist..."
                              className="h-9"
                            />
                            <Button type="submit" size="sm" className="h-9 bg-gradient-to-r from-violet-500 to-fuchsia-500">
                              <Plus className="w-4 h-4" />
                            </Button>
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
