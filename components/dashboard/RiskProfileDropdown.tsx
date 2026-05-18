'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ShieldAlert, Plus, Check, Pencil, Lock, Eye } from 'lucide-react';
import { RiskProfileResponse } from '@/lib/vwap-server-types';
import { cn } from '@/lib/utils';
import RiskProfileModal from './RiskProfileModal';
import DataViewModal from './DataViewModal';

interface RiskProfileDropdownProps {
  activeProfileId?: string;
  profiles: RiskProfileResponse[];
  onSelect: (profile: RiskProfileResponse) => void;
  onSaveProfile: (profile: any) => void;
  onDeleteProfile?: (profileId: string) => void;
}

const PROTECTED_PROFILES = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'];

export default function RiskProfileDropdown({
  activeProfileId,
  profiles,
  onSelect,
  onSaveProfile,
  onDeleteProfile,
}: RiskProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<RiskProfileResponse | null>(null);
  const [viewingProfile, setViewingProfile] = useState<RiskProfileResponse | null>(null);
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

  const activeProfile = profiles.find(p => p.profileId === activeProfileId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-secondary/30 hover:bg-secondary/50 border border-border rounded-sm transition-all min-w-[200px] justify-between group shadow-sm"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/20">
            <ShieldAlert className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col items-start min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold leading-tight">
              Risk Profile
            </p>
            <p className="text-xs font-bold text-foreground truncate leading-tight mt-0.5">
              {activeProfile ? activeProfile.displayName : 'Select Profile'}
            </p>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[280px] bg-card border border-border rounded-sm shadow-md z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
          
          <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
            {profiles.map((profile) => {
              const isProtected = PROTECTED_PROFILES.includes(profile.profileId || '');
              
              return (
                <div 
                  key={profile.profileId}
                  className={cn(
                    "group/row flex items-center gap-3 w-full px-2 py-2 text-left transition-all relative rounded-sm",
                    activeProfileId === profile.profileId 
                      ? "bg-primary/5 border-l-2 border-l-primary" 
                      : "hover:bg-secondary/50 border-l-2 border-l-transparent"
                  )}
                >
                  <button
                    onClick={() => {
                      onSelect(profile);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                          {profile.displayName}
                          {isProtected && <Lock className="w-3 h-3 text-muted-foreground" />}
                        </p>
                        {activeProfileId === profile.profileId && (
                          <Check className="w-3.5 h-3.5 text-primary" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono truncate text-left mt-0.5">
                        λ:{profile.defaultLambda} • Bins:{profile.defaultNBins}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center opacity-0 group-hover/row:opacity-100 transition-opacity pr-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingProfile(profile);
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
                        setEditingProfile(profile);
                        setIsModalOpen(true);
                        setIsOpen(false);
                      }}
                      className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-sm transition-colors text-muted-foreground"
                      title="View/Edit Profile"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2 bg-secondary/5 border-t border-border">
            <button
              onClick={() => {
                setEditingProfile(null);
                setIsModalOpen(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-sm text-xs font-bold hover:bg-primary/90 transition-all uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              New Custom Profile
            </button>
          </div>
        </div>
      )}

      <RiskProfileModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingProfile(null);
        }} 
        onSave={onSaveProfile}
        onDelete={onDeleteProfile}
        editingProfile={editingProfile}
      />

      <DataViewModal
        isOpen={!!viewingProfile}
        onClose={() => setViewingProfile(null)}
        title={viewingProfile ? `Raw Data: ${viewingProfile.displayName}` : ''}
        data={viewingProfile}
      />
    </div>
  );
}
