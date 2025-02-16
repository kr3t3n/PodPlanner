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
  users,
  groups,
  groupMembers,
  episodes,
  topics,
  topicComments,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
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
  getGroupEpisodes(groupId: number): Promise<Episode[]>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  getGroupTopics(groupId: number): Promise<Topic[]>;
  createTopicComment(comment: InsertTopicComment): Promise<TopicComment>;
  getTopicComments(topicId: number): Promise<TopicComment[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
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
    return await db
      .select()
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.userId, userId));
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
      .values({ ...insertMember, isAdmin: insertMember.isAdmin ?? false })
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
        status: insertEpisode.status ?? "draft",
        repeatPattern: insertEpisode.repeatPattern ?? null,
      })
      .returning();
    return episode;
  }

  async getGroupEpisodes(groupId: number): Promise<Episode[]> {
    return await db
      .select()
      .from(episodes)
      .where(eq(episodes.groupId, groupId));
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
}

export const storage = new DatabaseStorage();