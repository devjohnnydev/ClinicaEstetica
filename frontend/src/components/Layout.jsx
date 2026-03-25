import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiHome, FiUsers, FiFileText, FiClipboard, FiPlusCircle, FiCalendar, FiMenu, FiX, FiLogOut, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const navItems = [
  { to: '/', icon: FiHome, label: 'Dashboard' },
  { to: '/agenda', icon: FiCalendar, label: 'Agenda' },
  { to: '/pacientes', icon: FiUsers, label: 'Pacientes' },
  { to: '/modelos', icon: FiClipboard, label: 'Modelos de Anamnese' },
  { to: '/anamnese/nova', icon: FiPlusCircle, label: 'Nova Anamnese' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-soft font-body">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        ${sidebarCollapsed ? 'w-20' : 'w-72'} bg-white shadow-elegant
        transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col relative
      `}>
        {/* Logo */}
        <div className={`h-20 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between px-6'} border-b border-primary transition-all`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center shrink-0">
              <span className="text-white font-display text-lg font-bold">CE</span>
            </div>
            {!sidebarCollapsed && (
              <div className="whitespace-nowrap overflow-hidden">
                <h1 className="font-display text-lg font-semibold text-dark leading-tight">Clínica</h1>
                <p className="text-xs text-accent font-heading">Estética</p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-dark/50 hover:text-dark">
              <FiX size={20} />
            </button>
          )}
        </div>

        {/* Desktop Collapse Button */}
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
          className="hidden lg:flex absolute -right-3 top-24 w-6 h-6 bg-white border border-secondary rounded-full shadow-sm items-center justify-center text-dark/40 hover:text-accent z-50 transition-colors"
        >
          {sidebarCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
        </button>

        {/* Nav */}
        <nav className={`flex-1 ${sidebarCollapsed ? 'py-6 px-3' : 'py-6 px-4'} space-y-1 overflow-y-auto overflow-x-hidden`}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-accent/10 to-secondary/20 text-accent shadow-sm'
                  : 'text-dark/60 hover:bg-primary/50 hover:text-dark'}
              `}
            >
              <Icon size={20} className="shrink-0" />
              {!sidebarCollapsed && <span className="whitespace-nowrap">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-primary">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center gap-0 px-0' : 'gap-3 px-4'} py-3 transition-all`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">
                {user?.nome?.charAt(0) || 'A'}
              </span>
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark truncate">{user?.nome}</p>
                  <p className="text-xs text-dark/40 truncate">{user?.email}</p>
                </div>
                <button onClick={handleLogout} className="text-dark/30 hover:text-red-400 transition-colors shrink-0" title="Sair">
                  <FiLogOut size={18} />
                </button>
              </>
            )}
          </div>
          {sidebarCollapsed && (
             <button onClick={handleLogout} className="mt-2 w-full flex justify-center text-dark/30 hover:text-red-400 transition-colors" title="Sair">
                <FiLogOut size={18} />
             </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-20 bg-white/80 backdrop-blur-sm border-b border-primary/50 flex items-center px-6 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-4 text-dark/60 hover:text-dark">
            <FiMenu size={24} />
          </button>
          <div className="flex-1">
            <h2 className="font-heading text-lg font-semibold text-dark">Clínica de Estética</h2>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
