import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Target, Mail, Lock, Chrome, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';

export function LoginPage() {
  const { loginWithPassword, registerWithPassword, loginWithGoogle, enableGuestMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Vui lòng nhập email và mật khẩu');
      return;
    }

    setIsLoading(true);
    try {
      const success = isRegistering
        ? await registerWithPassword(email, password)
        : await loginWithPassword(email, password);
      
      if (!success) {
        toast.error(isRegistering ? 'Đăng ký thất bại' : 'Email hoặc mật khẩu không đúng');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const success = await loginWithGoogle();
      if (!success) {
        toast.error('Đăng nhập Google thất bại');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <Card className="border-0 shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mb-4"
              >
                <Target className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                DailyGoal
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {isRegistering ? 'Tạo tài khoản mới' : 'Đăng nhập để đồng bộ'}
              </p>
            </div>

            {/* Google Sign In */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-12 mb-4 border-gray-300 hover:bg-gray-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Chrome className="w-5 h-5 text-red-500 mr-2" />
              )}
              <span>Đăng nhập với Google</span>
            </Button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">hoặc</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email..."
                  disabled={isLoading}
                  className="pl-10 h-12"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu..."
                  disabled={isLoading}
                  className="pl-10 h-12"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  isRegistering ? 'Đăng ký' : 'Đăng nhập'
                )}
              </Button>
            </form>

            {/* Toggle Register/Login */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm text-violet-600 hover:underline"
              >
                {isRegistering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
              </button>
            </div>

            {/* Continue without login */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="ghost"
                onClick={enableGuestMode}
                className="w-full text-gray-500 hover:text-gray-700"
              >
                <User className="w-4 h-4 mr-2" />
                Tiếp tục không đăng nhập
              </Button>
              <p className="text-xs text-gray-400 text-center mt-2">
                Dữ liệu chỉ lưu trên thiết bị này
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
