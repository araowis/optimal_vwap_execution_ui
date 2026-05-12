'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Building2, Sparkles, Loader2, Plus, User, Globe, Briefcase } from 'lucide-react';
import { Client, StrategyParams } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (client: Client) => void;
  editingClient?: Client | null;
}

export default function AddClientModal({ isOpen, onClose, onAdd, editingClient }: AddClientModalProps) {
  const [type, setType] = useState<'ORGANIZATION' | 'PERSON'>('ORGANIZATION');
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [logo, setLogo] = useState('');
  const [sector, setSector] = useState('Financial Services');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [strategyParams, setStrategyParams] = useState<StrategyParams>({
    totalQuantity: 1000,
    numTranches: 30,
    trancheSize: 0,
    maxSlippage: 0.1,
    vwapDeviation: 0.5,
    minVolumeThreshold: 0,
    orderType: 'LIMIT',
    executionTimeframe: 'INTRADAY',
    enableTxCosts: false,
    lambda: 17.5,
    dates: [],
    txCostConfig: {
      brokeragePercent: 0.12,
      sttPercent: 0.025,
      gstPercent: 18,
      exchangeFeePercent: 0.00345,
      spreadBps: 5,
    },
  });

  useEffect(() => {
    if (editingClient) {
      setType(editingClient.type);
      setName(editingClient.name);
      setDomain(editingClient.domain || '');
      setLogo(editingClient.logo || '');
      setSector(editingClient.sector || 'Financial Services');
      setStrategyParams(editingClient.strategyParams);
    } else {
      setName('');
      setDomain('');
      setLogo('');
      setSector('Financial Services');
      setType('ORGANIZATION');
    }
  }, [editingClient]);

  const fetchSuggestions = async (query: string) => {
    if (type !== 'ORGANIZATION' || !query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/clearbit/companies/suggest?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSuggestions(data || []);
      setShowSuggestions(true);
    } catch (e) {
      console.error('Clearbit suggestions failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (type === 'ORGANIZATION' && name && !logo) {
      searchTimeoutRef.current = setTimeout(() => fetchSuggestions(name), 300);
    } else {
      setSuggestions([]);
    }
  }, [name, logo, type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const clientData: Client = {
      id: editingClient?.id || Math.random().toString(36).substr(2, 9),
      name,
      type,
      domain,
      logo,
      sector,
      strategyParams,
      watchlist: editingClient?.watchlist || [],
    };
    onAdd(clientData);
    onClose();
    // Reset form
    setName('');
    setDomain('');
    setLogo('');
    setSector('Financial Services');
    setType('ORGANIZATION');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-2xl rounded-sm shadow-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/5 flex items-center justify-center border border-primary/10">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground uppercase tracking-tight">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {editingClient ? 'Modify institutional partner or individual' : 'Onboard a new institutional partner or individual'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-md transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Client Type Toggle */}
          <div className="flex p-1 bg-secondary/20 rounded-sm w-full max-w-sm mx-auto">
            <button
              onClick={() => setType('ORGANIZATION')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider transition-all",
                type === 'ORGANIZATION' ? "bg-background shadow-sm text-primary rounded-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="w-4 h-4" />
              Organization
            </button>
            <button
              onClick={() => {
                setType('PERSON');
                setLogo('');
                setDomain('');
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider transition-all",
                type === 'PERSON' ? "bg-background shadow-sm text-primary rounded-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="w-4 h-4" />
              Individual
            </button>
          </div>

          {/* Client Identity Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              {type === 'ORGANIZATION' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
              {type === 'ORGANIZATION' ? 'Organization Identity' : 'Individual Identity'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {type === 'ORGANIZATION' ? 'Company Name' : 'Full Name'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (logo) setLogo('');
                    }}
                    className="w-full px-4 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 transition-all pl-10 outline-none"
                    placeholder={type === 'ORGANIZATION' ? "e.g. MSCI Inc." : "e.g. Jane Doe"}
                  />
                  {type === 'ORGANIZATION' ? (
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  ) : (
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  )}
                  {loading && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}
                </div>

                {/* Clearbit Suggestions (Only for Orgs) */}
                {type === 'ORGANIZATION' && showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-sm shadow-md overflow-hidden divide-y divide-border/50 max-h-60 overflow-y-auto">
                    {suggestions.map((s: any, i) => {
                      const googleLogo = `https://www.google.com/s2/favicons?domain=${s.domain}&sz=128`;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setName(s.name);
                            setDomain(s.domain);
                            setLogo(googleLogo);
                            setShowSuggestions(false);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-secondary/50 flex items-center gap-3 transition-colors"
                        >
                          <img src={googleLogo} className="w-10 h-10 rounded-sm bg-white object-contain" alt="" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{s.domain}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {type === 'ORGANIZATION' ? 'Sector' : 'Title / Role'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none pl-10"
                    placeholder={type === 'ORGANIZATION' ? "e.g. Financial Services" : "e.g. Portfolio Manager"}
                  />
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            {name && (
              <div className="flex items-start gap-4 p-4 bg-secondary/5 border border-border rounded-sm animate-in slide-in-from-top-1">
                <div className="relative flex-shrink-0">
                  {logo ? (
                    <img src={logo} className="w-14 h-14 rounded-sm bg-white object-contain" alt="Logo" />
                  ) : (
                    <div className="w-14 h-14 bg-primary/5 rounded-sm flex items-center justify-center border border-primary/10">
                      {type === 'ORGANIZATION' ? (
                        <Building2 className="w-8 h-8 text-primary" />
                      ) : (
                        <User className="w-8 h-8 text-primary" />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground uppercase tracking-tight truncate">{name}</p>
                    <button 
                      type="button" 
                      onClick={() => {
                        setName('');
                        setLogo('');
                        setDomain('');
                      }}
                      className="p-1 hover:bg-secondary rounded-sm transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <p className="text-xs text-primary font-medium">{domain || (type === 'PERSON' ? 'Private Individual' : 'internal.system')}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-widest">
                    {type === 'ORGANIZATION' ? 'Institutional Partner' : 'Private Client'} • {sector}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Strategy Parameters Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Default Strategy Parameters
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Total Quantity</label>
                <input
                  type="number"
                  value={strategyParams.totalQuantity}
                  onChange={(e) => setStrategyParams({...strategyParams, totalQuantity: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Num Tranches</label>
                <input
                  type="number"
                  value={strategyParams.numTranches}
                  onChange={(e) => setStrategyParams({...strategyParams, numTranches: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Lambda (Risk)</label>
                <input
                  type="number"
                  step="0.5"
                  value={strategyParams.lambda}
                  onChange={(e) => setStrategyParams({...strategyParams, lambda: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none"
                />
              </div>
            </div>
          </section>

          {/* Transaction Costs Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Transaction Costs</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={strategyParams.enableTxCosts}
                  onChange={(e) => setStrategyParams({...strategyParams, enableTxCosts: e.target.checked})}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-xs font-medium text-muted-foreground">Enable Costs</span>
              </label>
            </div>
            
            <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-6 transition-all duration-300", !strategyParams.enableTxCosts ? "opacity-30 pointer-events-none scale-[0.99]" : "opacity-100 scale-100")}>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Brokerage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={strategyParams.txCostConfig.brokeragePercent}
                  onChange={(e) => setStrategyParams({
                    ...strategyParams, 
                    txCostConfig: {...strategyParams.txCostConfig, brokeragePercent: parseFloat(e.target.value) || 0}
                  })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-sm text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Spread (bps)</label>
                <input
                  type="number"
                  value={strategyParams.txCostConfig.spreadBps}
                  onChange={(e) => setStrategyParams({
                    ...strategyParams, 
                    txCostConfig: {...strategyParams.txCostConfig, spreadBps: parseInt(e.target.value) || 0}
                  })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-sm text-sm outline-none"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-border bg-secondary/5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-sm transition-all uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-bold hover:bg-primary/90 transition-all uppercase tracking-wider shadow-sm"
          >
            {editingClient ? 'Save Changes' : 'Create Client'}
          </button>
        </div>
      </div>
    </div>
  );
}
