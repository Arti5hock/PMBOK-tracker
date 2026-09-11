import { FolderKanban, Calendar, Clock, ArrowRight, Plus, Activity } from 'lucide-react';
import { MyTasks } from './MyTasks';

// Визуализация статусов PMBOK
const pmBokStatuses: Record<string, { label: string, color: string }> = {
  initiation: { label: 'Инициация', color: 'bg-slate-100 text-slate-700' },
  planning: { label: 'Планирование', color: 'bg-blue-100 text-blue-700' },
  executing: { label: 'Исполнение', color: 'bg-amber-100 text-amber-700' },
  monitoring: { label: 'Мониторинг', color: 'bg-emerald-100 text-emerald-700' },
  closing: { label: 'Завершение', color: 'bg-purple-100 text-purple-700' },
  archived: { label: 'Архив', color: 'bg-slate-200 text-slate-500' },
};

interface DashboardProps {
  projects: any[];
  onSelectProject: (id: number) => void;
  onNewProject: () => void;
  onOpenTask: (task: any) => void;
  refreshTrigger: number;
}

export const Dashboard = ({ projects, onSelectProject, onNewProject, onOpenTask, refreshTrigger }: DashboardProps) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Блок 1: Проекты */}
      <div>
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FolderKanban size={24} className="text-blue-600" />
              Мои проекты
            </h2>
            <p className="text-sm text-slate-500 mt-1">Все проекты, к которым у тебя есть доступ</p>
          </div>
          <button
            onClick={onNewProject}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm"
          >
            <Plus size={16} />
            Создать проект
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <FolderKanban className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">Нет активных проектов</p>
            <p className="text-slate-400 text-xs mt-1">Нажми кнопку выше, чтобы запустить первый проект.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col group"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${pmBokStatuses[p.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                    {pmBokStatuses[p.status]?.label || p.status}
                  </span>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight">{p.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">
                  {p.description || 'Нет описания...'}
                </p>
                <div className="flex justify-between items-center text-xs font-medium text-slate-500 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} className="text-slate-400" />
                    {p.start_date ? new Date(p.start_date).toLocaleDateString() : '—'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} className="text-slate-400" />
                    {p.end_date ? new Date(p.end_date).toLocaleDateString() : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full h-px bg-slate-200 my-8"></div>

      {/* Блок 2: Глобальная доска задач */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
          <Activity size={24} className="text-blue-600" />
          Радар задач
        </h2>
        <p className="text-sm text-slate-500 mb-2">Сводка по всем проектам, где ты участвуешь</p>
        
        {/* Интегрируем твой компонент личных задач */}
        <MyTasks onOpenTask={onOpenTask} refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
};