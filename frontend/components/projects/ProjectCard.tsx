'use client';

import { Project } from '@/types/project';
import { User } from '@/types/user';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Calendar, Edit, Trash2 } from 'lucide-react';
import { useMemo } from 'react';

interface ProjectCardProps {
  project: Project;
  currentUser: User | null;
  isAdmin: boolean;
  onEdit?: (project: Project) => void;
  onDelete?: (projectId: string) => void;
}

export default function ProjectCard({
  project,
  currentUser,
  isAdmin,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const isCreator = project.createdById === currentUser?.id;

  // Format date consistently to prevent hydration mismatch
  const formattedDate = useMemo(() => {
    try {
      const date = new Date(project.createdAt);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  }, [project.createdAt]);

  return (
    <Card hover>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
            {isCreator && (
              <Badge variant="primary" size="sm">Creator</Badge>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>{formattedDate}</span>
        </div>

        {isAdmin && (onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(project)}
                leftIcon={<Edit className="w-3 h-3" />}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
                    onDelete(project.id);
                  }
                }}
                leftIcon={<Trash2 className="w-3 h-3" />}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
