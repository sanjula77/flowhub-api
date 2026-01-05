'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyProfile, getMyTeam, getProjects, deleteProject } from '@/lib/api';
import ProjectList from '@/components/projects/ProjectList';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import MainLayout from '@/components/layout/MainLayout';
import LoadingState from '@/components/ui/LoadingState';
import Alert from '@/components/ui/Alert';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { User } from '@/types/user';
import { Project } from '@/types/project';
import { FolderKanban, Plus } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  slug: string;
}

export default function ProjectsDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadProjectsData();
  }, []);

  const loadProjectsData = async () => {
    try {
      setLoading(true);
      setError('');

      const userData = await getMyProfile();
      setCurrentUser(userData);

      try {
        const teamData = await getMyTeam();
        setTeam(teamData);
      } catch (err) {
        // Error handled by catch block
      }

      const projectsData = await getProjects();
      setProjects(projectsData);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        router.push('/login');
        return;
      }
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = (newProject: Project) => {
    setProjects([newProject, ...projects]);
    setShowCreateModal(false);
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setDeleting(projectId);
      await deleteProject(projectId);
      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
    } finally {
      setDeleting(null);
    }
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

  if (loading) {
    return (
      <MainLayout
        userName={getUserDisplayName(currentUser)}
        userEmail={currentUser?.email}
        userRole={currentUser?.role as 'ADMIN' | 'USER'}
      >
        <LoadingState message="Loading projects..." />
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
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isAdmin
                ? 'Manage all projects across teams'
                : 'View projects in your team'}
            </p>
          </div>
          {isAdmin && team && (
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Project
            </Button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Projects List */}
        {projects.length > 0 ? (
          <ProjectList
            projects={projects}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onDelete={isAdmin ? handleDeleteProject : undefined}
            loading={false}
          />
        ) : (
          <Card>
            <CardContent>
              <EmptyState
                icon={<FolderKanban className="w-16 h-16 text-gray-300" />}
                title="No projects yet"
                description={
                  isAdmin
                    ? 'Get started by creating your first project'
                    : 'No projects have been created in your team yet'
                }
                action={
                  isAdmin && team ? (
                    <Button
                      variant="primary"
                      onClick={() => setShowCreateModal(true)}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Create Project
                    </Button>
                  ) : null
                }
              />
            </CardContent>
          </Card>
        )}

        {/* Create Project Modal */}
        {showCreateModal && team && (
          <CreateProjectModal
            teamId={team.id}
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleCreateProject}
          />
        )}
      </div>
    </MainLayout>
  );
}
