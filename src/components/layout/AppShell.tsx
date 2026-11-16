import { NavLink, Outlet } from "react-router-dom";
import { navItems, secondaryNavItems } from "../../navigation/navItems.ts";
import { NavIcon } from "../NavIcon.tsx";

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        IM
      </span>
      <span>
        <strong>Iron Mile</strong>
        <small>Strength and running</small>
      </span>
    </div>
  );
}

function Navigation({
  className,
  label,
  items,
}: {
  className: string;
  label: string;
  items: typeof navItems;
}) {
  return (
    <nav className={className} aria-label={label}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => (isActive ? "nav-link is-active" : "nav-link")}
        >
          <NavIcon name={item.icon} />
          <span className="nav-label">{item.label}</span>
          <span className="nav-short">{item.short}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        <Navigation className="sidebar-nav" label="Primary" items={navItems} />
        <Navigation className="sidebar-nav sidebar-secondary" label="More" items={secondaryNavItems} />
        <p className="sidebar-note">Your log stays in this browser.</p>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Brand />
        </header>
        <main className="content">
          <Outlet />
        </main>
        <Navigation className="tabbar" label="Primary mobile" items={navItems} />
      </div>
    </div>
  );
}
