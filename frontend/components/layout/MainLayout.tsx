'use client';

import Sidebar from './Sidebar';
import Header from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  userRole?: 'ADMIN' | 'USER';
}

export default function MainLayout({
  children,
  userName,
  userEmail,
  userRole = 'USER',
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar userRole={userRole} />
      <div className="lg:pl-64">
        <Header
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
        />
        <main className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

