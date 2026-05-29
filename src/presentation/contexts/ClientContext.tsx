// ============================================================
// CONTEXT: ClientContext
// Manages the currently selected client across the app
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Client } from '../../core/entities/Client';
import { SupabaseClientRepository } from '../../infra/repositories/SupabaseClientRepository';

interface ClientContextType {
  clients: Client[];
  currentClient: Client | null;
  loading: boolean;
  setCurrentClient: (client: Client | null) => void;
  refreshClients: () => Promise<void>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

const clientRepository = new SupabaseClientRepository();

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshClients = async () => {
    try {
      const data = await clientRepository.findAll();
      setClients(data);
      if (data.length > 0 && !currentClient) {
        setCurrentClient(data[0]);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshClients();
  }, []);

  return (
    <ClientContext.Provider value={{ clients, currentClient, loading, setCurrentClient, refreshClients }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClient = () => {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClient must be used within ClientProvider');
  return ctx;
};
