import React, { useState, useEffect } from "react";
import FileIcon from "./ui/file-icon";
import { getApiHeaders } from "@/lib/api/common";
import { PreviewData } from "./content-sidebar";
import ModalWrapper from "./ui/modal-wrapper";
import DashboardEditor from "./editor/dashboard-editor";
import IframeRenderer from "./ui/iframe-renderer";
import { ArtifactData } from "@/types/artifact";
import { useSavedArtifacts } from "@/contexts/saved-artifacts-context";
import { updateArtifactFile, suggestArtifactName } from "@/lib/api/artifacts";
import SaveArtifactButton from "./save-artifact-button";
import ArtifactActions from "./artifact-actions";
import { toast } from "react-hot-toast";
import { getArtifactFileUrl } from "@/lib/utils";

interface DashboardModalPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  previewData?: PreviewData;
  conversationId?: string;
}

const DashboardModalPreview: React.FC<DashboardModalPreviewProps> = ({
  isOpen,
  onClose,
  previewData,
  conversationId,
}) => {
  // Get saved artifacts context
  const {
    saveArtifact: saveArtifactToContext,
    getArtifact,
    removeArtifact,
    saveSuggestedName: saveSuggestedNameToContext,
    getSuggestedName: getSuggestedNameFromContext,
  } = useSavedArtifacts();

  // State for file content
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Saved state management
  const [isSaved, setIsSaved] = useState(false);
  const [savedArtifact, setSavedArtifact] = useState<ArtifactData | null>(null);

  // Suggested name state
  const [suggestedName, setSuggestedName] = useState<string>("");



  // Function to check for existing saved artifact
  const checkExistingArtifact = () => {
    if (!previewData?.filename || !previewData?.timestamp) {
      return;
    }

    const existingArtifact = getArtifact(
      previewData.filename,
      previewData.timestamp
    );
    if (existingArtifact) {
      setSavedArtifact(existingArtifact);
      setIsSaved(true);
      setSuggestedName(existingArtifact.name);
      return existingArtifact;
    }
    return null;
  };

  // Function to check for existing suggested name
  const checkExistingSuggestedName = () => {
    if (!previewData?.filename) {
      return;
    }

    const existingSuggestedName = getSuggestedNameFromContext(
      previewData.filename
    );
    if (existingSuggestedName) {
      setSuggestedName(existingSuggestedName);
      return existingSuggestedName;
    }
    return null;
  };

  // Function to get suggested name
  const getSuggestedName = async () => {
    if (
      !conversationId ||
      !previewData?.type ||
      (!previewData?.url && !previewData?.filename)
    ) {
      return;
    }

    try {
      const response = await suggestArtifactName(conversationId, {
        type: previewData.type,
        filepath: previewData.filename || previewData.url || "",
        content: (fileContent || "").substring(0, 1000), // Limit content length
      });

      if (response.suggested_name) {
        setSuggestedName(response.suggested_name);

        // Save suggested name to context for future use
        if (previewData.filename) {
          saveSuggestedNameToContext(
            response.suggested_name,
            previewData.filename,
            conversationId
          );
        }
      }
    } catch (error) {
      console.error("Name suggestion error:", error);
      // Don't show error toast for name suggestion failures - just use default
    }
  };

  // Fetch file content and check for existing artifacts when component opens
  useEffect(() => {
    if (!previewData || !conversationId) {
      setFileContent(null);
      setError(null);
      return;
    }

    // Check for existing artifact first
    const existingArtifact = checkExistingArtifact();

    if (existingArtifact) {
      // If we have an existing artifact, fetch the raw content for DashboardEditor
      const fetchFileContent = async () => {
        setError(null);

        try {
          const fileUrl = getArtifactFileUrl(
            existingArtifact.filepath,
            existingArtifact.id,
            true // raw=true for DashboardEditor
          );

          const apiHeaders = await getApiHeaders();
          const response = await fetch(fileUrl, { headers: apiHeaders });

          if (!response.ok) {
            const errorMessage = await response.json();
            throw new Error(
              errorMessage?.detail ||
                `Failed to fetch file: ${response.status}!`
            );
          }

          const content = await response.text();
          setFileContent(content);
        } catch (err) {
          console.error("Error fetching dashboard content:", err);
          setError(err instanceof Error ? err.message : String(err));
        }
      };

      fetchFileContent();
    } else {
      // No saved artifact - show preview immediately, get suggested name in background
      const hasExistingSuggestedName = checkExistingSuggestedName();
      if (!hasExistingSuggestedName) {
        getSuggestedName();
      }
    }
  }, [previewData, conversationId]);



  // Handle save content for dashboard
  const handleSaveContent = async (directContent?: string) => {
    if (!savedArtifact) return;

    try {
      const content = directContent || fileContent || "";

      await updateArtifactFile(
        savedArtifact.id,
        savedArtifact.filepath,
        content
      );

      setFileContent(content);
      toast.success("Dashboard saved successfully!");
    } catch (err) {
      console.error("Error saving dashboard content:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save content";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Handle artifact saved (first time save)
  const handleArtifactSaved = async (artifactData: {
    artifact: ArtifactData;
    detail: string;
  }) => {
    setIsSaved(true);
    setSavedArtifact(artifactData.artifact);
    setSuggestedName(artifactData.artifact.name);

    // Save artifact to context for global access
    if (conversationId && previewData?.filename && previewData?.timestamp) {
      saveArtifactToContext(
        artifactData.artifact,
        previewData.filename,
        previewData.timestamp,
        conversationId
      );
    }

    // Fetch the raw content for DashboardEditor now that we have a saved artifact
    try {
      const fileUrl = getArtifactFileUrl(
        artifactData.artifact.filepath,
        artifactData.artifact.id,
        true // raw=true for DashboardEditor
      );

      const apiHeaders = await getApiHeaders();
      const response = await fetch(fileUrl, { headers: apiHeaders });

      if (!response.ok) {
        throw new Error(`Failed to fetch artifact content: ${response.status}`);
      }

      const content = await response.text();
      setFileContent(content);

      toast.success("Dashboard saved as creation successfully!");
    } catch (err) {
      console.error("Error fetching saved artifact content:", err);
      toast.error("Dashboard saved but failed to load editor");
    }
  };

  // Handle artifact updated
  const handleArtifactUpdated = (updatedArtifact: ArtifactData) => {
    setSavedArtifact(updatedArtifact);

    // Update artifact in context
    if (conversationId && previewData?.filename && previewData?.timestamp) {
      saveArtifactToContext(
        updatedArtifact,
        previewData.filename,
        previewData.timestamp,
        conversationId
      );
    }
  };

  // Handle artifact deleted
  const handleArtifactDeleted = () => {
    setIsSaved(false);
    setSavedArtifact(null);

    // Remove artifact from context
    if (previewData?.filename && previewData?.timestamp) {
      removeArtifact(previewData.filename, previewData.timestamp);
    }

    onClose();
  };

  // Handle title change
  const handleTitleChange = async (newTitle: string) => {
    setSuggestedName(newTitle);

    // If we have a saved artifact, update it as well
    if (savedArtifact) {
      try {
        const { updateArtifact } = await import("@/lib/api/artifacts");
        const updatedArtifact = await updateArtifact(savedArtifact.id, {
          name: newTitle,
        });

        const updatedArtifactData = {
          ...savedArtifact,
          name: updatedArtifact.name,
        };
        setSavedArtifact(updatedArtifactData);

        // Update artifact in context
        if (conversationId && previewData?.filename && previewData?.timestamp) {
          saveArtifactToContext(
            updatedArtifactData,
            previewData.filename,
            previewData.timestamp,
            conversationId
          );
        }

        toast.success("Dashboard name updated successfully");
      } catch (error) {
        console.error("Failed to update dashboard name:", error);
        toast.error("Failed to update dashboard name");
        throw error; // Re-throw to reset title in modal wrapper
      }
    }
  };

  if (!previewData) return null;

  // Create modal actions
  const modalActions = (
    <>
      {/* Save artifact button - only show when not saved */}
      {!isSaved && (
        <SaveArtifactButton
          conversationId={conversationId}
          previewData={{
            type: previewData.type,
            url: previewData.url,
            filename: previewData.filename,
            content: fileContent || "",
            timestamp: previewData.timestamp,
          }}
          suggestedName={suggestedName}
          onSave={handleArtifactSaved}
        />
      )}

      {/* Artifact actions - unified download/share/ellipsis */}
      <ArtifactActions
        artifact={savedArtifact}
        onArtifactUpdated={handleArtifactUpdated}
        onArtifactDeleted={handleArtifactDeleted}
        onClose={onClose}
        isSaved={isSaved}
        previewData={previewData}
        conversationId={conversationId}
        onEditName={undefined} // Will be handled by modal wrapper
      />
    </>
  );


  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={
        suggestedName ||
        previewData.title ||
        previewData.filename ||
        "Dashboard"
      }
      icon={
        <FileIcon
          type={previewData.type}
          filepath={previewData.filename || ""}
          className="w-5 h-5 text-blue-500 flex-shrink-0"
        />
      }
      actions={modalActions}
      loading={false} // Never show modal-level loading, let IframeRenderer and DashboardEditor handle their own loading
      error={error}
      editableTitle={!!suggestedName}
      onTitleChange={handleTitleChange}
    >
      {savedArtifact && fileContent ? (
        // Show DashboardEditor if artifact exists (like original ContentSidebar)
        <DashboardEditor
          content={fileContent}
          artifact={savedArtifact}
          onSave={handleSaveContent}
        />
      ) : previewData.url ? (
        // Show preview without editing capabilities if not saved yet
        <IframeRenderer
          url={previewData.url}
          title={previewData.title || "Dashboard Preview"}
          className="h-full"
        />
      ) : null}
    </ModalWrapper>
  );
};

export default DashboardModalPreview;
