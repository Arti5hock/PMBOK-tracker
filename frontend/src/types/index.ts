export interface User {
  id: number;
  username: string;
  email: string;
  role?: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  wbs_code: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  parent: number | null;
  due_date: string | null;
  children?: Task[];
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  created_at: string;
}