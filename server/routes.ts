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
  app.post("/api/groups", async (req, res) => {
    const group = await storage.createGroup({
      name: req.body.name,
    });
    await storage.addGroupMember({
      groupId: group.id,
      userId: req.user!.id,
      isAdmin: true,
    });
    res.json(group);
  });

  app.get("/api/groups/:id", async (req, res) => {
    const group = await storage.getGroup(parseInt(req.params.id));
    if (!group) return res.sendStatus(404);
    res.json(group);
  });

  app.get("/api/groups/:id/members", async (req, res) => {
    const members = await storage.getGroupMembers(parseInt(req.params.id));
    res.json(members);
  });

  // Episode routes
  app.post("/api/groups/:id/episodes", async (req, res) => {
    const episode = await storage.createEpisode({
      groupId: parseInt(req.params.id),
      ...req.body,
    });
    res.json(episode);
  });

  app.get("/api/groups/:id/episodes", async (req, res) => {
    const episodes = await storage.getGroupEpisodes(parseInt(req.params.id));
    res.json(episodes);
  });

  // Topic routes
  app.post("/api/groups/:id/topics", async (req, res) => {
    const topic = await storage.createTopic({
      groupId: parseInt(req.params.id),
      ...req.body,
    });
    res.json(topic);
  });

  app.get("/api/groups/:id/topics", async (req, res) => {
    const topics = await storage.getGroupTopics(parseInt(req.params.id));
    res.json(topics);
  });

  // Topic comment routes
  app.post("/api/topics/:id/comments", async (req, res) => {
    const comment = await storage.createTopicComment({
      topicId: parseInt(req.params.id),
      userId: req.user!.id,
      content: req.body.content,
    });
    res.json(comment);
  });

  const httpServer = createServer(app);
  return httpServer;
}
