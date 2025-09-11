import { useArtifact } from '@/contexts/saved-artifacts-context';
import { ArtifactData } from '@/types/artifact';

/**
 * Hook to check if a file has been saved as an artifact
 * @param filename - The filename to check
 * @param timestamp - The timestamp to check
 * @returns Object with artifact data and status information
 */
export const useArtifactStatus = (filename?: string, timestamp?: string) => {
  const artifact = useArtifact(filename, timestamp);
  
  return {
    artifact,
    isSaved: !!artifact,
    artifactId: artifact?.id,
    artifactName: artifact?.name,
    isPublic: artifact?.is_public,
  };
};

/**
 * Hook to get artifact data for a specific file
 * @param filename - The filename
 * @param timestamp - The timestamp
 * @returns The artifact data or null
 */
export const useArtifactData = (filename?: string, timestamp?: string): ArtifactData | null => {
  return useArtifact(filename, timestamp);
};
