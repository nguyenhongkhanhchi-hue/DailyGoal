import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGoals } from '@/hooks/useGoals';
import { useProgressHistory } from '@/hooks/useDailyProgress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { TrendingUp, Target, CheckCircle2, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, endOfDay } from 'date-fns';
import type { ViewMode } from '@/types';

type ChartType = 'bar' | 'line' | 'area';

export function StatsTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const { goals } = useGoals();

  const { startDate, endDate, label } = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return { startDate: currentDate, endDate: currentDate, label: format(currentDate, 'dd/MM') };
      case 'week':
        return {
          startDate: startOfWeek(currentDate, { weekStartsOn: 1 }),
          endDate: endOfWeek(currentDate, { weekStartsOn: 1 }),
          label: `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM')}-${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM')}`
        };
      case 'month':
        return { startDate: startOfMonth(currentDate), endDate: endOfMonth(currentDate), label: format(currentDate, 'MM/yyyy') };
      case 'quarter': {
        const q = Math.floor(currentDate.getMonth() / 3);
        return {
          startDate: new Date(currentDate.getFullYear(), q * 3, 1),
          endDate: new Date(currentDate.getFullYear(), q * 3 + 3, 0),
          label: `Q${q + 1}`
        };
      }
      case 'year':
        return { startDate: new Date(currentDate.getFullYear(), 0, 1), endDate: new Date(currentDate.getFullYear(), 11, 31), label: `${currentDate.getFullYear()}` };
      default:
        return { startDate: currentDate, endDate: currentDate, label: '' };
    }
  }, [viewMode, currentDate]);

  const { history } = useProgressHistory(startDate, endDate);

  const stats = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    const dailyData = days.map(day => {
      const dayEnd = endOfDay(day);
      const dateStr = format(day, 'yyyy-MM-dd');
      const activeGoals = goals.filter(g => g.createdAt <= dayEnd && (!g.deletedAt || g.deletedAt > dayEnd));
      const activeGoalIdSet = new Set(activeGoals.map(g => g.id));
      const completed = history.filter(h => h.date === dateStr && h.completed && activeGoalIdSet.has(h.goalId)).length;
      const total = activeGoals.length;
      return {
        day: format(day, 'dd'),
        completed,
        total,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    const totals = dailyData.reduce(
      (acc, d) => {
        return {
          completed: acc.completed + d.completed,
          total: acc.total + d.total,
          sumRate: acc.sumRate + d.rate,
          sumRateWithGoals: acc.sumRateWithGoals + (d.total > 0 ? d.rate : 0),
          daysWithGoals: acc.daysWithGoals + (d.total > 0 ? 1 : 0),
        };
      },
      { completed: 0, total: 0, sumRate: 0, sumRateWithGoals: 0, daysWithGoals: 0 }
    );
    const averageRate = totals.daysWithGoals > 0 ? Math.round(totals.sumRateWithGoals / totals.daysWithGoals) : 0;

    return { dailyData, averageRate, totalCompletedGoals: totals.completed, totalPossibleGoals: totals.total };
  }, [history, goals, startDate, endDate]);

  const pieData = useMemo(() => {
    const completed = stats.totalCompletedGoals;
    const total = stats.totalPossibleGoals;
    return [
      { name: 'Xong', value: completed, color: '#8b5cf6' },
      { name: 'Chưa', value: total - completed, color: '#e5e7eb' },
    ];
  }, [stats.totalCompletedGoals, stats.totalPossibleGoals]);

  const handlePrev = () => {
    switch (viewMode) {
      case 'day': setCurrentDate(prev => subDays(prev, 1)); break;
      case 'week': setCurrentDate(prev => subDays(prev, 7)); break;
      case 'month': setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)); break;
      case 'quarter': setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 3, 1)); break;
      case 'year': setCurrentDate(prev => new Date(prev.getFullYear() - 1, 0, 1)); break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'day': setCurrentDate(prev => subDays(prev, -1)); break;
      case 'week': setCurrentDate(prev => subDays(prev, -7)); break;
      case 'month': setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)); break;
      case 'quarter': setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 3, 1)); break;
      case 'year': setCurrentDate(prev => new Date(prev.getFullYear() + 1, 0, 1)); break;
    }
  };

  const renderChart = () => {
    const props = { data: stats.dailyData, margin: { top: 10, right: 10, left: -20, bottom: 0 } };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...props}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" domain={[0, 100]} />
            <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: number) => [`${v}%`, '']} />
            <Line type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart {...props}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" domain={[0, 100]} />
            <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: number) => [`${v}%`, '']} />
            <Area type="monotone" dataKey="rate" stroke="#8b5cf6" fill="url(#grad)" strokeWidth={2} />
            <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
          </AreaChart>
        );
      default:
        return (
          <BarChart {...props}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" domain={[0, 100]} />
            <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: number) => [`${v}%`, '']} />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
          </BarChart>
        );
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* View Mode */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="day">Ngày</TabsTrigger>
          <TabsTrigger value="week">Tuần</TabsTrigger>
          <TabsTrigger value="month">Tháng</TabsTrigger>
          <TabsTrigger value="quarter">Quý</TabsTrigger>
          <TabsTrigger value="year">Năm</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Date Nav */}
      <Card className="border-0 shadow-md dark:bg-gray-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={handlePrev}><ChevronLeft className="w-5 h-5" /></Button>
            <span className="font-medium">{label}</span>
            <Button variant="ghost" size="icon" onClick={handleNext}><ChevronRight className="w-5 h-5" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-md bg-gradient-to-br from-violet-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <TrendingUp className="w-5 h-5 mb-1" />
            <p className="text-3xl font-bold">{stats.averageRate}%</p>
            <p className="text-sm text-white/70">Trung bình</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white">
          <CardContent className="p-4">
            <CheckCircle2 className="w-5 h-5 mb-1" />
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{stats.totalCompletedGoals}</p>
              <p className="text-sm text-white/70">/ {stats.totalPossibleGoals}</p>
            </div>
            <p className="text-sm text-white/70">Mục tiêu</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-0 shadow-lg dark:bg-gray-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-500" />
              Biểu đồ
            </CardTitle>
            <div className="flex gap-1">
              {(['bar', 'line', 'area'] as ChartType[]).map(t => (
                <Button key={t} variant={chartType === t ? 'default' : 'ghost'} size="sm" onClick={() => setChartType(t)} className="h-8 w-8 p-0">
                  {t === 'bar' ? <BarChart3 className="w-4 h-4" /> : t === 'line' ? <TrendingUp className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card className="border-0 shadow-lg dark:bg-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-violet-500" />
            Tổng quan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
