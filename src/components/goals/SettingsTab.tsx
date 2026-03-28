import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useGoals } from '@/hooks/useGoals';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Edit2, Target, Palette, LogOut } from 'lucide-react';
import type { Goal } from '@/types';

const iconOptions = [
  { id: 'droplets', emoji: '💧' },
  { id: 'book', emoji: '📚' },
  { id: 'dumbbell', emoji: '💪' },
  { id: 'moon', emoji: '🌙' },
  { id: 'sun', emoji: '☀️' },
  { id: 'heart', emoji: '❤️' },
  { id: 'star', emoji: '⭐' },
  { id: 'zap', emoji: '⚡' },
  { id: 'target', emoji: '🎯' },
];

const colorOptions = [
  { id: '#8b5cf6' },
  { id: '#ec4899' },
  { id: '#3b82f6' },
  { id: '#10b981' },
  { id: '#f59e0b' },
  { id: '#ef4444' },
  { id: '#06b6d4' },
  { id: '#84cc16' },
];

interface GoalFormData {
  title: string;
  icon: string;
  color: string;
  hasSubtasks: boolean;
}

export function SettingsTab() {
  const { logout } = useAuth();
  const { goals, loading, addGoal, updateGoal, deleteGoal } = useGoals();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    icon: 'target',
    color: '#8b5cf6',
    hasSubtasks: false,
  });

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setFormData({ title: '', icon: 'target', color: '#8b5cf6', hasSubtasks: false });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal.id);
    setFormData({
      title: goal.title,
      icon: goal.icon || 'target',
      color: goal.color || '#8b5cf6',
      hasSubtasks: goal.hasSubtasks || false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      if (editingGoal) {
        await updateGoal(editingGoal, formData);
      } else {
        await addGoal(formData);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleDelete = async (goalId: string) => {
    if (confirm('Xóa?')) {
      await deleteGoal(goalId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  const activeGoals = goals.filter(g => !g.deletedAt);

  return (
    <div className="space-y-4 pb-20">
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
        <Card className="border-0 shadow-md dark:bg-gray-800">
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Chưa có mục tiêu</p>
          </CardContent>
        </Card>
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Sửa' : 'Thêm'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tên</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ví dụ: Uống nước"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Icon
              </Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {iconOptions.map((icon) => (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: icon.id })}
                    className={`p-2 rounded-lg border-2 ${
                      formData.icon === icon.id
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <span className="text-xl">{icon.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Màu</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.id })}
                    className={`p-1 rounded-lg border-2 ${
                      formData.color === color.id ? 'border-gray-900' : 'border-transparent'
                    }`}
                  >
                    <div className="w-full h-8 rounded" style={{ backgroundColor: color.id }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasSubtasks"
                checked={formData.hasSubtasks}
                onChange={(e) => setFormData({ ...formData, hasSubtasks: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
              />
              <Label htmlFor="hasSubtasks" className="text-sm font-normal">
                Cho phép có việc con
              </Label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                Hủy
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" disabled={!formData.title.trim()}>
                {editingGoal ? 'Lưu' : 'Thêm'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
