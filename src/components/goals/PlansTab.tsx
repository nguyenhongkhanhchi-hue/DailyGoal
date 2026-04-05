import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Trophy, Lock, Unlock, Flame, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { usePlans } from '@/hooks/usePlans';
import { useGoals } from '@/hooks/useGoals';
import type { Plan } from '@/types';

const iconOptions = [
  { id: 'target', emoji: '🎯' },
  { id: 'dumbbell', emoji: '💪' },
  { id: 'flame', emoji: '🔥' },
  { id: 'trophy', emoji: '🏆' },
  { id: 'star', emoji: '⭐' },
  { id: 'rocket', emoji: '🚀' },
  { id: 'heart', emoji: '❤️' },
  { id: 'zap', emoji: '⚡' },
];

export function PlansTab() {
  const { plans, addPlan, updatePlan, deletePlan, toggleTrainingMode, streaks } = usePlans();
  const { goals } = useGoals();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formErrors, setFormErrors] = useState<{title?: string; goals?: string; trainingMode?: string}>({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: 'target',
    goalIds: [] as string[],
    isTrainingMode: false,
  });

  const validateForm = (): boolean => {
    const errors: {title?: string; goals?: string; trainingMode?: string} = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Vui lòng nhập tên kế hoạch';
    }
    
    if (formData.goalIds.length === 0) {
      errors.goals = 'Vui lòng chọn ít nhất 1 mục tiêu';
    }
    
    if (formData.isTrainingMode && formData.goalIds.length < 2) {
      errors.trainingMode = 'Chế độ rèn luyện cần ít nhất 2 mục tiêu để mở khóa lẫn nhau';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, formData);
      } else {
        await addPlan(formData);
      }

      setIsDialogOpen(false);
      setEditingPlan(null);
      setFormData({
        title: '',
        description: '',
        icon: 'target',
        goalIds: [],
        isTrainingMode: false,
      });
      setFormErrors({});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTraining = async (planId: string, checked: boolean) => {
    setIsToggling(planId);
    try {
      await toggleTrainingMode(planId, checked);
    } finally {
      setIsToggling(null);
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      title: plan.title,
      description: plan.description || '',
      icon: plan.icon || 'target',
      goalIds: plan.goalIds,
      isTrainingMode: plan.isTrainingMode,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    if (confirm('Bạn có chắc muốn xóa kế hoạch này?')) {
      await deletePlan(planId);
    }
  };

  const toggleGoalSelection = (goalId: string) => {
    setFormData(prev => ({
      ...prev,
      goalIds: prev.goalIds.includes(goalId)
        ? prev.goalIds.filter(id => id !== goalId)
        : [...prev.goalIds, goalId],
    }));
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-violet-500" />
            Kế Hoạch
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Quản lý kế hoạch dài hạn với chế độ rèn luyện
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-violet-500 hover:bg-violet-600">
              <Plus className="w-4 h-4 mr-1" />
              Tạo kế hoạch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Chỉnh sửa kế hoạch' : 'Tạo kế hoạch mới'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Tên kế hoạch</Label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="VD: Giảm cân thành công"
                  className={formErrors.title ? 'border-red-500' : ''}
                />
                {formErrors.title && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>
                )}
              </div>
              <div>
                <Label>Mô tả</Label>
                <Input
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả chi tiết..."
                />
              </div>
              <div>
                <Label>Biểu tượng</Label>
                <div className="flex gap-2 flex-wrap">
                  {iconOptions.map(icon => (
                    <button
                      key={icon.id}
                      type="button"
                      title={icon.id}
                      onClick={() => setFormData(prev => ({ ...prev, icon: icon.id }))}
                      className={`w-10 h-10 rounded-lg text-xl transition-all ${
                        formData.icon === icon.id
                          ? 'bg-violet-100 dark:bg-violet-900 ring-2 ring-violet-500'
                          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {icon.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Chọn mục tiêu ({formData.goalIds.length} đã chọn)</Label>
                <div className={`max-h-40 overflow-y-auto space-y-2 mt-2 border rounded-lg p-2 ${formErrors.goals ? 'border-red-500' : ''}`}>
                  {goals.filter(g => !g.deletedAt).map(goal => (
                    <label
                      key={goal.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.goalIds.includes(goal.id)}
                        onChange={() => toggleGoalSelection(goal.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{goal.title}</span>
                    </label>
                  ))}
                </div>
                {formErrors.goals && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.goals}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isTrainingMode}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, isTrainingMode: checked }))}
                />
                <Label className="cursor-pointer">
                  Bật chế độ rèn luyện (Training Mode)
                </Label>
              </div>
              {formErrors.trainingMode && (
                <p className="text-xs text-red-500">{formErrors.trainingMode}</p>
              )}
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                💡 Chế độ rèn luyện: Phải duy trì streak 7 ngày liên tiếp với mục tiêu trước để mở khóa mục tiêu tiếp theo
              </p>
              <Button 
                type="submit" 
                className="w-full bg-violet-500 hover:bg-violet-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang lưu...' : (editingPlan ? 'Lưu thay đổi' : 'Tạo kế hoạch')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plans List */}
      <div className="space-y-3">
        <AnimatePresence>
          {plans.map(plan => {
            const planGoals = goals.filter(goal => plan.goalIds.includes(goal.id));

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl flex-shrink-0">
                      {iconOptions.find(i => i.id === plan.icon)?.emoji || '🎯'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {plan.title}
                        </h3>
                        {plan.isTrainingMode && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs rounded-full font-medium">
                            <Flame className="w-3 h-3 inline mr-1" />
                            Rèn luyện
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {plan.description || `${planGoals.length} mục tiêu`}
                      </p>
                      
                      {/* Training Mode Status */}
                      {plan.isTrainingMode && planGoals.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {planGoals.map((goal, index) => {
                            const streak = streaks[goal.id]?.currentStreak || 0;
                            const isUnlocked = index === 0 || streak >= 7;
                            const isFirst = index === 0;
                            
                            return (
                              <div
                                key={goal.id}
                                className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                                  isUnlocked
                                    ? 'bg-green-50 dark:bg-green-900/20'
                                    : 'bg-gray-50 dark:bg-gray-800/50'
                                }`}
                              >
                                {isUnlocked ? (
                                  <Unlock className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Lock className="w-4 h-4 text-gray-400" />
                                )}
                                <span className={isUnlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
                                  {goal.title}
                                </span>
                                {!isFirst && (
                                  <span className="ml-auto text-xs text-amber-600 dark:text-amber-400">
                                    <Flame className="w-3 h-3 inline mr-1" />
                                    {streak}/7 ngày
                                  </span>
                                )}
                                {isFirst && (
                                  <span className="ml-auto text-xs text-green-600 dark:text-green-400">
                                    Đang rèn luyện
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Normal Mode Goals */}
                      {!plan.isTrainingMode && planGoals.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {planGoals.map(goal => (
                            <span
                              key={goal.id}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded-md text-gray-600 dark:text-gray-400"
                            >
                              {goal.title}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(plan)}
                          className="h-8 text-gray-500 hover:text-violet-600"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(plan.id)}
                          className="h-8 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Xóa
                        </Button>
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {plan.isTrainingMode ? 'Rèn luyện' : 'Thường'}
                          </span>
                          <Switch
                            checked={plan.isTrainingMode}
                            onCheckedChange={checked => handleToggleTraining(plan.id, checked)}
                            disabled={isToggling === plan.id}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {plans.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Chưa có kế hoạch nào
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Tạo kế hoạch để bắt đầu chế độ rèn luyện
            </p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 border-violet-100 dark:border-violet-800">
        <h4 className="font-medium text-violet-900 dark:text-violet-300 flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4" />
          Chế độ rèn luyện là gì?
        </h4>
        <p className="text-sm text-violet-700 dark:text-violet-400">
          Chế độ rèn luyện giúp bạn xây dựng thói quen từ từ. Bạn phải duy trì hoàn thành 
          mục tiêu đầu tiên trong 7 ngày liên tiếp để mở khóa mục tiêu tiếp theo. 
          Điều này giúp đảm bảo bạn thực sự thành thạo một thói quen trước khi thêm thói quen mới.
        </p>
      </Card>
    </div>
  );
}
