"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getArtifacts,
  deleteArtifact,
  updateArtifact,
  ArtifactResponse,
  ArtifactsListResponse,
} from "@/lib/api/artifacts";
import { format } from "date-fns";
import { Trash2, Share2, Search, Grid3x3, List } from "lucide-react";
import { toast } from "react-hot-toast";
import ArtifactViewer, { ArtifactData } from "@/components/artifact-viewer";
import DeleteConfirmationDialog from "@/components/delete-confirmation-dialog";
import ShareModal from "@/components/share-modal";
import FileIcon from "@/components/ui/file-icon";
import Header from "@/components/header";
import { useRouter } from "next/navigation";

export default function CreationsPage() {
  const [artifacts, setArtifacts] = useState<ArtifactResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(12);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "public" | "private"
  >("all");
  const [deletingArtifact, setDeletingArtifact] = useState<string | null>(null);
  const [updatingArtifact, setUpdatingArtifact] = useState<string | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [artifactToDelete, setArtifactToDelete] =
    useState<ArtifactResponse | null>(null);

  // Artifact viewer state
  const [selectedArtifact, setSelectedArtifact] =
    useState<ArtifactResponse | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [artifactToShare, setArtifactToShare] =
    useState<ArtifactResponse | null>(null);

  // Router for navigation
  const router = useRouter();

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
      setError(
        err instanceof Error ? err.message : "Failed to fetch artifacts"
      );
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
      setArtifacts((prev) => {
        const updatedArtifacts = prev.filter(
          (artifact) => artifact.id !== artifactToDelete.id
        );

        // If we're on the last page and it becomes empty, go to the previous page
        if (updatedArtifacts.length === 0 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        }

        return updatedArtifacts;
      });

      toast.success("Creation deleted successfully!");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete creation";
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

  const handleTogglePublic = async (artifact: ArtifactResponse) => {
    try {
      setUpdatingArtifact(artifact.id);
      const updatedArtifact = await updateArtifact(artifact.id, {
        is_public: !artifact.is_public,
      });

      // Update the artifact in the local state
      setArtifacts((prev) =>
        prev.map((a) =>
          a.id === artifact.id
            ? { ...a, is_public: updatedArtifact.is_public }
            : a
        )
      );

      // Update the artifact in share modal state if it's the same one
      if (artifactToShare && artifactToShare.id === artifact.id) {
        setArtifactToShare({
          ...artifactToShare,
          is_public: updatedArtifact.is_public,
        });
      }

      const status = updatedArtifact.is_public ? "public" : "private";
      toast.success(`Creation made ${status} successfully!`);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to update creation visibility";
      toast.error(errorMessage);
      throw err; // Re-throw for share modal to handle
    } finally {
      setUpdatingArtifact(null);
    }
  };

  const handleShareClick = (artifact: ArtifactResponse) => {
    setArtifactToShare(artifact);
    setShareModalOpen(true);
  };

  const handleShareModalClose = () => {
    setShareModalOpen(false);
    setArtifactToShare(null);
  };

  const filteredAndSortedArtifacts = artifacts.filter((artifact) => {
    const matchesSearch = artifact.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "public" && artifact.is_public) ||
      (filterStatus === "private" && !artifact.is_public);
    return matchesSearch && matchesStatus;
  });

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

  const handleArtifactUpdated = (updatedArtifact: ArtifactData) => {
    const artifactResponse: ArtifactResponse = updatedArtifact;
    setArtifacts((prev) =>
      prev.map((artifact) =>
        artifact.id === artifactResponse.id ? artifactResponse : artifact
      )
    );
    setSelectedArtifact(artifactResponse);
  };

  const handleArtifactDeleted = (artifactId: string) => {
    setArtifacts((prev) =>
      prev.filter((artifact) => artifact.id !== artifactId)
    );
    fetchArtifacts(); // Refresh the list
  };

  if (loading) {
    return (
      <>
        <Header
          title="My Creations"
          subtitle="Edit and share your creations"
          variant="page"
        />
        <div className="pt-32 px-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Search skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-64 h-9 bg-muted rounded-md animate-pulse"></div>
                <div className="w-20 h-9 bg-muted rounded-md animate-pulse"></div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-9 h-8 bg-muted rounded-md animate-pulse"></div>
                <div className="w-9 h-8 bg-muted rounded-md animate-pulse"></div>
              </div>
            </div>

            {/* Content skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="space-y-3">
                  <div className="aspect-video bg-muted rounded-lg animate-pulse flex items-center justify-center">
                    <FileIcon
                      filepath="loading"
                      className="h-8 w-8 text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-muted rounded-full animate-pulse" />
                      <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header
          title="My Creations"
          subtitle="View and manage your saved creations"
          variant="page"
          onNewConversation={() => router.push("/")}
        />
        <div className="pt-32 px-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Error state */}
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-red-500 mb-2">Error loading creations</div>
                <div className="text-muted-foreground text-sm mb-4">
                  {error}
                </div>
                <Button
                  onClick={() => {
                    setError(null);
                    fetchArtifacts();
                  }}
                  variant="outline"
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="My Creations"
        subtitle="View and manage your saved creations"
        variant="page"
        onNewConversation={() => router.push("/")}
      />
      <div className="pt-32 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Search and filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search creations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(
                    e.target.value as "all" | "public" | "private"
                  )
                }
                className="px-3 py-2 text-sm border rounded-md bg-background"
              >
                <option value="all">All</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div>
            {filteredAndSortedArtifacts.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-16 w-16 bg-muted/50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FileIcon
                    filepath="empty"
                    className="h-8 w-8 text-muted-foreground/50"
                  />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  No creations found
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                  {searchTerm || filterStatus !== "all"
                    ? "Try adjusting your search or filters to find what you're looking for."
                    : "Create your first dashboard in a conversation to see it here."}
                </p>
                {!searchTerm &&
                  filterStatus === "all" &&
                  artifacts.length === 0 && (
                    <Button onClick={() => router.push("/")} className="mt-2">
                      Start New Chat
                    </Button>
                  )}
              </div>
            ) : (
              <>
                {/* Grid view */}
                {viewMode === "grid" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAndSortedArtifacts.map((artifact) => (
                      <div key={artifact.id} className="group">
                        <div
                          className="bg-card border rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:border-border cursor-pointer"
                          onClick={() => handleViewArtifact(artifact)}
                        >
                          {/* Thumbnail */}
                          <div className="aspect-video bg-gradient-to-br from-muted/50 to-muted rounded-lg mb-4 flex items-center justify-center group-hover:from-muted/70 group-hover:to-muted/90 transition-all duration-200">
                            <FileIcon
                              filepath={artifact.filepath}
                              className="h-10 w-10 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors duration-200"
                            />
                          </div>

                          {/* Content */}
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <h3
                                className="font-semibold text-foreground truncate text-base leading-5"
                                title={artifact.name}
                              >
                                {artifact.name}
                              </h3>

                              <div className="flex items-center gap-2">
                                {artifact.is_public ? (
                                  <>
                                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                    <span className="text-xs font-medium text-green-700">
                                      Public
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <div className="h-2 w-2 rounded-full bg-muted-foreground/60"></div>
                                    <span className="text-xs font-medium text-muted-foreground">
                                      Private
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              {formatDate(artifact.created_at)}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/60">
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShareClick(artifact);
                                }}
                                className="h-8 w-8 p-0 hover:bg-green-600/10 hover:text-green-600"
                                title="Share creation"
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(artifact);
                              }}
                              disabled={deletingArtifact === artifact.id}
                              className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* List view */}
                {viewMode === "list" && (
                  <div className="space-y-3">
                    {filteredAndSortedArtifacts.map((artifact) => (
                      <div
                        key={artifact.id}
                        className="flex items-center justify-between p-5 bg-card border rounded-xl hover:shadow-md hover:border-border transition-all duration-200 cursor-pointer"
                        onClick={() => handleViewArtifact(artifact)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-gradient-to-br from-muted/50 to-muted rounded-lg flex items-center justify-center">
                            <FileIcon
                              filepath={artifact.filepath}
                              className="h-6 w-6 text-muted-foreground/70"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="font-semibold text-foreground">
                              {artifact.name}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                {artifact.is_public ? (
                                  <>
                                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                    <span className="font-medium text-green-700">
                                      Public
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <div className="h-2 w-2 rounded-full bg-muted-foreground/60"></div>
                                    <span className="font-medium">Private</span>
                                  </>
                                )}
                              </div>
                              <span>{formatDate(artifact.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareClick(artifact);
                            }}
                            className="h-8 w-8 p-0 hover:bg-green-600/10 hover:text-green-600"
                            title="Share creation"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(artifact);
                            }}
                            disabled={deletingArtifact === artifact.id}
                            className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-6">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Artifact Viewer */}
      <ArtifactViewer
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
        artifact={(selectedArtifact as ArtifactData) || undefined}
        onArtifactUpdated={handleArtifactUpdated}
        onArtifactDeleted={handleArtifactDeleted}
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

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={handleShareModalClose}
        artifact={artifactToShare}
        onTogglePublic={handleTogglePublic}
        isUpdating={updatingArtifact === artifactToShare?.id}
      />
    </>
  );
}
