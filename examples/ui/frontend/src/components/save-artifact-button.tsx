import React, { useState } from "react";
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
import { saveArtifact } from "@/lib/api/artifacts";
import { toast } from "react-hot-toast";

interface SaveArtifactButtonProps {
  conversationId?: string;
  previewData?: {
    title?: string;
    filename?: string;
    url?: string;
    content?: string;
    type?: string;
  };
}

const SaveArtifactButton: React.FC<SaveArtifactButtonProps> = ({
  conversationId,
  previewData,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [artifactName, setArtifactName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveArtifact = async () => {
    if (!conversationId) {
      toast.error("Missing conversation ID");
      return;
    }

    if (!artifactName.trim()) {
      toast.error("Please enter an artifact name");
      return;
    }

    setIsLoading(true);
    try {
      await saveArtifact(conversationId, {
        type: previewData?.type || "text",
        name: artifactName.trim(),
        filepath: previewData?.url || previewData?.filename || ""
      });
      toast.success("Artifact saved successfully!");
      setIsOpen(false);
      setArtifactName("");
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

  const handleOpenDialog = () => {
    setArtifactName(previewData?.title || "Untitled");
    setIsOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
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
            Enter a name for this creation. It will be saved to your list of creations.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="artifact-name" className="text-right">
              Name
            </Label>
            <Input
              id="artifact-name"
              value={artifactName}
              onChange={(e) => setArtifactName(e.target.value)}
              className="col-span-3"
              placeholder="Enter artifact name..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveArtifact();
                }
              }}
            />
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
            disabled={isLoading || !artifactName.trim()}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveArtifactButton; 