import React, { useState } from "react";
import { Share2, MoreVertical, Trash2, Pencil, Download } from "lucide-react";
import { toast } from "react-hot-toast";
import { useModalState } from "@/hooks/useModalState";
import ShareModal from "./share-modal";
import DeleteConfirmationDialog from "./delete-confirmation-dialog";
import { ArtifactResponse } from "@/lib/api/artifacts";
import { ArtifactData } from "@/types/artifact";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { downloadWithCheck } from "@/lib/utils";
import { getBackendServerURL } from "@/lib/server";
import { PreviewData } from "./content-sidebar";

interface ArtifactActionsProps {
  artifact: ArtifactData | null;
  onArtifactUpdated?: (artifact: ArtifactData) => void;
  onArtifactDeleted?: (artifactId: string) => void;
  onClose?: () => void;
  onEditName?: (() => void) | null;
  showShare?: boolean;
  showDelete?: boolean;
  isSaved?: boolean;
  previewData?: PreviewData;
  conversationId?: string;
}

const ArtifactActions: React.FC<ArtifactActionsProps> = ({
  artifact,
  onArtifactUpdated,
  onArtifactDeleted,
  onClose,
  onEditName,
  showShare = true,
  showDelete = true,
  isSaved = false,
  previewData,
  conversationId,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal state management
  const shareModal = useModalState();
  const deleteModal = useModalState();

  // Handle share
  const handleShare = () => {
    if (!isSaved || !artifact) {
      toast.error("Please save the creation first before sharing");
      return;
    }
    shareModal.open();
  };

  // Handle delete
  const handleDelete = () => {
    deleteModal.open();
  };

  // Handle download
  const handleDownload = async () => {
    if (!isSaved || !artifact || !conversationId || !previewData) {
      toast.error("Please save the creation first before downloading");
      return;
    }

    try {
      const filename = previewData.filename || artifact.filepath;
      const downloadUrl = getBackendServerURL(
        `/${conversationId}/files/download?file_path=${encodeURIComponent(
          filename
        )}`
      );
      try {
        let fileName = filename.split("/").pop();

        if (fileName && fileName.endsWith(".md")) {
          fileName = fileName.replace(".md", ".pdf");
        }

        await downloadWithCheck(downloadUrl, fileName || "download");
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Download failed: File not found or access denied";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Download error:", error);
      if (error instanceof Error) {
        toast.error(`Download failed: ${error.message}`);
      } else {
        toast.error("Download failed: Unknown error");
      }
    }
  };

  // Handle edit name
  const handleEditName = () => {
    if (onEditName) {
      // Add a small delay to ensure dropdown closes before focusing
      setTimeout(() => {
        onEditName();
      }, 100);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!artifact) {
      toast.error("No artifact to delete");
      return;
    }

    deleteModal.setLoading(true);
    try {
      // Import the deleteArtifact function
      const { deleteArtifact } = await import("@/lib/api/artifacts");
      await deleteArtifact(artifact.id);

      toast.success("Artifact deleted successfully");
      deleteModal.close();

      if (onArtifactDeleted) {
        onArtifactDeleted(artifact.id);
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to delete artifact:", error);
      toast.error("Failed to delete artifact");
    } finally {
      deleteModal.setLoading(false);
    }
  };

  // Handle artifact privacy toggle
  const handleTogglePublic = async (artifactToUpdate: ArtifactData) => {
    if (!artifactToUpdate) return;

    setIsUpdating(true);
    try {
      // Import the updateArtifact function
      const { updateArtifact } = await import("@/lib/api/artifacts");
      const updatedArtifact = await updateArtifact(artifactToUpdate.id, {
        is_public: !artifactToUpdate.is_public,
      });

      const newArtifactData: ArtifactData = {
        ...artifactToUpdate,
        is_public: updatedArtifact.is_public,
      };

      if (onArtifactUpdated) {
        onArtifactUpdated(newArtifactData);
      }

      toast.success(
        `Creation made ${
          updatedArtifact.is_public ? "public" : "private"
        } successfully!`
      );
    } catch (error) {
      console.error("Failed to update privacy setting:", error);
      toast.error("Failed to update privacy setting");
    } finally {
      setIsUpdating(false);
    }
  };

  // Create header actions
  const headerActions = (
    <TooltipProvider>
      {/* Download button - always show for markdown files */}
      {previewData?.type === "markdown" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleDownload}
              disabled={!isSaved}
              className={`h-8 w-8 rounded-md transition-colors flex items-center justify-center ${
                isSaved
                  ? "hover:bg-accent text-muted-foreground cursor-pointer"
                  : "cursor-not-allowed text-muted-foreground/50"
              }`}
            >
              <Download className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isSaved
                ? "Download as PDF"
                : "Save the creation first to enable download"}
            </p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Share button */}
      {showShare && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleShare}
              disabled={!isSaved}
              className={`h-8 w-8 rounded-md transition-colors flex items-center justify-center ${
                isSaved
                  ? "hover:bg-accent text-muted-foreground cursor-pointer"
                  : "cursor-not-allowed text-muted-foreground/50"
              }`}
            >
              <Share2 className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isSaved
                ? "Share creation"
                : "Save the creation first to enable sharing"}
            </p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* More options dropdown - only show when creation is saved */}
      {showDelete && isSaved && artifact && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-8 w-8 rounded-md hover:bg-accent transition-colors flex items-center justify-center cursor-pointer"
              title="More options"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onEditName && (
              <DropdownMenuItem
                onClick={handleEditName}
                className="cursor-pointer"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit name
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </TooltipProvider>
  );

  return (
    <>
      {headerActions}

      {/* Share Modal */}
      {shareModal.isOpen && artifact && (
        <ShareModal
          isOpen={shareModal.isOpen}
          onClose={shareModal.close}
          artifact={artifact as ArtifactResponse}
          onTogglePublic={handleTogglePublic}
          isUpdating={isUpdating}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteModal.isOpen && (
        <DeleteConfirmationDialog
          isOpen={deleteModal.isOpen}
          onClose={deleteModal.close}
          onConfirm={handleDeleteConfirm}
          title="Delete Artifact"
          description="Are you sure you want to delete this artifact? This action cannot be undone."
          itemName={artifact?.name}
          isLoading={deleteModal.isLoading}
        />
      )}
    </>
  );
};

export default ArtifactActions;
