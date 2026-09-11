import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Flag, Plus, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface MilestonesListProps {
  projectId: number;
  onOpenModal: (milestone?: any) => void;
  refreshTrigger?: number;
}

export const MilestonesList = ({ projectId, onOpenModal, refreshTrigger }: MilestonesListProps) => {
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMilestones = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/milestones/?project=${projectId}`);
        setMilestones(res.data.results || res.data);
      } catch (error) {
        console.error('Ошибка загрузки вех', error);
      } finally {
        setLoading(false);
      }
    };
    if (projectId) fetchMilestones();
  }, [projectId, refreshTrigger]);

  if (loading) return <div className="p-8 text-center text-slate-500">Загрузка контрольных точек...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Flag size={20} className="text-blue-600" />
            Фазы проекта (Milestones)
          </h3>
          <p className="text-xs text-slate-500 mt-1">Отслеживание ключевых контрольных точек по PMBOK</p>
        </div>
        <button 
          onClick={() => onOpenModal()} 
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          <Plus size={16} />
          Создать веху
        </button>
      </div>

      {milestones.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl">
          <Flag className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">Контрольные точки не заданы</p>
          <p className="text-slate-400 text-xs mt-1">Разбей проект на крупные фазы для удобного контроля.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {milestones.map((m) => {
            const isOverdue = new Date(m.due_date) < new Date() && m.status === 'planned';
            const progress = m.tasks_count > 0 ? Math.round((m.completed_tasks_count / m.tasks_count) * 100) : 0;

            return (
              <div 
                key={m.id} 
                onClick={() => onOpenModal(m)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all relative overflow-hidden"
              >
                {/* Декоративная полоса статуса */}
                <div className={`absolute top-0 left-0 w-full h-1.5 ${
                  m.status === 'achieved' ? 'bg-emerald-500' : 
                  m.status === 'missed' ? 'bg-rose-500' : 'bg-blue-500'
                }`} />

                <div className="flex justify-between items-start mb-3 mt-1">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    m.status === 'achieved' ? 'bg-emerald-100 text-emerald-700' :
                    m.status === 'missed' ? 'bg-rose-100 text-rose-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    {m.status === 'planned' ? 'В планах' : m.status === 'achieved' ? 'Достигнута' : 'Провалена'}
                  </span>
                  
                  <span className={`text-xs font-bold flex items-center gap-1 ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
                    <Clock size={12} />
                    {new Date(m.due_date).toLocaleDateString()}
                  </span>
                </div>

                <h4 className="font-bold text-slate-800 text-lg leading-tight mb-2">{m.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 h-8">{m.description || 'Нет описания'}</p>

                {/* Прогресс бар по задачам */}
                <div className="mt-auto pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Прогресс фазы</span>
                    <span className="text-xs font-bold text-slate-700">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-medium text-slate-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      {m.completed_tasks_count} закрыто
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertCircle size={12} className="text-blue-400" />
                      {m.tasks_count} всего задач
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};