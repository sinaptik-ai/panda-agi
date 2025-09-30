import React, { useState, useRef } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveArtifact,
  ArtifactResponse,
} from "@/lib/api/artifacts";

import { toast } from "react-hot-toast";

interface SaveArtifactButtonProps {
  conversationId?: string;
  previewData?: {
    title?: string;
    filename?: string;
    url?: string;
    content?: string;
    type?: string;
    timestamp?: string;
  };
  suggestedName?: string;
  onSave?: (artifactData: {
    artifact: ArtifactResponse;
    detail: string;
  }) => void;
}

const SaveArtifactButton = React.forwardRef<
  HTMLButtonElement,
  SaveArtifactButtonProps
>(({ conversationId, previewData, suggestedName, onSave }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [artifactName, setArtifactName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userHasEdited, setUserHasEdited] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSaveArtifact = async () => {
    if (!conversationId) {
      toast.error("Missing conversation ID");
      return;
    }

    if (!artifactName.trim()) {
      toast.error("Please enter an creation name");
      return;
    }

    setIsLoading(true);
    try {
      const savedArtifact = await saveArtifact(conversationId, {
        type: previewData?.type || "text",
        name: artifactName.trim(),
        filepath: previewData?.filename || previewData?.url || "",
        timestamp: previewData?.timestamp,
      });
      // toast.success("Creation saved successfully!");
      setIsOpen(false);
      setArtifactName("");

      // Call the onSave callback with the saved artifact data
      if (onSave) {
        onSave(savedArtifact);
      }
    } catch (error) {
      console.error("Save error:", error);
      if (error instanceof Error) {
        toast.error(`Save failed: ${error.message}`);
      } else {
        toast.error("Save failed: Unknown error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = async () => {
    setIsOpen(true);
    setArtifactName(suggestedName || "");
    setUserHasEdited(false);

    // Select all text if we have a suggested name
    if (suggestedName) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.select();
          inputRef.current.focus();
        }
      }, 100);
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setArtifactName(newValue);
    setUserHasEdited(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          ref={ref}
          variant="ghost"
          size="sm"
          onClick={handleOpenDialog}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Save Creation"
        >
          <Save className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Creation</DialogTitle>
          <DialogDescription>
            Enter a name for this creation. It will be saved to your list of
            creations.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="artifact-name" className="text-right">
              Name
            </Label>
            <div className="col-span-3">
              <Input
                ref={inputRef}
                id="artifact-name"
                value={artifactName}
                onChange={handleInputChange}
                className="w-full"
                placeholder="Enter creation name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveArtifact();
                  }
                }}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveArtifact}
            disabled={!artifactName.trim() || isLoading}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

SaveArtifactButton.displayName = "SaveArtifactButton";

export default SaveArtifactButton;
