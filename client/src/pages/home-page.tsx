import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CalendarView } from "@/components/calendar-view";
import { TopicVault } from "@/components/topic-vault";
import { GroupSettings } from "@/components/group-settings";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Group } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

const joinGroupSchema = z.object({
  code: z.string().min(1, "Invite code is required"),
});

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Get invite code from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('code');
    if (inviteCode) {
      setIsJoinDialogOpen(true);
      joinForm.setValue('code', inviteCode);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const joinForm = useForm({
    resolver: zodResolver(joinGroupSchema),
    defaultValues: {
      code: "",
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (data: { code: string }) => {
      const res = await apiRequest("POST", "/api/join-group", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setIsJoinDialogOpen(false);
      joinForm.reset();
      toast({
        title: "Joined group",
        description: "You have successfully joined the group",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: groups, isLoading: isGroupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  // Store the selected group ID in localStorage
  useEffect(() => {
    if (selectedGroup !== null) {
      localStorage.setItem('selectedGroupId', selectedGroup.toString());
    }
  }, [selectedGroup]);

  // Initialize selectedGroup from localStorage or first group
  useEffect(() => {
    if (groups?.length) {
      const savedGroupId = localStorage.getItem('selectedGroupId');
      if (savedGroupId) {
        // Check if the saved group still exists in the user's groups
        const groupExists = groups.some(g => g.id === parseInt(savedGroupId));
        if (groupExists) {
          setSelectedGroup(parseInt(savedGroupId));
          return;
        }
      }
      // If no saved group or it doesn't exist anymore, use the first group
      setSelectedGroup(groups[0].id);
    } else {
      setSelectedGroup(null);
    }
  }, [groups]);

  if (isGroupsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleCreateGroup = () => {
    setSelectedGroup(null);
    setIsDialogOpen(true);
  };

  return (
    <main className="container mx-auto px-4 py-8">
      {!groups?.length ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-center">Let's create a new group 🎧</h2>
            <p className="text-muted-foreground text-center mt-2 max-w-md">
              Create a new group to start planning your podcast episodes, topics and collaborate with others.
            </p>
          </div>
          <div className="flex gap-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg">Create New Group</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Group</DialogTitle>
                </DialogHeader>
                <GroupSettings />
              </DialogContent>
            </Dialog>
            <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg">Join Existing Group</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Group</DialogTitle>
                </DialogHeader>
                <Form {...joinForm}>
                  <form
                    onSubmit={joinForm.handleSubmit((data) =>
                      joinGroupMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={joinForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invite Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter invite code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={joinGroupMutation.isPending}
                    >
                      {joinGroupMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Join Group
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Select
              value={selectedGroup?.toString() ?? ""}
              onValueChange={(value) => setSelectedGroup(Number(value))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem
                    key={group.id}
                    value={group.id.toString()}
                  >
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={handleCreateGroup}>
                  Create New Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Group</DialogTitle>
                </DialogHeader>
                <GroupSettings />
              </DialogContent>
            </Dialog>
            <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
              <Button variant="outline" onClick={() => setIsJoinDialogOpen(true)}>
                Join Group
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Group</DialogTitle>
                </DialogHeader>
                <Form {...joinForm}>
                  <form
                    onSubmit={joinForm.handleSubmit((data) =>
                      joinGroupMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={joinForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invite Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter invite code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={joinGroupMutation.isPending}
                    >
                      {joinGroupMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Join Group
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {selectedGroup === null ? (
            <GroupSettings />
          ) : (
            <Tabs defaultValue="calendar" className="space-y-6">
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="calendar">Calendar</TabsTrigger>
                  <TabsTrigger value="topics">Topics</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="calendar">
                <CalendarView groupId={selectedGroup} />
              </TabsContent>

              <TabsContent value="topics">
                <TopicVault groupId={selectedGroup} />
              </TabsContent>

              <TabsContent value="settings">
                <GroupSettings groupId={selectedGroup} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </main>
  );
}