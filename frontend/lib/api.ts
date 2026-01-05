/**
 * API integration utilities for team dashboard
 * Handles secure API calls with cookie-based authentication
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
import { fetchWithAuth } from './auth';
import { Project, CreateProjectDto, UpdateProjectDto } from '@/types/project';

/**
 * Get current user's team
 */
export async function getMyTeam() {
  const res = await fetchWithAuth(`${API_URL}/teams/me`);
  if (!res.ok) {
    throw new Error('Failed to load team');
  }
  return res.json();
}

/**
 * Get current user profile
 */
export async function getMyProfile() {
  const res = await fetchWithAuth(`${API_URL}/users/me`);
  if (!res.ok) {
    throw new Error('Failed to load profile');
  }
  return res.json();
}

/**
 * Get team members
 * Requires ADMIN role or team admin status
 */
export async function getTeamMembers(teamId: string) {
  const res = await fetchWithAuth(`${API_URL}/users/team/${teamId}`);
  if (!res.ok) {
    throw new Error('Failed to load team members');
  }
  return res.json();
}

/**
 * Invite user to team
 * Requires ADMIN role or team admin status
 */
export async function inviteUser(data: {
  email: string;
  teamId: string;
  role: 'USER' | 'ADMIN';
  customMessage?: string;
}) {
  const res = await fetchWithAuth(`${API_URL}/invitations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to send invitation');
  }

  return res.json();
}

/**
 * Remove user from team
 * Requires ADMIN role
 */
export async function removeUser(userId: string) {
  const res = await fetchWithAuth(`${API_URL}/users/${userId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to remove user');
  }
}

/**
 * Get all tasks (role-based)
 * ADMIN: Returns all tasks
 * USER: Returns only tasks from their team
 */
export async function getTasks(projectId?: string, status?: string) {
  const params = new URLSearchParams();
  if (projectId) params.append('projectId', projectId);
  if (status) params.append('status', status);
  
  const queryString = params.toString();
  const url = queryString ? `${API_URL}/tasks?${queryString}` : `${API_URL}/tasks`;
  
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to load tasks');
  }
  return res.json();
}

/**
 * Get task by ID
 */
export async function getTaskById(id: string) {
  const res = await fetchWithAuth(`${API_URL}/tasks/${id}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to load task');
  }
  return res.json();
}

/**
 * Get tasks by project
 */
export async function getTasksByProject(projectId: string) {
  const res = await fetchWithAuth(`${API_URL}/tasks/project/${projectId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to load tasks');
  }
  return res.json();
}

/**
 * Get tasks assigned to a user
 */
export async function getTasksByAssigned(userId: string) {
  const res = await fetchWithAuth(`${API_URL}/tasks/assigned/${userId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to load tasks');
  }
  return res.json();
}

/**
 * Create new task
 */
export async function createTask(data: {
  title: string;
  description?: string;
  status?: string;
  projectId: string;
  assignedToId?: string;
  priority?: number;
  dueDate?: string;
}) {
  const res = await fetchWithAuth(`${API_URL}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create task');
  }

  return res.json();
}

/**
 * Assign task to user
 */
export async function assignTask(taskId: string, assignedToId: string) {
  const res = await fetchWithAuth(`${API_URL}/tasks/${taskId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ assignedToId }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to assign task');
  }

  return res.json();
}

/**
 * Update task status
 */
export async function updateTaskStatus(taskId: string, status: string) {
  const res = await fetchWithAuth(`${API_URL}/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update task status');
  }

  return res.json();
}

/**
 * Update task
 */
export async function updateTask(taskId: string, data: {
  title?: string;
  description?: string;
  status?: string;
  assignedToId?: string;
  priority?: number;
  dueDate?: string;
}) {
  const res = await fetchWithAuth(`${API_URL}/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update task');
  }

  return res.json();
}

/**
 * Delete task
 */
export async function deleteTask(taskId: string) {
  const res = await fetchWithAuth(`${API_URL}/tasks/${taskId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete task');
  }
}

/**
 * Get all projects (role-based)
 * ADMIN: Returns all projects
 * USER: Returns only projects from their team
 */
export async function getProjects(): Promise<Project[]> {
  const res = await fetchWithAuth(`${API_URL}/projects`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to load projects');
  }
  return res.json();
}

/**
 * Get project by ID
 * ADMIN: Can access any project
 * USER: Can only access projects from their team
 */
export async function getProjectById(id: string): Promise<Project> {
  const res = await fetchWithAuth(`${API_URL}/projects/${id}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to load project');
  }
  return res.json();
}

/**
 * Get projects created by current user
 */
export async function getMyProjects(): Promise<Project[]> {
  const res = await fetchWithAuth(`${API_URL}/projects/my-projects`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to load my projects');
  }
  return res.json();
}

/**
 * Create new project
 * Requires ADMIN role
 */
export async function createProject(data: CreateProjectDto): Promise<Project> {
  const res = await fetchWithAuth(`${API_URL}/projects`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create project');
  }

  return res.json();
}

/**
 * Update project
 * Requires ADMIN role
 */
export async function updateProject(id: string, data: UpdateProjectDto): Promise<Project> {
  const res = await fetchWithAuth(`${API_URL}/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update project');
  }

  return res.json();
}

/**
 * Delete project (soft delete)
 * Requires ADMIN role
 */
export async function deleteProject(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/projects/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete project');
  }
}
