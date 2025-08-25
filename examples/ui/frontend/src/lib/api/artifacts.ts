import { getBackendServerURL } from "@/lib/server";
import { getApiOptions } from "./common";

interface ArtifactPayload {
    type: string;
    name: string;
    filepath: string;
}

export interface ArtifactResponse {
    id: string;
    name: string;
    filepath: string;
    conversation_id: string;
    created_at: string;
    metadata: Record<string, unknown>;
    is_public: boolean;
}

export const saveArtifact = async (conversationId: string, payload: ArtifactPayload): Promise<ArtifactResponse> => {
    const url = getBackendServerURL(`/artifacts/${conversationId}/save`);
    const options = await getApiOptions();
    
    const response = await fetch(url, {
        method: 'POST',
        ...options,
        body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.detail || `Failed to save artifact: ${response.status}`);
    }
    
    return response.json();
};

export interface ArtifactsListResponse {
    artifacts: ArtifactResponse[];
    total: number;
}

export const getArtifacts = async (limit: number = 100, offset: number = 0): Promise<ArtifactsListResponse> => {
    const url = getBackendServerURL(`/artifacts?limit=${limit}&offset=${offset}`);
    const options = await getApiOptions();
    
    const response = await fetch(url, {
        method: 'GET',
        ...options,
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.detail || `Failed to get artifacts: ${response.status}`);
    }
    
    return response.json();
};

export const getArtifactFile = async (artifactId: string, filePath: string): Promise<string> => {
    const url = getBackendServerURL(`/artifacts/${artifactId}/${encodeURIComponent(filePath)}`);
    const options = await getApiOptions();
    
    const response = await fetch(url, {
        method: 'GET',
        ...options,
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.detail || `Failed to get artifact file: ${response.status}`);
    }
    
    return response.text();
};

export const deleteArtifact = async (artifactId: string): Promise<void> => {
    const url = getBackendServerURL(`/artifacts/${artifactId}`);
    const options = await getApiOptions();
    
    const response = await fetch(url, {
        method: 'DELETE',
        ...options,
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.detail || `Failed to delete artifact: ${response.status}`);
    }
};

export const updateArtifact = async (
    artifactId: string, 
    updates: { name?: string; is_public?: boolean }
): Promise<ArtifactResponse> => {
    const url = getBackendServerURL(`/artifacts/${artifactId}`);
    const options = await getApiOptions();
    
    const response = await fetch(url, {
        method: 'PATCH',
        ...options,
        body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.detail || `Failed to update artifact: ${response.status}`);
    }
    
    return response.json();
}; 