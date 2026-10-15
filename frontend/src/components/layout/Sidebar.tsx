import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/academic-years', label: 'Academic years', end: false },
  { to: '/departments', label: 'Departments', end: false },
  { to: '/branches', label: 'Branches', end: false },
  { to: '/courses', label: 'Courses', end: false },
  { to: '/curricula', label: 'Curricula', end: false },
  { to: '/faculty', label: 'Faculty', end: false },
  { to: '/students', label: 'Students', end: false },
  { to: '/assignments', label: 'Class curricula', end: false },
  { to: '/configuration', label: 'Configuration', end: false },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <p className="brand">Campus Admin</p>
      <nav className="nav" aria-label="Primary">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
