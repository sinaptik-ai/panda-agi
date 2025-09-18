import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ArtifactData } from '@/types/artifact';

interface SavedArtifact {
  artifact: ArtifactData;
  filename: string;
  timestamp: string;
  conversationId: string;
}

interface SuggestedName {
  name: string;
  filename: string;
  timestamp: string;
  conversationId: string;
}

interface SavedArtifactsContextType {
  savedArtifacts: Map<string, SavedArtifact>; // key: `${filename}-${timestamp}`
  saveArtifact: (artifact: ArtifactData, filename: string, timestamp: string, conversationId: string) => void;
  getArtifact: (filename: string, timestamp: string) => ArtifactData | null;
  clearArtifacts: (conversationId?: string) => void;
  removeArtifact: (filename: string, timestamp: string) => void;
  // Suggested names functionality
  suggestedNames: Map<string, SuggestedName>; // key: `${filename}-${timestamp}`
  saveSuggestedName: (name: string, filename: string, timestamp: string, conversationId: string) => void;
  getSuggestedName: (filename: string, timestamp: string) => string | null;
  clearSuggestedNames: (conversationId?: string) => void;
  removeSuggestedName: (filename: string, timestamp: string) => void;
}

const SavedArtifactsContext = createContext<SavedArtifactsContextType | undefined>(undefined);

interface SavedArtifactsProviderProps {
  children: ReactNode;
  conversationId?: string;
}

export const SavedArtifactsProvider: React.FC<SavedArtifactsProviderProps> = ({ 
  children, 
  conversationId 
}) => {
  const [savedArtifacts, setSavedArtifacts] = useState<Map<string, SavedArtifact>>(new Map());
  const [suggestedNames, setSuggestedNames] = useState<Map<string, SuggestedName>>(new Map());

  // Clear artifacts and suggested names when conversation changes
  useEffect(() => {
    if (conversationId) {
      // Clear artifacts from previous conversations
      setSavedArtifacts(prev => {
        const filtered = new Map();
        prev.forEach((artifact, key) => {
          if (artifact.conversationId === conversationId) {
            filtered.set(key, artifact);
          }
        });
        return filtered;
      });
      
      // Clear suggested names from previous conversations
      setSuggestedNames(prev => {
        const filtered = new Map();
        prev.forEach((suggestedName, key) => {
          if (suggestedName.conversationId === conversationId) {
            filtered.set(key, suggestedName);
          }
        });
        return filtered;
      });
    } else {
      // Clear all artifacts and suggested names when no conversation
      setSavedArtifacts(new Map());
      setSuggestedNames(new Map());
    }
  }, [conversationId]);

  const saveArtifact = (
    artifact: ArtifactData, 
    filename: string, 
    timestamp: string, 
    conversationId: string
  ) => {
    const key = `${filename}-${timestamp}`;
    const savedArtifact: SavedArtifact = {
      artifact,
      filename,
      timestamp,
      conversationId,
    };

    setSavedArtifacts(prev => {
      const newMap = new Map(prev);
      newMap.set(key, savedArtifact);
      return newMap;
    });
  };

  const getArtifact = (filename: string, timestamp: string): ArtifactData | null => {
    const key = `${filename}-${timestamp}`;
    const savedArtifact = savedArtifacts.get(key);
    return savedArtifact ? savedArtifact.artifact : null;
  };

  const clearArtifacts = (conversationId?: string) => {
    if (conversationId) {
      // Clear artifacts for specific conversation
      setSavedArtifacts(prev => {
        const filtered = new Map();
        prev.forEach((artifact, key) => {
          if (artifact.conversationId !== conversationId) {
            filtered.set(key, artifact);
          }
        });
        return filtered;
      });
    } else {
      // Clear all artifacts
      setSavedArtifacts(new Map());
    }
  };

  const removeArtifact = (filename: string, timestamp: string) => {
    const key = `${filename}-${timestamp}`;
    setSavedArtifacts(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  };

  // Suggested names functions
  const saveSuggestedName = (
    name: string, 
    filename: string, 
    timestamp: string, 
    conversationId: string
  ) => {
    const key = `${filename}-${timestamp}`;
    const suggestedName: SuggestedName = {
      name,
      filename,
      timestamp,
      conversationId,
    };

    setSuggestedNames(prev => {
      const newMap = new Map(prev);
      newMap.set(key, suggestedName);
      return newMap;
    });
  };

  const getSuggestedName = (filename: string, timestamp: string): string | null => {
    const key = `${filename}-${timestamp}`;
    const suggestedName = suggestedNames.get(key);
    return suggestedName ? suggestedName.name : null;
  };

  const clearSuggestedNames = (conversationId?: string) => {
    if (conversationId) {
      // Clear suggested names for specific conversation
      setSuggestedNames(prev => {
        const filtered = new Map();
        prev.forEach((suggestedName, key) => {
          if (suggestedName.conversationId !== conversationId) {
            filtered.set(key, suggestedName);
          }
        });
        return filtered;
      });
    } else {
      // Clear all suggested names
      setSuggestedNames(new Map());
    }
  };

  const removeSuggestedName = (filename: string, timestamp: string) => {
    const key = `${filename}-${timestamp}`;
    setSuggestedNames(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  };

  const value: SavedArtifactsContextType = {
    savedArtifacts,
    saveArtifact,
    getArtifact,
    clearArtifacts,
    removeArtifact,
    // Suggested names functionality
    suggestedNames,
    saveSuggestedName,
    getSuggestedName,
    clearSuggestedNames,
    removeSuggestedName,
  };

  return (
    <SavedArtifactsContext.Provider value={value}>
      {children}
    </SavedArtifactsContext.Provider>
  );
};

export const useSavedArtifacts = (): SavedArtifactsContextType => {
  const context = useContext(SavedArtifactsContext);
  if (context === undefined) {
    throw new Error('useSavedArtifacts must be used within a SavedArtifactsProvider');
  }
  return context;
};

// Helper hook for getting artifact by filename and timestamp
export const useArtifact = (filename?: string, timestamp?: string): ArtifactData | null => {
  const { getArtifact } = useSavedArtifacts();
  
  if (!filename || !timestamp) {
    return null;
  }
  
  return getArtifact(filename, timestamp);
};

// Helper hook for getting suggested name by filename and timestamp
export const useSuggestedName = (filename?: string, timestamp?: string): string | null => {
  const { getSuggestedName } = useSavedArtifacts();
  
  if (!filename || !timestamp) {
    return null;
  }
  
  return getSuggestedName(filename, timestamp);
};
