import { useState } from 'react';
import { ChevronDown, ChevronRight, FolderTree, Plus, Edit3 } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  wbs_code: string;
  status: string;
  progress_percent?: number; // ИСПРАВЛЕНО ИМЯ ПОЛЯ ПОД БЭКЕНД
  parent?: number | null;
  children?: Task[];
}

interface WbsTreeProps {
  tasks: Task[];
  onAddSubtask: (parentId?: number) => void;
  onEditTask: (task: Task) => void;
}

const statusColors: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700 border-slate-300',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  review: 'bg-amber-50 text-amber-700 border-amber-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const statusLabels: Record<string, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  review: 'Ревью',
  done: 'Завершено',
};

export const WbsTree = ({ tasks, onAddSubtask, onEditTask }: WbsTreeProps) => {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const toggleCollapse = (id: number) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ФУНКЦИЯ buildTree УДАЛЕНА — бэкенд УЖЕ отдает нам готовую иерархию

  const renderNode = (task: Task, level: number = 0) => {
    const hasChildren = task.children && task.children.length > 0;
    const isCollapsed = collapsed[task.id];

    return (
      <div key={task.id} className="flex flex-col group">
        <div
          className={`flex items-center justify-between p-2 my-1 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all ${
            level === 0 ? 'shadow-sm font-semibold' : ''
          }`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div className="flex items-center space-x-3">
            {hasChildren ? (
              <button
                onClick={() => toggleCollapse(task.id)}
                className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer transition-colors"
              >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
              </button>
            ) : (
              <div className="w-[26px]" />
            )}

            <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-300">
              {task.wbs_code || 'WBS'}
            </span>

            <span className="text-slate-900 text-sm cursor-pointer hover:text-blue-600" onClick={() => onEditTask(task)}>
              {task.title}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
              <button 
                onClick={() => onEditTask(task)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Редактировать"
              >
                <Edit3 size={16} />
              </button>
              <button 
                onClick={() => onAddSubtask(task.id)}
                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                title="Добавить подзадачу"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            {/* Прогресс (используем progress_percent) */}
            <div className="flex items-center space-x-2 w-28">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${task.progress_percent || 0}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 w-8 text-right font-medium">
                {task.progress_percent || 0}%
              </span>
            </div>

            <span
              className={`text-xs px-2.5 py-1 rounded-full border font-medium min-w-[100px] text-center ${
                statusColors[task.status] || 'bg-slate-100 text-slate-600'
              }`}
            >
              {statusLabels[task.status] || task.status}
            </span>
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div className="flex flex-col">
            {task.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center mb-4 px-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <FolderTree size={20} className="text-blue-600"/>
          Структура работ (WBS)
        </h3>
        <button 
          onClick={() => onAddSubtask()} 
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition"
        >
          <Plus size={16} />
          Корневой пакет
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <FolderTree className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">Дерево проекта пусто</p>
          <p className="text-slate-400 text-xs mt-1">Создай первый корневой пакет работ, чтобы начать планирование.</p>
        </div>
      ) : (
        /* Рендерим напрямую из пропсов, так как бэкенд уже собрал дерево */
        tasks.map((root) => renderNode(root, 0))
      )}
    </div>
  );
};