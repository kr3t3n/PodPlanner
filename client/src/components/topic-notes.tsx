import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TopicComment, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface TopicNotesProps {
  topicId: number;
  currentUser: User;
}

export function TopicNotes({ topicId, currentUser }: TopicNotesProps) {
  const [editedContent, setEditedContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Fetch topic notes/comments
  const { data: comments, isLoading } = useQuery<(TopicComment & { user: User })[]>({
    queryKey: [`/api/topics/${topicId}/comments`],
    enabled: !!topicId,
  });

  const saveNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest(
        "POST",
        `/api/topics/${topicId}/comments`,
        { content }
      );
      if (!res.ok) {
        throw new Error("Failed to save note");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/topics/${topicId}/comments`] });
      setIsEditing(false);
      toast({
        title: "Note saved",
        description: "Your note has been saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const currentUserNote = comments?.find(
    (comment) => comment.userId === currentUser.id
  );

  const handleEditClick = () => {
    setEditedContent(currentUserNote?.content || "");
    setIsEditing(true);
  };

  const handleSave = () => {
    saveNoteMutation.mutate(editedContent);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        {/* Current user's notes section */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Your Notes</h4>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditClick}
                >
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  placeholder="Add your notes here..."
                  className="min-h-[100px]"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saveNoteMutation.isPending}
                  >
                    {saveNoteMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {currentUserNote?.content || "No notes added yet."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Other users' notes */}
        {comments
          ?.filter((comment) => comment.userId !== currentUser.id)
          .map((comment) => (
            <Card key={comment.id}>
              <CardHeader className="pb-2">
                <h4 className="text-sm font-medium">
                  {comment.user.username}'s Notes
                </h4>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
