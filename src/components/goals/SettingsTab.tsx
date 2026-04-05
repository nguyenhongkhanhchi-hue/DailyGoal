import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useGoals } from '@/hooks/useGoals';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Edit2, Target, LogOut } from 'lucide-react';
import type { Goal, Dependency } from '@/types';

interface GoalFormData {
  title: string;
  icon: string;
  color: string;
  hasSubtasks: boolean;
  scheduleType: 'daily' | 'weekly' | 'specific';
  specificDate: string;
  weekDays: number[];
  dependencies: Dependency[];
}

const iconOptions = [
  { id: 'target', emoji: '🎯' },
  { id: 'water', emoji: '💧' },
  { id: 'book', emoji: '📚' },
  { id: 'dumbbell', emoji: '💪' },
  { id: 'moon', emoji: '🌙' },
  { id: 'sun', emoji: '☀️' },
  { id: 'heart', emoji: '❤️' },
  { id: 'star', emoji: '⭐' },
  { id: 'zap', emoji: '⚡' },
  { id: 'run', emoji: '🏃' },
  { id: 'sleep', emoji: '😴' },
  { id: 'food', emoji: '🍎' },
  { id: 'money', emoji: '💰' },
  { id: 'work', emoji: '💼' },
  { id: 'code', emoji: '💻' },
  { id: 'phone', emoji: '📱' },
  { id: 'music', emoji: '🎵' },
  { id: 'art', emoji: '🎨' },
  { id: 'camera', emoji: '📷' },
  { id: 'plane', emoji: '✈️' },
  { id: 'home', emoji: '🏠' },
  { id: 'car', emoji: '🚗' },
  { id: 'gift', emoji: '🎁' },
  { id: 'sport', emoji: '⚽' },
  { id: 'health', emoji: '🏥' },
  { id: 'school', emoji: '🏫' },
  { id: 'coffee', emoji: '☕' },
  { id: 'plant', emoji: '🌱' },
  { id: 'fire', emoji: '🔥' },
  { id: 'money2', emoji: '💵' },
];

const weekDaysOptions = [
  { value: 0, label: 'CN' },
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
];

export function SettingsTab() {
  const { user, logout } = useAuth();
  const { goals, loading, addGoal, updateGoal, deleteGoal } = useGoals();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    icon: 'target',
    color: '#8b5cf6',
    hasSubtasks: false,
    scheduleType: 'daily',
    specificDate: '',
    weekDays: [],
    dependencies: [],
  });
  
  const handleOpenAdd = () => {
    setEditingGoal(null);
    setFormData({
      title: '',
      icon: 'target',
      color: '#8b5cf6',
      hasSubtasks: false,
      scheduleType: 'daily',
      specificDate: '',
      weekDays: [],
      dependencies: [],
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal.id);
    setFormData({
      title: goal.title,
      icon: goal.icon || 'target',
      color: goal.color || '#8b5cf6',
      hasSubtasks: goal.hasSubtasks || false,
      scheduleType: goal.scheduleType || 'daily',
      specificDate: goal.specificDate || '',
      weekDays: goal.weekDays || [],
      dependencies: goal.dependencies || [],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit called, formData:', formData);
    if (!formData.title.trim()) {
      console.log('Title is empty, returning');
      return;
    }

    try {
      console.log('Calling addGoal with:', formData);
      if (editingGoal) {
        await updateGoal(editingGoal, formData);
        console.log('updateGoal success');
      } else {
        await addGoal(formData);
        console.log('addGoal success');
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving goal:', error);
      alert('Lỗi: ' + (error.message || 'Không thể lưu mục tiêu'));
    }
  };

  const handleDelete = async (goalId: string) => {
    if (confirm('Xóa?')) {
      await deleteGoal(goalId);
    }
  };

  // Export all data to JSON file
  
  if (loading) {
    return (
      <div className="space-y-4 pb-20">
        <div className="flex justify-between">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const activeGoals = goals.filter(g => !g.deletedAt);

  return (
    <div className="space-y-4 pb-20">
      {/* User Info */}
      {user && (
        <Card className="border-0 shadow-md bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-bold">
                  {user.email?.[0].toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.displayName || 'Người dùng'}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <div className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full">
                ✓ Đã đăng nhập
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="w-5 h-5 text-violet-500" />
          Mục tiêu ({activeGoals.length})
        </h3>
        <div className="flex gap-2">
          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            onClick={logout}
            size="sm"
            variant="outline"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Goals List */}
      {activeGoals.length === 0 ? (
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
              <p className="text-gray-400 dark:text-gray-500 text-sm">Nhấn nút + để tạo mục tiêu đầu tiên của bạn</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          {activeGoals.map((goal, index) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              layout
            >
              <Card className="border-0 shadow-md dark:bg-gray-800 group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${goal.color || '#8b5cf6'}20` }}
                    >
                      <span className="text-xl">
                        {iconOptions.find(i => i.id === goal.icon)?.emoji || '✨'}
                      </span>
                    </div>

                    <p className="flex-1 font-medium break-words">{goal.title}</p>

                    <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(goal)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(goal.id)}
                        className="h-8 w-8 text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      
      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0">
          <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 p-4 rounded-t-xl">
            <DialogTitle className="text-white text-lg font-semibold">
              {editingGoal ? 'Sửa mục tiêu' : 'Thêm mục tiêu mới'}
            </DialogTitle>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-5">
            {/* Preview */}
            <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-lg"
                style={{ backgroundColor: `${formData.color}20` }}
              >
                {iconOptions.find(i => i.id === formData.icon)?.emoji || '🎯'}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Tên mục tiêu</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formData.title || '...'}</p>
              </div>
              <div 
                className="px-3 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: formData.color }}
              >
                {formData.scheduleType === 'daily' ? 'Hàng ngày' : formData.scheduleType === 'weekly' ? 'Hàng tuần' : 'Ngày cụ thể'}
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tên mục tiêu</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ví dụ: Uống nước, Tập thể dục..."
                className="h-10 text-base"
              />
            </div>

            {/* Icon Grid */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Chọn biểu tượng</Label>
              <div className="grid grid-cols-6 gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                {iconOptions.map((icon) => (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: icon.id })}
                    className={`p-2 rounded-lg transition-all ${
                      formData.icon === icon.id
                        ? 'bg-violet-500 text-white shadow-md scale-110'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-xl">{icon.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lặp lại</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'daily', label: 'Hàng ngày', icon: '📅' },
                  { id: 'weekly', label: 'Hàng tuần', icon: '🔄' },
                  { id: 'specific', label: 'Ngày cụ thể', icon: '📆' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, scheduleType: option.id as any })}
                    className={`py-3 px-2 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                      formData.scheduleType === option.id
                        ? 'bg-violet-500 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-lg">{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Weekly Days */}
            {formData.scheduleType === 'weekly' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Chọn ngày trong tuần</Label>
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  {weekDaysOptions.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                    const dayValue = day.value;
                    setFormData(prev => ({
                      ...prev,
                      weekDays: prev.weekDays.includes(dayValue)
                        ? prev.weekDays.filter(d => d !== dayValue)
                        : [...prev.weekDays, dayValue].sort()
                    }));
                  }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.weekDays.includes(day.value)
                          ? 'bg-violet-500 text-white shadow'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Specific Date */}
            {formData.scheduleType === 'specific' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Chọn ngày</Label>
                <Input
                  type="date"
                  value={formData.specificDate}
                  onChange={(e) => setFormData({ ...formData, specificDate: e.target.value })}
                  className="h-10"
                />
              </div>
            )}

            {/* Has Subtasks */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <span className="text-lg">📋</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Việc con</p>
                <p className="text-xs text-gray-500">Cho phép thêm nhiều việc nhỏ</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, hasSubtasks: !formData.hasSubtasks })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  formData.hasSubtasks ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow ${
                  formData.hasSubtasks ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>

            {/* Dependencies Selection */}
            {activeGoals.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <span>🔗</span> Mục tiêu phụ thuộc
                </Label>
                <p className="text-xs text-gray-500">
                  Chọn mục tiêu hoặc việc con cần hoàn thành trước
                </p>
                
                {/* Hiển thị dependencies đã chọn */}
                {formData.dependencies && formData.dependencies.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-600">Đã chọn:</p>
                    <div className="flex flex-wrap gap-1">
                      {formData.dependencies.map((dep) => (
                        <span
                          key={dep.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs rounded-full"
                        >
                          {dep.type === 'goal' ? (
                            <>
                              <span>🎯</span>
                              <span>{dep.sourceGoalTitle || 'Mục tiêu'}</span>
                            </>
                          ) : (
                            <>
                              <span>📋</span>
                              <span>{dep.sourceItemText || 'Việc con'}</span>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                dependencies: formData.dependencies.filter(d => d.id !== dep.id)
                              });
                            }}
                            className="ml-1 text-violet-500 hover:text-violet-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Chọn dependency mới */}
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  {activeGoals
                    .filter(g => g.id !== editingGoal)
                    .map(goal => (
                      <div key={goal.id} className="space-y-1">
                        {/* Goal checkbox */}
                        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.dependencies?.some(d => d.type === 'goal' && d.sourceGoalId === goal.id) || false}
                            onChange={(e) => {
                              const deps = formData.dependencies || [];
                              if (e.target.checked) {
                                const newDep: Dependency = {
                                  id: `dep_${Date.now()}_${goal.id}`,
                                  type: 'goal',
                                  sourceGoalId: goal.id,
                                  sourceGoalTitle: goal.title
                                };
                                setFormData({ ...formData, dependencies: [...deps, newDep] });
                              } else {
                                setFormData({
                                  ...formData,
                                  dependencies: deps.filter(d => !(d.type === 'goal' && d.sourceGoalId === goal.id))
                                });
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                          />
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${goal.color || '#8b5cf6'}20` }}
                          >
                            <span className="text-sm">
                              {iconOptions.find(i => i.id === goal.icon)?.emoji || '✨'}
                            </span>
                          </div>
                          <span className="text-sm flex-1 font-medium">{goal.title}</span>
                          <span className="text-xs text-gray-400">🎯 Toàn bộ</span>
                        </label>
                        
                        {/* Checklist items của goal này */}
                        {goal.hasSubtasks && (
                          <div className="ml-8 space-y-1">
                            <p className="text-xs text-gray-400 mb-1">Hoặc chọn việc con:</p>
                            {/* Giả lập các checklist item mẫu - thực tế sẽ load từ progress */}
                            <div className="space-y-1">
                              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-xs">
                                <input
                                  type="checkbox"
                                  disabled
                                  className="w-3 h-3 rounded border-gray-300"
                                />
                                <span className="text-gray-400 italic">
                                  (Sẽ hiển thị việc con khi có dữ liệu)
                                </span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 h-10">
                Hủy
              </Button>
              <Button type="submit" className="flex-1 h-10 bg-gradient-to-r from-violet-500 to-fuchsia-500 font-medium" disabled={!formData.title.trim()}>
                {editingGoal ? 'Lưu' : 'Thêm'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

          </div>
  );
}
