import { useState, useEffect } from 'react';
import { api } from './api/client';
import { LogOut, Plus, Settings, Kanban, UserCircle } from 'lucide-react';

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


export default function App() {
  // 1. Аут и проекты
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // 2. Текущая вкладка (внутри проекта)
  const [currentView, setCurrentView] = useState<'wbs' | 'kanban' | 'raci' | 'my_tasks'>('kanban');

  // 3. Модалки
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [activeParentId, setActiveParentId] = useState<number | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // 4. Данные
  const [wbsTasks, setWbsTasks] = useState([]);

  // Проверка сессии при запуске
  useEffect(() => {
    checkAuth();
  }, []);

  // Если авторизован - тянем проекты
  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  // Загружаем WBS при выборе проекта и переходе на нужную вкладку
  useEffect(() => {
    if (selectedProjectId && currentView === 'wbs') {
      loadWbs();
    }
  }, [selectedProjectId, currentView]);

  const checkAuth = () => {
    const token = localStorage.getItem('access_token');
    setIsAuthenticated(!!token);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
    setSelectedProjectId(null);
    setProjects([]);
  };

  // Чистая функция загрузки проектов без костылей выбора по умолчанию
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

  if (!isAuthenticated) {
    return <LoginModal onSuccess={checkAuth} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* ШАПКА */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm z-10">
        {/* Клик по логотипу сбрасывает проект и кидает на Главную панель */}
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
                {/* Если мы на дашборде, показываем плейсхолдер */}
                {!selectedProjectId && <option value="" disabled>Выберите проект...</option>}
                
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              
              {/* Шестеренка активна только если проект выбран */}
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


          {/* НОВАЯ КНОПКА ПРОФИЛЯ */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition ml-2"
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
          /* ДАШБОРД (ГЛОБАЛЬНЫЙ ВИД) */
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
              refreshTrigger={isTaskModalOpen}
            />
          </div>
        ) : (
          /* ВНУТРЯНКА ПРОЕКТА (ЛОКАЛЬНЫЙ ВИД) */
          <>
            <div className="mb-6 border-b border-slate-200">
              <div className="flex space-x-6">
                <button 
                  onClick={() => setCurrentView('wbs')}
                  className={`py-3 text-sm font-semibold border-b-2 transition-colors ${currentView === 'wbs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Структура WBS
                </button>
                <button 
                  onClick={() => setCurrentView('kanban')}
                  className={`py-3 text-sm font-semibold border-b-2 transition-colors ${currentView === 'kanban' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Канбан-доска
                </button>
                <button 
                  onClick={() => setCurrentView('raci')}
                  className={`py-3 text-sm font-semibold border-b-2 transition-colors ${currentView === 'raci' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Матрица RACI
                </button>
                {/* Локальные задачи проекта */}
                <button 
                  onClick={() => setCurrentView('my_tasks')}
                  className={`py-3 text-sm font-semibold border-b-2 transition-colors ${currentView === 'my_tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Мои задачи
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {currentView === 'wbs' && (
                <WbsTree 
                  tasks={wbsTasks} 
                  onAddSubtask={(parentId) => {
                    setActiveParentId(parentId || null);
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                  onEditTask={(task) => {
                    setActiveParentId(null); 
                    setEditingTask(task);
                    setIsTaskModalOpen(true);
                  }}
                />
              )}
              {currentView === 'kanban' && <KanbanBoard projectId={selectedProjectId} />}
              
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

              {currentView === 'my_tasks' && (
                <MyTasks 
                  projectId={selectedProjectId} 
                  refreshTrigger={isTaskModalOpen}
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

      {/* МОДАЛКИ (ОТРИСОВКА ПОВЕРХ ВСЕГО) */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        project={editingProject}
        onSuccess={(newId) => {
          fetchProjects().then(() => {
            // Если мы сохранили/создали проект, переключаемся на него (если его не удалили)
            if (newId) setSelectedProjectId(newId);
          });
        }}
      />

      {/* ВАЖНО: Модалка задач рендерится всегда, но projectId может браться из открытой задачи */}
      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => {
          if (currentView === 'wbs') loadWbs();
        }}
        // Если проект выбран — передаем его. Иначе модалка возьмет ID из самой редактируемой задачи.
        projectId={selectedProjectId || 0} 
        task={editingTask}
        parentTaskId={activeParentId}
      />

      // Вызов Модалки профиля
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        onLogout={handleLogout} 
      />

    </div>
  );
}