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
    });
    await storage.addGroupMember({
      groupId: group.id,
      userId: req.user.id,
      isAdmin: true,
    });
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
    await storage.addTopicToEpisode(
      parseInt(req.params.episodeId),
      parseInt(req.params.topicId),
      req.body.order
    );
    res.sendStatus(200);
  });

  app.delete("/api/episodes/:episodeId/topics/:topicId", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    await storage.removeTopicFromEpisode(
      parseInt(req.params.episodeId),
      parseInt(req.params.topicId)
    );
    res.sendStatus(200);
  });

  app.get("/api/episodes/:id/topics", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const topics = await storage.getEpisodeTopics(parseInt(req.params.id));
    res.json(topics);
  });

  // Topic comment routes (only one instance needed)
  app.post("/api/topics/:id/comments", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const comment = await storage.createTopicComment({
      topicId: parseInt(req.params.id),
      userId: req.user.id,
      content: req.body.content,
    });
    res.json(comment);
  });

  const httpServer = createServer(app);
  return httpServer;
}