"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getArtifacts, ArtifactResponse, ArtifactsListResponse } from "@/lib/api/artifacts";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";

export default function CreationsPage() {
  const router = useRouter();
  const [artifacts, setArtifacts] = useState<ArtifactResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

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
                    <th className="text-left py-3 px-4 font-medium">Date Saved</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArtifacts.map((artifact) => (
                    <tr key={artifact.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{artifact.name}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(artifact.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Handle download or view action
                            console.log("View artifact:", artifact.id);
                          }}
                        >
                          View
                        </Button>
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
  );
} 