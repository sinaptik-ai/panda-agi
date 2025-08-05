import { getBackendServerURL } from "@/lib/server";
import { getApiHeaders } from "./common";

interface ArtifactPayload {
    type: string;
    name: string;
    filepath: string;
}

interface ArtifactResponse {
    success?: boolean;
    message?: string;
    [key: string]: any;
}

export const saveArtifact = async (conversationId: string, payload: ArtifactPayload): Promise<ArtifactResponse> => {
    const url = getBackendServerURL(`/artifacts/${conversationId}/save`);
    const headers = await getApiHeaders();
    
    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.detail || `Failed to save artifact: ${response.status}`);
    }
    
    return response.json();
}; 