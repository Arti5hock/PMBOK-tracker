import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { api } from '../api/client';
import { Trash2, MessageSquare, Paperclip, Users, X, Send } from 'lucide-react';

interface UserItem {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

interface CommentItem {
  id: number;
  author_name: string;
  text: string;
  created_at: string;
}

interface AttachmentItem {
  id: number;
  filename: string;
  file: string;
  uploaded_by_name: string;
  uploaded_at: string;
}

interface RaciItem {
  id?: number;
  user: number;
  username?: string;
  role: 'R' | 'A' | 'C' | 'I';
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: number;
  task: any | null;
  defaultStatus?: string;
  parentTaskId?: number | null;
}

export function TaskModal({ isOpen, onClose, onSuccess, projectId, task, defaultStatus, parentTaskId }: TaskModalProps) {
  const [activeSection, setActiveSection] = useState<'details' | 'comments' | 'attachments' | 'raci'>('details');

  // Основные поля
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<number | ''>('');
  const [projectTasks, setProjectTasks] = useState<any[]>([]); // Для выпадающего списка родителей и поиска детей
  const [priority, setPriority] = useState('medium');
  const [type, setType] = useState('task');
  const [status, setStatus] = useState('todo');
  const [loading, setLoading] = useState(false);

  // Комментарии
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState('');

  // Вложения
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // RACI и пользователи
  const [projectUsers, setProjectUsers] = useState<UserItem[]>([]);
  const [raciList, setRaciList] = useState<RaciItem[]>([]);
  const [newRaciUser, setNewRaciUser] = useState<number | ''>('');
  const [newRaciRole, setNewRaciRole] = useState<'R' | 'A' | 'C' | 'I'>('R');

useEffect(() => {
    if (isOpen) {
      fetchUsers();
      // Берем проект самой задачи, а если это новая задача — берем текущий проект из шапки
      const activeProjectId = task ? task.project : projectId; 
      
      if (activeProjectId) {
        api.get(`/tasks/?project=${activeProjectId}`).then(res => {
          setProjectTasks(res.data.results || res.data);
        });
      }

      if (task) {
        setTitle(task.title || '');
        setDescription(task.description || '');
        setPriority(task.priority || 'medium');
        setType(task.type || 'task');
        setStatus(task.status || 'todo');
        setParentId(task.parent || task.parent_task || ''); // Устанавливаем родителя
        fetchComments(task.id);
        fetchAttachments(task.id);
        setRaciList(task.raci || []);
      } else {
        setTitle('');
        setDescription('');
        setPriority('medium');
        setType('task');
        setStatus(defaultStatus || 'todo');
        setParentId(parentTaskId || ''); // Подхватываем переданного родителя из WBS дерева
        setComments([]);
        setAttachments([]);
        setRaciList([]);
      }
      setActiveSection('details');
    }
  }, [task, isOpen, defaultStatus, projectId, parentTaskId]);


  const fetchUsers = async () => {
    try {
      // Обновлено под стандартный эндпоинт Djoser
      const res = await api.get('/auth/users/');
      setProjectUsers(res.data.results || res.data);
    } catch {
      console.warn('Не удалось загрузить пользователей. Проверь эндпоинт /auth/users/.');
    }
  };

  const fetchComments = async (taskId: number) => {
    try {
      const res = await api.get(`/comments/?task=${taskId}`);
      setComments(res.data.results || res.data);
    } catch (e) {
      console.error('Ошибка загрузки комментариев', e);
    }
  };

  const fetchAttachments = async (taskId: number) => {
    try {
      const res = await api.get(`/attachments/?task=${taskId}`);
      setAttachments(res.data.results || res.data);
    } catch (e) {
      console.error('Ошибка загрузки вложений', e);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

const payload = {
      project: task ? task.project : projectId, // <-- Защита от случайного переноса в другой проект
      title,
      description,
      priority,
      type,
      status,
      parent: parentId ? Number(parentId) : null,
    };

    try {
      if (task) {
        await api.patch(`/tasks/${task.id}/`, payload);
      } else {
        await api.post('/tasks/', payload);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка сохранения задачи. Чекай консоль.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!window.confirm(`Точно сносим задачу "${task.title}"? Это не отменить.`)) return;

    setLoading(true);
    try {
      await api.delete(`/tasks/${task.id}/`);
      onSuccess();
      onClose();
    } catch (error) {
      alert('Ошибка при удалении. База сопротивляется.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!task || !newCommentText.trim()) return;

    try {
      const res = await api.post('/comments/', {
        task: task.id,
        text: newCommentText.trim(),
      });
      setComments((prev) => [...prev, res.data]);
      setNewCommentText('');
    } catch (error) {
      alert('Не удалось отправить комментарий.');
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('task', String(task.id));
    formData.append('filename', file.name);

    setUploadingFile(true);
    try {
      const res = await api.post('/attachments/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachments((prev) => [...prev, res.data]);
    } catch (error) {
      alert('Ошибка при загрузке файла. Проверь MEDIA_ROOT в Django.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleAddRaci = async () => {
    if (!task || !newRaciUser) return;

    if (newRaciRole === 'A' && raciList.some((r) => r.role === 'A')) {
      alert('По стандарту PMBOK у задачи может быть только один Accountable (Утверждающий)! Не ломай методологию.');
      return;
    }

    try {
      const res = await api.post('/raci/', {
        task: task.id,
        user: Number(newRaciUser),
        role: newRaciRole,
      });
      setRaciList((prev) => [...prev, res.data]);
      setNewRaciUser('');
    } catch (error: any) {
      alert(error.response?.data?.role || 'Ошибка назначения роли. Проверь роуты.');
    }
  };

  const handleRemoveRaci = async (raciId?: number) => {
    if (!raciId) return;
    try {
      await api.delete(`/raci/${raciId}/`);
      setRaciList((prev) => prev.filter((r) => r.id !== raciId));
    } catch (error) {
      alert('Не удалось удалить назначение.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Шапка модалки */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {task ? `#${task.wbs_code || task.id}` : 'Новая задача'}
            </span>
            <h3 className="font-bold text-lg text-slate-800 mt-1">
              {task ? task.title : 'Создание задачи'}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {task && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Удалить задачу"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Навигация по вкладкам задачи */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveSection('details')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeSection === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Параметры
          </button>
          {task && (
            <>
              <button
                onClick={() => setActiveSection('raci')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeSection === 'raci'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users size={14} />
                RACI ({raciList.length})
              </button>
              <button
                onClick={() => setActiveSection('comments')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeSection === 'comments'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare size={14} />
                Комментарии ({comments.length})
              </button>
              <button
                onClick={() => setActiveSection('attachments')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeSection === 'attachments'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Paperclip size={14} />
                Файлы ({attachments.length})
              </button>
            </>
          )}
        </div>

        {/* Контент модалки */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Секция 1: Параметры */}
          {activeSection === 'details' && (
            <form id="task-form" onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Название задачи
                </label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Что необходимо сделать?"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Описание
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Требования, критерии приемки, ссылки..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Родительская задача</label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Корневая (без родителя) --</option>
                    {projectTasks
                      .filter(t => t.id !== task?.id) // Нельзя быть родителем самому себе
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          #{t.wbs_code || t.id} {t.title}
                        </option>
                    ))}
                  </select>
                </div>
                
                {/* Если это редактирование существующей задачи, показываем её детей */}
                {task && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Подзадачи (Дети)</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 max-h-24 overflow-y-auto">
                      {projectTasks.filter(t => t.parent === task.id || t.parent_task === task.id).length > 0 ? (
                        <ul className="text-xs text-slate-700 space-y-1 pl-4 list-disc">
                          {projectTasks.filter(t => t.parent === task.id || t.parent_task === task.id).map(child => (
                            <li key={child.id}>#{child.wbs_code || child.id} {child.title}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-400 pl-2">Нет подзадач</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Статус</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Приоритет</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Тип</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="task">Task</option>
                    <option value="story">Story</option>
                    <option value="epic">Epic</option>
                  </select>
                </div>
              </div>
            </form>
          )}

          {/* Секция 2: Матрица RACI */}
          {activeSection === 'raci' && (
            <div className="space-y-4">
              <div className="flex gap-2 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                <select
                  value={newRaciUser}
                  onChange={(e) => setNewRaciUser(e.target.value ? Number(e.target.value) : '')}
                  className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm"
                >
                  <option value="">Выберите сотрудника</option>
                  {projectUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name ? `${u.first_name} (${u.username})` : u.username}
                    </option>
                  ))}
                </select>
                <select
                  value={newRaciRole}
                  onChange={(e: any) => setNewRaciRole(e.target.value)}
                  className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm font-medium"
                >
                  <option value="R">Responsible (R)</option>
                  <option value="A">Accountable (A)</option>
                  <option value="C">Consulted (C)</option>
                  <option value="I">Informed (I)</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddRaci}
                  className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-md hover:bg-blue-700 transition"
                >
                  Добавить
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                {raciList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">Ответственные еще не назначены</div>
                ) : (
                  raciList.map((item) => (
                    <div key={item.id} className="p-3 flex justify-between items-center text-sm">
                      <div className="flex items-center space-x-2">
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                          item.role === 'A' ? 'bg-amber-100 text-amber-700' :
                          item.role === 'R' ? 'bg-blue-100 text-blue-700' :
                          item.role === 'C' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.role}
                        </span>
                        <span className="font-medium text-slate-800">{item.username || `User #${item.user}`}</span>
                        <span className="text-xs text-slate-400">
                          ({item.role === 'R' ? 'Responsible' : item.role === 'A' ? 'Accountable' : item.role === 'C' ? 'Consulted' : 'Informed'})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRaci(item.id)}
                        className="text-slate-400 hover:text-rose-600 text-xs"
                      >
                        Удалить
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Секция 3: Комментарии */}
          {activeSection === 'comments' && (
            <div className="space-y-4">
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">Комментариев пока нет</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-xs text-slate-800">{c.author_name}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Написать комментарий..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg flex items-center justify-center transition"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}

          {/* Секция 4: Вложения */}
          {activeSection === 'attachments' && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition">
                <Paperclip size={24} className="text-slate-400 mb-1" />
                <span className="text-xs font-medium text-slate-600">
                  {uploadingFile ? 'Загрузка...' : 'Нажмите для выбора файла'}
                </span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                />
              </label>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {attachments.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-4">Нет прикрепленных файлов</p>
                ) : (
                  attachments.map((file) => (
                    <div key={file.id} className="p-3 flex justify-between items-center text-sm hover:bg-slate-50">
                      <div className="flex items-center space-x-2 truncate">
                        <Paperclip size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate font-medium text-slate-700">{file.filename}</span>
                      </div>
                      <a
                        href={file.file}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline flex-shrink-0 font-medium ml-2"
                      >
                        Скачать
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            Закрыть
          </button>
          {activeSection === 'details' && (
            <button
              type="submit"
              form="task-form"
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}