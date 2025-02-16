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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TopicItemProps {
  topic: Topic & { order: number };
  onRemove: (id: number) => void;
}

function TopicItem({ topic, onRemove }: TopicItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 border rounded-lg group ${
        isDragging ? "opacity-50" : ""
      }`}
      {...attributes}
    >
      <div {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
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
        onClick={() => onRemove(topic.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface EpisodeTopicsProps {
  episodeId: number;
  groupId: number;
}

export function EpisodeTopics({ episodeId, groupId }: EpisodeTopicsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: episodeTopics, isLoading: isLoadingEpisodeTopics } = useQuery<
    (Topic & { order: number })[]
  >({
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
      return res.json();
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

  const reorderTopicsMutation = useMutation({
    mutationFn: async (topics: { id: number; order: number }[]) => {
      try {
        const updates = topics.map(({ id, order }) =>
          apiRequest(
            "POST",
            `/api/episodes/${episodeId}/topics/${id}`,
            { order }
          ).then(res => {
            if (!res.ok) throw new Error(`Failed to update topic ${id}`);
            return res.json();
          })
        );
        await Promise.all(updates);
      } catch (error) {
        console.error("Error reordering topics:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/episodes/${episodeId}/topics`] });
      toast({
        title: "Topics reordered",
        description: "The topics have been reordered successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Failed to reorder topics",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !episodeTopics) return;

    const oldIndex = episodeTopics.findIndex((t) => t.id === active.id);
    const newIndex = episodeTopics.findIndex((t) => t.id === over.id);

    const newOrder = arrayMove(episodeTopics, oldIndex, newIndex).map(
      (topic, index) => ({
        id: topic.id,
        order: index,
      })
    );

    reorderTopicsMutation.mutate(newOrder);
  };

  if (!episodeId) {
    return <div>Please select an episode first</div>;
  }

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={episodeTopics?.map((t) => t.id) ?? []}
            strategy={verticalListSortingStrategy}
          >
            {episodeTopics?.map((topic) => (
              <TopicItem
                key={topic.id}
                topic={topic}
                onRemove={() => removeTopicMutation.mutate(topic.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}