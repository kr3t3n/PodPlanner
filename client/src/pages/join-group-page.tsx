import { useState, useEffect } from "react";
import { useLocation, useRoute, useRouter } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

export default function JoinGroupPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/join-group");
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the token from the URL search params
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      return;
    }

    // If user is authenticated, automatically try to join the group
    const joinGroup = async () => {
      if (user && token && !isJoining) {
        try {
          setIsJoining(true);
          await apiRequest("POST", "/api/accept-invitation", { token });
          setLocation("/"); // Redirect to home page after successful join
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to join group");
        } finally {
          setIsJoining(false);
        }
      }
    };

    joinGroup();
  }, [user, token, setLocation]);

  if (isAuthLoading || isJoining) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h1 className="text-2xl font-bold text-destructive">{error}</h1>
        <Button onClick={() => setLocation("/")}>Go to Home</Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h1 className="text-2xl font-bold">Please sign in to join the group</h1>
        <Button onClick={() => setLocation(`/auth?redirect=/join-group?token=${token}`)}>
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
