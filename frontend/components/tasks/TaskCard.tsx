'use client';

import { Task, TaskStatus } from '@/types/task';
import { User } from '@/types/user';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Calendar, Edit, Trash2, UserCheck, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

interface TaskCardProps {
  task: Task;
  currentUser: User | null;
  isAdmin: boolean;
  isProjectCreator: boolean;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onAssign?: (taskId: string) => void;
}

const statusConfig: Record<TaskStatus, { label: string; variant: 'primary' | 'success' | 'warning' | 'gray' }> = {
  [TaskStatus.TODO]: { label: 'To Do', variant: 'gray' },
  [TaskStatus.IN_PROGRESS]: { label: 'In Progress', variant: 'primary' },
  [TaskStatus.DONE]: { label: 'Done', variant: 'success' },
};

export default function TaskCard({
  task,
  currentUser,
  isAdmin,
  isProjectCreator,
  onStatusChange,
  onEdit,
  onDelete,
  onAssign,
}: TaskCardProps) {
  const isAssignee = task.assignedToId === currentUser?.id;
  const canUpdateStatus = isAdmin || isAssignee;
  const canEdit = isAdmin || isProjectCreator;
  const canDelete = isAdmin || isProjectCreator;
  const canAssign = isAdmin || isProjectCreator;

  const statusInfo = statusConfig[task.status];
  const nextStatus = task.status === TaskStatus.TODO 
    ? TaskStatus.IN_PROGRESS 
    : task.status === TaskStatus.IN_PROGRESS 
    ? TaskStatus.DONE 
    : null;

  // Format dates consistently to prevent hydration mismatch
  const formattedDueDate = useMemo(() => {
    if (!task.dueDate) return null;
    try {
      const date = new Date(task.dueDate);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  }, [task.dueDate]);

  const formattedCreatedDate = useMemo(() => {
    try {
      const date = new Date(task.createdAt);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  }, [task.createdAt]);

  return (
    <Card hover>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
            {task.priority && (
              <Badge variant="warning" size="sm">P{task.priority}</Badge>
            )}
          </div>
          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{task.description}</p>
          )}
        </div>
        <Badge variant={statusInfo.variant} size="sm">
          {statusInfo.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {formattedDueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formattedDueDate}</span>
            </div>
          )}
        </div>
        {isAssignee && (
          <Badge variant="info" size="sm">
            <UserCheck className="w-3 h-3 mr-1" />
            Assigned to you
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          {canUpdateStatus && nextStatus && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onStatusChange?.(task.id, nextStatus)}
              leftIcon={<CheckCircle2 className="w-3 h-3" />}
            >
              Mark as {statusConfig[nextStatus].label}
            </Button>
          )}
          {task.status === TaskStatus.DONE && (
            <Badge variant="success" size="sm">
              Completed
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canAssign && onAssign && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAssign(task.id)}
              leftIcon={<UserCheck className="w-3 h-3" />}
            >
              Assign
            </Button>
          )}
          {canEdit && onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(task)}
              leftIcon={<Edit className="w-3 h-3" />}
            >
              Edit
            </Button>
          )}
          {canDelete && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
                  onDelete(task.id);
                }
              }}
              leftIcon={<Trash2 className="w-3 h-3" />}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
