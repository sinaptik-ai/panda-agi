"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getArtifacts, deleteArtifact, updateArtifact, ArtifactResponse, ArtifactsListResponse } from "@/lib/api/artifacts";
import { format } from "date-fns";
import { ArrowLeft, Trash2, Edit, Globe, Copy, Share2 } from "lucide-react";
import { toast } from "react-hot-toast";
import ArtifactViewer from "@/components/artifact-viewer";
import DeleteConfirmationDialog from "@/components/delete-confirmation-dialog";
import EditNameDialog from "@/components/edit-name-dialog";

export default function CreationsPage() {
  const router = useRouter();
  const [artifacts, setArtifacts] = useState<ArtifactResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [deletingArtifact, setDeletingArtifact] = useState<string | null>(null);
  const [updatingArtifact, setUpdatingArtifact] = useState<string | null>(null);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [artifactToDelete, setArtifactToDelete] = useState<ArtifactResponse | null>(null);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [artifactToEdit, setArtifactToEdit] = useState<ArtifactResponse | null>(null);
  
  // Artifact viewer state
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactResponse | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  useEffect(() => {
    fetchArtifacts();
  }, [currentPage]);

  const fetchArtifacts = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * limit;
      const data: ArtifactsListResponse = await getArtifacts(limit, offset);
      setArtifacts(data.artifacts);
      setTotalPages(Math.ceil(data.total / limit));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch artifacts");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (artifact: ArtifactResponse) => {
    setArtifactToDelete(artifact);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!artifactToDelete) return;

    try {
      setDeletingArtifact(artifactToDelete.id);
      await deleteArtifact(artifactToDelete.id);
      
      // Remove the artifact from the local state
      setArtifacts(prev => {
        const updatedArtifacts = prev.filter(artifact => artifact.id !== artifactToDelete.id);
        
        // If we're on the last page and it becomes empty, go to the previous page
        if (updatedArtifacts.length === 0 && currentPage > 1) {
          setCurrentPage(prev => prev - 1);
        }
        
        return updatedArtifacts;
      });
      
      toast.success("Creation deleted successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete creation";
      toast.error(errorMessage);
    } finally {
      setDeletingArtifact(null);
      setDeleteDialogOpen(false);
      setArtifactToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setArtifactToDelete(null);
    setDeletingArtifact(null);
  };

  const handleEditClick = (artifact: ArtifactResponse) => {
    setArtifactToEdit(artifact);
    setEditDialogOpen(true);
  };

  const handleEditConfirm = async (newName: string) => {
    if (!artifactToEdit) return;

    try {
      setUpdatingArtifact(artifactToEdit.id);
      const updatedArtifact = await updateArtifact(artifactToEdit.id, {name: newName});
      
      // Update the artifact in the local state
      setArtifacts(prev => prev.map(artifact => 
        artifact.id === artifactToEdit.id 
          ? { ...artifact, name: updatedArtifact.name }
          : artifact
      ));
      
      toast.success("Creation name updated successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update creation name";
      toast.error(errorMessage);
    } finally {
      setUpdatingArtifact(null);
      setEditDialogOpen(false);
      setArtifactToEdit(null);
    }
  };

  const handleTogglePublic = async (artifact: ArtifactResponse) => {
    try {
      setUpdatingArtifact(artifact.id);
      const updatedArtifact = await updateArtifact(artifact.id, { is_public: !artifact.is_public });
      
      // Update the artifact in the local state
      setArtifacts(prev => prev.map(a => 
        a.id === artifact.id 
          ? { ...a, is_public: updatedArtifact.is_public }
          : a
      ));
      
      const status = updatedArtifact.is_public ? "public" : "private";
      toast.success(`Creation made ${status} successfully!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update creation visibility";
      toast.error(errorMessage);
    } finally {
      setUpdatingArtifact(null);
    }
  };

  const handleCopyShareLink = async (artifact: ArtifactResponse) => {
    if (!artifact.is_public) {
      toast.error("Creation must be public to share");
      return;
    }

    const shareUrl = `${window.location.origin}/creations/${artifact.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success("Share link copied to clipboard!");
    }
  };

  const handleEditCancel = () => {
    setEditDialogOpen(false);
    setArtifactToEdit(null);
    setUpdatingArtifact(null);
  };

  const filteredArtifacts = artifacts.filter((artifact) =>
    artifact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch {
      return dateString;
    }
  };

  const handleViewArtifact = (artifact: ArtifactResponse) => {
    setSelectedArtifact(artifact);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedArtifact(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading creations...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="outline"
            onClick={() => router.push('/chat')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Chat</span>
          </Button>
        </div>
        <h1 className="text-3xl font-bold mb-2">My Creations</h1>
        <p className="text-gray-600">View and manage your saved creations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Creations</CardTitle>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search creations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredArtifacts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No creations found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Date Saved</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArtifacts.map((artifact) => (
                    <tr key={artifact.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{artifact.name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {artifact.is_public ? (
                            <>
                              <Globe className="w-4 h-4 text-green-600" />
                              <span className="text-green-600 text-sm">Public</span>
                            </>
                          ) : (
                            <>
                              <div className="w-4 h-4 rounded-full bg-gray-300" />
                              <span className="text-gray-600 text-sm">Private</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(artifact.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewArtifact(artifact)}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(artifact)}
                            disabled={updatingArtifact === artifact.id}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          {artifact.is_public && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyShareLink(artifact)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Share2 className="w-4 h-4 mr-1" />
                              Share
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTogglePublic(artifact)}
                            disabled={updatingArtifact === artifact.id}
                            className={artifact.is_public 
                              ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" 
                              : "text-green-600 hover:text-green-700 hover:bg-green-50"
                            }
                          >
                            <Globe className="w-4 h-4 mr-1" />
                            {artifact.is_public ? "Make Private" : "Make Public"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(artifact)}
                            disabled={deletingArtifact === artifact.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Artifact Viewer */}
      <ArtifactViewer
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
        artifact={selectedArtifact || undefined}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Creation"
        description="Are you sure you want to delete this creation? This action cannot be undone."
        itemName={artifactToDelete?.name}
        isLoading={deletingArtifact === artifactToDelete?.id}
      />

      {/* Edit Name Dialog */}
      <EditNameDialog
        isOpen={editDialogOpen}
        onClose={handleEditCancel}
        onConfirm={handleEditConfirm}
        title="Edit Creation Name"
        description="Enter a new name for this creation."
        currentName={artifactToEdit?.name || ""}
        isLoading={updatingArtifact === artifactToEdit?.id}
      />
    </div>
  );
} 