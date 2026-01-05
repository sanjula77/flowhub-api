'use client';

import { useState } from 'react';
import { User } from '@/types/user';
import { removeUser } from '@/lib/api';

interface TeamMembersProps {
  members: User[];
  currentUserId?: string;
  isAdmin: boolean;
  onRefresh: () => void;
}

export default function TeamMembers({
  members,
  currentUserId,
  isAdmin,
  onRefresh,
}: TeamMembersProps) {
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemoveMember = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${userEmail} from the team?`)) {
      return;
    }

    try {
      setRemoving(userId);
      await removeUser(userId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    } finally {
      setRemoving(null);
    }
  };

  if (members.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
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
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <p className="text-gray-500 text-lg">No members found</p>
        <p className="text-gray-400 text-sm mt-2">Team members will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
        <p className="text-sm text-gray-500 mt-1">{members.length} member(s)</p>
      </div>

      <div className="divide-y divide-gray-200">
        {members.map((member) => {
          const isCurrentUser = member.id === currentUserId;
          const isMemberAdmin = member.role === 'ADMIN';

          return (
            <div
              key={member.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {member.firstName
                      ? `${member.firstName.charAt(0)}${member.lastName?.charAt(0) || ''}`
                      : member.email.charAt(0).toUpperCase()}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.email}
                      </p>
                      {isCurrentUser && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{member.email}</p>
                  </div>

                  {/* Role Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isMemberAdmin
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {member.role}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {isAdmin && !isCurrentUser && (
                  <div className="ml-4">
                    <button
                      onClick={() => handleRemoveMember(member.id, member.email)}
                      disabled={removing === member.id}
                      className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {removing === member.id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

