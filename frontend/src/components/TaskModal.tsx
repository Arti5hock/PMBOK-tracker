import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { api } from '../api/client';
import { Trash2, MessageSquare, Paperclip, Users, X, Send, Flag, Edit2, Calendar } from 'lucide-react';

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
  // НОВЫЙ СТЕЙТ: Режим просмотра/редактирования
  const [isEditing, setIsEditing] = useState(false);
  
  const [activeSection, setActiveSection] = useState<'details' | 'comments' | 'attachments' | 'raci'>('details');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<number | ''>('');
  const [milestoneId, setMilestoneId] = useState<number | ''>(''); 
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [projectMilestones, setProjectMilestones] = useState<any[]>([]); 
  const [priority, setPriority] = useState('medium');
  const [type, setType] = useState('task');
  const [status, setStatus] = useState('todo');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [projectUsers, setProjectUsers] = useState<UserItem[]>([]);
  const [raciList, setRaciList] = useState<RaciItem[]>([]);
  const [newRaciUser, setNewRaciUser] = useState<number | ''>('');
  const [newRaciRole, setNewRaciRole] = useState<'R' | 'A' | 'C' | 'I'>('R');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      
      const activeProjectId = task ? task.project : projectId; 
      
      if (activeProjectId) {
        api.get(`/tasks/?project=${activeProjectId}`).then(res => {
          setProjectTasks(res.data.results || res.data);
        });
        api.get(`/milestones/?project=${activeProjectId}`).then(res => {
          setProjectMilestones(res.data.results || res.data);
        });
      }

      if (task) {
        setTitle(task.title || '');
        setDescription(task.description || '');
        setPriority(task.priority || 'medium');
        setType(task.type || 'task');
        setStatus(task.status || 'todo');
        setDueDate(task.due_date ? task.due_date.substring(0, 10) : '');
        setParentId(task.parent_task || '');
        setMilestoneId(task.milestone || '');
        fetchComments(task.id);
        fetchAttachments(task.id);
        setRaciList(task.raci_assignments || []);
        
        setIsEditing(false); // Существующую задачу открываем в режиме просмотра
      } else {
        setTitle('');
        setDescription('');
        setPriority('medium');
        setType('task');
        setStatus(defaultStatus || 'todo');
        setDueDate('');
        setParentId(parentTaskId || '');
        setMilestoneId('');
        setComments([]);
        setAttachments([]);
        setRaciList([]);
        
        setIsEditing(true); // Новую задачу сразу редактируем
      }
      setActiveSection('details');
    }
  }, [task, isOpen, defaultStatus, projectId, parentTaskId]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users/');
      setProjectUsers(res.data.results || res.data);
    } catch {
      console.warn('Не удалось загрузить пользователей.');
    }
  };

  const fetchComments = async (taskId: number) => {
    try {
      const res = await api.get(`/comments/?task=${taskId}`);
      setComments(res.data.results || res.data);
    } catch (e) {
      console.error('Ошибка', e);
    }
  };

  const fetchAttachments = async (taskId: number) => {
    try {
      const res = await api.get(`/attachments/?task=${taskId}`);
      setAttachments(res.data.results || res.data);
    } catch (e) {
      console.error('Ошибка', e);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      project: task ? task.project : projectId,
      title,
      description,
      priority,
      type,
      status,
      due_date: dueDate ? `${dueDate}T23:59:59Z` : null,
      parent_task: parentId ? Number(parentId) : null,
      milestone: milestoneId ? Number(milestoneId) : null,
    };

    try {
      if (task) {
        await api.patch(`/tasks/${task.id}/`, payload);
        // Если сохранили успешно - возвращаемся в режим просмотра
        setIsEditing(false);
        onSuccess(); // Перезагружаем данные снаружи
      } else {
        await api.post('/tasks/', payload);
        onSuccess();
        onClose(); // Новую задачу просто закрываем
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка сохранения задачи.');
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
      alert('Ошибка при удалении.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!task || !newCommentText.trim()) return;
    try {
      const res = await api.post(`/tasks/${task.id}/add_comment/`, {
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
      alert('Ошибка при загрузке файла.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleAddRaci = async () => {
    if (!task || !newRaciUser) return;
    if (newRaciRole === 'A' && raciList.some((r) => r.role === 'A')) {
      alert('У задачи может быть только один Accountable!');
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
      alert(error.response?.data?.role || 'Ошибка назначения.');
    }
  };

  const handleRemoveRaci = async (raciId?: number) => {
    if (!raciId) return;
    try {
      await api.delete(`/raci/${raciId}/`);
      setRaciList((prev) => prev.filter((r) => r.id !== raciId));
    } catch (error) {
      alert('Ошибка удаления.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* ШАПКА МОДАЛКИ */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {task ? `#${task.wbs_code || task.id}` : 'Новая задача'}
            </span>
            {isEditing ? (
              <h3 className="font-bold text-lg text-slate-800 mt-1">
                {task ? 'Редактирование задачи' : 'Создание задачи'}
              </h3>
            ) : (
              <h3 className="font-bold text-xl text-slate-800 mt-1">{title}</h3>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {task && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-colors"
              >
                <Edit2 size={14} /> Редактировать
              </button>
            )}
            {task && isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Удалить задачу"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ОСНОВНОЙ КОНТЕНТ */}
        {!isEditing ? (
          /* РЕЖИМ ПРОСМОТРА (ПАСПОРТ ЗАДАЧИ) */
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-8">
            
            {/* Беджи мета-информации */}
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 uppercase shadow-sm">
                Статус: <span className="text-blue-600">{status}</span>
              </span>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 uppercase shadow-sm">
                Приоритет: <span className={priority === 'critical' || priority === 'high' ? 'text-rose-600' : 'text-slate-800'}>{priority}</span>
              </span>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 uppercase shadow-sm">
                Тип: {type}
              </span>
              {dueDate && (
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm flex items-center gap-1">
                  <Calendar size={12} className="text-rose-500"/> {new Date(dueDate).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Описание */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Описание</h4>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-700 whitespace-pre-wrap min-h-[4rem]">
                {description || <span className="text-slate-400 italic">Описание отсутствует...</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* RACI Матрица (Сводка) */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider flex items-center gap-1">
                  <Users size={14}/> Команда (RACI)
                </h4>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                  {raciList.length === 0 ? (
                    <div className="p-4 text-xs text-slate-400 text-center">Роли не распределены</div>
                  ) : (
                    raciList.map(item => (
                      <div key={item.id} className="p-3 flex items-center gap-3 text-sm">
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                          item.role === 'A' ? 'bg-amber-100 text-amber-700' :
                          item.role === 'R' ? 'bg-blue-100 text-blue-700' :
                          item.role === 'C' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.role}
                        </span>
                        <span className="font-medium text-slate-800">{item.username}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Связи (Родитель и Веха) */}
              <div className="space-y-6">
                 <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Родительская задача</h4>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-sm">
                    {parentId ? (
                      <span className="text-blue-600 font-medium">#{projectTasks.find(t => t.id === parentId)?.wbs_code || parentId} {projectTasks.find(t => t.id === parentId)?.title}</span>
                    ) : (
                      <span className="text-slate-400">Корневая задача</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Привязка к вехе</h4>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-sm flex items-center gap-2">
                    <Flag size={14} className={milestoneId ? 'text-blue-600' : 'text-slate-300'}/>
                    {milestoneId ? (
                      <span className="font-medium text-slate-800">{projectMilestones.find(m => m.id === milestoneId)?.title}</span>
                    ) : (
                      <span className="text-slate-400">Не привязана</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Вложения */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider flex items-center gap-1">
                <Paperclip size={14}/> Вложенные файлы ({attachments.length})
              </h4>
              {attachments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {attachments.map(file => (
                    <a key={file.id} href={file.file} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-400 px-3 py-2 rounded-lg text-sm transition-colors shadow-sm">
                      <Paperclip size={14} className="text-slate-400" />
                      <span className="font-medium text-blue-600">{file.filename}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Нет файлов</p>
              )}
            </div>

            {/* Комментарии */}
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider flex items-center gap-1">
                <MessageSquare size={14}/> Обсуждение ({comments.length})
              </h4>
              <div className="space-y-4 mb-4">
                {comments.map((c) => (
                  <div key={c.id} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm text-slate-800">{c.author_name}</span>
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.text}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddComment} className="flex gap-2 relative">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Написать быстрый комментарий..."
                  className="flex-1 bg-white border border-slate-200 shadow-sm rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg transition-colors">
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* РЕЖИМ РЕДАКТИРОВАНИЯ (С ТАБАМИ) */
          <>
            <div className="flex border-b border-slate-200 bg-white px-6">
              <button
                onClick={() => setActiveSection('details')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeSection === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Параметры
              </button>
              {task && (
                <>
                  <button
                    onClick={() => setActiveSection('raci')}
                    className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                      activeSection === 'raci' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Users size={14} /> RACI ({raciList.length})
                  </button>
                  <button
                    onClick={() => setActiveSection('comments')}
                    className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                      activeSection === 'comments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <MessageSquare size={14} /> Комментарии
                  </button>
                  <button
                    onClick={() => setActiveSection('attachments')}
                    className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                      activeSection === 'attachments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Paperclip size={14} /> Файлы
                  </button>
                </>
              )}
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {activeSection === 'details' && (
                <form id="task-form" onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Название задачи</label>
                    <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Описание</label>
                    <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Родительская задача</label>
                      <select value={parentId} onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : '')} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Корневая --</option>
                        {projectTasks.filter(t => t.id !== task?.id).map(t => (
                          <option key={t.id} value={t.id}>#{t.wbs_code || t.id} {t.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1"><Flag size={12}/> Привязка к Вехе</label>
                      <select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value ? Number(e.target.value) : '')} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Без привязки --</option>
                        {projectMilestones.map(m => (
                          <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Статус</label>
                      <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                        <option value="backlog">Backlog</option>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Приоритет</label>
                      <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Тип</label>
                      <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                        <option value="task">Task</option>
                        <option value="story">Story</option>
                        <option value="epic">Epic</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Крайний срок</label>
                      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 text-slate-700" />
                    </div>
                  </div>
                </form>
              )}

              {activeSection === 'raci' && ( 
                <div className="space-y-4">
                  <div className="flex gap-2 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <select value={newRaciUser} onChange={(e) => setNewRaciUser(e.target.value ? Number(e.target.value) : '')} className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm">
                      <option value="">Выберите сотрудника</option>
                      {projectUsers.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                    <select value={newRaciRole} onChange={(e: any) => setNewRaciRole(e.target.value)} className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm font-medium">
                      <option value="R">Responsible</option>
                      <option value="A">Accountable</option>
                      <option value="C">Consulted</option>
                      <option value="I">Informed</option>
                    </select>
                    <button type="button" onClick={handleAddRaci} className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-md hover:bg-blue-700 transition">Добавить</button>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                    {raciList.map((item) => (
                      <div key={item.id} className="p-3 flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-800">{item.role} - {item.username}</span>
                        <button type="button" onClick={() => handleRemoveRaci(item.id)} className="text-slate-400 hover:text-rose-600 text-xs">Удалить</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'comments' && ( 
                <div className="space-y-4">
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {comments.map((c) => (
                      <div key={c.id} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-1"><span className="font-semibold text-xs text-slate-800">{c.author_name}</span></div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.text}</p>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input type="text" value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                    <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg"><Send size={16} /></button>
                  </form>
                </div>
              )}

              {activeSection === 'attachments' && ( 
                <div className="space-y-4">
                  <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition">
                    <Paperclip size={24} className="text-slate-400 mb-1" />
                    <span className="text-xs font-medium text-slate-600">{uploadingFile ? 'Загрузка...' : 'Нажмите для загрузки'}</span>
                    <input type="file" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
                  </label>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                    {attachments.map((file) => (
                      <div key={file.id} className="p-3 flex justify-between items-center text-sm hover:bg-slate-50">
                        <span className="truncate font-medium text-slate-700">{file.filename}</span>
                        <a href={file.file} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Скачать</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ФУТЕР */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end space-x-2">
          {isEditing && task ? (
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