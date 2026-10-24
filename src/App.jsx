
import React from 'react';
import {
  Routes,
  Route,
  Link,
  useLocation,
} from 'react-router-dom';
import {
  Trophy,
  Menu,
  X,
} from 'lucide-react';

import Home from './pages/Home';
import Voting from './pages/Voting';
import Rankings from './pages/Rankings';
import Winners from './pages/Winners';
import History from './pages/History';
import Admin from './pages/Admin';

export default function App() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const location = useLocation();

  const nav = [
    ['/', 'Home'],
    ['/vote', 'Vote'],
    ['/rankings', 'Rankings'],
    ['/winners', 'Winners'],
    ['/history', 'History'],
  ];

  return (
    <div className="app">
      <header>
        <Link
          to="/"
          className="brand"
          onClick={() => setMenuOpen(false)}
        >
          <span className="brandMark">BDR</span>
          <span>
            Balon Dor <b>Rank</b>
          </span>
        </Link>

        <button
          className="menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav className={menuOpen ? 'open' : ''}>
          {nav.map(([path, label]) => (
            <Link
              className={location.pathname === path ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
              to={path}
              key={path}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vote" element={<Voting />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/winners" element={<Winners />} />
          <Route path="/history" element={<History />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      <footer>
        <Trophy size={15} />
        Community football rankings • Edition 2026
      </footer>
    </div>
  );
}
