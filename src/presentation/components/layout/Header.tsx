import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useClient } from '../../contexts/ClientContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { LogOut, User, Building2, RefreshCw } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const { clients, currentClient, setCurrentClient, refreshClients, loading } = useClient();
  const { collapsed } = useSidebar();

  const leftOffset = collapsed ? 'left-16' : 'left-64';

  return (
    <header
      className={`bg-white border-b border-gray-200 fixed top-0 right-0 ${leftOffset} z-10 h-16 transition-all duration-300`}
    >
      <div className="h-full px-6 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-700 hidden md:block">
          Sistema Integral de Gestión – BERONICA ROSADO
        </h1>

        <div className="flex items-center gap-3 ml-auto">
          {/* Client selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
            <Building2 size={16} className="text-gray-500 shrink-0" />
            {loading ? (
              <span className="text-sm text-gray-400">Cargando...</span>
            ) : clients.length === 0 ? (
              <span className="text-sm text-red-500">Sin clientes — ve a Clientes</span>
            ) : (
              <select
                value={currentClient?.id ?? ''}
                onChange={(e) => {
                  const client = clients.find((c) => c.id === e.target.value);
                  setCurrentClient(client ?? null);
                }}
                className="bg-transparent border-none focus:outline-none text-sm font-medium text-gray-800 max-w-[200px]"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_comercial}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={refreshClients}
              title="Recargar clientes"
              className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          {/* User info */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User size={15} className="text-blue-600" />
            </div>
            <span className="text-sm text-gray-600 hidden md:block max-w-[160px] truncate">
              {user?.email}
            </span>
            <button
              onClick={() => signOut()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={17} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
