import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ShieldAlert, Plus, Activity, AlertTriangle } from 'lucide-react';

interface RiskRegisterProps {
  projectId: number;
  onOpenRiskModal: (risk?: any) => void;
  refreshTrigger?: number;
}

export const RiskRegister = ({ projectId, onOpenRiskModal, refreshTrigger }: RiskRegisterProps) => {
  const [risks, setRisks] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchRisksData = async () => {
    setLoading(true);
    try {
      // Бэкенд возвращает готовый дашборд
      const summaryRes = await api.get(`/risks/summary/?project=${projectId}`);
      setSummary(summaryRes.data);

      const listRes = await api.get(`/risks/?project=${projectId}`);
      setRisks(listRes.data.results || listRes.data);
    } catch (error) {
      console.error('Ошибка загрузки реестра рисков', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchRisksData();
  }, [projectId, refreshTrigger]);

  if (loading) return <div className="p-8 text-center text-slate-500">Анализ реестра рисков...</div>;

  return (
    <div className="space-y-6">
      {/* Сводный дашборд */}
      {summary && summary.total_risks > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Всего угроз</p>
            <p className="text-2xl font-black text-slate-800">{summary.total_risks}</p>
          </div>
          <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm">
            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Критичные</p>
            <p className="text-2xl font-black text-rose-700">{summary.by_severity.critical}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 shadow-sm">
            <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Высокие</p>
            <p className="text-2xl font-black text-orange-700">{summary.by_severity.high}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Средние</p>
            <p className="text-2xl font-black text-amber-700">{summary.by_severity.medium}</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Низкие</p>
            <p className="text-2xl font-black text-emerald-700">{summary.by_severity.low}</p>
          </div>
        </div>
      )}

      {/* Таблица реестра */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Activity size={20} className="text-blue-600" />
              Реестр рисков проекта
            </h3>
            <p className="text-xs text-slate-500 mt-1">Отсортировано по уровню угрозы (Score)</p>
          </div>
          <button 
            onClick={() => onOpenRiskModal()} 
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition"
          >
            <Plus size={16} />
            Добавить риск
          </button>
        </div>

        {risks.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">Реестр рисков пуст</p>
            <p className="text-slate-400 text-xs mt-1">Идеальных проектов не бывает. Найди слабое место и запиши его.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Угроза</th>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">P × I = Score</th>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Стратегия</th>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Статус</th>
                  <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Владелец</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {risks.map((risk) => (
                  <tr 
                    key={risk.id} 
                    onClick={() => onOpenRiskModal(risk)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="flex items-start gap-2">
                        {risk.score >= 20 && <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />}
                        <div>
                          <p className={`text-sm font-bold ${risk.score >= 20 ? 'text-rose-700' : 'text-slate-800'}`}>
                            {risk.title}
                          </p>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{risk.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className={`text-sm font-black px-2 py-1 rounded-md border ${
                          risk.score >= 20 ? 'bg-rose-100 text-rose-700 border-rose-200' :
                          risk.score >= 15 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                          risk.score >= 7 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}>
                          {risk.score}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold mt-1">
                          {risk.probability} × {risk.impact}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-700 uppercase">
                      {risk.strategy}
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
                        {risk.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-600">
                      {risk.owner_name || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
