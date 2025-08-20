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
import UserMenu from "@/components/user-menu";
import UpgradeModal from "@/components/upgrade-modal";

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
  
  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

    const shareUrl = `${window.location.origin}/creations/share/${artifact.id}/${encodeURIComponent(artifact.filepath)}`;
    
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
      return format(new Date(dateString), "MMM dd, yyyy");
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
      <div className="min-h-screen bg-gray-50">
        {/* Header - positioned absolutely over content */}
        <div className="glass-header p-4 fixed top-0 left-0 right-0 z-10 backdrop-blur-xl bg-white/80">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-2xl select-none">🐼</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  My Creations
                </h1>
                <p className="text-sm text-gray-500">
                  View and manage your saved creations
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Back to Chat Button */}
              <Button
                variant="outline"
                onClick={() => router.push('/chat')}
                className="flex items-center space-x-2 px-4 py-2 text-sm bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Chat</span>
              </Button>

              {/* User Menu Dropdown */}
              <UserMenu onUpgradeClick={() => setShowUpgradeModal(true)} />
            </div>
          </div>
        </div>

        {/* Main content with top padding for fixed header */}
        <div className="pt-20 px-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Creations</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="w-64 h-9 bg-gray-200 rounded-md animate-pulse"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-6 font-semibold text-gray-700">Name</th>
                        <th className="text-left py-3 px-6 font-semibold text-gray-700 w-24">Status</th>
                        <th className="text-left py-3 px-6 font-semibold text-gray-700 w-32">Date Saved</th>
                        <th className="text-left py-3 px-6 font-semibold text-gray-700 w-48">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(5)].map((_, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-3 px-6">
                            <div className="w-48 h-4 bg-gray-200 rounded animate-pulse"></div>
                          </td>
                          <td className="py-3 px-6">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse"></div>
                              <div className="w-12 h-3 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                          </td>
                          <td className="py-3 px-6">
                            <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                          </td>
                          <td className="py-3 px-6">
                            <div className="flex items-center space-x-1">
                              {[...Array(4)].map((_, actionIndex) => (
                                <div key={actionIndex} className="w-8 h-8 bg-gray-200 rounded-md animate-pulse"></div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header - positioned absolutely over content */}
      <div className="glass-header p-4 fixed top-0 left-0 right-0 z-10 backdrop-blur-xl bg-white/80">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-2xl select-none">🐼</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                My Creations
              </h1>
              <p className="text-sm text-gray-500">
                View and manage your saved creations
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Back to Chat Button */}
            <Button
              variant="outline"
              onClick={() => router.push('/chat')}
              className="flex items-center space-x-2 px-4 py-2 text-sm bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Chat</span>
            </Button>

            {/* User Menu Dropdown */}
            <UserMenu onUpgradeClick={() => setShowUpgradeModal(true)} />
          </div>
        </div>
      </div>

      {/* Main content with top padding for fixed header */}
      <div className="pt-20 px-6">
        <div className="max-w-4xl mx-auto">
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
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-6 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-6 font-semibold text-gray-700 w-24">Status</th>
                    <th className="text-left py-3 px-6 font-semibold text-gray-700 w-32">Date Saved</th>
                    <th className="text-left py-3 px-6 font-semibold text-gray-700 w-48">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArtifacts.map((artifact) => (
                    <tr key={artifact.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="py-3 px-6">
                        <div className="max-w-xs">
                          <div className="font-medium text-gray-900 truncate" title={artifact.name}>
                            {artifact.name}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center space-x-2">
                          {artifact.is_public ? (
                            <>
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-green-700 text-xs font-medium">Public</span>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              <span className="text-gray-600 text-xs font-medium">Private</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-6 text-gray-600 text-sm">
                        {formatDate(artifact.created_at)}
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleViewArtifact(artifact)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-150"
                            title="View"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => handleEditClick(artifact)}
                            disabled={updatingArtifact === artifact.id}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          {artifact.is_public && (
                            <button
                              onClick={() => handleCopyShareLink(artifact)}
                              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors duration-150"
                              title="Share"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleTogglePublic(artifact)}
                            disabled={updatingArtifact === artifact.id}
                            className={`p-2 rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
                              artifact.is_public 
                                ? "text-gray-600 hover:text-orange-600 hover:bg-orange-50" 
                                : "text-gray-600 hover:text-green-600 hover:bg-green-50"
                            }`}
                            title={artifact.is_public ? "Make Private" : "Make Public"}
                          >
                            <Globe className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteClick(artifact)}
                            disabled={deletingArtifact === artifact.id}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
        </div>
      </div>

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

      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
} 