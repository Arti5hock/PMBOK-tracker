import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { X, Users, FolderKanban } from 'lucide-react';

interface UserItem {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
}

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newProjectId?: number) => void;
    project: any | null; // Если null - создаем новый
}

export function ProjectModal({ isOpen, onClose, onSuccess, project }: ProjectModalProps) {
    const [activeTab, setActiveTab] = useState<'settings' | 'team'>('settings');

    // Поля проекта
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('initiation');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [members, setMembers] = useState<number[]>([]);

    // Данные для селекторов
    const [allUsers, setAllUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            if (project) {
                setName(project.name || '');
                setDescription(project.description || '');

                // Жесткая проверка на валидность статуса по PMBOK
                const validStatuses = ['initiation', 'planning', 'executing', 'monitoring', 'closing', 'archived'];
                setStatus(validStatuses.includes(project.status) ? project.status : 'initiation');

                setStartDate(project.start_date || '');
                setEndDate(project.end_date || '');
                setMembers(project.members || []);
            } else {
                setName('');
                setDescription('');
                setStatus('initiation');
                setStartDate('');
                setEndDate('');
                setMembers([]);
            }
            setActiveTab('settings');
        }
    }, [project, isOpen]);


    const fetchUsers = async () => {
        try {
            const res = await api.get('/auth/users/');
            setAllUsers(res.data.results || res.data);
        } catch (e) {
            console.error('Ошибка загрузки пользователей', e);
        }
    };

    const handleDelete = async () => {
        if (!project) return;
        if (!window.confirm(`Точно сносим проект "${project.name}"? Это навсегда убьет все его задачи, доски и вложения.`)) return;

        setLoading(true);
        try {
            await api.delete(`/projects/${project.id}/`);
            onSuccess(undefined); // Сбрасываем выбранный проект в App.tsx
            onClose();
        } catch (error) {
            alert('Не удалось удалить проект. Возможно, на сервере сработала защита базы данных.');
        } finally {
            setLoading(false);
        }
    };

    // Убрали FormEvent, теперь это обычная функция
    const handleSave = async () => {
        if (!name.trim()) {
            alert('Название проекта обязательно!');
            setActiveTab('settings');
            return;
        }

        setLoading(true);

        const payload = {
            name,
            description,
            status,
            start_date: startDate || null,
            end_date: endDate || null,
            members
        };

        try {
            let savedProjectId;
            if (project) {
                await api.patch(`/projects/${project.id}/`, payload);
                savedProjectId = project.id;
            } else {
                const res = await api.post('/projects/', payload);
                savedProjectId = res.data.id;
            }
            onSuccess(savedProjectId);
            onClose();
        } catch (error: any) {
            // Расширенный вывод ошибки, чтобы не гадать, если бэкенд ругается
            console.error('Ошибка бэкенда:', error.response?.data);
            alert(JSON.stringify(error.response?.data) || 'Ошибка сохранения проекта.');
        } finally {
            setLoading(false);
        }
    };

    const toggleMember = (userId: number) => {
        setMembers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 flex flex-col">
                {/* Шапка */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <FolderKanban size={20} className="text-blue-600" />
                        {project ? 'Настройки проекта' : 'Новый проект'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Вкладки */}
                <div className="flex border-b border-slate-200 bg-white px-6">
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        Параметры
                    </button>
                    <button
                        onClick={() => setActiveTab('team')}
                        className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${activeTab === 'team' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <Users size={14} />
                        Команда ({members.length})
                    </button>
                </div>

                {/* Контент */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {activeTab === 'settings' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Название проекта *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Внедрение ERP..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Описание / Цели</label>
                                <textarea
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Статус PMBOK</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="initiation">Инициация</option>
                                        <option value="planning">Планирование</option>
                                        <option value="executing">Исполнение</option>
                                        <option value="monitoring">Мониторинг</option>
                                        <option value="closing">Завершение</option>
                                        <option value="archived">Архив</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Старт</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Финиш</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'team' && (
                        <div className="space-y-2">
                            <p className="text-xs text-slate-500 mb-4">
                                Отметьте сотрудников, которые будут иметь доступ к задачам и доскам этого проекта. Вы (как создатель) добавляетесь автоматически.
                            </p>
                            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
                                {allUsers.length === 0 ? (
                                    <p className="p-4 text-center text-sm text-slate-400">Нет доступных пользователей</p>
                                ) : (
                                    allUsers.map(user => (
                                        <label key={user.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={members.includes(user.id)}
                                                onChange={() => toggleMember(user.id)}
                                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-slate-800">
                                                {user.first_name ? `${user.first_name} (${user.username})` : user.username}
                                            </span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Подвал */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        {project && (
                            <button 
                                type="button" 
                                onClick={handleDelete}
                                disabled={loading}
                                className="px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-100 rounded-lg transition disabled:opacity-50"
                            >
                                Удалить проект
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition">
                            Отмена
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                        >
                            {loading ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}