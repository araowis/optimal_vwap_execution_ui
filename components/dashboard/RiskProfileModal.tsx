"use client";

import { useState, useEffect } from "react";
import { X, ShieldAlert, KeyRound, Save, Trash2, Lock } from "lucide-react";
import { RiskProfileResponse } from "@/lib/vwap-server-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RiskProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: any) => void;
  onDelete?: (profileId: string) => void;
  editingProfile?: RiskProfileResponse | null;
}

const PROTECTED_PROFILES = ["CONSERVATIVE", "MODERATE", "AGGRESSIVE"];

export default function RiskProfileModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingProfile,
}: RiskProfileModalProps) {
  const [profileId, setProfileId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [defaultLambda, setDefaultLambda] = useState<number | "">(15.0);
  const [defaultNBins, setDefaultNBins] = useState<number | "">(12);

  const isProtected = editingProfile
    ? PROTECTED_PROFILES.includes(editingProfile.profileId || "")
    : false;

  useEffect(() => {
    if (editingProfile) {
      setProfileId(editingProfile.profileId || "");
      setDisplayName(editingProfile.displayName || "");
      setDefaultLambda(editingProfile.defaultLambda ?? 15.0);
      setDefaultNBins(editingProfile.defaultNBins ?? 12);
    } else {
      setProfileId("");
      setDisplayName("");
      setDefaultLambda(15.0);
      setDefaultNBins(12);
    }
  }, [editingProfile, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !profileId ||
      !displayName ||
      defaultLambda === "" ||
      defaultNBins === ""
    )
      return;
    if (isProtected) return;

    onSave({
      profileId,
      displayName,
      defaultLambda: Number(defaultLambda),
      defaultNBins: Number(defaultNBins),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-lg rounded-sm shadow-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/5 flex items-center justify-center border border-primary/10">
              <ShieldAlert className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
                {editingProfile ? "Edit Risk Profile" : "Create Risk Profile"}
                {isProtected && (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                {editingProfile
                  ? "Modify execution risk settings"
                  : "Define new execution behavior"}
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
          <form
            id="risk-profile-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border/50 pb-2">
                Profile Identity
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">
                    Profile ID <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      disabled={!!editingProfile}
                      value={profileId}
                      onChange={(e) =>
                        setProfileId(
                          e.target.value.toUpperCase().replace(/\s+/g, "_"),
                        )
                      }
                      className="w-full px-4 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none pl-10 disabled:opacity-50"
                      placeholder="e.g. HDFC_CUSTOM"
                    />
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  {editingProfile && (
                    <p className="text-[10px] text-muted-foreground">
                      Profile ID is immutable after creation.
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
                    disabled={isProtected}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-sm text-sm focus:ring-1 focus:ring-primary/30 outline-none disabled:opacity-50"
                    placeholder="e.g. HDFC Alpha Strategy"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border/50 pb-2">
                Execution Defaults
              </h3>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">
                      Default Lambda (Risk Aversion){" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded-sm">
                      {defaultLambda}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="0.5"
                    disabled={isProtected}
                    value={defaultLambda === "" ? 15 : defaultLambda}
                    onChange={(e) => setDefaultLambda(Number(e.target.value))}
                    className="w-full accent-primary disabled:opacity-50"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Aggressive (Lower)</span>
                    <span>Conservative (Higher)</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">
                      Default N Bins (Execution Chunks){" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded-sm">
                      {defaultNBins}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="60"
                    step="1"
                    disabled={isProtected}
                    value={defaultNBins === "" ? 12 : defaultNBins}
                    onChange={(e) => setDefaultNBins(Number(e.target.value))}
                    className="w-full accent-primary disabled:opacity-50"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Faster Chunking (Lower)</span>
                    <span>Smoother Granularity (Higher)</span>
                  </div>
                </div>
              </div>
            </section>
          </form>
        </div>

        <div className="p-6 border-t border-border bg-secondary/5 flex items-center justify-between gap-3">
          <div>
            {editingProfile && !isProtected && onDelete && (
              <button
                type="button"
                onClick={() => {
                  toast(`Delete profile ${profileId}?`, {
                    description: "This action cannot be undone.",
                    action: {
                      label: "Delete",
                      onClick: () => {
                        onDelete(profileId);
                        onClose();
                      },
                    },
                    cancel: {
                      label: "Cancel",
                      onClick: () => {},
                    },
                  });
                }}
                className="px-4 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-sm transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            {isProtected && (
              <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Built-in profiles cannot be
                modified.
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-sm transition-all uppercase tracking-wider"
            >
              Cancel
            </button>
            {!isProtected && (
              <button
                type="submit"
                form="risk-profile-form"
                className="px-8 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-bold hover:bg-primary/90 transition-all uppercase tracking-wider shadow-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingProfile ? "Save Changes" : "Create Profile"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
