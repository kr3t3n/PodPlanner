import { useState, useEffect } from "react";
import { useLocation, useRoute, useRouter } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import * as z from "zod";

const registrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function JoinGroupPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/join-group");
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresRegistration, setRequiresRegistration] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Get the token from the URL search params
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      return;
    }

    const acceptInvitation = async () => {
      if (isJoining) return;

      try {
        setIsJoining(true);
        const response = await apiRequest("POST", "/api/accept-invitation", { token });
        const data = await response.json();

        if (response.ok) {
          setLocation("/"); // Success - redirect to home
          return;
        }

        // Handle various scenarios based on the response
        if (data.requiresLogin) {
          setInvitedEmail(data.email);
          setLocation(`/auth?redirect=/join-group?token=${token}`);
          return;
        }

        if (data.requiresRegistration) {
          setInvitedEmail(data.email);
          setRequiresRegistration(true);
          return;
        }

        setError(data.message || "Failed to join group");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to join group");
      } finally {
        setIsJoining(false);
      }
    };

    if (user || requiresRegistration) {
      acceptInvitation();
    }
  }, [user, token, setLocation, requiresRegistration]);

  const onSubmit = async (values: z.infer<typeof registrationSchema>) => {
    if (!token) return;

    try {
      setIsJoining(true);
      const response = await apiRequest("POST", "/api/accept-invitation", {
        token,
        ...values,
      });

      if (response.ok) {
        setLocation("/");
      } else {
        const data = await response.json();
        setError(data.message || "Failed to complete registration");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete registration");
    } finally {
      setIsJoining(false);
    }
  };

  if (isAuthLoading || (isJoining && !requiresRegistration)) {
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

  if (requiresRegistration && invitedEmail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-6 px-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Complete Registration</h1>
            <p className="text-muted-foreground">
              Choose a username and password for your account with {invitedEmail}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isJoining}
              >
                {isJoining && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Complete Registration
              </Button>
            </form>
          </Form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}