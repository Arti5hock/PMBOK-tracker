import { useState } from 'react';
import { HelpCircle, Book, ChevronRight, X, ExternalLink } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const helpSections = [
  {
    title: 'Начало работы',
    icon: Book,
    content: (
      <>
        <p className="mb-3">
          PMBOK Tracker — это инструмент для управления проектами на основе методологии PMBOK.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
          <li>Создайте новый проект через кнопку «Новый проект»</li>
          <li>Заполните информацию о проекте: название, описание, даты</li>
          <li>Выберите проект из выпадающего списка в шапке</li>
          <li>Начните добавлять задачи и работать с модулями</li>
        </ol>
      </>
    ),
  },
  {
    title: 'Канбан-доска',
    icon: ChevronRight,
    content: (
      <>
        <p className="mb-3 text-sm text-slate-700">
          Визуализируйте задачи по статусам выполнения. Перетаскивайте карточки между колонками.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
          <li><strong>Бэклог:</strong> Новые задачи, ожидающие начала</li>
          <li><strong>В работе:</strong> Активно выполняемые задачи</li>
          <li><strong>На проверке:</strong> Задачи на ревью</li>
          <li><strong>Готово:</strong> Завершённые задачи</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Структура WBS',
    icon: ChevronRight,
    content: (
      <>
        <p className="mb-3 text-sm text-slate-700">
          Иерархическая структура работ проекта. Разбивайте проект на фазы и подзадачи.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
          <li>Добавляйте подзадачи к существующим элементам</li>
          <li>Оценивайте длительность и трудоёмкость</li>
          <li>Назначайте исполнителей</li>
          <li>Отслеживайте прогресс выполнения</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Матрица RACI',
    icon: ChevronRight,
    content: (
      <>
        <p className="mb-3 text-sm text-slate-700">
          Распределение ролей в проекте для каждой задачи.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
          <li><strong>R (Responsible):</strong> Исполнитель</li>
          <li><strong>A (Accountable):</strong> Ответственный</li>
          <li><strong>C (Consulted):</strong> Консультант</li>
          <li><strong>I (Informed):</strong> Наблюдатель</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Вехи проекта',
    icon: ChevronRight,
    content: (
      <>
        <p className="mb-3 text-sm text-slate-700">
          Ключевые события и контрольные точки проекта.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
          <li>Отмечайте важные даты</li>
          <li>Связывайте вехи с задачами</li>
          <li>Отслеживайте достижение целей</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Реестр рисков',
    icon: ChevronRight,
    content: (
      <>
        <p className="mb-3 text-sm text-slate-700">
          Управление рисками проекта: идентификация, оценка и мониторинг.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
          <li>Описывайте потенциальные риски</li>
          <li>Оценивайте вероятность и влияние</li>
          <li>Планируйте меры реагирования</li>
          <li>Назначайте ответственных за риски</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Настройка модулей',
    icon: ChevronRight,
    content: (
      <>
        <p className="mb-3 text-sm text-slate-700">
          Вы можете настроить интерфейс, включив только нужные вам модули.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
          <li>Нажмите на иконку шестерёнки в панели навигации проекта</li>
          <li>Включите или отключите ненужные модули</li>
          <li>Сохраните настройки</li>
          <li>Настройки сохраняются для вашего пользователя</li>
        </ul>
      </>
    ),
  },
];

export const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  const [activeSection, setActiveSection] = useState<number | null>(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        {/* Заголовок */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-2">
            <HelpCircle size={24} className="text-white" />
            <h2 className="text-xl font-bold text-white">Справка PMBOK Tracker</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Контент */}
        <div className="flex flex-col md:flex-row h-[600px]">
          {/* Левая панель - список разделов */}
          <div className="w-full md:w-64 border-r border-slate-200 bg-slate-50 overflow-y-auto">
            <nav className="p-3 space-y-1">
              {helpSections.map((section, index) => {
                const Icon = section.icon;
                const isActive = activeSection === index;
                
                return (
                  <button
                    key={index}
                    onClick={() => setActiveSection(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-white shadow-sm text-blue-600 font-semibold'
                        : 'text-slate-600 hover:bg-white/50'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                    <span className="text-sm">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Правая панель - содержимое */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeSection !== null && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
                  {(() => {
                    const Icon = helpSections[activeSection].icon;
                    return <Icon size={24} className="text-blue-600" />;
                  })()}
                  <h3 className="text-lg font-bold text-slate-800">
                    {helpSections[activeSection].title}
                  </h3>
                </div>
                
                <div className="text-slate-700">
                  {helpSections[activeSection].content}
                </div>

                {activeSection === 0 && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-800 font-medium mb-2">
                      💡 Совет:
                    </p>
                    <p className="text-sm text-blue-700">
                      Начните с создания небольшого тестового проекта, чтобы освоиться с интерфейсом. 
                      Затем переходите к реальным проектам.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Футер */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={() => setActiveSection(Math.max(0, (activeSection || 0) - 1))}
            disabled={activeSection === 0}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition"
          >
            ← Назад
          </button>
          
          <div className="text-xs text-slate-500">
            Раздел {((activeSection || 0) + 1)} из {helpSections.length}
          </div>
          
          <button
            onClick={() => setActiveSection(Math.min(helpSections.length - 1, (activeSection || 0) + 1))}
            disabled={activeSection === helpSections.length - 1}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition"
          >
            Вперёд →
          </button>
        </div>
      </div>
    </div>
  );
};
