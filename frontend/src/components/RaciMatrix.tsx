import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Users, AlertCircle } from 'lucide-react';

interface RaciRow {
  task_id: number;
  task_title: string;
  matrix: {
    responsible: string[];
    accountable: string[];
    consulted: string[];
    informed: string[];
  };
}

interface RaciMatrixProps {
  projectId: number;
  // Функция для открытия модалки с деталями задачи
  onOpenTask: (task: any) => void; 
}

export const RaciMatrix = ({ projectId, onOpenTask }: RaciMatrixProps) => {
  const [data, setData] = useState<RaciRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Загружаем матрицу RACI при монтировании компонента или смене проекта
  useEffect(() => {
    const fetchMatrix = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/raci/project_matrix/?project=${projectId}`);
        setData(res.data);
      } catch (error) {
        console.error('Ошибка загрузки матрицы RACI', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchMatrix();
    }
  }, [projectId]);

  // Запрашиваем полные данные задачи перед открытием модалки
  const handleTaskClick = async (taskId: number) => {
    try {
      const res = await api.get(`/tasks/${taskId}/`);
      onOpenTask(res.data);
    } catch (error) {
      console.error('Ошибка при загрузке задачи', error);
      alert('Не удалось загрузить данные задачи.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Сборка матрицы...</div>;
  }

  // Заглушка, если задач нет или роли не распределены
  if (data.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white mt-4">
        <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
        <p className="text-slate-600 font-medium">Матрица пуста</p>
        <p className="text-slate-400 text-xs mt-1">В проекте еще нет задач или никому не назначены роли.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-2">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider w-1/3">Задача</th>
              <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider bg-blue-50/50">Responsible (Исполняет)</th>
              <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider bg-amber-50/50">Accountable (Утверждает)</th>
              <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider bg-emerald-50/50">Consulted (Консультирует)</th>
              <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-50">Informed (Информируется)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => {
              // PMBOK Rule: Утверждающий (A) должен быть ОДИН. Если его нет — это красная зона.
              const missingAccountable = row.matrix.accountable.length === 0;

              return (
                <tr key={row.task_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-sm font-medium text-slate-800 border-r border-slate-100">
                    <div className="flex items-center gap-2">
                      {missingAccountable && (
                        <AlertCircle size={16} className="text-rose-500 flex-shrink-0" aria-label="Нет утверждающего (Accountable)!" />
                      )}
                      {/* Кликабельное название задачи */}
                      <span 
                        onClick={() => handleTaskClick(row.task_id)}
                        className={`cursor-pointer hover:text-blue-600 hover:underline transition-colors ${missingAccountable ? "text-rose-600" : ""}`}
                      >
                        {row.task_title}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-sm border-r border-slate-100">
                    <div className="flex flex-wrap gap-1">
                      {row.matrix.responsible.map((user, idx) => (
                        <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">
                          {user}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-sm border-r border-slate-100">
                    <div className="flex flex-wrap gap-1">
                      {row.matrix.accountable.map((user, idx) => (
                        <span key={idx} className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-semibold">
                          {user}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-sm border-r border-slate-100">
                    <div className="flex flex-wrap gap-1">
                      {row.matrix.consulted.map((user, idx) => (
                        <span key={idx} className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-semibold">
                          {user}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {row.matrix.informed.map((user, idx) => (
                        <span key={idx} className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold">
                          {user}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};