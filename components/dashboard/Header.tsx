"use client";

import { BarChart3, Settings } from "lucide-react";
import StatusIndicator from "./StatusIndicator";
import ClientDropdown from "./ClientDropdown";
import RiskProfileDropdown from "./RiskProfileDropdown";
import RuntimeTuningProfileDropdown from "./RuntimeTuningProfileDropdown";
import { Client } from "@/lib/types";
import {
  RiskProfileResponse,
  RuntimeTuningProfile,
  RuntimeTuningProfileRequest,
} from "@/lib/vwap-server-types";

interface HeaderProps {
  chartTimeframeMode?: "ALL" | "DAY" | "WEEK" | "MONTH" | "YEAR";
  onTimeframeChange?: (mode: "ALL" | "DAY" | "WEEK" | "MONTH" | "YEAR") => void;
  selectedClient: Client | null;
  clients: Client[];
  onSelectClient: (client: Client) => void;
  onAddClient: (client: Client) => void;
  onDeleteClient?: (clientId: string) => void;
  riskProfiles?: RiskProfileResponse[];
  activeRiskProfileId?: string;
  onChangeRiskProfile?: (profile: RiskProfileResponse) => void;
  onSaveRiskProfile?: (profile: any) => void;
  onDeleteRiskProfile?: (profileId: string) => void;
  // Runtime Tuning Profiles
  tuningProfiles?: RuntimeTuningProfile[];
  selectedTuningProfileId?: number;
  onSelectTuningProfile?: (profile: RuntimeTuningProfile) => void;
  onSaveTuningProfile?: (
    request: RuntimeTuningProfileRequest,
    id?: number,
  ) => void;
  onDeleteTuningProfile?: (id: number) => void;
}

export default function Header({
  chartTimeframeMode = "ALL",
  onTimeframeChange,
  selectedClient,
  clients,
  onSelectClient,
  onAddClient,
  onDeleteClient,
  riskProfiles = [],
  activeRiskProfileId,
  onChangeRiskProfile,
  onSaveRiskProfile,
  onDeleteRiskProfile,
  tuningProfiles = [],
  selectedTuningProfileId,
  onSelectTuningProfile,
  onSaveTuningProfile,
  onDeleteTuningProfile,
}: HeaderProps) {
  return (
    <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <img
            src="https://www.google.com/s2/favicons?sz=64&domain=wissen.com"
            alt="Wissen Technology Logo"
            className="w-8 h-8 rounded-sm object-contain"
          />
          <div>
            <div className="flex items-baseline gap-1.5">
              <h1 className="text-xl font-black text-foreground tracking-wider">PLUTOS</h1>
              <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">by Wissen Technology</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Execution Dashboard
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 border-r border-border pr-6">
          <ClientDropdown
            selectedClient={selectedClient}
            clients={clients}
            onSelect={onSelectClient}
            onAdd={onAddClient}
            onDelete={onDeleteClient}
            riskProfiles={riskProfiles}
          />
          {onChangeRiskProfile && onSaveRiskProfile && (
            <RiskProfileDropdown
              profiles={riskProfiles}
              activeProfileId={activeRiskProfileId}
              onSelect={onChangeRiskProfile}
              onSaveProfile={onSaveRiskProfile}
              onDeleteProfile={onDeleteRiskProfile}
            />
          )}
          {onSelectTuningProfile && onSaveTuningProfile && (
            <RuntimeTuningProfileDropdown
              profiles={tuningProfiles}
              selectedProfileId={selectedTuningProfileId}
              onSelect={onSelectTuningProfile}
              onSave={onSaveTuningProfile}
              onDelete={onDeleteTuningProfile}
            />
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Timeframe:</span>
            <select
              value={chartTimeframeMode}
              onChange={(e) => onTimeframeChange?.(e.target.value as any)}
              className="text-sm bg-background border border-border rounded-sm px-3 py-1.5 hover:bg-secondary transition-colors"
            >
              <option value="ALL">All</option>
              <option value="DAY">Day</option>
              <option value="WEEK">Week</option>
              <option value="MONTH">Month</option>
              <option value="YEAR">Year</option>
            </select>
          </div>
          <StatusIndicator />
          <button className="p-2 rounded-sm hover:bg-secondary transition-colors">
            <Settings className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}
