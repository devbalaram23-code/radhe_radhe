import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useThemeMode } from '../ThemeContext';
import "./Navbar.css";
// load logo from public folder

function Navbar() {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [logoError, setLogoError] = useState(false);
  const { isDark, toggleTheme } = useThemeMode();

  const handleToggle = () => setOpen(!open);

  const linkClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000); // keep the clock ticking
    return () => clearInterval(timer);
  }, []);

  return (
    <nav className="navbar">
      <div className="nav-left">
        <div className="logo-wrap">
          {!logoError ? (
            <img
              src={`${process.env.PUBLIC_URL || ''}/brandlogo.png`}
              alt="Radha Govind Jewellery logo"
              className="brand-logo"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="brand-fallback" aria-label="Radha Govind Jewellery">RG</div>
          )}
          <h2 className="logo">Radha Govind Jewellery</h2>
        </div>
        <div className="time-card" aria-label="Current time and date">
          <div className="time-text">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</div>
          <div className="date-text">{now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
        </div>
      </div>

      <button
        className={`hamburger ${open ? "open" : ""}`}
        aria-label="Toggle navigation"
        onClick={handleToggle}
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`nav-links ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
        <button className="theme-toggle" onClick={toggleTheme} aria-pressed={isDark} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>{isDark ? '🌙' : '☀️'}</button>
        <NavLink to="/" className={linkClass} end>Home</NavLink>
        <NavLink to="/add-product" className={linkClass}>Add Product</NavLink>
        <NavLink to="/inventory" className={linkClass}>Inventory</NavLink>
        <NavLink to="/billing" className={linkClass}>Billing</NavLink>
        <NavLink to="/advance" className={linkClass}>Advance</NavLink>
        <NavLink to="/credits" className={linkClass}>Credits</NavLink>
        <NavLink to="/sales" className={linkClass}>Sales</NavLink>
        <NavLink to="/customers" className={linkClass}>Customers</NavLink>
      </div>
    </nav>
  );
}

export default Navbar;
