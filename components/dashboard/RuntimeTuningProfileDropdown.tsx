"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Sliders,
  Plus,
  Check,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  RuntimeTuningProfile,
  RuntimeTuningProfileRequest,
} from "@/lib/vwap-server-types";
import { cn } from "@/lib/utils";
import RuntimeTuningProfileModal from "./RuntimeTuningProfileModal";
import { toast } from "sonner";

interface RuntimeTuningProfileDropdownProps {
  profiles: RuntimeTuningProfile[];
  selectedProfileId?: number;
  onSelect: (profile: RuntimeTuningProfile) => void;
  onSave: (request: RuntimeTuningProfileRequest, id?: number) => void;
  onDelete?: (id: number) => void;
}

export default function RuntimeTuningProfileDropdown({
  profiles,
  selectedProfileId,
  onSelect,
  onSave,
  onDelete,
}: RuntimeTuningProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] =
    useState<RuntimeTuningProfile | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeProfile = profiles.find((p) => p.id === selectedProfileId);

  const handleSave = (request: RuntimeTuningProfileRequest) => {
    onSave(request, editingProfile?.id);
  };

  const handleDeleteConfirm = (id: number, name: string) => {
    toast(`Delete "${name}"?`, {
      description: "This profile will be permanently removed.",
      action: { label: "Delete", onClick: () => onDelete?.(id) },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 border rounded-lg transition-all min-w-[200px] justify-between group",
          isOpen
            ? "bg-secondary/60 border-border shadow-sm"
            : "bg-secondary/30 border-border/50 hover:bg-secondary/50 hover:border-border",
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
            <Sliders className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex flex-col items-start min-w-0">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold leading-tight">
              Tuning Profile
            </p>
            <p className="text-[11px] font-bold text-foreground truncate leading-tight mt-0.5 font-mono">
              {activeProfile ? (
                activeProfile.profileName
              ) : (
                <span className="text-muted-foreground font-normal">
                  None selected
                </span>
              )}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-[280px] bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-left">
          {/* Header */}
          <div className="px-3 pt-3 pb-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold px-1">
              Active Profile
            </p>
          </div>

          {/* None option */}
          <div className="px-2 pb-1">
            <button
              onClick={() => {
                onSelect({
                  id: undefined as any,
                  profileName: "",
                  description: "",
                });
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all",
                !selectedProfileId
                  ? "bg-secondary/60 text-foreground"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  !selectedProfileId ? "bg-primary" : "bg-border",
                )}
              />
              <span className="text-[11px] flex-1 italic">No profile</span>
              {!selectedProfileId && <Check className="w-3 h-3 text-primary" />}
            </button>
          </div>

          {/* Divider */}
          {profiles.length > 0 && (
            <div className="mx-3 border-t border-border/50 mb-1">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold pt-2 pb-1 px-1">
                Saved profiles
              </p>
            </div>
          )}

          {/* Profile list */}
          <div className="max-h-[220px] overflow-y-auto px-2 pb-2 space-y-0.5">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className={cn(
                  "group/row flex items-center gap-1.5 w-full rounded-lg transition-all relative",
                  selectedProfileId === profile.id
                    ? "bg-primary/8"
                    : "hover:bg-secondary/40",
                )}
              >
                <button
                  onClick={() => {
                    onSelect(profile);
                    setIsOpen(false);
                  }}
                  className="flex-1 min-w-0 text-left px-2.5 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        selectedProfileId === profile.id
                          ? "bg-primary"
                          : "bg-border",
                      )}
                    />
                    <p className="text-[11px] font-bold text-foreground font-mono truncate">
                      {profile.profileName}
                    </p>
                    {selectedProfileId === profile.id && (
                      <Check className="w-3 h-3 text-primary flex-shrink-0 ml-auto" />
                    )}
                  </div>
                  {profile.description && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5 pl-3.5">
                      {profile.description}
                    </p>
                  )}
                </button>

                {/* Actions — appear on hover */}
                <div className="flex items-center opacity-0 group-hover/row:opacity-100 transition-opacity gap-0.5 pr-1.5 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProfile(profile);
                      setIsModalOpen(true);
                      setIsOpen(false);
                    }}
                    className="p-1 hover:bg-primary/10 hover:text-primary rounded-md transition-colors text-muted-foreground"
                    title="Edit"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConfirm(
                          profile.id!,
                          profile.profileName || "",
                        );
                      }}
                      className="p-1 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors text-muted-foreground"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {profiles.length === 0 && (
              <div className="py-5 text-center">
                <Sliders className="w-6 h-6 mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-[10px] text-muted-foreground/50">
                  No profiles saved yet
                </p>
              </div>
            )}
          </div>

          {/* Footer action */}
          <div className="p-2 border-t border-border/50 bg-secondary/5">
            <button
              onClick={() => {
                setEditingProfile(null);
                setIsModalOpen(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[10px] font-bold hover:bg-primary/20 transition-all uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" />
              New Tuning Profile
            </button>
          </div>
        </div>
      )}

      <RuntimeTuningProfileModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProfile(null);
        }}
        onSave={handleSave}
        onDelete={onDelete}
        editingProfile={editingProfile}
      />
    </div>
  );
}
