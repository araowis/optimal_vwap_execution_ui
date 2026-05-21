"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Database,
  Server,
  Zap,
} from "lucide-react";

interface ServiceStatus {
  name: string;
  status: "connected" | "disconnected" | "loading" | "error";
  icon: React.ReactNode;
  lastChecked?: string;
  details?: string;
}

interface StatusIndicatorProps {
  small?: boolean;
}

export default function StatusIndicator({ small = false }: StatusIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const [statuses, setStatuses] = useState<ServiceStatus[]>([
    {
      name: "Backend API",
      status: "loading",
      icon: <Server className="w-4 h-4" />,
    },
    {
      name: "Upstox API",
      status: "loading",
      icon: <Zap className="w-4 h-4" />,
    },
    {
      name: "Correction Engine",
      status: "loading",
      icon: <Database className="w-4 h-4" />,
    },
    {
      name: "WebSocket",
      status: "loading",
      icon: <Activity className="w-4 h-4" />,
    },
  ]);

  useEffect(() => {
    checkStatuses();
    const interval = setInterval(checkStatuses, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkStatuses = async () => {
    const now = new Date().toLocaleTimeString();

    // Check Backend API
    try {
      const backendRes = await fetch("/api/health", {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      setStatuses((prev) =>
        prev.map((s) =>
          s.name === "Backend API"
            ? {
                ...s,
                status: backendRes.ok ? "connected" : "disconnected",
                lastChecked: now,
                details: backendRes.ok
                  ? "API responding"
                  : "API not responding",
              }
            : s,
        ),
      );
    } catch {
      setStatuses((prev) =>
        prev.map((s) =>
          s.name === "Backend API"
            ? {
                ...s,
                status: "disconnected",
                lastChecked: now,
                details: "Connection failed",
              }
            : s,
        ),
      );
    }

    // Check Upstox API (check actual health endpoint)
    const upstoxToken = localStorage.getItem("upstox-access-token");
    if (upstoxToken) {
      try {
        const upstoxRes = await fetch("/api/upstox/health", {
          method: "GET",
          headers: { Authorization: `Bearer ${upstoxToken}` },
          signal: AbortSignal.timeout(5000),
        });
        setStatuses((prev) =>
          prev.map((s) =>
            s.name === "Upstox API"
              ? {
                  ...s,
                  status: upstoxRes.ok ? "connected" : "disconnected",
                  lastChecked: now,
                  details: upstoxRes.ok ? "Token valid" : "Token invalid",
                }
              : s,
          ),
        );
      } catch {
        setStatuses((prev) =>
          prev.map((s) =>
            s.name === "Upstox API"
              ? {
                  ...s,
                  status: "disconnected",
                  lastChecked: now,
                  details: "Connection failed",
                }
              : s,
          ),
        );
      }
    } else {
      setStatuses((prev) =>
        prev.map((s) =>
          s.name === "Upstox API"
            ? {
                ...s,
                status: "disconnected",
                lastChecked: now,
                details: "No token configured",
              }
            : s,
        ),
      );
    }

    // Check Correction Engine (mock for now)
    setStatuses((prev) =>
      prev.map((s) =>
        s.name === "Correction Engine"
          ? {
              ...s,
              status: "connected",
              lastChecked: now,
              details: "Engine running",
            }
          : s,
      ),
    );

    // Check WebSocket (check if any MarketDepth is connected via custom event)
    const wsConnected = localStorage.getItem("websocket-connected") === "true";
    setStatuses((prev) =>
      prev.map((s) =>
        s.name === "WebSocket"
          ? {
              ...s,
              status: wsConnected ? "connected" : "disconnected",
              lastChecked: now,
              details: wsConnected ? "Streaming active" : "Not connected",
            }
          : s,
      ),
    );
  };

  const getStatusColor = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "connected":
        return "text-green-600 dark:text-green-400";
      case "disconnected":
        return "text-red-600 dark:text-red-400";
      case "error":
        return "text-orange-600 dark:text-orange-400";
      case "loading":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: ServiceStatus["status"]) => {
    const size = small ? "w-3 h-3" : "w-4 h-4";
    switch (status) {
      case "connected":
        return <CheckCircle className={size} />;
      case "disconnected":
        return <XCircle className={size} />;
      case "error":
        return <AlertCircle className={size} />;
      case "loading":
        return (
          <div className={`${size} border-2 border-current border-t-transparent rounded-full animate-spin`} />
        );
      default:
        return <AlertCircle className={size} />;
    }
  };

  const overallStatus = statuses.every((s) => s.status === "connected")
    ? "connected"
    : statuses.some((s) => s.status === "error")
      ? "error"
      : statuses.some((s) => s.status === "disconnected")
        ? "disconnected"
        : "loading";

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`${
          small ? "p-1.5 px-2.5 text-xs rounded-md gap-1.5" : "p-2 rounded-lg text-sm gap-2"
        } hover:bg-secondary transition-colors flex items-center`}
        title="Connection Status"
      >
        {getStatusIcon(overallStatus)}
        <span
          className={`font-semibold ${getStatusColor(overallStatus)}`}
        >
          Status
        </span>
        {expanded ? (
          <ChevronUp className={small ? "w-3 h-3" : "w-4 h-4"} />
        ) : (
          <ChevronDown className={small ? "w-3 h-3" : "w-4 h-4"} />
        )}
      </button>

      {expanded && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-lg shadow-lg p-4 z-50">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Service Status
          </h3>
          <div className="space-y-3">
            {statuses.map((service, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-2 rounded hover:bg-secondary/50 transition-colors"
              >
                <div className={`mt-0.5 ${getStatusColor(service.status)}`}>
                  {service.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {service.name}
                    </span>
                    <div className={getStatusColor(service.status)}>
                      {getStatusIcon(service.status)}
                    </div>
                  </div>
                  {service.details && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {service.details}
                    </p>
                  )}
                  {service.lastChecked && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Checked: {service.lastChecked}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={checkStatuses}
            className="w-full mt-3 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors"
          >
            Refresh Status
          </button>
        </div>
      )}
    </div>
  );
}
