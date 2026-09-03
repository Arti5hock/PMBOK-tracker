import { useState, useEffect, FormEvent } from 'react';
import { api } from '../api/client';
import { X, Flag, Trash2, Edit2, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: number;
  milestone: any | null;
}

export const MilestoneModal = ({ isOpen, onClose, onSuccess, projectId, milestone }: MilestoneModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('planned');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (milestone) {
        setTitle(milestone.title || '');
        setDescription(milestone.description || '');
        setDueDate(milestone.due_date ? milestone.due_date.substring(0, 10) : '');
        setStatus(milestone.status || 'planned');
        setIsEditing(false); // Существующая веха открывается в режиме просмотра
      } else {
        setTitle('');
        setDescription('');
        setDueDate('');
        setStatus('planned');
        setIsEditing(true); // Новая веха сразу в режиме редактирования
      }
    }
  }, [isOpen, milestone]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      project: projectId,
      title,
      description,
      status,
      due_date: dueDate ? `${dueDate}T23:59:59Z` : null,
    };

    try {
      if (milestone) {
        await api.patch(`/milestones/${milestone.id}/`, payload);
        setIsEditing(false);
        onSuccess();
      } else {
        await api.post('/milestones/', payload);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.status) {
        setError(errorData.status[0]);
      } else {
        setError('Не удалось сохранить веху.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!milestone) return;
    if (!window.confirm('Удалить эту веху? Задачи, привязанные к ней, потеряют связь с этапом.')) return;
    
    setLoading(true);
    try {
      await api.delete(`/milestones/${milestone.id}/`);
      onSuccess();
      onClose();
    } catch (error) {
      alert('Ошибка при удалении вехи.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        
        {/* ШАПКА */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            {isEditing ? (
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Flag size={20} className="text-blue-600" />
                {milestone ? 'Редактирование вехи' : 'Новая веха'}
              </h3>
            ) : (
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Flag size={20} className="text-blue-600" />
                Паспорт вехи
              </h3>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {milestone && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-colors"
              >
                <Edit2 size={14} /> Изменить
              </button>
            )}
            {milestone && isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isEditing ? (
            /* РЕЖИМ ПРОСМОТРА */
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800 leading-tight mb-2">{title}</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    status === 'achieved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                    status === 'missed' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                    'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}>
                    {status === 'planned' ? 'В планах' : status === 'achieved' ? 'Достигнута' : 'Провалена'}
                  </span>
                  {dueDate && (
                    <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-600 flex items-center gap-1">
                      <Calendar size={12} className={new Date(dueDate) < new Date() && status === 'planned' ? 'text-rose-500' : 'text-slate-400'}/> 
                      Дедлайн: {new Date(dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap">
                  {description || <span className="text-slate-400 italic">Описание этапа отсутствует</span>}
                </div>
              </div>

              {milestone && (
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-emerald-500"/> Статистика задач
                  </h4>
                  <div className="flex justify-between items-center">
                    <div className="text-center">
                      <p className="text-2xl font-black text-slate-800">{milestone.tasks_count}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Всего</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-emerald-600">{milestone.completed_tasks_count}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Закрыто</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-blue-600">
                        {milestone.tasks_count > 0 ? Math.round((milestone.completed_tasks_count / milestone.tasks_count) * 100) : 0}%
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Прогресс</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* РЕЖИМ РЕДАКТИРОВАНИЯ */
            <form id="milestone-form" onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Название контрольной точки</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Описание этапа</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Дедлайн фазы</label>
                  <input
                    required
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Статус</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="planned">Запланирована</option>
                    <option value="achieved">Достигнута</option>
                    <option value="missed">Провалена (Срыв)</option>
                  </select>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* ФУТЕР */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-2">
          {isEditing && milestone ? (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setError(null);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
            >
              Отмена
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
            >
              Закрыть
            </button>
          )}

          {isEditing && (
            <button
              type="submit"
              form="milestone-form"
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Запись...' : 'Сохранить веху'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};