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
  transporter
} from "./email";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Test email endpoint
  app.get("/api/test-email", async (req, res) => {
    try {
      // First verify SMTP connection
      const verifyResult = await transporter.verify();
      console.log("SMTP Verification result:", verifyResult);

      // Then try to send a test email
      await transporter.sendMail({
        from: process.env.SMTP_FROM_EMAIL,
        to: "georgi@pepelyankov.com",
        subject: "PodPlanner Test Email",
        text: "This is a test email from PodPlanner to verify SMTP configuration.",
        html: "<h1>PodPlanner Test Email</h1><p>This is a test email from PodPlanner to verify SMTP configuration.</p>",
      });

      res.setHeader('Content-Type', 'application/json');
      res.json({ 
        success: true, 
        message: "Test email sent successfully",
        smtpConfig: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_PORT === "465",
          user: process.env.SMTP_USER,
          fromEmail: process.env.SMTP_FROM_EMAIL
        }
      });
    } catch (error) {
      console.error("Test email error:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? error.stack : String(error),
        smtpConfig: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_PORT === "465",
          user: process.env.SMTP_USER,
          fromEmail: process.env.SMTP_FROM_EMAIL
        }
      });
    }
  });

  // Password Reset Routes
  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return res.sendStatus(200);
    }

    const token = randomBytes(32).toString("hex");
    await storage.createPasswordResetToken({
      userId: user.id,
      token,
      expiresAt: addHours(new Date(), 1),
      used: false,
    });

    const resetUrl = `${req.protocol}://${req.get("host")}/reset-password`;
    await sendPasswordResetEmail(email, token, resetUrl);
    res.sendStatus(200);
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

    const inviteUrl = `${req.protocol}://${req.get("host")}/join-group`;
    await sendGroupInvitationEmail(
      email,
      group.name,
      req.user.username,
      token,
      inviteUrl
    );

    res.json(invitation);
  });

  app.post("/api/accept-invitation", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const { token } = req.body;

    const invitation = await storage.getValidGroupInvitation(token);
    if (!invitation) {
      return res.status(400).send("Invalid or expired invitation");
    }

    // Add user to group
    await storage.addGroupMember({
      userId: req.user.id,
      groupId: invitation.groupId,
      isAdmin: false,
    });

    // Mark invitation as used
    await storage.markGroupInvitationAsUsed(invitation.id);
    res.json(invitation.group);
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