import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  groupId: integer("group_id").notNull().references(() => groups.id),
  isAdmin: boolean("is_admin").notNull().default(false),
});

export const episodes = pgTable("episodes", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  title: text("title").notNull(),
  date: timestamp("date", { mode: 'date' }).notNull(),
  status: text("status").notNull().default("draft"),
  repeatPattern: json("repeat_pattern"),
});

export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  name: text("name"),
  url: text("url"),
  isArchived: boolean("is_archived").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

export const topicComments = pgTable("topic_comments", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull().references(() => topics.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
});

export const episodeTopics = pgTable("episode_topics", {
  id: serial("id").primaryKey(),
  episodeId: integer("episode_id").notNull().references(() => episodes.id),
  topicId: integer("topic_id").notNull().references(() => topics.id),
  order: integer("order").notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertGroupSchema = createInsertSchema(groups);
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

export const insertGroupMemberSchema = createInsertSchema(groupMembers);
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;

export const insertEpisodeSchema = createInsertSchema(episodes);
export type InsertEpisode = z.infer<typeof insertEpisodeSchema>;
export type Episode = typeof episodes.$inferSelect;

export const insertTopicSchema = createInsertSchema(topics);
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topics.$inferSelect;

export const insertTopicCommentSchema = createInsertSchema(topicComments);
export type InsertTopicComment = z.infer<typeof insertTopicCommentSchema>;
export type TopicComment = typeof topicComments.$inferSelect;

export const insertEpisodeTopicSchema = createInsertSchema(episodeTopics);
export type InsertEpisodeTopic = z.infer<typeof insertEpisodeTopicSchema>;
export type EpisodeTopic = typeof episodeTopics.$inferSelect;

export const episodeStatuses = ["draft", "planned", "done", "deleted"] as const;
export type EpisodeStatus = typeof episodeStatuses[number];