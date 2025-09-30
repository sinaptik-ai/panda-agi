"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Globe, Lock, Share2, Check, ExternalLink } from "lucide-react";
import { toast } from "react-hot-toast";
import { ArtifactResponse } from "@/lib/api/artifacts";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: ArtifactResponse | null;
  onTogglePublic: (artifact: ArtifactResponse) => Promise<void>;
  isUpdating: boolean;
}

export default function ShareModal({
  isOpen,
  onClose,
  artifact,
  onTogglePublic,
  isUpdating,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!artifact) return null;

  const shareUrl = `${window.location.origin}/creations/${
    artifact.id
  }/${encodeURIComponent(artifact.filepath)}`;

  const handleCopyLink = async () => {
    if (!artifact.is_public) {
      // First make it public, then copy
      try {
        await onTogglePublic(artifact);
        // After making public, copy the link
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Creation shared! Link copied to clipboard");
      } catch (err) {
        toast.error("Failed to share creation");
      }
    } else {
      // Already public, just copy
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Link copied to clipboard!");
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Link copied to clipboard!");
      }
    }
  };

  const handleTogglePrivacy = async () => {
    try {
      await onTogglePublic(artifact);
    } catch (err) {
      toast.error("Failed to update privacy setting");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share creation</DialogTitle>
          <DialogDescription>
            Share &quot;{artifact.name}&quot; with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Privacy Status */}
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md">
            <div className="flex items-center gap-2">
              {artifact.is_public ? (
                <>
                  <Globe className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Public
                  </span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Private</span>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTogglePrivacy}
              disabled={isUpdating}
              className="h-7 px-2 text-xs"
            >
              {isUpdating ? (
                <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
              ) : artifact.is_public ? (
                "Make Private"
              ) : (
                "Make Public"
              )}
            </Button>
          </div>

          {/* Share Actions */}
          <div className="space-y-2">
            {artifact.is_public ? (
              <>
                <Button
                  onClick={handleCopyLink}
                  className="w-full justify-center gap-2"
                  variant="default"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy Link"}
                </Button>

                <Button
                  onClick={() => window.open(shareUrl, "_blank")}
                  className="w-full justify-center gap-2"
                  variant="ghost"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  View
                </Button>
              </>
            ) : (
              <Button
                onClick={handleCopyLink}
                className="w-full justify-center gap-2"
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                {isUpdating ? "Sharing..." : "Share"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
