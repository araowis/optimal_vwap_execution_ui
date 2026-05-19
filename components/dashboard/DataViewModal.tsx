"use client";

import { X, Database } from "lucide-react";

interface DataViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
}

export default function DataViewModal({
  isOpen,
  onClose,
  title,
  data,
}: DataViewModalProps) {
  if (!isOpen) return null;

  const renderValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined)
      return <span className="text-muted-foreground italic">null</span>;
    if (typeof value === "boolean")
      return <span className="font-mono text-primary">{value.toString()}</span>;
    if (typeof value === "number")
      return <span className="font-mono text-blue-500">{value}</span>;
    if (typeof value === "object") {
      if (Object.keys(value).length === 0)
        return <span className="text-muted-foreground italic">empty</span>;
      return (
        <div className="space-y-1 mt-1">
          {Object.entries(value).map(([k, v]) => (
            <div
              key={k}
              className="flex flex-col sm:flex-row sm:items-start border-l-2 border-border/50 pl-3 py-1"
            >
              <span className="text-xs font-medium text-muted-foreground min-w-[120px]">
                {k}
              </span>
              <div className="text-xs text-foreground font-mono mt-1 sm:mt-0">
                {renderValue(v)}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-foreground">{String(value)}</span>;
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-2xl rounded-sm shadow-md overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/20">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-md font-bold text-foreground tracking-tight">
                {title}
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Backend Information
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-sm transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-background">
          <div className="space-y-2">
            {data &&
              typeof data === "object" &&
              Object.entries(data).map(([k, v]) => {
                if (v === undefined) return null;
                return (
                  <div
                    key={k}
                    className="flex flex-col sm:flex-row sm:items-start border-b border-border/50 pb-2 last:border-0"
                  >
                    <span className="text-xs font-bold text-muted-foreground min-w-[180px] uppercase tracking-wider pt-0.5">
                      {k}
                    </span>
                    <div className="text-xs flex-1">{renderValue(v)}</div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
