import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import GraphPage from './pages/GraphPage';
import UploadPage from './pages/UploadPage';
import './App.css';
import UsefulInfoPage from './pages/UsefulInfoPage';
import FinanceMetricsPage from './pages/FinanceMetricsPage';

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink className="app-brand" to="/graphs" aria-label="Statement Studio home">
          <span className="app-brand-mark" aria-hidden="true">S</span>
          <span>Statement Studio</span>
        </NavLink>
        <nav className="app-nav" aria-label="Main navigation">
          <NavLink className={({ isActive }) => isActive ? 'is-active' : undefined} to="/graphs">Graphs</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'is-active' : undefined} to="/upload">Upload</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'is-active' : undefined} to="/info">Info</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'is-active' : undefined} to="/metrics">Metrics</NavLink>
        </nav>
        <span className="app-header-status"><i /> Workspace</span>
      </header>
      <Routes>
        <Route path="/" element={<Navigate to="/graphs" replace />} />
        <Route path="/graphs" element={<GraphPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/info" element={<UsefulInfoPage />} />
        <Route path="/metrics" element={<FinanceMetricsPage />} />
        <Route path="*" element={<Navigate to="/graphs" replace />} />
      </Routes>
    </div>
  );
}

export default App;
