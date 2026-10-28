import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { notificationService } from '../services/notification'
import { NAV } from '../utils/roles'
import Icon from './Icon'

export function NotificationBell() {
  const nav = useNavigate()
  const [count, setCount] = useState(0)
  const { pathname } = useLocation()
  useEffect(() => {
    let alive = true
    const load = () => notificationService.list().then((l) => alive && setCount(l.filter((n) => !n.is_read).length)).catch(() => {})
    load()
    const t = setInterval(load, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [pathname])
  return (
    <button className="icon-btn bell" aria-label={`Notifications (${count} unread)`} onClick={() => nav('/notifications')}>
      <Icon name="bell" />{count > 0 && <span className="bell-count">{count > 99 ? '99+' : count}</span>}
    </button>
  )
}

export default function Layout() {
  const { user, role, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  const items = NAV.filter((n) => n.roles.includes(role))
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand"><span className="brand-mark">₹</span><span>PayrollPro</span></div>
        <nav>{items.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Icon name={n.icon} /><span>{n.label}</span></NavLink>))}</nav>
        <div className="sidebar-foot">
          <div className="muted small">Signed in as</div><div className="sidebar-role">{role}</div>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}><Icon name="menu" /></button>
          <div className="grow" />
          <NotificationBell />
          <div className="user-chip"><span className="avatar">{initials}</span>
            <div className="user-meta"><b>{user.name}</b><span className="muted small">{user.email}</span></div></div>
          <button className="icon-btn" aria-label="Sign out" title="Sign out" onClick={logout}><Icon name="logout" /></button>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  )
}
