'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProjects, getMyProfile, getTasks, getMyTeam, getTeamMembers } from '@/lib/api';
import { Project } from '@/types/project';
import { User } from '@/types/user';
import { Task, TaskStatus } from '@/types/task';
import MainLayout from '@/components/layout/MainLayout';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { 
  FolderKanbanIcon, 
  CheckSquareIcon, 
  UsersIcon,
  TrendingUpIcon,
  ClockIcon,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const userData = await getMyProfile();
      setCurrentUser(userData);

      // Load all data in parallel
      const [projectsData, tasksData] = await Promise.all([
        getProjects().catch((err) => {
          // Error handled by catch block
          return [];
        }),
        getTasks().catch((err) => {
          // Error handled by catch block
          return [];
        }),
      ]);

      setProjects(projectsData);
      setTasks(tasksData);

      // Load team members if user has a team
      try {
        const team = await getMyTeam();
        const members = await getTeamMembers(team.id).catch(() => []);
        setTeamMembers(members);
      } catch (err) {
        // User might not have a team, that's okay
        setTeamMembers([]);
      }
    } catch (err: any) {
      // Error already displayed to user via state
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        router.push('/login');
        return;
      }
      // Show more detailed error message
      const errorMsg = err.message || 'Failed to load dashboard data';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN';
  const recentProjects = projects.slice(0, 6);

  // Calculate stats
  const activeTasks = tasks.filter(
    (task) => task.status === TaskStatus.TODO || task.status === TaskStatus.IN_PROGRESS
  ).length;

  const thisWeekTasks = tasks.filter((task) => {
    const taskDate = new Date(task.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return taskDate >= weekAgo;
  }).length;

  // Get display name from user
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

  if (loading) {
    return (
      <MainLayout
        userName={getUserDisplayName(currentUser)}
        userEmail={currentUser?.email}
        userRole={currentUser?.role as 'ADMIN' | 'USER'}
      >
        <LoadingState message="Loading dashboard..." />
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {getUserDisplayName(currentUser)}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card hover>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Projects</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    {projects.length}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FolderKanbanIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card hover>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    {activeTasks}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckSquareIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card hover>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Team Members</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    {teamMembers.length || 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <UsersIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card hover>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    {thisWeekTasks}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <TrendingUpIcon className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        <Card>
          <CardHeader
            title="Recent Projects"
            subtitle={`${projects.length} total projects`}
            action={
              <Link href="/projects">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            }
          />
          <CardContent>
            {recentProjects.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      {isAdmin && (
                        <Badge variant="primary" size="sm">Admin</Badge>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <ClockIcon className="w-3 h-3" />
                      <span>Updated recently</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FolderKanbanIcon className="w-16 h-16 text-gray-300" />}
                title="No projects yet"
                description="Get started by creating your first project"
                action={
                  <Link href="/projects">
                    <Button>Create Project</Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Quick Actions (Admin Only) */}
        {isAdmin && (
          <Card>
            <CardHeader title="Admin Quick Actions" />
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Link href="/team">
                  <Button variant="outline" className="w-full justify-start">
                    <UsersIcon className="w-4 h-4 mr-2" />
                    Manage Teams
                  </Button>
                </Link>
                <Link href="/admin/settings">
                  <Button variant="outline" className="w-full justify-start">
                    <ClockIcon className="w-4 h-4 mr-2" />
                    System Settings
                  </Button>
                </Link>
                <Link href="/admin/analytics">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </Link>
                <Link href="/admin">
                  <Button variant="outline" className="w-full justify-start">
                    <CheckSquareIcon className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
