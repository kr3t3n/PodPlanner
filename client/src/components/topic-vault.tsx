import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTopicSchema, Topic } from "@shared/schema";
import { Loader2, Archive, Trash2, Link } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

type TopicFormData = {
  name?: string;
  url?: string;
};

export function TopicVault({ groupId }: { groupId: number | null }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();

  const { data: topics, isLoading } = useQuery<Topic[]>({
    queryKey: [`/api/groups/${groupId}/topics`],
    enabled: !!groupId,
  });

  const form = useForm<TopicFormData>({
    resolver: zodResolver(insertTopicSchema),
    defaultValues: {
      name: "",
      url: "",
    },
  });

  const createTopicMutation = useMutation({
    mutationFn: async (data: TopicFormData) => {
      if (!groupId) throw new Error("No group selected");

      const payload = {
        ...data,
        name: data.name || data.url,
        groupId,
      };

      console.log("Creating topic with payload:", payload);

      const res = await apiRequest("POST", `/api/groups/${groupId}/topics`, payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/topics`] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Topic created",
        description: "Your topic has been added to the vault",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to create topic:", error);
      toast({
        title: "Failed to create topic",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const archiveTopicMutation = useMutation({
    mutationFn: async (topicId: number) => {
      const res = await apiRequest(
        "PATCH",
        `/api/topics/${topicId}`,
        { isArchived: true }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/topics`] });
      toast({
        title: "Topic archived",
        description: "Topic has been moved to the archive",
      });
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (topicId: number) => {
      const res = await apiRequest(
        "PATCH",
        `/api/topics/${topicId}`,
        { isDeleted: true }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/topics`] });
      toast({
        title: "Topic deleted",
        description: "Topic has been moved to deleted status",
      });
    },
  });

  if (!groupId) {
    return <div>Please select a group first</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Topic Vault</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? "Show Active" : "Show Archived"}
            <Archive className="ml-2 h-4 w-4" />
          </Button>
          <Dialog 
            open={isDialogOpen} 
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                form.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>New Topic</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>✨ Add New Topic</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => {
                    console.log("Form submitted:", data);
                    createTopicMutation.mutate(data);
                  })}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Topic Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter topic name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference URL (optional if name provided)</FormLabel>
                        <FormControl>
                          <Input {...field} type="url" placeholder="https://..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createTopicMutation.isPending}
                  >
                    {createTopicMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Topic
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="h-[600px] rounded-md border p-4">
        <div className="space-y-4">
          {topics?.filter(t => t.isArchived === showArchived && !t.isDeleted).map((topic) => (
            <div
              key={topic.id}
              className="p-4 border rounded-lg space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{topic.name}</h3>
                  {topic.url && (
                    <a
                      href={topic.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <Link className="h-4 w-4" />
                      Reference Link
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => archiveTopicMutation.mutate(topic.id)}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteTopicMutation.mutate(topic.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}