import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PWAUpdatePromptProps {
  needRefresh: boolean;
  onUpdate: () => Promise<void>;
}

export function PWAUpdatePrompt({ needRefresh, onUpdate }: PWAUpdatePromptProps) {
  if (!needRefresh) return null;

  return (
    <div className="fixed top-16 left-4 right-4 z-50 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl shadow-xl p-4 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">Có phiên bản mới!</p>
          <p className="text-xs text-white/80">Bấm cập nhật để có tính năng mới nhất</p>
        </div>
        <Button
          onClick={onUpdate}
          size="sm"
          className="bg-white text-violet-600 hover:bg-white/90 font-medium shadow-lg"
        >
          Cập nhật
        </Button>
      </div>
    </div>
  );
}
