import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AudioLines, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth';

export default function Navigation() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const logout = () => { signOut(); navigate('/'); };
  const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark"><AudioLines size={20} /></span>
          <span>connect<span className="brand-accent">sphere</span></span>
        </Link>
        <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`nav-links${open ? ' nav-open' : ''}`}>
          <NavLink to="/" className={linkClass} onClick={() => setOpen(false)}>Home</NavLink>
          {user && <NavLink to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>Dashboard</NavLink>}
          <NavLink to="/about" className={linkClass} onClick={() => setOpen(false)}>About</NavLink>
          {user ? (
            <div className="nav-user">
              <span className="avatar avatar-small">{user.name?.charAt(0).toUpperCase()}</span>
              <span className="nav-user-name">{user.name}</span>
              <button className="icon-btn logout-btn" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button>
            </div>
          ) : (
            <div className="nav-actions">
              <Link to="/login" className="nav-link" onClick={() => setOpen(false)}>Log in</Link>
              <Link to="/register" className="button button-small button-primary" onClick={() => setOpen(false)}>Get started</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
