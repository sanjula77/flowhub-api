'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyProfile, getMyTeam, getTeamMembers } from '@/lib/api';
import TeamHeader from '@/components/team/TeamHeader';
import TeamMembers from '@/components/team/TeamMembers';
import InviteUserModal from '@/components/team/InviteUserModal';
import MainLayout from '@/components/layout/MainLayout';
import LoadingState from '@/components/ui/LoadingState';
import Alert from '@/components/ui/Alert';
import { User } from '@/types/user';

interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  adminUserId?: string;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

export default function TeamDashboard() {
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError('');

      const userData = await getMyProfile();
      setCurrentUser(userData);

      try {
        const teamData = await getMyTeam();
        setTeam(teamData);

        if (userData.role === 'ADMIN' || userData.id === teamData.adminUserId) {
          try {
            const membersData = await getTeamMembers(teamData.id);
            setMembers(membersData);
          } catch (err) {
            // Error handled by catch block
          }
        }
      } catch (err: any) {
        if (err.message?.includes('404') || err.message?.includes('not found')) {
          setError('You are not assigned to any team');
          setLoading(false);
          return;
        }
        throw err;
      }
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        router.push('/login');
        return;
      }
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSuccess = async () => {
    setShowInviteModal(false);
    if (team && (currentUser?.role === 'ADMIN' || currentUser?.id === team.adminUserId)) {
      try {
        const membersData = await getTeamMembers(team.id);
        setMembers(membersData);
      } catch (err) {
        // Error handled silently - user can retry
      }
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

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.id === team?.adminUserId;

  if (loading) {
    return (
      <MainLayout
        userName={getUserDisplayName(currentUser)}
        userEmail={currentUser?.email}
        userRole={currentUser?.role as 'ADMIN' | 'USER'}
      >
        <LoadingState message="Loading team data..." />
      </MainLayout>
    );
  }

  if (error && !team) {
    return (
      <MainLayout
        userName={getUserDisplayName(currentUser)}
        userEmail={currentUser?.email}
        userRole={currentUser?.role as 'ADMIN' | 'USER'}
      >
        <Alert variant="error" onClose={() => setError('')}>
          {error}
        </Alert>
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
        {team && (
          <>
            <TeamHeader
              team={team}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onInviteClick={() => setShowInviteModal(true)}
            />

            <TeamMembers
              members={members}
              currentUserId={currentUser?.id}
              isAdmin={isAdmin}
              onRefresh={loadTeamData}
            />
          </>
        )}

        {showInviteModal && team && (
          <InviteUserModal
            teamId={team.id}
            onClose={() => setShowInviteModal(false)}
            onSuccess={handleInviteSuccess}
          />
        )}
      </div>
    </MainLayout>
  );
}
