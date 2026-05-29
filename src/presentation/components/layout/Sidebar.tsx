import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, ShoppingCart, Package,
  DollarSign, FileText, Users, Truck, FlaskConical,
  ChevronLeft, ChevronRight, Newspaper,
} from 'lucide-react';
import { useSidebar } from '../../contexts/SidebarContext';

const NAV_ITEMS = [
  { path: '/',            icon: LayoutDashboard, label: 'Dashboard'    },
  { path: '/clients',     icon: Users,           label: 'Clientes'     },
  { path: '/suppliers',   icon: Truck,           label: 'Proveedores'  },
  { path: '/ingredients', icon: FlaskConical,    label: 'Insumos'      },
  { path: '/planner',     icon: Calendar,        label: 'Planificador' },
  { path: '/cartelera',   icon: Newspaper,       label: 'Cartelera'    },
  { path: '/purchases',   icon: ShoppingCart,    label: 'Compras'      },
  { path: '/inventory',   icon: Package,         label: 'Inventario'   },
  { path: '/treasury',    icon: DollarSign,      label: 'Tesorería'    },
  { path: '/reports',     icon: FileText,        label: 'Reportes'     },
];

export const Sidebar: React.FC = () => {
  const { collapsed, toggle } = useSidebar();
  return (
    <aside className={`bg-gray-900 text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} min-h-screen fixed left-0 top-0 z-20`}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between h-16">
          {!collapsed && <span className="font-bold text-lg tracking-wide text-white">BERONICA ROSADO</span>}
          <button onClick={toggle} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors ml-auto">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 py-2.5 transition-colors ${
                  collapsed ? 'justify-center px-0' : 'px-4'
                } ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={19} className="shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        {!collapsed && (
          <div className="p-4 border-t border-gray-800 text-xs text-gray-500 text-center">
            Beronica Rosado © 2025
          </div>
        )}
      </div>
    </aside>
  );
};
