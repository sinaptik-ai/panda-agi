import React from "react";
import ScriptViewer from "../ui/script-viewer";

interface ExecuteScriptEventProps {
  payload?: {
    code?: string;
    language?: string;
    output?: string;
  };
}

const ExecuteScriptEvent: React.FC<ExecuteScriptEventProps> = ({ payload }) => {
  if (!payload) return null;

  return (
    <ScriptViewer
      code={payload.code}
      language={payload.language}
      output={payload.output}
      title={`Executing ${payload.language || "script"}`}
    />
  );
};

export default ExecuteScriptEvent; 