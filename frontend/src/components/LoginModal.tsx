import { useState, FormEvent } from 'react';
import { api } from '../api/client';
import { Kanban, LogIn, UserPlus, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  onSuccess: () => void;
}

export const LoginModal = ({ onSuccess }: LoginModalProps) => {
  const [isLogin, setIsLogin] = useState(true);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState(''); // Новое поле для регистрации
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Логика ВХОДА (замени URL на тот, что у тебя работает для логина, 
        // обычно это /auth/token/ или /auth/jwt/create/)
        const res = await api.post('/token/', { 
          username, 
          password 
        });
        localStorage.setItem('access_token', res.data.access);
        localStorage.setItem('refresh_token', res.data.refresh);
        onSuccess();
      } else {
        // Логика РЕГИСТРАЦИИ
        if (password !== passwordConfirm) {
          setError('Пароли не совпадают. Проверь ввод.');
          setLoading(false);
          return;
        }

        // Отправляем расширенный payload (password2 нужен для твоего сериализатора)
        await api.post('/auth/register/', { 
          username, 
          password,
          password2: passwordConfirm // Djoser или твой кастомный сериализатор ждет это поле
        });
        
        // Если всё ок — переключаем на логин
        setIsLogin(true);
        setSuccessMsg('Регистрация прошла успешно! Теперь войди по этим данным.');
        setPassword('');
        setPasswordConfirm('');
      }
    } catch (err: any) {
      console.error('Auth Error Payload:', err.response?.data);
      
      // Вытаскиваем и красиво форматируем ошибку от Django
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'object') {
          // Превращаем объект {"username": ["Уже занят"], "password": ["Слишком короткий"]} в строку
          const errorText = Object.entries(data)
            .map(([key, value]) => `${key.toUpperCase()}: ${Array.isArray(value) ? value[0] : value}`)
            .join(' | ');
          setError(errorText || 'Ошибка валидации (400)');
        } else {
          setError('Внутренняя ошибка сервера');
        }
      } else {
        setError('Не удалось подключиться к серверу');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        
        <div className="bg-blue-600 p-8 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Kanban size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">PMBOK Tracker</h2>
          <p className="text-blue-100 text-sm mt-2 font-medium">Профессиональное управление</p>
        </div>

        <div className="p-8">
          {/* Блок вывода ошибок с бэкенда */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs font-semibold">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Блок вывода успешной регистрации */}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-semibold text-center">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Имя пользователя (Логин)</label>
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                placeholder="Например: admin"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Пароль</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                placeholder="Минимум 8 символов"
              />
            </div>

            {/* Показываем подтверждение пароля только при регистрации */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Подтвердите пароль</label>
                <input
                  required
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="Повторите пароль"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 mt-2 disabled:opacity-50"
            >
              {loading ? (
                'Обработка...'
              ) : isLogin ? (
                <><LogIn size={18} /> Войти в систему</>
              ) : (
                <><UserPlus size={18} /> Создать аккаунт</>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
            >
              {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войти'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};