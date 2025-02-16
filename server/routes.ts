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

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Group routes
  app.get("/api/groups", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const groups = await storage.getUserGroups(req.user.id);
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