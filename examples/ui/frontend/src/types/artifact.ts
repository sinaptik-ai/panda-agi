/**
 * Shared types for artifacts across the application
 */

export interface ArtifactData {
  id: string;
  name: string;
  filepath: string;
  conversation_id: string;
  created_at: string;
  is_public: boolean;
  metadata: Record<string, unknown>;
}

export interface ArtifactViewerCallbacks {
  onArtifactUpdated?: (updatedArtifact: ArtifactData) => void;
  onArtifactDeleted?: (artifactId: string) => void;
}

export interface SidebarCallbacks {
  onTitleChange?: (newTitle: string) => Promise<void>;
  onShare?: () => void;
  onDelete?: () => void;
  onToggleFullMode?: () => void;
}