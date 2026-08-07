import { type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { authAPI, type UserProfile } from '../api/client';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
  onLogout: () => void;
  userProfile: UserProfile | null;
}

const navItems = [
  { path: '/', label: 'Shape a Brief', icon: '✦' },
  { path: '/creators', label: 'Creators', icon: '◎' },
  { path: '/briefs', label: 'My Briefs', icon: '▤' },
  { path: '/analytics', label: 'Analytics', icon: '◔' },
];

export function AppLayout({ children, onLogout, userProfile }: AppLayoutProps) {
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // logout anyway
    }
    onLogout();
  };

  const displayName = userProfile?.full_name || 'Nithin Vinuthan';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">MatchInfluence</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item-active' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : ''}`
            }
          >
            <span className="nav-icon">⚙</span>
            <span className="nav-label">Settings</span>
          </NavLink>
          <div className="sidebar-user">
            {userProfile?.avatar_url ? (
              <img src={userProfile.avatar_url} alt="Profile" className="user-avatar-img" />
            ) : (
              <div className="user-avatar">{initial}</div>
            )}
            <span className="user-name" title={displayName}>{displayName}</span>
          </div>
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <span className="nav-icon">↗</span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="content-wrapper" key={location.pathname}>
          {children}
        </div>
      </main>
    </div>
  );
}
