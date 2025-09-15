import React, { useState } from "react";
import { Button } from "./button";
import { Loader2 } from "lucide-react";

interface IframeRendererProps {
  url: string;
  title?: string;
  className?: string;
}

const IframeRenderer: React.FC<IframeRendererProps> = ({
  url,
  title,
  className = "h-full rounded-md overflow-hidden border relative",
}) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    setIframeError(null);
    // Add a small delay to ensure smooth transition
    setTimeout(() => {
      setIframeLoading(false);
    }, 300);
  };

  const handleIframeError = () => {
    setIframeLoading(false);
    setIframeLoaded(false);
    setIframeError("Failed to load content. The URL may be inaccessible or blocked.");
  };

  const handleRetry = () => {
    setIframeError(null);
    setIframeLoading(true);
    setIframeLoaded(false);
    // Force iframe reload by updating the key
    const iframeElement = document.querySelector('iframe[data-retry-key]') as HTMLIFrameElement;
    if (iframeElement) {
      iframeElement.src = iframeElement.src;
    }
  };

  return (
    <div className={className}>
      {/* Loading spinner */}
      {iframeLoading && !iframeError && (
        <div className="absolute inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-10 transition-opacity duration-300">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Error state */}
      {iframeError && (
        <div className="absolute inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-10 transition-opacity duration-300">
          <div className="text-center p-6 max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Content Failed to Load
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {iframeError}
            </p>
            <div className="space-y-2">
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Loader2 className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                URL: <span className="font-mono break-all">{url}</span>
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Iframe content */}
      {!iframeError && (
        <iframe
          key={iframeError ? 'error' : 'loaded'}
          data-retry-key={iframeError ? 'error' : 'loaded'}
          src={url}
          className={`w-full h-full transition-opacity duration-300 ${
            iframeLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          title={title}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}
    </div>
  );
};

export default IframeRenderer;
