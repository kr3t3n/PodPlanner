import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Topic } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, GripVertical, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EpisodeTopicsProps {
  episodeId: number;
  groupId: number;
}

export function EpisodeTopics({ episodeId, groupId }: EpisodeTopicsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: episodeTopics, isLoading: isLoadingEpisodeTopics } = useQuery<(Topic & { order: number })[]>({
    queryKey: [`/api/episodes/${episodeId}/topics`],
    enabled: !!episodeId,
  });

  const { data: availableTopics, isLoading: isLoadingAvailableTopics } = useQuery<Topic[]>({
    queryKey: [`/api/groups/${groupId}/topics`],
    enabled: !!groupId && isDialogOpen,
  });

  const addTopicMutation = useMutation({
    mutationFn: async (topicId: number) => {
      const newOrder = episodeTopics?.length ?? 0;
      const res = await apiRequest(
        "POST",
        `/api/episodes/${episodeId}/topics/${topicId}`,
        { order: newOrder }
      );
      if (!res.ok) throw new Error("Failed to add topic to episode");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/episodes/${episodeId}/topics`] });
      setIsDialogOpen(false);
      toast({
        title: "Topic added",
        description: "Topic has been added to the episode",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add topic",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeTopicMutation = useMutation({
    mutationFn: async (topicId: number) => {
      const res = await apiRequest(
        "DELETE",
        `/api/episodes/${episodeId}/topics/${topicId}`
      );
      if (!res.ok) throw new Error("Failed to remove topic from episode");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/episodes/${episodeId}/topics`] });
      toast({
        title: "Topic removed",
        description: "Topic has been removed from the episode",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove topic",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoadingEpisodeTopics) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Episode Topics</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Topic</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Topic to Episode</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[300px] pr-4">
              {isLoadingAvailableTopics ? (
                <div className="flex items-center justify-center h-[200px]">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {availableTopics
                    ?.filter(
                      (topic) =>
                        !topic.isArchived &&
                        !topic.isDeleted &&
                        !episodeTopics?.some((et) => et.id === topic.id)
                    )
                    .map((topic) => (
                      <div
                        key={topic.id}
                        className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => addTopicMutation.mutate(topic.id)}
                      >
                        <h4 className="font-medium">{topic.name}</h4>
                        {topic.url && (
                          <p className="text-sm text-muted-foreground truncate">
                            {topic.url}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {episodeTopics?.map((topic) => (
          <div
            key={topic.id}
            className="flex items-center gap-2 p-3 border rounded-lg group"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
            <div className="flex-1">
              <h4 className="font-medium">{topic.name}</h4>
              {topic.url && (
                <p className="text-sm text-muted-foreground truncate">
                  {topic.url}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeTopicMutation.mutate(topic.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
