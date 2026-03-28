import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200/70 dark:border-gray-800/70 shadow-sm shadow-black/5">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            DailyGoal
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-8 h-8 rounded-full">
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-violet-600" />}
          </Button>
        </motion.div>
      </div>
    </header>
  );
}
