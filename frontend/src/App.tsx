import { useState, useEffect } from 'react';
import { api } from './api/client';
import { LogOut, Plus, Settings, Kanban, UserCircle, Bell, HelpCircle, Settings2 } from 'lucide-react';

// Компоненты
import { LoginModal } from './components/LoginModal';
import { ProjectModal } from './components/ProjectModal';
import { TaskModal } from './components/TaskModal';
import { WbsTree } from './components/WbsTree';
import KanbanBoard from './components/KanbanBoard';
import { Dashboard } from './components/Dashboard';
import { RaciMatrix } from './components/RaciMatrix';
import { MyTasks } from './components/MyTasks';
import { ProfileModal } from './components/ProfileModal';
import { RiskRegister } from './components/RiskRegister';
import { RiskModal } from './components/RiskModal';
import { NotificationPanel } from './components/NotificationPanel';
import { MilestonesList } from './components/MilestonesList';
import { MilestoneModal } from './components/MilestoneModal';
import { ModuleSettingsModal } from './components/ModuleSettingsModal';
import { HelpModal } from './components/HelpModal';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  // Инициализируем проект из памяти браузера
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => {
    const saved = localStorage.getItem('pmbok_projectId');
    return saved ? Number(saved) : null;
  });

  // Инициализируем вкладку из памяти браузера
  const [currentView, setCurrentView] = useState<'wbs' | 'kanban' | 'raci' | 'my_tasks' | 'risks' | 'milestones'>(() => {
    return (localStorage.getItem('pmbok_currentView') as any) || 'kanban';
  });

  // Модалки
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [activeParentId, setActiveParentId] = useState<number | null>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<any | null>(null);

  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any | null>(null);

  // Состояния для уведомлений
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Состояния для настроек модулей и справки
  const [isModuleSettingsOpen, setIsModuleSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [moduleSettings, setModuleSettings] = useState<{
    kanban: boolean;
    raci: boolean;
    milestones: boolean;
    risks: boolean;
  }>({ kanban: true, raci: true, milestones: true, risks: true });

  const [wbsTasks, setWbsTasks] = useState([]);

  // Синхронизация стейтов с localStorage
  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('pmbok_projectId', String(selectedProjectId));
    } else {
      localStorage.removeItem('pmbok_projectId');
    }
  }, [selectedProjectId]);

  useEffect(() => {
    localStorage.setItem('pmbok_currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedProjectId && currentView === 'wbs') {
      loadWbs();
    }
  }, [selectedProjectId, currentView]);

  // Загрузка настроек модулей при авторизации
  useEffect(() => {
    if (isAuthenticated) {
      loadModuleSettings();
    }
  }, [isAuthenticated]);

  const checkAuth = () => {
    const token = localStorage.getItem('access_token');
    setIsAuthenticated(!!token);
  };

  const loadModuleSettings = async () => {
    try {
      const res = await api.get('/auth/me/');
      if (res.data.module_settings) {
        setModuleSettings(res.data.module_settings);
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек модулей', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // Зачищаем память при выходе
    localStorage.removeItem('pmbok_projectId');
    localStorage.removeItem('pmbok_currentView');

    setIsAuthenticated(false);
    setSelectedProjectId(null);
    setProjects([]);
    setUnreadCount(0);
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects/');
      const data = res.data.results || res.data;
      setProjects(data);
    } catch (error) {
      console.error('Ошибка загрузки проектов', error);
      if ((error as any).response?.status === 401) {
        handleLogout();
      }
    }
  };

  const loadWbs = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await api.get(`/tasks/wbs_tree/?project=${selectedProjectId}`);
      setWbsTasks(res.data);
    } catch (error) {
      console.error("Ошибка загрузки WBS", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread_count/');
      setUnreadCount(res.data.unread_count || 0);
    } catch (error) {
      console.error('Ошибка загрузки счетчика уведомлений', error);
    }
  };

  if (!isAuthenticated) {
    return <LoginModal onSuccess={checkAuth} />;
  }

  const refreshCounter = isTaskModalOpen || isRiskModalOpen;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

      {/* ШАПКА */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm z-10">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setSelectedProjectId(null)}
          title="На главную"
        >
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Kanban size={20} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">PMBOK Tracker</h1>
        </div>

        <div className="flex items-center space-x-3">
          {projects.length > 0 ? (
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-1">
              <select
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                className="bg-transparent text-slate-800 text-sm pl-2 py-1 font-medium focus:outline-none cursor-pointer"
              >
                {!selectedProjectId && <option value="" disabled>Выберите проект...</option>}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {selectedProjectId && (
                <button
                  onClick={() => {
                    setEditingProject(projects.find(p => p.id === selectedProjectId) || null);
                    setIsProjectModalOpen(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded transition"
                  title="Настройки проекта"
                >
                  <Settings size={16} />
                </button>
              )}
            </div>
          ) : (
            <span className="text-sm text-slate-500 font-medium">Нет проектов</span>
          )}

          <button
            onClick={() => {
              setEditingProject(null);
              setIsProjectModalOpen(true);
            }}
            className="flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-sm font-semibold transition"
          >
            <Plus size={16} />
            Новый проект
          </button>

          {/* КОЛОКОЛЬЧИК УВЕДОМЛЕНИЙ */}
          <button
            onClick={() => setIsNotifPanelOpen(true)}
            className="relative p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition ml-2"
            title="Уведомления"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
            )}
          </button>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
            title="Профиль"
          >
            <UserCircle size={18} />
          </button>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
            title="Выйти"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* РАБОЧАЯ ОБЛАСТЬ */}
      <main className="flex-1 overflow-hidden flex flex-col p-6 max-w-7xl mx-auto w-full">
        {!selectedProjectId ? (
          <div className="flex-1 overflow-y-auto pr-2">
            <Dashboard
              projects={projects}
              onSelectProject={setSelectedProjectId}
              onNewProject={() => {
                setEditingProject(null);
                setIsProjectModalOpen(true);
              }}
              onOpenTask={(task) => {
                setActiveParentId(null);
                setEditingTask(task);
                setIsTaskModalOpen(true);
              }}
              refreshTrigger={!!refreshCounter}
            />
          </div>
        ) : (
          <>
            {/* ТАБЫ НАВИГАЦИИ ПРОЕКТА */}
            <div className="mb-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex space-x-6">
                  {moduleSettings.kanban && (
                    <button
                      onClick={() => setCurrentView('kanban')}
                      className={`py-3 text-sm font-semibold border-b-2 transition-colors ${currentView === 'kanban' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                      Канбан-доска
                    </button>
                  )}
                  {moduleSettings.milestones && (
                    <button
                      onClick={() => setCurrentView('milestones')}
                      className={`py-3 text-sm font-semibold border-b-2 transition-colors ${currentView === 'milestones' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                      Вехи проекта
                    </button>
                  )}
                  <button
                    onClick={() => setCurrentView('wbs')}
                    className={`py-3 text-sm font-semibold border-b-2 transition-colors ${currentView === 'wbs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                    Структура WBS
                  </button>
                  {moduleSettings.raci && (
                    <button
                      onClick={() => setCurrentView('raci')}
                      className={`py-3 text-sm font-semibold border-b-2 transition-colors ${currentView === 'raci' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                      Матрица RACI
                    </button>
                  )}
                  {moduleSettings.risks && (
                    <button
                      onClick={() => setCurrentView('risks')}
                      className={`py-3 text-sm font-semibold border-b-2 transition-colors ${currentView === 'risks' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                      Реестр рисков
                    </button>
                  )}
                  <button
                    onClick={() => setCurrentView('my_tasks')}
                    className={`py-3 text-sm font-semibold border-b-2 transition-colors ${currentView === 'my_tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                    Мои задачи
                  </button>
                </div>

                {/* Кнопки настроек модулей и справки */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsModuleSettingsOpen(true)}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                    title="Настройка модулей"
                  >
                    <Settings2 size={18} />
                  </button>
                  <button
                    onClick={() => setIsHelpOpen(true)}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                    title="Справка"
                  >
                    <HelpCircle size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* КОНТЕНТ ПРОЕКТА */}
            <div className="flex-1 overflow-y-auto pr-2">
              {currentView === 'kanban' && <KanbanBoard projectId={selectedProjectId} />}

              {currentView === 'milestones' && (
                <MilestonesList
                  projectId={selectedProjectId}
                  refreshTrigger={isMilestoneModalOpen}
                  onOpenModal={(milestone) => {
                    setEditingMilestone(milestone || null);
                    setIsMilestoneModalOpen(true);
                  }}
                />
              )}

              {currentView === 'wbs' && (
                <WbsTree 
                  tasks={wbsTasks} 
                  onAddSubtask={(parentId) => {
                    setActiveParentId(parentId || null);
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                  onEditTask={async (node) => {
                    // Запрашиваем полные данные задачи перед открытием
                    try {
                      const res = await api.get(`/tasks/${node.id}/`);
                      setActiveParentId(null); 
                      setEditingTask(res.data);
                      setIsTaskModalOpen(true);
                    } catch (error) {
                      console.error("Ошибка при загрузке задачи", error);
                      alert('Не удалось загрузить данные задачи.');
                    }
                  }}
                />
              )}

              {currentView === 'raci' && (
                <RaciMatrix
                  projectId={selectedProjectId}
                  onOpenTask={(task) => {
                    setActiveParentId(null);
                    setEditingTask(task);
                    setIsTaskModalOpen(true);
                  }}
                />
              )}

              {currentView === 'risks' && (
                <RiskRegister
                  projectId={selectedProjectId}
                  onOpenRiskModal={(risk) => {
                    setEditingRisk(risk || null);
                    setIsRiskModalOpen(true);
                  }}
                />
              )}

              {currentView === 'my_tasks' && (
                <MyTasks
                  projectId={selectedProjectId}
                  refreshTrigger={!!refreshCounter}
                  onOpenTask={(task) => {
                    setActiveParentId(null);
                    setEditingTask(task);
                    setIsTaskModalOpen(true);
                  }}
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* МОДАЛКИ И ПАНЕЛИ */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        project={editingProject}
        onSuccess={(newId) => {
          fetchProjects().then(() => {
            if (newId) setSelectedProjectId(newId);
          });
        }}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => {
          if (currentView === 'wbs') loadWbs();
        }}
        projectId={selectedProjectId || 0}
        task={editingTask}
        parentTaskId={activeParentId}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onLogout={handleLogout}
      />

      <RiskModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        onSuccess={() => setCurrentView('risks')}
        projectId={selectedProjectId || 0}
        risk={editingRisk}
      />

      {/* БОКОВАЯ ПАНЕЛЬ УВЕДОМЛЕНИЙ */}
      <NotificationPanel
        isOpen={isNotifPanelOpen}
        onClose={() => setIsNotifPanelOpen(false)}
        onUnreadChanged={fetchUnreadCount}
        onOpenTask={(task) => {
          setActiveParentId(null);
          setEditingTask(task);
          setIsTaskModalOpen(true);
        }}
      />
      <MilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        onSuccess={() => {
          // Вызываем ререндер (передергиваем стейт)
          setCurrentView('milestones');
        }}
        projectId={selectedProjectId || 0}
        milestone={editingMilestone}
      />

      {/* МОДАЛКА НАСТРОЙКИ МОДУЛЕЙ */}
      <ModuleSettingsModal
        isOpen={isModuleSettingsOpen}
        onClose={() => setIsModuleSettingsOpen(false)}
        onSuccess={() => {
          loadModuleSettings();
        }}
      />

      {/* МОДАЛКА СПРАВКИ */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}