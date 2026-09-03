import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { X, CheckCheck, MessageSquare, AlertTriangle, UserPlus, Info, Bell, Trash2 } from 'lucide-react';

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    // Передаем функцию открытия задачи, чтобы проваливаться в нее по клику
    onOpenTask: (task: any) => void;
    // Функция для обновления счетчика в шапке
    onUnreadChanged: () => void;
}

const typeConfig: Record<string, { icon: any, color: string, bg: string }> = {
    task_assigned: { icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50' },
    task_commented: { icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    deadline_approaching: { icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
    task_status_changed: { icon: Info, color: 'text-amber-600', bg: 'bg-amber-50' },
    system: { icon: Bell, color: 'text-slate-600', bg: 'bg-slate-100' },
};

export const NotificationPanel = ({ isOpen, onClose, onOpenTask, onUnreadChanged }: NotificationPanelProps) => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Грузим список только когда панель открывается
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications/');
            setNotifications(res.data.results || res.data);
        } catch (e) {
            console.error('Ошибка загрузки уведомлений', e);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.post('/notifications/mark_all_as_read/');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            onUnreadChanged();
        } catch (e) {
            console.error('Ошибка при отметке прочитанными', e);
        }
    };

    const handleNotificationClick = async (notification: any) => {
        // 1. Отмечаем как прочитанное (если еще нет)
        if (!notification.is_read) {
            try {
                await api.post(`/notifications/${notification.id}/mark_as_read/`);
                setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
                onUnreadChanged();
            } catch (e) {
                console.error('Не удалось отметить как прочитанное', e);
            }
        }

        // 2. Если к уведомлению привязана задача — скачиваем ее целиком и открываем модалку
        if (notification.task) {
            try {
                const res = await api.get(`/tasks/${notification.task}/`);
                onOpenTask(res.data);
                onClose(); // Закрываем панель уведомлений
            } catch (e) {
                alert('Задача была удалена или к ней нет доступа.');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Затемнение фона */}
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />

            {/* Сама панель (выезжает справа) */}
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">

                {/* Шапка панели */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Bell size={20} className="text-slate-600" />
                        Уведомления
                    </h3>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleMarkAllAsRead}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Отметить все как прочитанные"
                        >
                            <CheckCheck size={18} />
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Список */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading && notifications.length === 0 ? (
                        <div className="text-center text-slate-500 py-12">Синхронизация...</div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCheck className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                            <p className="text-slate-600 font-medium">Всё прочитано</p>
                            <p className="text-slate-400 text-xs mt-1">Новых событий пока нет.</p>
                        </div>
                    ) : (
                        notifications.map(notif => {
                            const config = typeConfig[notif.notification_type] || typeConfig.system;
                            const Icon = config.icon;

                            return (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer flex gap-3 ${notif.is_read
                                            ? 'bg-slate-50 border-slate-100 opacity-70 hover:bg-slate-100'
                                            : 'bg-white border-blue-200 shadow-sm hover:border-blue-400'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                                        <Icon size={20} className={config.color} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-sm font-bold truncate pr-2 ${notif.is_read ? 'text-slate-600' : 'text-slate-800'}`}>
                                                {notif.title}
                                            </h4>
                                            <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                                                {new Date(notif.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 leading-snug line-clamp-2">
                                            {notif.message}
                                        </p>
                                        {notif.task_title && (
                                            <p className="text-[10px] font-mono font-semibold text-blue-600 mt-2 truncate">
                                                Задача: {notif.task_title}
                                            </p>
                                        )}
                                    </div>
                                    {!notif.is_read && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
};