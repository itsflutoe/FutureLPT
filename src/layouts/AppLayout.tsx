import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Megaphone,
} from 'lucide-react';
import { useState } from 'react';
import { signOut } from '@/services/auth';
import { cn } from '@/lib/utils';

const primaryNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/practice', label: 'Practice', icon: BookOpen },
  { to: '/mock-exams', label: 'Mock Exams', icon: ClipboardList },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
];

const reviewNav = [
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
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
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors min-h-11',
          isActive
            ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
            : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      {label}
    </NavLink>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isExamFocus =
    location.pathname.startsWith('/exam/') || location.pathname.startsWith('/results/');

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const closeMobile = () => setSidebarOpen(false);

  if (isExamFocus) {
    return (
      <div className="min-h-screen max-w-[100vw] overflow-x-clip bg-[var(--background)]">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen max-w-[100vw] overflow-x-clip bg-[var(--background)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--accent-color)] focus:px-4 focus:py-2 focus:text-white focus:text-sm"
      >
        Skip to main content
      </a>

      <aside
        className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 border-r border-[var(--border)] bg-[var(--card)]"
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center gap-2 px-5 border-b border-[var(--border)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-color)] text-white font-bold text-sm">
            FL
          </div>
          <div className="min-w-0">
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
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] min-h-11"
          >
            <LogOut className="h-5 w-5" aria-hidden />
            Log out
          </button>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 max-w-[100vw]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-color)] text-white font-bold text-xs shrink-0">
            FL
          </div>
          <span className="font-semibold text-sm">FLPT</span>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="shrink-0 p-2 min-h-11 min-w-11 flex items-center justify-center"
        >
          <Menu className="h-6 w-6" aria-hidden />
        </button>
      </div>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40" onClick={closeMobile} />
          <div className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] max-w-full bg-[var(--card)] shadow-xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <span className="font-semibold">Menu</span>
              <button
                type="button"
                onClick={closeMobile}
                aria-label="Close menu"
                className="p-2 min-h-11 min-w-11 flex items-center justify-center"
              >
                <X className="h-5 w-5" aria-hidden />
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
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--muted-foreground)] min-h-11"
                >
                  <LogOut className="h-5 w-5" aria-hidden /> Log out
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 lg:pl-60">
        <div
          id="main-content"
          tabIndex={-1}
          className="min-h-screen max-w-full overflow-x-clip pt-14 lg:pt-0 pb-20 lg:pb-0 outline-none"
        >
          <Outlet />
        </div>
      </main>

      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--card)] max-w-[100vw]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Primary"
      >
        <div className="flex justify-around py-1">
          {bottomNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 text-[10px] sm:text-xs min-w-0 flex-1 max-w-[4.5rem] min-h-12',
                  isActive ? 'text-[var(--accent-color)]' : 'text-[var(--muted-foreground)]'
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="truncate w-full text-center">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
