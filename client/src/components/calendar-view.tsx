import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Episode } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function CalendarView({ groupId }: { groupId: number | null }) {
  const [selected, setSelected] = useState<Date>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: episodes, isLoading } = useQuery<Episode[]>({
    queryKey: [`/api/groups/${groupId}/episodes`],
    enabled: !!groupId,
  });

  const createEpisodeMutation = useMutation({
    mutationFn: async (data: { title: string; date: Date }) => {
      const res = await apiRequest(
        "POST",
        `/api/groups/${groupId}/episodes`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/episodes`] });
      setIsDialogOpen(false);
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
        <h2 className="text-2xl font-bold">Calendar</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>New Episode</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Episode</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const title = (form.elements.namedItem("title") as HTMLInputElement)
                  .value;
                if (selected && title) {
                  createEpisodeMutation.mutate({ title, date: selected });
                }
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="title">Episode Title</Label>
                <Input id="title" name="title" required />
              </div>
              <Calendar
                mode="single"
                selected={selected}
                onSelect={setSelected}
                className="rounded-md border"
              />
              <Button type="submit" className="w-full">
                Create Episode
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg p-4">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          className="rounded-md border"
        />
      </div>

      <div className="space-y-2">
        {episodes?.map((episode) => (
          <div
            key={episode.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div>
              <h3 className="font-medium">{episode.title}</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(episode.date).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Edit
              </Button>
              <Button variant="destructive" size="sm">
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
