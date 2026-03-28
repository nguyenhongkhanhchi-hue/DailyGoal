import { motion } from 'framer-motion';
import { CalendarDays, BarChart3, Settings } from 'lucide-react';
import type { TabType } from '@/types';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: typeof CalendarDays }[] = [
  { id: 'today', label: 'Hôm nay', icon: CalendarDays },
  { id: 'stats', label: 'Thống kê', icon: BarChart3 },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-t border-gray-200/70 dark:border-gray-800/70 safe-area-pb z-50 shadow-[0_-1px_0_0_rgba(0,0,0,0.04)]">
      <div className="max-w-lg mx-auto flex justify-around items-center h-[4.5rem]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center w-full h-full transition-colors duration-300 ${
                isActive 
                  ? 'text-violet-600 dark:text-violet-400' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-12 h-0.5 bg-violet-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              
              <motion.div
                animate={{ 
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -2 : 0 
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Icon className="w-6 h-6" />
              </motion.div>
              
              <span className={`text-xs mt-1 font-medium ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
