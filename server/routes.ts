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
    try {
      const { token, password } = req.body;
      const resetToken = await storage.getValidPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      // Hash the new password before storing
      const hashedPassword = await hashPassword(password);

      // Update password and mark token as used
      await storage.updateUser(resetToken.userId, { password: hashedPassword });
      await storage.markPasswordResetTokenAsUsed(resetToken.id);

      res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.post("/api/groups/:id/invite", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const { email } = req.body;
    const groupId = parseInt(req.params.id);

    const group = await storage.getGroup(groupId);
    if (!group) return res.sendStatus(404);

    // Check if user is admin
    const members = await storage.getGroupMembers(groupId);
    const isAdmin = members.some(m => m.userId === req.user!.id && m.isAdmin);
    if (!isAdmin) return res.sendStatus(403);

    // Generate a new invite code
    const code = randomBytes(4).toString('hex');

    const inviteCode = await storage.createGroupInviteCode({
      groupId,
      code,
      createdBy: req.user.id,
      expiresAt: addDays(new Date(), 7),
      used: false,
    });

    // Get the base URL and construct join link
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const joinUrl = `${protocol}://${host}/auth?redirect=/?code=${code}`;

    // Send invitation email with the code and join link
    await sendGroupInvitationEmail(
      email,
      group.name,
      req.user.username,
      code,
      joinUrl
    );

    // Return both the invite code and group for the UI
    res.json({ code, group: inviteCode.group });
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

  // Add this route within the registerRoutes function
  app.patch("/api/groups/:groupId/members/:memberId", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const groupId = parseInt(req.params.groupId);
    const memberId = parseInt(req.params.memberId);
    const { isAdmin } = req.body;

    // Check if user is admin
    const members = await storage.getGroupMembers(groupId);
    const isUserAdmin = members.some(m => m.userId === req.user!.id && m.isAdmin);
    if (!isUserAdmin) return res.sendStatus(403);

    try {
      const updatedMember = await storage.updateGroupMember(memberId, { isAdmin });
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ error: "Failed to update member role" });
    }
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

  // Generate invite code for a group
  app.post("/api/groups/:id/invite-codes", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const groupId = parseInt(req.params.id);

    // Check if user is admin
    const members = await storage.getGroupMembers(groupId);
    const isAdmin = members.some(m => m.userId === req.user!.id && m.isAdmin);
    if (!isAdmin) return res.sendStatus(403);

    // Generate a random 8-character code
    const code = randomBytes(4).toString('hex');

    const inviteCode = await storage.createGroupInviteCode({
      groupId,
      code,
      createdBy: req.user.id,
      expiresAt: addDays(new Date(), 7), // Code expires in 7 days
      used: false,
    });

    res.json(inviteCode);
  });

  // Join group with invite code
  app.post("/api/join-group", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: "Invite code is required" });
    }

    const inviteCode = await storage.getValidGroupInviteCode(code);
    if (!inviteCode) {
      return res.status(400).json({ message: "Invalid or expired invite code" });
    }

    // Check if user is already a member
    const members = await storage.getGroupMembers(inviteCode.groupId);
    if (members.some(m => m.userId === req.user!.id)) {
      return res.status(400).json({ message: "You are already a member of this group" });
    }

    // Add user to group
    await storage.addGroupMember({
      userId: req.user.id,
      groupId: inviteCode.groupId,
      isAdmin: false,
    });

    // Mark code as used
    await storage.markGroupInviteCodeAsUsed(inviteCode.id);

    res.json(inviteCode.group);
  });

  const httpServer = createServer(app);
  return httpServer;
}