import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { CheckCircle2, AlertCircle, Clock, CheckCircle, Calendar, UserCheck } from 'lucide-react';

interface MyTasksProps {
  // Делаем projectId опциональным: если передан — локальная доска, если нет — глобальная
  projectId?: number | null;
  onOpenTask: (task: any) => void;
  refreshTrigger?: number;
}

export const MyTasks = ({ projectId, onOpenTask, refreshTrigger }: MyTasksProps) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projectsMap, setProjectsMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<number | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        // Узнаем ID текущего юзера
        const userRes = await api.get('/auth/me/');
        const myId = userRes.data.id;
        setMyUserId(myId);

        // Если мы на глобальном дашборде (нет projectId), запрашиваем имена проектов для карточек
        if (!projectId) {
          const projRes = await api.get('/projects/');
          const projData = projRes.data.results || projRes.data;
          const pMap: Record<number, string> = {};
          projData.forEach((p: any) => { pMap[p.id] = p.name; });
          setProjectsMap(pMap);
        }

        // Динамический URL: локальный проект или вообще все задачи
        const url = projectId ? `/tasks/?project=${projectId}` : '/tasks/';
        const tasksRes = await api.get(url);
        const allTasks = tasksRes.data.results || tasksRes.data;

        // Жесткая фильтрация: оставляем только те задачи, где юзер реально должен что-то делать
        const myAssigned = allTasks.filter((t: any) => {
          const isAssignee = t.assignees?.includes(myId);
          const isRaciResponsible = t.raci_assignments?.some((r: any) => r.user === myId);
          return isAssignee || isRaciResponsible;
        });

        setTasks(myAssigned);
      } catch (e) {
        console.error('Ошибка загрузки задач', e);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [projectId, refreshTrigger]);

  // Вычисляем конкретную роль юзера в задаче для отображения в интерфейсе
  const getMyRole = (task: any) => {
    if (!myUserId) return null;
    const raciRecord = task.raci_assignments?.find((r: any) => r.user === myUserId);
    if (raciRecord) return raciRecord.role;
    if (task.assignees?.includes(myUserId)) return 'Исполнитель';
    return null;
  };

  const isOverdue = (dateString: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Поиск твоих задач...</div>;

  if (tasks.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white mt-4">
        <CheckCircle2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
        <p className="text-slate-600 font-medium">Свобода!</p>
        <p className="text-slate-400 text-xs mt-1">Ни одной задачи на тебе сейчас не висит.</p>
      </div>
    );
  }

  // Разделяем задачи на активные и завершенные
  const activeTasks = tasks.filter(t => ['todo', 'backlog', 'in_progress', 'review'].includes(t.status));
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="space-y-8 mt-4 pb-8">
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <AlertCircle size={16} className="text-blue-600" />
          В работе ({activeTasks.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeTasks.map(task => {
            const role = getMyRole(task);
            const overdue = isOverdue(task.due_date);

            return (
              <div 
                key={task.id}
                onClick={() => onOpenTask(task)}
                className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col relative overflow-hidden"
              >
                {/* Цветовая индикация приоритета */}
                <div className={`absolute top-0 left-0 w-full h-1 ${task.priority === 'critical' ? 'bg-rose-500' : task.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                
                <div className="flex justify-between items-start mb-2 mt-1">
                  {/* Рендерим имя проекта только если мы на глобальном дашборде */}
                  {!projectId ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate pr-2">
                      {projectsMap[task.project] || 'Неизвестный проект'}
                    </span>
                  ) : (
                    <span></span>
                  )}
                  <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    #{task.wbs_code || task.id}
                  </span>
                </div>
                
                <h4 className="text-sm font-bold text-slate-800 leading-snug mb-4 flex-1">{task.title}</h4>
                
                <div className="flex flex-col gap-2 mt-auto border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                      <Clock size={12} />
                      {task.status.replace('_', ' ')}
                    </span>
                    {task.due_date ? (
                      <span className={`font-semibold flex items-center gap-1 ${overdue ? 'text-rose-600' : 'text-slate-600'}`}>
                        <Calendar size={12} />
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1"><Calendar size={12}/> Нет срока</span>
                    )}
                  </div>
                  
                  {role && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold mt-1">
                      <UserCheck size={12} className="text-slate-400" />
                      <span className="text-slate-500 uppercase tracking-wide">Моя роль:</span>
                      <span className={`px-1.5 py-0.5 rounded ${
                        role === 'A' ? 'bg-amber-100 text-amber-700' :
                        role === 'R' ? 'bg-blue-100 text-blue-700' :
                        role === 'C' ? 'bg-emerald-100 text-emerald-700' :
                        role === 'I' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {role === 'R' ? 'R (Исполнитель)' : role === 'A' ? 'A (Утверждающий)' : role === 'C' ? 'C (Консультант)' : role === 'I' ? 'I (Информируемый)' : role}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};