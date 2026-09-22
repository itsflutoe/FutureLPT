import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  FolderOpen,
  TrendingUp,
  History,
  Bookmark,
  AlertCircle,
  Trophy,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
} from 'lucide-react';
import { useState } from 'react';
import { signOut } from '@/services/auth';
import { cn } from '@/lib/utils';

/** Primary student destinations — keep this list short. */
const primaryNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/practice', label: 'Practice', icon: BookOpen },
  { to: '/mock-exams', label: 'Mock Exams', icon: ClipboardList },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
];

/** Secondary review tools — grouped so the sidebar stays scannable. */
const reviewNav = [
  { to: '/topics', label: 'Topics', icon: FolderOpen },
  { to: '/history', label: 'History', icon: History },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/mistakes', label: 'Mistakes', icon: AlertCircle },
  { to: '/achievements', label: 'Achievements', icon: Trophy },
];

const bottomNav = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/practice', label: 'Practice', icon: BookOpen },
  { to: '/mock-exams', label: 'Mock', icon: ClipboardList },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
  { to: '/profile', label: 'Profile', icon: User },
];

function NavItem({
  to,
  label,
  icon: Icon,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
            : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </NavLink>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const closeMobile = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 border-r border-[var(--border)] bg-[var(--card)]">
        <div className="flex h-16 items-center gap-2 px-5 border-b border-[var(--border)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-color)] text-white font-bold text-sm">
            FL
          </div>
          <div>
            <div className="font-semibold text-sm">FLPT</div>
            <div className="text-xs text-[var(--muted-foreground)]">Find · Learn · Pass · Teach</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-0.5">
            {primaryNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>

          <div>
            <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Review
            </div>
            <div className="space-y-0.5">
              {reviewNav.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </div>
        </nav>

        <div className="border-t border-[var(--border)] p-3 space-y-0.5">
          <NavItem to="/profile" label="Profile" icon={User} />
          <NavItem to="/settings" label="Settings" icon={Settings} />
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-color)] text-white font-bold text-xs">
            FL
          </div>
          <span className="font-semibold text-sm">FLPT</span>
        </div>
        <button onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeMobile} />
          <div className="absolute inset-y-0 left-0 w-72 bg-[var(--card)] shadow-xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <span className="font-semibold">Menu</span>
              <button onClick={closeMobile} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-4">
              <div className="space-y-1">
                {primaryNav.map((item) => (
                  <NavItem key={item.to} {...item} onClick={closeMobile} />
                ))}
              </div>
              <div>
                <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Review
                </div>
                <div className="space-y-1">
                  {reviewNav.map((item) => (
                    <NavItem key={item.to} {...item} onClick={closeMobile} />
                  ))}
                </div>
              </div>
              <div className="border-t border-[var(--border)] pt-2 space-y-1">
                <NavItem to="/profile" label="Profile" icon={User} onClick={closeMobile} />
                <NavItem to="/settings" label="Settings" icon={Settings} onClick={closeMobile} />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--muted-foreground)]"
                >
                  <LogOut className="h-5 w-5" /> Log out
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:pl-60">
        <div className="min-h-screen pt-14 lg:pt-0 pb-20 lg:pb-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--card)]">
        <div className="flex justify-around py-2">
          {bottomNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1 text-xs',
                  isActive ? 'text-[var(--accent-color)]' : 'text-[var(--muted-foreground)]'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
