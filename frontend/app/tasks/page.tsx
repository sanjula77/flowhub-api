'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getMyProfile, getProjects, getTasks, updateTaskStatus, deleteTask } from '@/lib/api';
import TaskList from '@/components/tasks/TaskList';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import AssignTaskModal from '@/components/tasks/AssignTaskModal';
import MainLayout from '@/components/layout/MainLayout';
import LoadingState from '@/components/ui/LoadingState';
import Alert from '@/components/ui/Alert';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import { User } from '@/types/user';
import { Project } from '@/types/project';
import { Task, TaskStatus } from '@/types/task';
import { CheckSquare, Plus, Filter } from 'lucide-react';

function TasksDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectIdParam);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadTasks();
    }
  }, [selectedProjectId, selectedStatus]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const userData = await getMyProfile();
      setCurrentUser(userData);

      const projectsData = await getProjects();
      setProjects(projectsData);

      await loadTasks();
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        router.push('/login');
        return;
      }
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const tasksData = await getTasks(selectedProjectId || undefined, selectedStatus || undefined);
      setTasks(tasksData);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    }
  };

  const handleCreateTask = (newTask: Task) => {
    setTasks([newTask, ...tasks]);
    setShowCreateModal(false);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      await loadTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
    }
  };

  const handleAssignSuccess = async () => {
    setAssigningTaskId(null);
    await loadTasks();
  };

  const getUserDisplayName = (user: User | null): string => {
    if (!user) return 'User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    return user.email.split('@')[0];
  };

  const isAdmin = currentUser?.role === 'ADMIN';
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const isProjectCreator = selectedProject?.createdById === currentUser?.id;

  if (loading) {
    return (
      <MainLayout
        userName={getUserDisplayName(currentUser)}
        userEmail={currentUser?.email}
        userRole={currentUser?.role as 'ADMIN' | 'USER'}
      >
        <LoadingState message="Loading tasks..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout
      userName={getUserDisplayName(currentUser)}
      userEmail={currentUser?.email}
      userRole={currentUser?.role as 'ADMIN' | 'USER'}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isAdmin
                ? 'Manage all tasks across projects'
                : 'View and manage tasks in your team'}
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              if (!selectedProjectId && projects.length > 0) {
                // If no project selected but projects exist, show message
                setError('Please select a project first to create a task');
              } else if (projects.length === 0) {
                setError('No projects available. Please create a project first.');
              } else {
                setShowCreateModal(true);
              }
            }}
            leftIcon={<Plus className="w-4 h-4" />}
            disabled={projects.length === 0}
          >
            Create Task
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader
            title="Filters"
            subtitle="Filter tasks by project and status"
            action={<Filter className="w-5 h-5 text-gray-400" />}
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Project"
                value={selectedProjectId || ''}
                onChange={(e) => {
                  const projectId = e.target.value || null;
                  setSelectedProjectId(projectId);
                  if (projectId) {
                    router.push(`/tasks?projectId=${projectId}`);
                  } else {
                    router.push('/tasks');
                  }
                }}
                options={[
                  { value: '', label: 'All Projects' },
                  ...projects.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />

              <Select
                label="Status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: TaskStatus.TODO, label: 'To Do' },
                  { value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
                  { value: TaskStatus.DONE, label: 'Done' },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Tasks List */}
        {tasks.length > 0 ? (
          <TaskList
            tasks={tasks}
            currentUser={currentUser}
            isAdmin={isAdmin}
            isProjectCreator={isProjectCreator}
            onStatusChange={handleStatusChange}
            onDelete={isAdmin || isProjectCreator ? handleDeleteTask : undefined}
            onAssign={isAdmin || isProjectCreator ? (taskId) => setAssigningTaskId(taskId) : undefined}
            loading={false}
          />
        ) : (
          <Card>
            <CardContent>
              <EmptyState
                icon={<CheckSquare className="w-16 h-16 text-gray-300" />}
                title="No tasks found"
                description={
                  selectedProjectId
                    ? 'No tasks in this project. Create your first task to get started.'
                    : 'No tasks found. Select a project or create a new task.'
                }
                action={
                  projects.length > 0 ? (
                    <Button
                      variant="primary"
                      onClick={() => setShowCreateModal(true)}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Create Task
                    </Button>
                  ) : null
                }
              />
            </CardContent>
          </Card>
        )}

        {/* Create Task Modal */}
        {showCreateModal && (
          <CreateTaskModal
            projectId={selectedProjectId || undefined}
            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleCreateTask}
          />
        )}

        {/* Assign Task Modal */}
        {assigningTaskId && selectedProject && (
          <AssignTaskModal
            taskId={assigningTaskId}
            teamId={selectedProject.teamId}
            currentAssignedToId={tasks.find((t) => t.id === assigningTaskId)?.assignedToId}
            onClose={() => setAssigningTaskId(null)}
            onSuccess={handleAssignSuccess}
          />
        )}
      </div>
    </MainLayout>
  );
}

export default function TasksDashboard() {
  return (
    <Suspense fallback={<LoadingState fullScreen message="Loading..." />}>
      <TasksDashboardContent />
    </Suspense>
  );
}
