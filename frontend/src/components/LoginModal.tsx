import { useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { Lock, User, UserPlus, LogIn } from 'lucide-react';

interface LoginModalProps {
  onSuccess: () => void;
}

export const LoginModal = ({ onSuccess }: LoginModalProps) => {
  const [isRegister, setIsRegister] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // Для регистрации добавим имя (по желанию)
  const [firstName, setFirstName] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        // 1. Регистрируем пользователя
        await api.post('/auth/register/', { 
          username, 
          password,
          first_name: firstName 
        });
        // 2. Сразу же логиним его (получаем токены)
        const loginRes = await api.post('/token/', { username, password });
        localStorage.setItem('access_token', loginRes.data.access);
        localStorage.setItem('refresh_token', loginRes.data.refresh);
        onSuccess();
      } else {
        // Обычный логин
        const response = await api.post('/token/', { username, password });
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        onSuccess();
      }
    } catch (err: any) {
      if (isRegister) {
        // Djoser отдает ошибки в виде объекта полей
        const data = err.response?.data;
        if (data?.username) setError(`Логин: ${data.username[0]}`);
        else if (data?.password) setError(`Пароль: ${data.password[0]}`);
        else setError('Ошибка при регистрации. Возможно, логин уже занят.');
      } else {
        setError(err.response?.data?.detail || 'Неверный логин или пароль');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-8 relative overflow-hidden">
        
        {/* Декоративная полоса сверху */}
        <div className={`absolute top-0 left-0 w-full h-1.5 ${isRegister ? 'bg-emerald-500' : 'bg-blue-600'}`} />

        <div className="text-center mb-6 mt-2">
          <h2 className="text-2xl font-bold text-slate-800">
            {isRegister ? 'Регистрация' : 'Вход в PMBOK Tracker'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isRegister ? 'Создай аккаунт для работы с проектами' : 'Авторизуйся для продолжения работы'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Логин
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                placeholder="Например: admin"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Имя (Опционально)
              </label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="Как к тебе обращаться?"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-2 py-2.5 text-white font-medium rounded-lg shadow transition disabled:opacity-50 text-sm cursor-pointer flex justify-center items-center gap-2 ${
              isRegister ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Обработка...' : isRegister ? (
              <><UserPlus size={18} /> Создать аккаунт</>
            ) : (
              <><LogIn size={18} /> Войти в систему</>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </div>
    </div>
  );
};