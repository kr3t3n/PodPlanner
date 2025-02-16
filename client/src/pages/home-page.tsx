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
  const { toast } = useToast();

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

  useEffect(() => {
    if (groups && groups.length > 0 && selectedGroup === null) {
      setSelectedGroup(groups[0].id);
    }
  }, [groups, selectedGroup]);

  if (isGroupsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">PodPlanner</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.username}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!groups?.length ? (
          <GroupSettings />
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
              <Button
                variant="outline"
                onClick={() => setSelectedGroup(null)}
              >
                Create New Group
              </Button>
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
    </div>
  );
}