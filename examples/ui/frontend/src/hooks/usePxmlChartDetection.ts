import { useState, useEffect } from 'react';
import { getFileUrl } from '@/lib/utils';
import { getApiHeaders } from '@/lib/api/common';

interface PxmlChartDetection {
  isChart: boolean;
  isLoading: boolean;
  error: string | null;
  content: string | null;
}

export const usePxmlChartDetection = (
  filename: string | null,
  conversationId: string | undefined,
  timestamp?: string
): PxmlChartDetection => {
  const [isChart, setIsChart] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    if (!filename || !conversationId || !filename.toLowerCase().endsWith('.pxml')) {
      setIsChart(false);
      return;
    }

    const checkPxmlContent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const fileUrl = getFileUrl(filename, conversationId, true, timestamp);
        const apiHeaders = await getApiHeaders();
        
        const response = await fetch(fileUrl, { headers: apiHeaders });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }
        
        const fileContent = await response.text();
        const isChartContent = fileContent.trim().startsWith('<chart');
        setContent(fileContent);
        setIsChart(isChartContent);
      } catch (err) {
        console.error('Error checking PXML content:', err);
        setError(err instanceof Error ? err.message : 'Failed to check file content');
        setIsChart(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPxmlContent();
  }, [filename, conversationId, timestamp]);

  return { isChart, isLoading, error, content };
};
