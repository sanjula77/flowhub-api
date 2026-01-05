'use client';

import { useState, useEffect } from 'react';
import { assignTask, getTeamMembers } from '@/lib/api';
import { User } from '@/types/user';

interface AssignTaskModalProps {
  taskId: string;
  teamId: string;
  currentAssignedToId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignTaskModal({
  taskId,
  teamId,
  currentAssignedToId,
  onClose,
  onSuccess,
}: AssignTaskModalProps) {
  const [members, setMembers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentAssignedToId || '');
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMembers();
  }, [teamId]);

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const teamMembers = await getTeamMembers(teamId);
      setMembers(teamMembers);
    } catch (err: any) {
      setError(err.message || 'Failed to load team members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      setError('Please select a team member');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await assignTask(taskId, selectedUserId);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to assign task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Assign Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
              Assign to <span className="text-red-500">*</span>
            </label>
            {loadingMembers ? (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500">Loading team members...</p>
              </div>
            ) : (
              <select
                id="assignedTo"
                required
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="" className="text-gray-900">Select a team member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id} className="text-gray-900">
                    {member.firstName && member.lastName
                      ? `${member.firstName} ${member.lastName}`
                      : member.email}
                    {member.role === 'ADMIN' && ' (Admin)'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedUserId || loadingMembers}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

