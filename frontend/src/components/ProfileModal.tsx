import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { X, UserX, AlertTriangle, ShieldAlert } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const ProfileModal = ({ isOpen, onClose, onLogout }: ProfileModalProps) => {
  const [user, setUser] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.get('/auth/me/')
        .then(res => setUser(res.data))
        .catch(() => setError('Не удалось загрузить данные профиля'));
      setPassword('');
      setError(null);
    }
  }, [isOpen]);

  const handleDeleteAccount = async () => {
    if (!password) {
      setError('Для удаления аккаунта необходимо ввести текущий пароль.');
      return;
    }
    
    if (!window.confirm('Это действие необратимо. Все связи с задачами останутся, но твой аккаунт будет стерт. Уверен?')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      // Djoser требует current_password для удаления профиля
      await api.delete('/auth/me/', {
        data: { current_password: password }
      });
      // Если удаление прошло успешно, выкидываем из системы
      onLogout();
    } catch (err: any) {
      const detail = err.response?.data?.current_password?.[0] || 'Неверный пароль или ошибка сервера.';
      setError(`Ошибка: ${detail}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        
        {/* Шапка */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <ShieldAlert size={20} className="text-slate-600" />
            Настройки профиля
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Контент */}
        <div className="p-6 space-y-6">
          {/* Инфа о юзере */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Текущий пользователь</p>
            <p className="text-lg font-semibold text-slate-800">
              {user ? (user.first_name ? `${user.first_name} (${user.username})` : user.username) : 'Загрузка...'}
            </p>
          </div>

          {/* Зона удаления */}
          <div className="border border-rose-200 bg-rose-50 rounded-xl p-5">
            <h4 className="text-rose-700 font-bold flex items-center gap-2 mb-2">
              <AlertTriangle size={18} />
              Опасная зона
            </h4>
            <p className="text-xs text-rose-600/80 mb-4">
              Удаление аккаунта приведет к потере доступа к системе. Чтобы подтвердить удаление, введи свой пароль.
            </p>

            {error && (
              <div className="mb-3 p-2 bg-white/50 border border-rose-200 text-rose-700 text-xs rounded font-medium">
                {error}
              </div>
            )}

            <input
              type="password"
              placeholder="Введи пароль для подтверждения"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 mb-3"
            />

            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting || !password}
              className="w-full flex justify-center items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <UserX size={16} />
              {isDeleting ? 'Удаление...' : 'Удалить аккаунт навсегда'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};