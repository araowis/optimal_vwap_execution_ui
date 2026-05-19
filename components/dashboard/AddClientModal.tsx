"use client";

import { useState, useEffect } from "react";
import {
  X,
  Building2,
  Sparkles,
  Plus,
  Image as ImageIcon,
  KeyRound,
  ShieldAlert,
  Coins,
  Tag,
  Trash2,
} from "lucide-react";
import { Client, StrategyParams } from "@/lib/types";
import { RiskProfileResponse } from "@/lib/vwap-server-types";
import { cn } from "@/lib/utils";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (client: Client) => void;
  editingClient?: Client | null;
  riskProfiles?: RiskProfileResponse[];
}

const defaultStrategyParams: StrategyParams = {
  totalQuantity: 1000,
  numTranches: 30,
  trancheSize: 0,
  maxSlippage: 0.1,
  vwapDeviation: 0.5,
  minVolumeThreshold: 0,
  orderType: "LIMIT",
  executionTimeframe: "INTRADAY",
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
};

export default function AddClientModal({
  isOpen,
  onClose,
  onAdd,
  editingClient,
  riskProfiles = [],
}: AddClientModalProps) {
  // Basic Details
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");

  // Risk Configuration
  const [riskProfileId, setRiskProfileId] = useState("MODERATE");
  const [defaultLambda, setDefaultLambda] = useState<number | "">("");
  const [defaultNBins, setDefaultNBins] = useState<number | "">("");

  // Capital Controls
  const [capitalLimit, setCapitalLimit] = useState<number | "">("");
  const [deskCode, setDeskCode] = useState("");
  const [team, setTeam] = useState("");

  // Dynamic Metadata
  const [dynamicMeta, setDynamicMeta] = useState<
    { key: string; value: string }[]
  >([]);

  // Preserved from existing
  const [strategyParams, setStrategyParams] = useState<StrategyParams>(
    defaultStrategyParams,
  );
  const [watchlist, setWatchlist] = useState<any[]>([]);

  useEffect(() => {
    if (editingClient) {
      setClientId(editingClient.id);
      setName(editingClient.name);
      setLogo(editingClient.logo || "");
      setRiskProfileId(editingClient.riskProfileId || "MODERATE");
      setDefaultLambda(editingClient.defaultLambda ?? "");
      setDefaultNBins(editingClient.defaultNBins ?? "");
      setCapitalLimit(editingClient.capitalLimit || "");

      const meta = editingClient.metadata || {};
      setDeskCode(meta.deskCode || "");
      setTeam(meta.team || "");

      const dynamic = Object.keys(meta)
        .filter(
          (k) =>
            ![
              "logo",
              "domain",
              "sector",
              "deskCode",
              "team",
              "strategyParams",
              "watchlist",
            ].includes(k),
        )
        .map((k) => ({ key: k, value: meta[k] }));
      setDynamicMeta(dynamic);

      setStrategyParams(editingClient.strategyParams || defaultStrategyParams);
      setWatchlist(editingClient.watchlist || []);
    } else {
      setClientId("");
      setName("");
      setLogo("");
      setRiskProfileId("MODERATE");
      setDefaultLambda("");
      setDefaultNBins("");
      setCapitalLimit("");
      setDeskCode("");
      setTeam("");
      setDynamicMeta([]);
      setStrategyParams(defaultStrategyParams);
      setWatchlist([]);
    }
  }, [editingClient, isOpen]);

  const handleAddDynamicMeta = () => {
    setDynamicMeta([...dynamicMeta, { key: "", value: "" }]);
  };

  const handleRemoveDynamicMeta = (index: number) => {
    setDynamicMeta(dynamicMeta.filter((_, i) => i !== index));
  };

  const handleDynamicMetaChange = (
    index: number,
    field: "key" | "value",
    val: string,
  ) => {
    const updated = [...dynamicMeta];
    updated[index][field] = val;
    setDynamicMeta(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !clientId) return;

    const metaRecord: Record<string, string> = {};
    if (logo?.trim()) metaRecord.logo = logo.trim();
    if (deskCode?.trim()) metaRecord.deskCode = deskCode.trim();
    if (team?.trim()) metaRecord.team = team.trim();

    dynamicMeta.forEach((m) => {
      if (m.key.trim() && m.value.trim()) {
        metaRecord[m.key.trim()] = m.value.trim();
      }
    });

    const clientData: any = {
      id: clientId.trim(),
      name: name.trim(),
    };

    if (riskProfileId) clientData.riskProfileId = riskProfileId;
    if (defaultLambda !== "") clientData.defaultLambda = Number(defaultLambda);
    if (defaultNBins !== "") clientData.defaultNBins = Number(defaultNBins);
    if (capitalLimit !== "") clientData.capitalLimit = Number(capitalLimit);
    if (logo?.trim()) clientData.logo = logo.trim();
    if (Object.keys(metaRecord).length > 0) clientData.metadata = metaRecord;

    clientData.strategyParams = strategyParams;
    clientData.watchlist = watchlist;

    onAdd(clientData as Client);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-2xl rounded-sm shadow-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/5 flex items-center justify-center border border-primary/10">
              {editingClient ? (
                <Building2 className="w-6 h-6 text-primary" />
              ) : (
                <Plus className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground uppercase tracking-tight">
                {editingClient
                  ? "Edit Client Configuration"
                  : "Create Trading Client"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {editingClient
                  ? "Modify client execution and risk setup"
                  : "Setup a new execution desk or client"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <form id="client-form" onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Basic Details */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border/50 pb-2">
                <Building2 className="w-4 h-4" />
                Basic Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">
                    Client ID <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      disabled={!!editingClient}
                      value={clientId}
                      onChange={(e) =>
                        setClientId(
                          e.target.value.toUpperCase().replace(/\s+/g, "_"),
                        )
                      }
                      className="w-full px-4 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none pl-10 disabled:opacity-50"
                      placeholder="e.g. HDFC_DESK"
                    />
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  {editingClient && (
                    <p className="text-[10px] text-muted-foreground">
                      Client ID is immutable after creation.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">
                    Display Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none"
                    placeholder="e.g. HDFC Equities Desk"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground block">
                    Profile Image URL (Optional)
                  </label>
                  <div className="relative flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={logo}
                        onChange={(e) => setLogo(e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none pl-10"
                        placeholder="https://example.com/logo.png"
                      />
                      <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                    {logo && (
                      <div className="w-9 h-9 border border-border rounded-sm overflow-hidden flex-shrink-0 bg-white">
                        <img
                          src={logo}
                          alt="Preview"
                          className="w-full h-full object-contain"
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Risk Configuration */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border/50 pb-2">
                <ShieldAlert className="w-4 h-4" />
                Risk Configuration
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">
                    Risk Profile <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={riskProfileId}
                    onChange={(e) => setRiskProfileId(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none"
                  >
                    {riskProfiles && riskProfiles.length > 0 ? (
                      riskProfiles.map((p) => (
                        <option key={p.profileId} value={p.profileId}>
                          {p.displayName} ({p.profileId})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="CONSERVATIVE">CONSERVATIVE</option>
                        <option value="MODERATE">MODERATE</option>
                        <option value="AGGRESSIVE">AGGRESSIVE</option>
                        <option value="CUSTOM">CUSTOM</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">
                    Lambda Override
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={defaultLambda}
                    onChange={(e) =>
                      setDefaultLambda(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none"
                    placeholder="Profile Default"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">
                    Execution Bins Override
                  </label>
                  <input
                    type="number"
                    value={defaultNBins}
                    onChange={(e) =>
                      setDefaultNBins(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none"
                    placeholder="Profile Default"
                  />
                </div>
              </div>
            </section>

            {/* 3. Capital & Organizational Controls */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border/50 pb-2">
                <Coins className="w-4 h-4" />
                Capital Controls & Routing
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">
                    Capital Limit (INR)
                  </label>
                  <input
                    type="number"
                    value={capitalLimit}
                    onChange={(e) =>
                      setCapitalLimit(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none"
                    placeholder="0 = Unlimited"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">
                    Desk Code
                  </label>
                  <input
                    type="text"
                    value={deskCode}
                    onChange={(e) => setDeskCode(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none"
                    placeholder="e.g. D42"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">
                    Team Tag
                  </label>
                  <input
                    type="text"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none"
                    placeholder="e.g. equities"
                  />
                </div>
              </div>
            </section>

            {/* 4. Dynamic Metadata */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Custom Metadata
                </h3>
                <button
                  type="button"
                  onClick={handleAddDynamicMeta}
                  className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Field
                </button>
              </div>

              {dynamicMeta.length === 0 ? (
                <p className="text-xs text-muted-foreground italic bg-secondary/10 p-3 rounded-sm border border-border border-dashed text-center">
                  No custom metadata defined. Use this for UI preferences or
                  specific strategy tags.
                </p>
              ) : (
                <div className="space-y-2">
                  {dynamicMeta.map((meta, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 animate-in slide-in-from-top-2"
                    >
                      <input
                        type="text"
                        value={meta.key}
                        onChange={(e) =>
                          handleDynamicMetaChange(index, "key", e.target.value)
                        }
                        placeholder="Key (e.g. ui_theme)"
                        className="flex-1 px-3 py-1.5 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none font-mono text-xs"
                      />
                      <input
                        type="text"
                        value={meta.value}
                        onChange={(e) =>
                          handleDynamicMetaChange(
                            index,
                            "value",
                            e.target.value,
                          )
                        }
                        placeholder="Value (e.g. dark)"
                        className="flex-[2] px-3 py-1.5 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveDynamicMeta(index)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-secondary/5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-sm transition-all uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="client-form"
            className="px-8 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-bold hover:bg-primary/90 transition-all uppercase tracking-wider shadow-sm flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {editingClient ? "Save Changes" : "Create Client"}
          </button>
        </div>
      </div>
    </div>
  );
}
