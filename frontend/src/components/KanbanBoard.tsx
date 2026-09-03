import { useState, useEffect, DragEvent } from 'react';
import { api } from '../api/client'; // Проверь путь к своему инстансу
import { TaskModal } from './TaskModal';

interface Task {
  id: number;
  title: string;
  description: string;
  wbs_code: string;
  priority: string;
  type: string;
  status: string;
}

interface Column {
  id: number;
  type: string;
  name: string;
  wip_limit: number | null;
  tasks: Task[];
  task_count: number;
}

interface Board {
  id: number;
  project: number;
  columns: Column[];
}

export default function KanbanBoard({ projectId }: { projectId: number }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  // D&D
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [draggedFromColumn, setDraggedFromColumn] = useState<string | null>(null);

  // Модалка
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [targetColumn, setTargetColumn] = useState<string>('todo');

  useEffect(() => {
    fetchBoard();
  }, [projectId]);

  const fetchBoard = async () => {
    try {
      const response = await api.get('/kanban/boards/');
      const boards = response.data.results || response.data;
      const currentBoard = boards.find((b: Board) => b.project === projectId);
      setBoard(currentBoard || null);
    } catch (error) {
      console.error('Ошибка загрузки Канбана', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: DragEvent, taskId: number, columnType: string) => {
    setDraggedTaskId(taskId);
    setDraggedFromColumn(columnType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: DragEvent, targetColumnType: string) => {
    e.preventDefault();
    if (!draggedTaskId || !draggedFromColumn || draggedFromColumn === targetColumnType) return;
    if (!board) return;

    const newBoard = { ...board };
    const sourceColIndex = newBoard.columns.findIndex(c => c.type === draggedFromColumn);
    const targetColIndex = newBoard.columns.findIndex(c => c.type === targetColumnType);

    const taskToMove = newBoard.columns[sourceColIndex].tasks.find(t => t.id === draggedTaskId);
    
    if (taskToMove) {
      newBoard.columns[sourceColIndex].tasks = newBoard.columns[sourceColIndex].tasks.filter(t => t.id !== draggedTaskId);
      newBoard.columns[targetColIndex].tasks.push(taskToMove);
      setBoard(newBoard);
    }

    try {
      await api.post(`/kanban/boards/${board.id}/move_task/`, {
        task_id: draggedTaskId,
        status: targetColumnType,
      });
    } catch (error: any) {
      alert(error.response?.data?.error || 'Не удалось переместить задачу');
      fetchBoard(); 
    } finally {
      setDraggedTaskId(null);
      setDraggedFromColumn(null);
    }
  };

  const openNewTaskModal = (columnType: string) => {
    setEditingTask(null);
    setTargetColumn(columnType);
    setIsModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  if (loading) return <div className="p-4 text-slate-500">Загрузка доски...</div>;
  if (!board) return <div className="p-4 text-rose-500">Доска не найдена для этого проекта.</div>;

  return (
    <>
      <div className="flex h-[calc(100vh-12rem)] gap-4 overflow-x-auto pb-4">
        {board.columns.map((column) => (
          <div 
            key={column.id} 
            className="flex-shrink-0 w-80 bg-slate-100 rounded-xl flex flex-col border border-slate-200"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.type)}
          >
            {/* Заголовок колонки */}
            <div className="p-3 font-bold text-slate-700 flex justify-between items-center border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span>{column.name}</span>
                <span className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">
                  {column.tasks.length} {column.wip_limit ? `/ ${column.wip_limit}` : ''}
                </span>
              </div>
              <button 
                onClick={() => openNewTaskModal(column.type)}
                className="text-slate-400 hover:text-blue-600 hover:bg-white rounded p-1 transition-colors"
                title="Добавить задачу"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Список задач */}
            <div className="p-2 overflow-y-auto flex-1">
              {column.tasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id, column.type)}
                  onClick={() => openEditTaskModal(task)}
                  className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 mb-2 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all border-l-4 border-l-blue-500"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-mono text-slate-400">#{task.wbs_code || task.id}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800 leading-snug">{task.title}</div>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span className={`uppercase px-2 py-1 rounded bg-slate-100 ${
                      task.priority === 'critical' ? 'text-rose-600 bg-rose-50' : 
                      task.priority === 'high' ? 'text-orange-600 bg-orange-50' : ''
                    }`}>
                      {task.priority}
                    </span>
                    <span className="uppercase text-slate-400">{task.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchBoard}
        projectId={projectId}
        task={editingTask}
        defaultStatus={targetColumn}
      />
    </>
  );
}