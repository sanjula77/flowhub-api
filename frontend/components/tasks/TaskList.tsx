'use client';

import { Task, TaskStatus } from '@/types/task';
import { User } from '@/types/user';
import TaskCard from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  currentUser: User | null;
  isAdmin: boolean;
  isProjectCreator: boolean;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onAssign?: (taskId: string) => void;
  loading?: boolean;
}

export default function TaskList({
  tasks,
  currentUser,
  isAdmin,
  isProjectCreator,
  onStatusChange,
  onEdit,
  onDelete,
  onAssign,
  loading,
}: TaskListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <svg
          className="w-16 h-16 mx-auto text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-gray-500 text-lg font-medium mb-2">No tasks found</p>
        <p className="text-gray-400 text-sm">Create your first task to get started</p>
      </div>
    );
  }

  // Group tasks by status
  const tasksByStatus = {
    [TaskStatus.TODO]: tasks.filter((t) => t.status === TaskStatus.TODO),
    [TaskStatus.IN_PROGRESS]: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS),
    [TaskStatus.DONE]: tasks.filter((t) => t.status === TaskStatus.DONE),
  };

  return (
    <div className="space-y-6">
      {/* TODO Tasks */}
      {tasksByStatus[TaskStatus.TODO].length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            To Do ({tasksByStatus[TaskStatus.TODO].length})
          </h3>
          <div className="space-y-4">
            {tasksByStatus[TaskStatus.TODO].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                currentUser={currentUser}
                isAdmin={isAdmin}
                isProjectCreator={isProjectCreator}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
                onAssign={onAssign}
              />
            ))}
          </div>
        </div>
      )}

      {/* IN_PROGRESS Tasks */}
      {tasksByStatus[TaskStatus.IN_PROGRESS].length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
            In Progress ({tasksByStatus[TaskStatus.IN_PROGRESS].length})
          </h3>
          <div className="space-y-4">
            {tasksByStatus[TaskStatus.IN_PROGRESS].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                currentUser={currentUser}
                isAdmin={isAdmin}
                isProjectCreator={isProjectCreator}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
                onAssign={onAssign}
              />
            ))}
          </div>
        </div>
      )}

      {/* DONE Tasks */}
      {tasksByStatus[TaskStatus.DONE].length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            Done ({tasksByStatus[TaskStatus.DONE].length})
          </h3>
          <div className="space-y-4">
            {tasksByStatus[TaskStatus.DONE].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                currentUser={currentUser}
                isAdmin={isAdmin}
                isProjectCreator={isProjectCreator}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
                onAssign={onAssign}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

