import {
  type User,
  type InsertUser,
  type Group,
  type InsertGroup,
  type GroupMember,
  type InsertGroupMember,
  type Episode,
  type InsertEpisode,
  type Topic,
  type InsertTopic,
  type TopicComment,
  type InsertTopicComment,
  type EpisodeTopic,
  users,
  groups,
  groupMembers,
  episodes,
  topics,
  topicComments,
  episodeTopics,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserGroups(userId: number): Promise<Group[]>;
  createGroup(group: InsertGroup): Promise<Group>;
  getGroup(id: number): Promise<Group | undefined>;
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]>;
  createEpisode(episode: InsertEpisode): Promise<Episode>;
  updateEpisode(id: number, episode: Partial<InsertEpisode>): Promise<Episode>;
  deleteEpisode(id: number): Promise<Episode>;
  getGroupEpisodes(groupId: number): Promise<Episode[]>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  getGroupTopics(groupId: number): Promise<Topic[]>;
  createTopicComment(comment: InsertTopicComment): Promise<TopicComment>;
  getTopicComments(topicId: number): Promise<TopicComment[]>;
  getTopicCommentsWithUsers(topicId: number): Promise<(TopicComment & { user: User })[]>;
  updateTopic(
    id: number,
    updateData: Partial<InsertTopic> & { isArchived?: boolean; isDeleted?: boolean }
  ): Promise<Topic>;
  getEpisodeTopics(episodeId: number): Promise<(Topic & { order: number })[]>;
  addTopicToEpisode(episodeId: number, topicId: number, order: number): Promise<void>;
  removeTopicFromEpisode(episodeId: number, topicId: number): Promise<void>;
  upsertTopicComment(comment: InsertTopicComment): Promise<TopicComment>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'user_sessions',
      schemaName: 'public',
      pruneSessionInterval: false, // Disable automatic pruning
      errorLog: console.error.bind(console), // Add error logging
      connectionString: process.env.DATABASE_URL // Explicitly set connection string
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserGroups(userId: number): Promise<Group[]> {
    const result = await db
      .select({
        id: groups.id,
        name: groups.name,
      })
      .from(groups)
      .innerJoin(
        groupMembers,
        and(
          eq(groups.id, groupMembers.groupId),
          eq(groupMembers.userId, userId)
        )
      );

    return result.map(group => ({
      id: group.id,
      name: group.name
    }));
  }

  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const [group] = await db.insert(groups).values(insertGroup).returning();
    return group;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async addGroupMember(insertMember: InsertGroupMember): Promise<GroupMember> {
    const [member] = await db
      .insert(groupMembers)
      .values(insertMember)
      .returning();
    return member;
  }

  async getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]> {
    return await db
      .select({
        id: groupMembers.id,
        userId: groupMembers.userId,
        groupId: groupMembers.groupId,
        isAdmin: groupMembers.isAdmin,
        user: users,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId));
  }

  async createEpisode(insertEpisode: InsertEpisode): Promise<Episode> {
    const [episode] = await db
      .insert(episodes)
      .values({
        ...insertEpisode,
        date: new Date(insertEpisode.date), // Convert string date to Date object
        status: insertEpisode.status || "draft",
        repeatPattern: insertEpisode.repeatPattern || null,
      })
      .returning();
    return episode;
  }

  async updateEpisode(id: number, updateEpisode: Partial<InsertEpisode>): Promise<Episode> {
    const [episode] = await db
      .update(episodes)
      .set({
        ...updateEpisode,
        date: updateEpisode.date ? new Date(updateEpisode.date) : undefined,
      })
      .where(eq(episodes.id, id))
      .returning();
    return episode;
  }

  async deleteEpisode(id: number): Promise<Episode> {
    const [episode] = await db
      .update(episodes)
      .set({ status: "deleted" })
      .where(eq(episodes.id, id))
      .returning();
    return episode;
  }

  async getGroupEpisodes(groupId: number): Promise<Episode[]> {
    return await db
      .select()
      .from(episodes)
      .where(
        and(
          eq(episodes.groupId, groupId),
          ne(episodes.status, "deleted") // Use ne instead of not
        )
      );
  }

  async createTopic(insertTopic: InsertTopic): Promise<Topic> {
    const [topic] = await db
      .insert(topics)
      .values({
        ...insertTopic,
        isArchived: false,
        isDeleted: false,
      })
      .returning();
    return topic;
  }

  async getGroupTopics(groupId: number): Promise<Topic[]> {
    return await db
      .select()
      .from(topics)
      .where(eq(topics.groupId, groupId));
  }

  async updateTopic(
    id: number,
    updateData: Partial<InsertTopic> & { isArchived?: boolean; isDeleted?: boolean }
  ): Promise<Topic> {
    const [topic] = await db
      .update(topics)
      .set(updateData)
      .where(eq(topics.id, id))
      .returning();
    return topic;
  }

  async getEpisodeTopics(episodeId: number): Promise<(Topic & { order: number })[]> {
    const result = await db
      .select({
        id: topics.id,
        groupId: topics.groupId,
        name: topics.name,
        url: topics.url,
        isArchived: topics.isArchived,
        isDeleted: topics.isDeleted,
        order: episodeTopics.order,
      })
      .from(topics)
      .innerJoin(
        episodeTopics,
        and(
          eq(episodeTopics.topicId, topics.id),
          eq(episodeTopics.episodeId, episodeId)
        )
      )
      .orderBy(episodeTopics.order);
    return result;
  }

  async addTopicToEpisode(episodeId: number, topicId: number, order: number): Promise<void> {
    await db
      .insert(episodeTopics)
      .values({ episodeId, topicId, order })
      .onConflictDoUpdate({
        target: [episodeTopics.episodeId, episodeTopics.topicId],
        set: { order },
      });
  }

  async removeTopicFromEpisode(episodeId: number, topicId: number): Promise<void> {
    await db
      .delete(episodeTopics)
      .where(
        and(
          eq(episodeTopics.episodeId, episodeId),
          eq(episodeTopics.topicId, topicId)
        )
      );
  }

  async createTopicComment(insertComment: InsertTopicComment): Promise<TopicComment> {
    const [comment] = await db
      .insert(topicComments)
      .values(insertComment)
      .returning();
    return comment;
  }

  async getTopicComments(topicId: number): Promise<TopicComment[]> {
    return await db
      .select()
      .from(topicComments)
      .where(eq(topicComments.topicId, topicId));
  }

  async getTopicCommentsWithUsers(topicId: number): Promise<(TopicComment & { user: User })[]> {
    return await db
      .select({
        id: topicComments.id,
        topicId: topicComments.topicId,
        userId: topicComments.userId,
        content: topicComments.content,
        updatedAt: topicComments.updatedAt,
        user: users,
      })
      .from(topicComments)
      .innerJoin(users, eq(topicComments.userId, users.id))
      .where(eq(topicComments.topicId, topicId));
  }

  async upsertTopicComment(insertComment: InsertTopicComment): Promise<TopicComment> {
    const [comment] = await db
      .insert(topicComments)
      .values({
        ...insertComment,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [topicComments.userId, topicComments.topicId],
        set: {
          content: insertComment.content,
          updatedAt: new Date(),
        },
      })
      .returning();
    return comment;
  }
}

export const storage = new DatabaseStorage();