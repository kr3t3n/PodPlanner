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
import { insertGroupSchema, Group, GroupMember, User } from "@shared/schema";
import { Loader2, UserPlus, Shield, UserMinus, Pencil, Link } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import * as z from 'zod';

export function GroupSettings({ groupId }: { groupId?: number }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviteCodeDialogOpen, setIsInviteCodeDialogOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null); // Added state variable
  const { toast } = useToast();
  const { user } = useAuth();

  const inviteForm = useForm({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(z.object({
      email: z.string().email("Invalid email address"),
    })),
  });

  const generateInviteCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/groups/${groupId}/invite-codes`);
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedCode(data.code);
      setIsInviteCodeDialogOpen(true);
      toast({
        title: "Invite code generated",
        description: "Share this code with others to let them join the group",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate invite code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const inviteLink = generatedCode ? `${window.location.origin}/auth?redirect=/?code=${generatedCode}` : '';

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await apiRequest("POST", `/api/groups/${groupId}/invite`, data);
      return res.json();
    },
    onSuccess: (data) => { // Updated onSuccess callback
      setIsInviteDialogOpen(false);
      inviteForm.reset();
      // Set the code from the response and show the code dialog
      setGeneratedCode(data.code);
      setIsInviteCodeDialogOpen(true);
      toast({
        title: "Invitation sent",
        description: "An invitation email has been sent to the user",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: group } = useQuery<Group>({
    queryKey: [`/api/groups/${groupId}`],
    enabled: !!groupId,
  });

  const { data: members, isLoading: isMembersLoading } = useQuery<(GroupMember & { user: User })[]>({
    queryKey: [`/api/groups/${groupId}/members`],
    enabled: !!groupId,
  });

  const editForm = useForm({
    resolver: zodResolver(insertGroupSchema),
    defaultValues: {
      name: group?.name || "",
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await apiRequest("PATCH", `/api/groups/${groupId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setIsEditing(false);
      toast({
        title: "Group updated",
        description: "The group name has been updated successfully",
      });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await apiRequest("POST", "/api/groups", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Group created",
        description: "Your new group has been created successfully",
      });
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({
      memberId,
      isAdmin,
    }: {
      memberId: number;
      isAdmin: boolean;
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/groups/${groupId}/members/${memberId}`,
        { isAdmin }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/members`] });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertGroupSchema),
    defaultValues: {
      name: "",
    },
  });

  if (!groupId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-bold">Welcome to PodPlanner</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Create a new group to start planning your podcast episodes and managing topics
        </p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">Create New Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) =>
                  createGroupMutation.mutate(data)
                )}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createGroupMutation.isPending}
                >
                  {createGroupMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Group
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (isMembersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isAdmin = members?.some(
    (m) => m.userId === user?.id && m.isAdmin
  );

  return (
    <div className="space-y-6">
      <div>
        {isEditing ? (
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) =>
                updateGroupMutation.mutate(data)
              )}
              className="flex items-center gap-2"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                size="sm"
                disabled={updateGroupMutation.isPending}
              >
                {updateGroupMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </form>
          </Form>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{group?.name}</h2>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(true);
                  editForm.reset({ name: group?.name });
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        <p className="text-muted-foreground">
          Manage your group members and their roles
        </p>
      </div>

      <ScrollArea className="h-[400px] rounded-md border">
        <div className="p-4 space-y-4">
          {members?.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="font-medium">{member.user.username}</div>
                {member.isAdmin && (
                  <div className="text-sm text-muted-foreground">Admin</div>
                )}
              </div>
              {isAdmin && member.userId !== user?.id && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateMemberRoleMutation.mutate({
                        memberId: member.id,
                        isAdmin: !member.isAdmin,
                      })
                    }
                    title={member.isAdmin ? "Demote to member" : "Promote to admin"}
                  >
                    {member.isAdmin ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-2" />
                        Demote
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Make Admin
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {isAdmin && (
        <div className="flex justify-end gap-2">
          <Dialog open={isInviteCodeDialogOpen} onOpenChange={setIsInviteCodeDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Code Generated</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <code className="text-lg font-mono">{generatedCode}</code>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-sm break-all">
                    <p className="font-medium mb-1">Or share this link:</p>
                    <code>{inviteLink}</code>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this code or link with others to let them join the group. The code will expire in 7 days.
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (generatedCode) {
                        navigator.clipboard.writeText(generatedCode);
                        toast({
                          title: "Copied to clipboard",
                          description: "The invite code has been copied to your clipboard",
                        });
                      }
                    }}
                  >
                    Copy Code
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast({
                        title: "Copied to clipboard",
                        description: "The invite link has been copied to your clipboard",
                      });
                    }}
                  >
                    Copy Link
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={() => generateInviteCodeMutation.mutate()}
            disabled={generateInviteCodeMutation.isPending}
          >
            {generateInviteCodeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link className="h-4 w-4 mr-2" />
            )}
            Generate Invite Code
          </Button>

          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New Member</DialogTitle>
              </DialogHeader>
              <Form {...inviteForm}>
                <form
                  onSubmit={inviteForm.handleSubmit((data) =>
                    inviteMutation.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={inviteForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="Enter email address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={inviteMutation.isPending}
                  >
                    {inviteMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send Invitation
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}