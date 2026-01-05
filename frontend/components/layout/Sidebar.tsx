'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  FolderKanbanIcon, 
  CheckSquareIcon, 
  UsersIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface SidebarProps {
  userRole?: 'ADMIN' | 'USER';
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('ADMIN' | 'USER')[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    roles: ['ADMIN', 'USER'],
  },
  {
    label: 'Projects',
    href: '/projects',
    icon: FolderKanbanIcon,
    roles: ['ADMIN', 'USER'],
  },
  {
    label: 'Tasks',
    href: '/tasks',
    icon: CheckSquareIcon,
    roles: ['ADMIN', 'USER'],
  },
  {
    label: 'Team',
    href: '/team',
    icon: UsersIcon,
    roles: ['ADMIN', 'USER'],
  },
  {
    label: 'Admin',
    href: '/admin',
    icon: ShieldCheckIcon,
    roles: ['ADMIN'],
  },
];

export default function Sidebar({ userRole = 'USER' }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole),
  );

  const isActive = (href: string) => {
    if (!mounted) return false; // Return false during SSR
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Mobile menu button - only render after mount */}
      {mounted && (
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-gray-200 shadow-md hover:bg-gray-50 transition-colors"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out z-40
          ${mounted && isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-200">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">FlowHub</h1>
              <p className="text-xs text-gray-500">Project Management</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-lg
                    transition-all duration-200
                    ${
                      active
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      active ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="px-4 py-4 border-t border-gray-200">
            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <SettingsIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm">Settings</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mounted && isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
