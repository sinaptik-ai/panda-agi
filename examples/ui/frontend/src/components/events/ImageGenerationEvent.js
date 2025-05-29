import React from "react";
import { Activity } from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer";

const ImageGenerationEvent = ({ payload, onPreviewClick }) => {
  if (!payload) return null;

  const content = (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        <Activity className="w-4 h-4 text-purple-500" />
        <span className="font-medium text-sm text-gray-900">
          Image Generation
        </span>
      </div>
      <div className="mt-2">
        {payload.prompt && (
          <div>
            <p className="text-sm text-gray-700 font-medium">Prompt:</p>
            <div className="mt-1">
              <MarkdownRenderer onPreviewClick={onPreviewClick}>
                {payload.prompt}
              </MarkdownRenderer>
            </div>
          </div>
        )}
        {payload.filename && (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">Generated:</p>
            <div className="mt-1">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {payload.filename}
              </code>
            </div>
          </div>
        )}
        {payload.url && (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">Image:</p>
            <div className="mt-1">
              <img
                src={payload.url}
                alt={"Generated image: " + payload.filename}
                className="max-w-xs rounded border"
                loading="lazy"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return {
    color: "bg-purple-50 border-purple-200",
    content,
  };
};

export default ImageGenerationEvent;
