import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  name: string;
  url: string;
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
      console.log("Starting topic creation with data:", data);

      if (!groupId) {
        console.error("No group selected");
        throw new Error("No group selected");
      }

      // Clean the data before sending
      const payload = {
        name: data.name,
        url: data.url || undefined,
        groupId,
      };

      console.log("Sending payload:", payload);

      try {
        const res = await apiRequest("POST", `/api/groups/${groupId}/topics`, payload);
        console.log("API Response status:", res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("API Error:", errorText);
          throw new Error(errorText || "Failed to create topic");
        }

        const result = await res.json();
        console.log("API Success response:", result);
        return result;
      } catch (error) {
        console.error("API Call error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Mutation succeeded:", data);
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/topics`] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Topic created successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Mutation failed:", error);
      toast({
        title: "Failed to create topic",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: TopicFormData) => {
    console.log("Form submitted with data:", data);
    try {
      await createTopicMutation.mutateAsync(data);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>New Topic</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Topic</DialogTitle>
                <DialogDescription>
                  Create a new topic for your podcast. Add a name and optionally a reference URL.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    console.log("Form submit event triggered");
                    const result = form.handleSubmit(onSubmit)(e);
                    console.log("Form handle submit result:", result);
                  }}
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
                        <FormLabel>Reference URL (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="url" placeholder="https://" />
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