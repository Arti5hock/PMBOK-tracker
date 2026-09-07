import { useState, useEffect } from 'react';
import { Settings2, Kanban, Users, Flag, AlertTriangle, X, Save } from 'lucide-react';
import { api } from '../api/client';

interface ModuleSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ModuleSettings {
  kanban: boolean;
  raci: boolean;
  milestones: boolean;
  risks: boolean;
}

const moduleInfo = {
  kanban: {
    name: 'Канбан-доска',
    icon: Kanban,
    description: 'Визуализация задач по статусам. Перетаскивайте карточки между колонками.',
  },
  raci: {
    name: 'Матрица RACI',
    icon: Users,
    description: 'Распределение ролей: Responsible, Accountable, Consulted, Informed.',
  },
  milestones: {
    name: 'Вехи проекта',
    icon: Flag,
    description: 'Ключевые точки проекта с датами. Отслеживайте важные события.',
  },
  risks: {
    name: 'Реестр рисков',
    icon: AlertTriangle,
    description: 'Управление рисками проекта. Оценка вероятности и влияния.',
  },
};

export const ModuleSettingsModal = ({ isOpen, onClose, onSuccess }: ModuleSettingsProps) => {
  const [settings, setSettings] = useState<ModuleSettings>({
    kanban: true,
    raci: true,
    milestones: true,
    risks: true,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      setSaved(false);
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const res = await api.get('/accounts/me/');
      if (res.data.module_settings) {
        setSettings(res.data.module_settings);
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек модулей', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/accounts/module-settings/', settings);
      setSaved(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 800);
    } catch (error) {
      console.error('Ошибка сохранения настроек', error);
      alert('Не удалось сохранить настройки');
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (module: keyof ModuleSettings) => {
    setSettings(prev => ({ ...prev, [module]: !prev[module] }));
    setSaved(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Заголовок */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Settings2 size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Настройка модулей</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Контент */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 mb-4">
            Выберите модули, которые будут отображаться в интерфейсе проекта. 
            Это поможет упростить интерфейс и сосредоточиться на важном.
          </p>

          {Object.entries(moduleInfo).map(([key, info]) => {
            const Icon = info.icon;
            const isActive = settings[key as keyof ModuleSettings];
            
            return (
              <div
                key={key}
                onClick={() => toggleModule(key as keyof ModuleSettings)}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  {isActive && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                    <span className={`font-semibold ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                      {info.name}
                    </span>
                  </div>
                  <p className={`text-sm ${isActive ? 'text-slate-700' : 'text-slate-400'}`}>
                    {info.description}
                  </p>
                </div>
              </div>
            );
          })}

          {saved && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-700 text-sm font-medium animate-in fade-in">
              <Save size={16} />
              Настройки успешно сохранены!
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-semibold transition flex items-center gap-2"
          >
            {loading ? (
              <>Сохранение...</>
            ) : (
              <>
                <Save size={16} />
                Сохранить
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
