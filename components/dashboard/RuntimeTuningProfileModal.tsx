'use client';

import { useState, useEffect } from 'react';
import { X, Sliders, Save, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { RuntimeTuningProfile, RuntimeTuningProfileRequest } from '@/lib/vwap-server-types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RuntimeTuningProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (request: RuntimeTuningProfileRequest) => void;
  onDelete?: (id: number) => void;
  editingProfile?: RuntimeTuningProfile | null;
}

type NumericField = Omit<RuntimeTuningProfile, 'id' | 'profileName' | 'description' | 'createdAt' | 'updatedAt'>;

interface ParamGroupDef {
  label: string;
  accent: string;
  fields: (keyof NumericField)[];
}

const PARAM_GROUPS: ParamGroupDef[] = [
  { label: 'Lambda', accent: 'text-violet-400', fields: ['lambdaMultiplier', 'lambdaClampLo', 'lambdaClampHi'] },
  { label: 'Adjustment Clamps', accent: 'text-emerald-400', fields: ['adjustmentClampLo', 'adjustmentClampHi'] },
  {
    label: 'Trend Weights', accent: 'text-amber-400',
    fields: ['rawTrendWeightGap', 'rawTrendWeightConsistency', 'rawTrendWeightReturn'],
  },
  {
    label: 'EWMA', accent: 'text-sky-400',
    fields: ['ewmaFastOldWeight', 'ewmaSlowOldWeight', 'intradayAlphaEwmaOldWeight'],
  },
  {
    label: 'Trend Regime', accent: 'text-amber-400',
    fields: [
      'upTrendScoreThreshold', 'upTrendConsecBars',
      'downTrendScoreThreshold', 'downTrendConsecBars',
      'maxTrendAccel', 'minTrendAccel',
      'trendAccelScaleUp', 'trendAccelScaleDown',
    ],
  },
  { label: 'Scaling', accent: 'text-emerald-400', fields: ['barStructAlpha', 'scaleFactorHi', 'scaleFactorLo'] },
  {
    label: 'Liquidity', accent: 'text-cyan-400',
    fields: ['liquidityFactorBase', 'liquidityFactorScale', 'deficitPressureScale', 'deficitFracClamp'],
  },
  {
    label: 'Execution', accent: 'text-rose-400',
    fields: ['executionScoreHistWeight', 'priceEdgeExponent', 'strongSignalThreshold'],
  },
  {
    label: 'Refinement', accent: 'text-orange-400',
    fields: ['refinementPasses', 'binSmoothingWindow', 'minSpacingDenominator'],
  },
];

const INTEGER_FIELDS = new Set<keyof NumericField>([
  'upTrendConsecBars', 'downTrendConsecBars', 'refinementPasses',
  'binSmoothingWindow', 'minSpacingDenominator',
]);

const FIELD_STEPS: Partial<Record<keyof NumericField, number>> = {
  upTrendConsecBars: 1, downTrendConsecBars: 1,
  refinementPasses: 1, binSmoothingWindow: 1, minSpacingDenominator: 1,
};

const DEFAULT_PARAMS: NumericField = {
  lambdaMultiplier: 1.0, adjustmentClampLo: -0.15, adjustmentClampHi: 0.15,
  rawTrendWeightGap: 0.33, rawTrendWeightConsistency: 0.33, rawTrendWeightReturn: 0.34,
  ewmaFastOldWeight: 0.9, ewmaSlowOldWeight: 0.95,
  upTrendScoreThreshold: 0.25, upTrendConsecBars: 3,
  downTrendScoreThreshold: -0.25, downTrendConsecBars: 3,
  maxTrendAccel: 0.15, minTrendAccel: -0.15,
  trendAccelScaleUp: 1.0, trendAccelScaleDown: 1.0,
  intradayAlphaEwmaOldWeight: 0.95, barStructAlpha: 0.5,
  scaleFactorHi: 1.2, scaleFactorLo: 0.8,
  executionScoreHistWeight: 0.5, lambdaClampLo: 5.0, lambdaClampHi: 50.0,
  priceEdgeExponent: 1.0, liquidityFactorBase: 1.0, liquidityFactorScale: 1.0,
  deficitPressureScale: 1.0, deficitFracClamp: 0.5,
  binSmoothingWindow: 3, minSpacingDenominator: 4,
  strongSignalThreshold: 0.7, refinementPasses: 2,
};

export default function RuntimeTuningProfileModal({
  isOpen, onClose, onSave, onDelete, editingProfile,
}: RuntimeTuningProfileModalProps) {
  const [profileName, setProfileName] = useState('');
  const [description, setDescription] = useState('');
  const [params, setParams] = useState<NumericField>({ ...DEFAULT_PARAMS });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isOpen) { setConfirmDelete(false); return; }
    if (editingProfile) {
      setProfileName(editingProfile.profileName || '');
      setDescription(editingProfile.description || '');
      const p: NumericField = {} as NumericField;
      (Object.keys(DEFAULT_PARAMS) as (keyof NumericField)[]).forEach((k) => {
        (p as any)[k] = (editingProfile as any)[k] ?? (DEFAULT_PARAMS as any)[k];
      });
      setParams(p);
    } else {
      setProfileName('');
      setDescription('');
      setParams({ ...DEFAULT_PARAMS });
    }
    // Collapse all groups by default
    setExpandedGroups(Object.fromEntries(PARAM_GROUPS.map(g => [g.label, false])));
  }, [editingProfile, isOpen]);

  const handleParamChange = (key: keyof NumericField, val: string) => {
    const step = FIELD_STEPS[key] ?? 0.001;
    const parsed = step >= 1 ? parseInt(val, 10) : parseFloat(val);
    setParams((prev) => ({ ...prev, [key]: isNaN(parsed) ? prev[key] : parsed }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) { toast.error('Profile name is required'); return; }
    onSave({ profileName: profileName.trim(), description: description.trim(), ...params });
    onClose();
  };

  const toggleGroup = (label: string) =>
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="bg-card border border-border/70 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-97 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sliders className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {editingProfile ? 'Edit Tuning Profile' : 'New Tuning Profile'}
              </h2>
              <p className="text-[10px] text-muted-foreground">Runtime parameter preset</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <form id="tuning-profile-form" onSubmit={handleSubmit}>

            {/* Identity section */}
            <div className="px-6 py-5 border-b border-border/30 bg-secondary/5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Profile Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProfile}
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''))}
                    className="w-full px-3 py-2 bg-background border border-border/60 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    placeholder="AGGRESSIVE_PROFILE"
                  />
                  {editingProfile && (
                    <p className="text-[10px] text-muted-foreground/60">Name is immutable after creation</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border/60 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all"
                    placeholder="e.g. High urgency execution"
                  />
                </div>
              </div>
            </div>

            {/* Parameter groups — collapsible */}
            <div className="divide-y divide-border/30">
              {PARAM_GROUPS.map((group) => (
                <div key={group.label}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-secondary/20 transition-colors text-left"
                  >
                    <span className={cn('text-[10px] font-bold uppercase tracking-widest', group.accent)}>
                      {group.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground/40">{group.fields.length} params</span>
                      {expandedGroups[group.label]
                        ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/50" />
                        : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />}
                    </div>
                  </button>

                  {expandedGroups[group.label] && (
                    <div className="px-6 pb-4 grid grid-cols-2 gap-x-6 gap-y-2.5 bg-secondary/5">
                      {group.fields.map((field) => {
                        const step = FIELD_STEPS[field] ?? 0.001;
                        return (
                          <div key={field} className="flex items-center justify-between gap-3">
                            <label
                              className="text-[10px] text-muted-foreground font-mono flex-1 truncate"
                              title={field}
                            >
                              {field}
                            </label>
                            <input
                              type="number"
                              step={step}
                              value={(params as any)[field] ?? ''}
                              onChange={(e) => handleParamChange(field, e.target.value)}
                              className="w-24 px-2 py-1 bg-background border border-border/60 rounded-md text-[11px] font-mono text-right focus:ring-1 focus:ring-primary/30 focus:border-primary/40 outline-none transition-all"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 bg-secondary/5 flex items-center justify-between gap-3">
          <div>
            {editingProfile && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-destructive">Confirm delete?</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingProfile.id !== undefined) { onDelete(editingProfile.id); onClose(); }
                    }}
                    className="px-3 py-1.5 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-lg transition-all hover:bg-destructive/90"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-secondary rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-destructive/70 hover:text-destructive hover:bg-destructive/8 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Profile
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[10px] font-bold text-muted-foreground hover:bg-secondary rounded-lg transition-all uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="tuning-profile-form"
              className="flex items-center gap-1.5 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold hover:bg-primary/90 transition-all uppercase tracking-wider shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {editingProfile ? 'Save Changes' : 'Create Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}