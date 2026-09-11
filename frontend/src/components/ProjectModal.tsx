import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { X, Users, FolderKanban, Search, UserPlus, Crown } from 'lucide-react';

interface UserItem {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
}

const userLabel = (u: UserItem) => {
    const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return full ? `${full} (${u.username})` : u.username;
};

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
    const [loading, setLoading] = useState(false);

    // Поиск участников
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserItem[]>([]);
    const [searching, setSearching] = useState(false);
    const [memberDetails, setMemberDetails] = useState<UserItem[]>([]);
    const searchSeq = useRef(0);

    useEffect(() => {
        if (isOpen) {
            if (project) {
                setName(project.name || '');
                setDescription(project.description || '');

                // Жесткая проверка на валидность статуса по PMBOK
                const validStatuses = ['initiation', 'planning', 'executing', 'monitoring', 'closing', 'archived'];
                setStatus(validStatuses.includes(project.status) ? project.status : 'initiation');

                setStartDate(project.start_date || '');
                setEndDate(project.end_date || '');
                setMembers(project.members || []);
                setMemberDetails([]);
            } else {
                setName('');
                setDescription('');
                setStatus('initiation');
                setStartDate('');
                setEndDate('');
                setMembers([]);
                setMemberDetails([]);
            }
            setSearchQuery('');
            setSearchResults([]);
            setActiveTab('settings');
        }
    }, [project, isOpen]);

    // Догружаем подписи для уже добавленных участников: сериализатор проекта
    // отдаёт только их id, а показать надо имя и username.
    useEffect(() => {
        if (!isOpen || !members.length) return;
        const missing = members.filter(id => !memberDetails.some(m => m.id === id));
        if (!missing.length) return;

        const controller = new AbortController();
        api.get('/auth/users/', { signal: controller.signal })
            .then(res => {
                const list: UserItem[] = res.data.results || res.data;
                setMemberDetails(prev => {
                    const known = new Set(prev.map(u => u.id));
                    return [...prev, ...list.filter(u => !known.has(u.id))];
                });
            })
            .catch(() => undefined);

        return () => controller.abort();
    }, [isOpen, members, memberDetails]);

    // Поиск и правка команды доступны только владельцу проекта. Для нового
    // проекта владельцем станет текущий пользователь, поэтому ограничений нет.
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        api.get('/auth/me/')
            .then(res => setCurrentUserId(res.data.id ?? null))
            .catch(() => setCurrentUserId(null));
    }, [isOpen]);

    const canManageTeam = !project || (currentUserId !== null && project.owner === currentUserId);

    // Поиск пользователей с дебаунсом
    useEffect(() => {
        const query = searchQuery.trim();
        if (query.length < 2) {
            setSearchResults([]);
            setSearching(false);
            return;
        }

        const seq = ++searchSeq.current;
        setSearching(true);
        const timer = setTimeout(() => {
            api.get(`/auth/users/search/?search=${encodeURIComponent(query)}${project ? `&project=${project.id}` : ''}`)
                .then(res => {
                    if (seq !== searchSeq.current) return;
                    setSearchResults(res.data.results || res.data);
                })
                .catch(() => {
                    if (seq !== searchSeq.current) return;
                    setSearchResults([]);
                })
                .finally(() => {
                    if (seq === searchSeq.current) setSearching(false);
                });
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, project]);


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

    const addMember = (user: UserItem) => {
        setMembers(prev => (prev.includes(user.id) ? prev : [...prev, user.id]));
        setMemberDetails(prev => (prev.some(u => u.id === user.id) ? prev : [...prev, user]));
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeMember = (userId: number) => {
        setMembers(prev => prev.filter(id => id !== userId));
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
                        <div className="space-y-4">
                            <p className="text-xs text-slate-500">
                                {canManageTeam
                                    ? 'Найдите сотрудника по username, имени или фамилии и добавьте его в команду проекта. Участники получают доступ к задачам, доскам и вехам проекта.'
                                    : 'Состав команды может менять только владелец проекта. Здесь виден текущий состав.'}
                            </p>

                            {/* Поиск */}
                            {canManageTeam && (
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Введите минимум 2 символа..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            )}

                            {/* Результаты поиска */}
                            {canManageTeam && searchQuery.trim().length >= 2 && (
                                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-44 overflow-y-auto">
                                    {searching ? (
                                        <p className="p-3 text-center text-xs text-slate-400">Поиск...</p>
                                    ) : searchResults.length === 0 ? (
                                        <p className="p-3 text-center text-xs text-slate-400">Ничего не найдено</p>
                                    ) : (
                                        searchResults.map(user => (
                                            <button
                                                key={user.id}
                                                type="button"
                                                onClick={() => addMember(user)}
                                                className="w-full flex items-center justify-between gap-3 p-3 hover:bg-blue-50 transition-colors text-left"
                                            >
                                                <span className="text-sm font-medium text-slate-800">{userLabel(user)}</span>
                                                <UserPlus size={16} className="text-blue-600 shrink-0" />
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Текущий состав */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">
                                    В команде ({members.length})
                                </h4>
                                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
                                    {members.length === 0 ? (
                                        <p className="p-4 text-center text-sm text-slate-400">Команда пока пуста</p>
                                    ) : (
                                        members.map(id => {
                                            const user = memberDetails.find(u => u.id === id);
                                            const isProjectOwner = project?.owner === id;
                                            return (
                                                <div key={id} className="flex items-center justify-between gap-3 p-3">
                                                    <span className="flex items-center gap-2 text-sm font-medium text-slate-800 min-w-0">
                                                        {isProjectOwner && <Crown size={14} className="text-amber-500 shrink-0" />}
                                                        <span className="truncate">
                                                            {user ? userLabel(user) : `Пользователь #${id}`}
                                                        </span>
                                                    </span>
                                                    {!isProjectOwner && canManageTeam && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeMember(id)}
                                                            className="text-xs font-medium text-rose-600 hover:bg-rose-50 px-2 py-1 rounded transition shrink-0"
                                                        >
                                                            Убрать
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
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