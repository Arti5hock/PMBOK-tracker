import { useState, useEffect, FormEvent } from 'react';
import { api } from '../api/client';
import { X, ShieldAlert, Trash2, Edit2, Activity, User, Target } from 'lucide-react';

interface RiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: number;
  risk: any | null;
}

export const RiskModal = ({ isOpen, onClose, onSuccess, projectId, risk }: RiskModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);
  const [strategy, setStrategy] = useState('mitigate');
  const [responsePlan, setResponsePlan] = useState('');
  const [status, setStatus] = useState('identified');
  const [owner, setOwner] = useState<number | ''>('');
  
  const [projectUsers, setProjectUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.get('/auth/users/').then(res => {
        setProjectUsers(res.data.results || res.data);
      }).catch(e => console.error("Ошибка загрузки пользователей", e));

      if (risk) {
        setTitle(risk.title || '');
        setDescription(risk.description || '');
        setProbability(risk.probability || 3);
        setImpact(risk.impact || 3);
        setStrategy(risk.strategy || 'mitigate');
        setResponsePlan(risk.response_plan || '');
        setStatus(risk.status || 'identified');
        setOwner(risk.owner || '');
        setIsEditing(false); // Существующий риск - режим просмотра
      } else {
        setTitle('');
        setDescription('');
        setProbability(3);
        setImpact(3);
        setStrategy('mitigate');
        setResponsePlan('');
        setStatus('identified');
        setOwner('');
        setIsEditing(true); // Новый риск - режим редактирования
      }
    }
  }, [isOpen, risk]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      project: projectId,
      title,
      description,
      probability,
      impact,
      strategy,
      response_plan: responsePlan,
      status,
      owner: owner ? Number(owner) : null,
    };

    try {
      if (risk) {
        await api.patch(`/risks/${risk.id}/`, payload);
        setIsEditing(false);
        onSuccess();
      } else {
        await api.post('/risks/', payload);
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка сохранения риска.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!risk) return;
    if (!window.confirm('Удалить этот риск из реестра?')) return;
    
    setLoading(true);
    try {
      await api.delete(`/risks/${risk.id}/`);
      onSuccess();
      onClose();
    } catch (error) {
      alert('Ошибка при удалении риска.');
    } finally {
      setLoading(false);
    }
  };

  const currentScore = probability * impact;
  const getSeverityColor = (score: number) => {
    if (score >= 20) return 'bg-rose-100 text-rose-700 border-rose-200';
    if (score >= 15) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (score >= 7) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* ШАПКА */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            {isEditing ? (
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <ShieldAlert size={20} className="text-slate-600" />
                {risk ? 'Редактирование угрозы' : 'Идентификация нового риска'}
              </h3>
            ) : (
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <ShieldAlert size={20} className="text-slate-600" />
                Карточка риска
              </h3>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {risk && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-colors"
              >
                <Edit2 size={14} /> Изменить
              </button>
            )}
            {risk && isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
          {!isEditing ? (
            /* РЕЖИМ ПРОСМОТРА */
            <div className="space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-slate-800 leading-tight mb-3">{title}</h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 uppercase shadow-sm">
                      Статус: <span className="text-blue-600">{status}</span>
                    </span>
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 uppercase shadow-sm flex items-center gap-1">
                      <Target size={12} className="text-slate-400"/>
                      Стратегия: <span className="text-slate-800">{strategy}</span>
                    </span>
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 uppercase shadow-sm flex items-center gap-1">
                      <User size={12} className="text-slate-400"/>
                      Владелец: <span className="text-slate-800">{projectUsers.find(u => u.id === owner)?.username || 'Не назначен'}</span>
                    </span>
                  </div>
                </div>
                {/* Матрица Score */}
                <div className="shrink-0 flex flex-col items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm w-32">
                  <span className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                    <Activity size={12}/> Оценка (P×I)
                  </span>
                  <div className={`text-3xl font-black px-4 py-2 rounded-xl border w-full text-center ${getSeverityColor(currentScore)}`}>
                    {currentScore}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 mt-2 text-center">
                    В: {probability} <span className="mx-1">×</span> И: {impact}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Причины и последствия</h4>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-700 whitespace-pre-wrap min-h-[4rem]">
                  {description || <span className="text-slate-400 italic">Подробности не описаны...</span>}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">План реагирования (Response Plan)</h4>
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 shadow-sm text-sm text-slate-700 whitespace-pre-wrap min-h-[4rem]">
                  {responsePlan || <span className="text-slate-400 italic">План действий отсутствует. В случае проблем придется импровизировать.</span>}
                </div>
              </div>
            </div>
          ) : (
            /* РЕЖИМ РЕДАКТИРОВАНИЯ */
            <form id="risk-form" onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Формулировка угрозы</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Что может пойти не так?"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Детальное описание</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">Вероятность (1-5)</label>
                  <input type="range" min="1" max="5" step="1" value={probability} onChange={(e) => setProbability(Number(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1"><span>Низкая</span><span>Высокая</span></div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">Влияние (1-5)</label>
                  <input type="range" min="1" max="5" step="1" value={impact} onChange={(e) => setImpact(Number(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1"><span>Слабое</span><span>Критичное</span></div>
                </div>
                <div className="flex flex-col items-center justify-center border-l border-slate-200 pl-4">
                  <span className="text-xs font-bold uppercase text-slate-400 mb-1">Оценка (P×I)</span>
                  <div className={`text-2xl font-black px-4 py-2 rounded-xl border ${getSeverityColor(currentScore)}`}>
                    {currentScore}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Стратегия</label>
                  <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500">
                    <option value="mitigate">Mitigate (Снижение)</option>
                    <option value="avoid">Avoid (Уклонение)</option>
                    <option value="transfer">Transfer (Передача)</option>
                    <option value="accept">Accept (Принятие)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Статус</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500">
                    <option value="identified">Выявлен</option>
                    <option value="analyzed">Проанализирован</option>
                    <option value="action_required">Требует действий</option>
                    <option value="mitigated">Нивелирован</option>
                    <option value="occurred">Случился (Проблема)</option>
                    <option value="closed">Закрыт</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Владелец риска</label>
                  <select value={owner} onChange={(e) => setOwner(e.target.value === "" ? "" : Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500">
                    <option value="">Не назначен</option>
                    {projectUsers.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">План реагирования</label>
                <textarea
                  rows={3}
                  value={responsePlan}
                  onChange={(e) => setResponsePlan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Конкретные шаги..."
                />
              </div>
            </form>
          )}
        </div>

        {/* ФУТЕР */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-2">
          {isEditing && risk ? (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
            >
              Отменить изменения
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
              form="risk-form"
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Запись...' : 'Сохранить риск'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};