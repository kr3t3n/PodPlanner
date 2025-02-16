import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import {
  insertGroupSchema,
  insertTopicSchema,
  insertTopicCommentSchema,
  insertEpisodeSchema,
} from "@shared/schema";
import { randomBytes } from "crypto";
import { addHours, addDays } from "date-fns";
import {
  sendPasswordResetEmail,
  sendGroupInvitationEmail,
  sendGroupActivityEmail,
  transporter,
  sendTestEmail
} from "./email";
import { hashPassword } from './auth'; // Assuming this function exists

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Test email endpoint
  app.get("/api/test-email", async (req, res) => {
    try {
      // Force JSON response
      res.setHeader('Content-Type', 'application/json');

      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          error: "Email parameter is required" 
        });
      }

      console.log(`Attempting to send test email to: ${email}`);
      const result = await sendTestEmail(email);

      if (result.success) {
        res.json({ 
          success: true, 
          message: "Test email sent successfully",
          config: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT === "465",
            user: process.env.SMTP_USER,
            fromEmail: process.env.SMTP_FROM_EMAIL
          }
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: result.error,
          config: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT === "465",
            user: process.env.SMTP_USER,
            fromEmail: process.env.SMTP_FROM_EMAIL
          }
        });
      }
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Password Reset Routes
  app.post("/api/forgot-password", async (req, res) => {
    console.log("Received forgot password request for email:", req.body.email);
    const { email } = req.body;

    try {
      console.log("Looking up user by email:", email);
      const user = await storage.getUserByEmail(email);
      console.log('User lookup result:', user ? `Found user with ID ${user.id}` : 'No user found');

      if (!user) {
        // Don't reveal if email exists
        return res.sendStatus(200);
      }

      console.log("Generating reset token for user:", user.id);
      const token = randomBytes(32).toString("hex");
      await storage.createPasswordResetToken({
        userId: user.id,
        token,
        expiresAt: addHours(new Date(), 1),
        used: false,
      });

      // Get the base URL from request headers
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const resetUrl = `${protocol}://${host}/reset-password`;
      console.log("Constructed reset URL:", resetUrl);

      console.log("Sending password reset email with URL:", resetUrl);
      const emailSent = await sendPasswordResetEmail(email, token, resetUrl);

      if (emailSent) {
        console.log("Password reset email sent successfully");
        res.sendStatus(200);
      } else {
        console.error("Failed to send password reset email");
        res.status(500).send("Failed to send password reset email");
      }
    } catch (error) {
      console.error("Error in forgot password flow:", error);
      res.status(500).send("Internal server error");
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    const { token, password } = req.body;
    const resetToken = await storage.getValidPasswordResetToken(token);
    if (!resetToken) {
      return res.status(400).send("Invalid or expired token");
    }

    // Update password and mark token as used
    await storage.updateUser(resetToken.userId, { password });
    await storage.markPasswordResetTokenAsUsed(resetToken.id);
    res.sendStatus(200);
  });

  // Group Invitation Routes
  app.post("/api/groups/:id/invite", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const { email } = req.body;
    const groupId = parseInt(req.params.id);

    const group = await storage.getGroup(groupId);
    if (!group) return res.sendStatus(404);

    // Generate invitation token
    const token = randomBytes(32).toString("hex");
    const invitation = await storage.createGroupInvitation({
      groupId,
      email,
      token,
      invitedBy: req.user.id,
      expiresAt: addDays(new Date(), 7),
      used: false,
    });

    // Get the base URL from request headers
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const inviteUrl = `${protocol}://${host}/join-group?token=${token}`;

    await sendGroupInvitationEmail(
      email,
      group.name,
      req.user.username,
      token,
      inviteUrl
    );

    res.json(invitation);
  });

  app.get("/api/invitations/:token", async (req, res) => {
    try {
      const invitation = await storage.getValidGroupInvitation(req.params.token);
      if (!invitation) {
        return res.status(400).json({ message: "Invalid or expired invitation" });
      }

      // Check if this email already has an account
      const existingUser = await storage.getUserByEmail(invitation.email);

      return res.json({
        email: invitation.email,
        groupName: invitation.group.name,
        requiresRegistration: !existingUser,
        requiresLogin: existingUser && !req.user
      });
    } catch (error) {
      console.error("Error checking invitation:", error);
      res.status(500).send("Failed to verify invitation");
    }
  });

  app.post("/api/accept-invitation", async (req, res) => {
    const { token, username, password } = req.body;

    const invitation = await storage.getValidGroupInvitation(token);
    if (!invitation) {
      return res.status(400).json({ message: "Invalid or expired invitation" });
    }

    try {
      let user = req.user;

      // If not logged in, check if we need to register or just login
      if (!user) {
        // Check if the invited email already has an account
        const existingUser = await storage.getUserByEmail(invitation.email);

        if (existingUser) {
          return res.status(400).json({
            message: "Please login first",
            email: invitation.email,
            requiresLogin: true
          });
        }

        // If we have username/password, create new account
        if (username && password) {
          const existingUsername = await storage.getUserByUsername(username);
          if (existingUsername) {
            return res.status(400).json({ 
              message: "Username already exists",
              error: "USERNAME_EXISTS"
            });
          }

          // Create new user with the invitation email
          user = await storage.createUser({
            username,
            password: await hashPassword(password),
            email: invitation.email
          });

          // Log them in
          await new Promise((resolve, reject) => {
            req.login(user, (err) => {
              if (err) reject(err);
              else resolve(void 0);
            });
          });
        } else {
          return res.status(400).json({
            message: "Registration required",
            email: invitation.email,
            requiresRegistration: true
          });
        }
      }

      // Verify the logged-in user's email matches the invitation
      if (user.email !== invitation.email) {
        return res.status(400).json({
          message: "Please login with the invited email address",
          email: invitation.email,
          requiresLogin: true
        });
      }

      // Add user to group
      await storage.addGroupMember({
        userId: user.id,
        groupId: invitation.groupId,
        isAdmin: false,
      });

      // Mark invitation as used
      await storage.markGroupInvitationAsUsed(invitation.id);

      res.json(invitation.group);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to process invitation" });
    }
  });

  // Group routes
  app.get("/api/groups", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    console.log(`Fetching groups for user ${req.user.id}`);
    const groups = await storage.getUserGroups(req.user.id);
    console.log('Retrieved groups:', groups);
    res.json(groups);
  });

  app.post("/api/groups", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const group = await storage.createGroup({
      name: req.body.name,
    }, req.user.id);
    res.json(group);
  });

  app.get("/api/groups/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const group = await storage.getGroup(parseInt(req.params.id));
    if (!group) return res.sendStatus(404);
    res.json(group);
  });

  app.patch("/api/groups/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const groupId = parseInt(req.params.id);
    const group = await storage.getGroup(groupId);
    if (!group) return res.sendStatus(404);

    // Check if user is admin
    const members = await storage.getGroupMembers(groupId);
    const isAdmin = members.some(m => m.userId === req.user!.id && m.isAdmin);
    if (!isAdmin) return res.sendStatus(403);

    const updatedGroup = await storage.updateGroup(groupId, {
      name: req.body.name
    });
    res.json(updatedGroup);
  });

  app.get("/api/groups/:id/members", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const members = await storage.getGroupMembers(parseInt(req.params.id));
    res.json(members);
  });

  // Episode routes
  app.post("/api/groups/:id/episodes", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const episode = await storage.createEpisode({
      groupId: parseInt(req.params.id),
      ...req.body,
    });
    res.json(episode);
  });

  app.patch("/api/episodes/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const episode = await storage.updateEpisode(parseInt(req.params.id), req.body);
    res.json(episode);
  });

  app.delete("/api/episodes/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    await storage.deleteEpisode(parseInt(req.params.id));
    res.sendStatus(200);
  });

  app.get("/api/groups/:id/episodes", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const episodes = await storage.getGroupEpisodes(parseInt(req.params.id));
    res.json(episodes);
  });

  // Topic routes
  app.post("/api/groups/:id/topics", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const topic = await storage.createTopic({
      groupId: parseInt(req.params.id),
      ...req.body,
    });
    res.json(topic);
  });

  app.get("/api/groups/:id/topics", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const topics = await storage.getGroupTopics(parseInt(req.params.id));
    res.json(topics);
  });

  // Add patch route for updating topics
  app.patch("/api/topics/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const topic = await storage.updateTopic(parseInt(req.params.id), req.body);
    res.json(topic);
  });


  // Routes for topic-episode associations
  app.post("/api/episodes/:episodeId/topics/:topicId", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      await storage.addTopicToEpisode(
        parseInt(req.params.episodeId),
        parseInt(req.params.topicId),
        req.body.order
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error adding topic to episode:", error);
      res.status(500).json({ error: "Failed to add topic to episode" });
    }
  });

  app.delete("/api/episodes/:episodeId/topics/:topicId", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      await storage.removeTopicFromEpisode(
        parseInt(req.params.episodeId),
        parseInt(req.params.topicId)
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing topic from episode:", error);
      res.status(500).json({ error: "Failed to remove topic from episode" });
    }
  });

  app.get("/api/episodes/:id/topics", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const topics = await storage.getEpisodeTopics(parseInt(req.params.id));
    res.json(topics);
  });

  // Topic comment routes (only one instance needed)
  app.get("/api/topics/:id/comments", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const comments = await storage.getTopicCommentsWithUsers(parseInt(req.params.id));
    res.json(comments);
  });

  app.post("/api/topics/:id/comments", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const comment = await storage.upsertTopicComment({
        topicId: parseInt(req.params.id),
        userId: req.user.id,
        content: req.body.content,
      });
      res.json(comment);
    } catch (error) {
      console.error("Error saving topic comment:", error);
      res.status(500).json({ error: "Failed to save topic comment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}