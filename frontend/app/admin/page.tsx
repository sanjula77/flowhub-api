'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyProfile, getProjects, getTasks, getMyTeam, getTeamMembers } from '@/lib/api';
import { User } from '@/types/user';
import { Project } from '@/types/project';
import { Task } from '@/types/task';
import MainLayout from '@/components/layout/MainLayout';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  ShieldCheck,
  Users,
  FolderKanban,
  CheckSquare,
  BarChart3,
  Settings,
  TrendingUp,
  AlertCircle,
  UserCheck,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError('');

      const userData = await getMyProfile();
      setCurrentUser(userData);

      // Check if user is admin
      if (userData.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }

      // Load all data in parallel
      const [projectsData, tasksData] = await Promise.all([
        getProjects().catch(() => []),
        getTasks().catch(() => []),
      ]);

      setProjects(projectsData);
      setTasks(tasksData);

      // Load team members if user has a team
      try {
        const team = await getMyTeam();
        const members = await getTeamMembers(team.id).catch(() => []);
        setTeamMembers(members);
      } catch (err) {
        setTeamMembers([]);
      }
    } catch (err: any) {
      // Error already displayed to user via state
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        router.push('/login');
        return;
      }
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

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

  // Calculate statistics
  const totalUsers = teamMembers.length;
  const totalProjects = projects.length;
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter(
    (task) => task.status === 'TODO' || task.status === 'IN_PROGRESS'
  ).length;
  const completedTasks = tasks.filter((task) => task.status === 'DONE').length;

  if (loading) {
    return (
      <MainLayout
        userName={getUserDisplayName(currentUser)}
        userEmail={currentUser?.email}
        userRole={currentUser?.role as 'ADMIN' | 'USER'}
      >
        <LoadingState message="Loading admin panel..." />
      </MainLayout>
    );
  }

  if (currentUser?.role !== 'ADMIN') {
    return null; // Will redirect
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
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          <p className="text-sm text-gray-500">
            Manage users, projects, tasks, and system settings
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card hover>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{totalUsers}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card hover>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Projects</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{totalProjects}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FolderKanban className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card hover>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{totalTasks}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckSquare className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card hover>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{activeTasks}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader
            title="Quick Actions"
            subtitle="Common administrative tasks"
          />
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link href="/team">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Teams
                </Button>
              </Link>
              <Link href="/projects">
                <Button variant="outline" className="w-full justify-start">
                  <FolderKanban className="w-4 h-4 mr-2" />
                  Manage Projects
                </Button>
              </Link>
              <Link href="/tasks">
                <Button variant="outline" className="w-full justify-start">
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Manage Tasks
                </Button>
              </Link>
              <Link href="/admin/analytics">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </Link>
              <Link href="/admin/settings">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  System Settings
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              {projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.slice(0, 5).map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="block p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{project.name}</h3>
                          {project.description && (
                            <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="primary" size="sm">
                          Active
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FolderKanban className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No projects yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Status Overview */}
          <Card>
            <CardHeader
              title="Task Status Overview"
              subtitle="Current task distribution"
            />
            <CardContent>
              {tasks.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Total Tasks</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{totalTasks}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-medium text-gray-700">Active Tasks</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{activeTasks}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium text-gray-700">Completed</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{completedTasks}</span>
                  </div>
                  <Link href="/tasks">
                    <Button variant="outline" className="w-full mt-4">
                      View All Tasks
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No tasks yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System Information */}
        <Card>
          <CardHeader
            title="System Information"
            subtitle="Platform status and details"
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Admin Status</span>
                </div>
                <Badge variant="success" size="sm" className="mt-1">
                  Active
                </Badge>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Team Members</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{totalUsers}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

