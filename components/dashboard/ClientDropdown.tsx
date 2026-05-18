'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Plus, Check, Building2, User, Pencil, Trash2, Eye } from 'lucide-react';
import { Client } from '@/lib/types';
import { cn } from '@/lib/utils';
import AddClientModal from './AddClientModal';
import { RiskProfileResponse } from '@/lib/vwap-server-types';
import { toast } from 'sonner';
import DataViewModal from './DataViewModal';

interface ClientDropdownProps {
  selectedClient: Client | null;
  clients: Client[];
  onSelect: (client: Client) => void;
  onAdd: (client: Client) => void;
  onDelete?: (clientId: string) => void;
  riskProfiles?: RiskProfileResponse[];
}

export default function ClientDropdown({
  selectedClient,
  clients,
  onSelect,
  onAdd,
  onDelete,
  riskProfiles,
}: ClientDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getClientSubtitle = (client: Client) => {
    const meta = client.metadata || {};
    // Extract metadata values excluding internal JSON structures and logo
    const metaValues = Object.entries(meta)
      .filter(([k, v]) => k !== 'strategyParams' && k !== 'watchlist' && k !== 'logo' && k !== 'domain' && k !== 'sector' && v)
      .map(([_, v]) => v);
    
    // If domain or sector are defined as root fields on client or metadata, prioritize those
    const explicitParts = [];
    if (client.domain || meta.domain) explicitParts.push(client.domain || meta.domain);
    if (client.sector || meta.sector) explicitParts.push(client.sector || meta.sector);
    if (explicitParts.length > 0) return explicitParts.join(' • ');

    if (metaValues.length > 0) {
      return metaValues.slice(0, 2).join(' • '); // Show up to 2 dynamic metadata values
    }
    return client.id;
  };

  const getApiFormatClient = (c: Client | null) => {
    if (!c) return null;
    const { strategyParams, watchlist, logo, domain, sector, ...restMeta } = c.metadata || {};
    
    const cleanMeta = { ...restMeta };
    Object.keys(cleanMeta).forEach(k => {
      if (!cleanMeta[k]) delete cleanMeta[k];
    });

    const apiObj: any = {
      clientId: c.id,
      name: c.name,
      riskProfileId: c.riskProfileId,
      riskProfileDisplayName: c.riskProfileDisplayName,
      profileLambda: c.profileLambda,
      profileNBins: c.profileNBins,
      defaultLambda: c.defaultLambda,
      defaultNBins: c.defaultNBins,
      effectiveLambda: c.effectiveLambda,
      effectiveNBins: c.effectiveNBins,
      capitalLimit: c.capitalLimit,
    };

    if (Object.keys(cleanMeta).length > 0) {
      apiObj.metadata = cleanMeta;
    }

    Object.keys(apiObj).forEach(k => {
      if (apiObj[k] === undefined) delete apiObj[k];
    });

    return apiObj;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-secondary/30 hover:bg-secondary/50 border border-border rounded-sm transition-all min-w-[280px] justify-between group shadow-sm"
      >
        <div className="flex items-center gap-3 min-w-0">
          {selectedClient?.logo ? (
            <img 
              src={selectedClient.logo} 
              alt="" 
              className="w-8 h-8 rounded-sm object-contain bg-white" 
            />
          ) : (
            <div className="w-8 h-8 rounded-sm bg-primary/5 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="flex flex-col items-start min-w-0">
            <p className="text-xs font-bold text-foreground uppercase tracking-tight truncate leading-tight">
              {selectedClient ? selectedClient.name : 'Select Client'}
            </p>
            {selectedClient && (
              <p className="text-[10px] text-primary font-medium truncate leading-tight">
                {getClientSubtitle(selectedClient)}
              </p>
            )}
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[320px] bg-card border border-border rounded-sm shadow-md z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-3 border-b border-border bg-secondary/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <div 
                  key={client.id}
                  className={cn(
                    "group/row flex items-center gap-3 w-full px-2 py-1 text-left transition-all relative rounded-sm",
                    selectedClient?.id === client.id 
                      ? "bg-primary/5 border-l-2 border-l-primary" 
                      : "hover:bg-secondary/50 border-l-2 border-l-transparent"
                  )}
                >
                  <button
                    onClick={() => {
                      onSelect(client);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="relative">
                      {client.logo ? (
                        <img 
                          src={client.logo} 
                          alt="" 
                          className="w-10 h-10 rounded-sm object-contain bg-white" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-sm bg-secondary flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-foreground uppercase tracking-tight truncate">{client.name}</p>
                        {selectedClient?.id === client.id && (
                          <Check className="w-3.5 h-3.5 text-primary" />
                        )}
                      </div>
                      <p className="text-[10px] text-primary font-medium truncate text-left">
                        {getClientSubtitle(client)}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity pr-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingClient(client);
                          setIsOpen(false);
                        }}
                        className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-sm transition-colors text-muted-foreground"
                        title="View Raw Data"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingClient(client);
                          setIsAddModalOpen(true);
                          setIsOpen(false);
                        }}
                        className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-sm transition-colors text-muted-foreground"
                        title="Edit Client"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toast(`Delete ${client.name}?`, {
                            description: 'This action cannot be undone.',
                            action: {
                              label: 'Delete',
                              onClick: () => onDelete(client.id)
                            },
                            cancel: {
                              label: 'Cancel',
                              onClick: () => {}
                            }
                          });
                        }}
                        className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-sm transition-colors text-muted-foreground"
                        title="Delete Client"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <Building2 className="w-8 h-8 mx-auto text-muted-foreground opacity-20 mb-2" />
                <p className="text-sm text-muted-foreground">No clients found</p>
              </div>
            )}
          </div>

          <div className="p-2 bg-secondary/5 border-t border-border">
            <button
              onClick={() => {
                setEditingClient(null);
                setIsAddModalOpen(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-sm text-xs font-bold hover:bg-primary/90 transition-all uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              Add New Client
            </button>
          </div>
        </div>
      )}

      <AddClientModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingClient(null);
        }} 
        onAdd={onAdd}
        editingClient={editingClient}
        riskProfiles={riskProfiles}
      />

      <DataViewModal
        isOpen={!!viewingClient}
        onClose={() => setViewingClient(null)}
        title={viewingClient ? `Raw Data: ${viewingClient.name}` : ''}
        data={getApiFormatClient(viewingClient)}
      />
    </div>
  );
}
