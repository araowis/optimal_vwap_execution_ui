"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Key, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UpstoxConfigDialogProps {
  onConfigured: (config: { accessToken: string }) => void;
}

export default function UpstoxConfigDialog({
  onConfigured,
}: UpstoxConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setError(null);

    if (!accessToken) {
      setError("Please enter your access token");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/upstox/health", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!result.ok) {
        setError(
          `Invalid access token: ${result.error || "Please check your token"}`,
        );
        return;
      }

      onConfigured({ accessToken });
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to validate access token",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="secondary">
          <Key className="w-4 h-4 mr-2" />
          Connect Upstox API
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Configure Upstox API
          </DialogTitle>
          <DialogDescription>
            Enter your Upstox API credentials to connect and fetch real-time
            market data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="access-token" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Access Token
            </Label>
            <Input
              id="access-token"
              type="password"
              placeholder="Enter your Upstox access token"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Get your access token from{" "}
              <a
                href="https://account.upstox.com/developer/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Upstox Developer Apps
              </a>{" "}
              (valid for 30 days)
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Important:</strong> Your access token will be stored
              locally in your browser. The access token is valid for 30 days
              from generation.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={loading}>
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
