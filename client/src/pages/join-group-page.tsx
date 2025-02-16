import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
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

  // First effect to check invitation validity and requirements
  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      return;
    }

    const checkInvitation = async () => {
      if (isLoading) return;

      try {
        setIsLoading(true);
        const response = await apiRequest("GET", `/api/invitations/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Invalid invitation");
          return;
        }

        setInvitedEmail(data.email);

        if (data.requiresLogin) {
          // Encode the token to prevent URL parsing issues
          const encodedToken = encodeURIComponent(token);
          setLocation(`/auth?redirect=/join-group?token=${encodedToken}`);
          return;
        }

        if (data.requiresRegistration) {
          setRequiresRegistration(true);
          return;
        }

        // If we're here, we're logged in with the correct email
        await acceptInvitation();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to verify invitation");
      } finally {
        setIsLoading(false);
      }
    };

    checkInvitation();
  }, [token, user]);

  const acceptInvitation = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/accept-invitation", { token });

      if (!response.ok) {
        const data = await response.json();
        if (data.requiresLogin) {
          const encodedToken = encodeURIComponent(token);
          setLocation(`/auth?redirect=/join-group?token=${encodedToken}`);
          return;
        }
        throw new Error(data.message || "Failed to join group");
      }

      setLocation("/"); // Success - redirect to home
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join group");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof registrationSchema>) => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/accept-invitation", {
        token,
        ...values,
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === "USERNAME_EXISTS") {
          form.setError("username", { message: "Username already taken" });
          return;
        }
        throw new Error(data.message || "Failed to complete registration");
      }

      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete registration");
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h1 className="text-2xl font-bold text-destructive">{error}</h1>
        <Button onClick={() => setLocation("/")}>Go to Home</Button>
      </div>
    );
  }

  if (isLoading && !requiresRegistration) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
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
                disabled={isLoading}
              >
                {isLoading && (
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