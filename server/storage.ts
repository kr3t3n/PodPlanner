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
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type GroupInvitation,
  type InsertGroupInvitation,
  type GroupInviteCode,
  type InsertGroupInviteCode,
  users,
  groups,
  groupMembers,
  episodes,
  topics,
  topicComments,
  episodeTopics,
  passwordResetTokens,
  groupInvitations,
  groupInviteCodes,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne, gt } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User>;
  getUserGroups(userId: number): Promise<Group[]>;
  createGroup(group: InsertGroup, creatorUserId: number): Promise<Group>;
  getGroup(id: number): Promise<Group | undefined>;
  updateGroup(id: number, data: Partial<InsertGroup>): Promise<Group>;
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

  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getValidPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(id: number): Promise<void>;

  createGroupInvitation(invitation: InsertGroupInvitation): Promise<GroupInvitation>;
  getValidGroupInvitation(token: string): Promise<(GroupInvitation & { group: Group }) | undefined>;
  markGroupInvitationAsUsed(id: number): Promise<void>;

  // Add new methods for invite codes
  createGroupInviteCode(code: InsertGroupInviteCode): Promise<GroupInviteCode>;
  getValidGroupInviteCode(code: string): Promise<(GroupInviteCode & { group: Group }) | undefined>;
  markGroupInviteCodeAsUsed(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'user_sessions',
      schemaName: 'public',
      pruneSessionInterval: false,
      errorLog: console.error.bind(console),
      connectionString: process.env.DATABASE_URL
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
      .from(groupMembers)
      .innerJoin(
        groups,
        eq(groups.id, groupMembers.groupId)
      )
      .where(eq(groupMembers.userId, userId));

    return result;
  }

  async createGroup(insertGroup: InsertGroup, creatorUserId: number): Promise<Group> {
    const [group] = await db.insert(groups).values(insertGroup).returning();

    // Add the creator as an admin member
    await db.insert(groupMembers).values({
      userId: creatorUserId,
      groupId: group.id,
      isAdmin: true,
    });

    return group;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async updateGroup(id: number, updateData: Partial<InsertGroup>): Promise<Group> {
    const [group] = await db
      .update(groups)
      .set(updateData)
      .where(eq(groups.id, id))
      .returning();
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
        date: new Date(insertEpisode.date),
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
          ne(episodes.status, "deleted")
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    console.log(`Looking up user by email: ${email}`);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    console.log(`User lookup result:`, user ? `Found user with ID ${user.id}` : 'No user found');
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values(token)
      .returning();
    return resetToken;
  }

  async getValidPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      );
    return resetToken;
  }

  async markPasswordResetTokenAsUsed(id: number): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, id));
  }

  async createGroupInvitation(invitation: InsertGroupInvitation): Promise<GroupInvitation> {
    const [groupInvitation] = await db
      .insert(groupInvitations)
      .values(invitation)
      .returning();
    return groupInvitation;
  }

  async getValidGroupInvitation(token: string): Promise<(GroupInvitation & { group: Group }) | undefined> {
    const [invitation] = await db
      .select({
        id: groupInvitations.id,
        groupId: groupInvitations.groupId,
        email: groupInvitations.email,
        token: groupInvitations.token,
        invitedBy: groupInvitations.invitedBy,
        expiresAt: groupInvitations.expiresAt,
        used: groupInvitations.used,
        group: groups,
      })
      .from(groupInvitations)
      .innerJoin(groups, eq(groups.id, groupInvitations.groupId))
      .where(
        and(
          eq(groupInvitations.token, token),
          eq(groupInvitations.used, false),
          gt(groupInvitations.expiresAt, new Date())
        )
      );

    console.log('Retrieved invitation:', invitation); // Add logging
    return invitation;
  }

  async markGroupInvitationAsUsed(id: number): Promise<void> {
    console.log('Marking invitation as used:', id); // Add logging
    await db
      .update(groupInvitations)
      .set({ used: true })
      .where(eq(groupInvitations.id, id));
  }

  async createGroupInviteCode(insertCode: InsertGroupInviteCode): Promise<GroupInviteCode> {
    const [inviteCode] = await db
      .insert(groupInviteCodes)
      .values(insertCode)
      .returning();
    return inviteCode;
  }

  async getValidGroupInviteCode(code: string): Promise<(GroupInviteCode & { group: Group }) | undefined> {
    const [inviteCode] = await db
      .select({
        id: groupInviteCodes.id,
        groupId: groupInviteCodes.groupId,
        code: groupInviteCodes.code,
        createdBy: groupInviteCodes.createdBy,
        expiresAt: groupInviteCodes.expiresAt,
        used: groupInviteCodes.used,
        group: groups,
      })
      .from(groupInviteCodes)
      .innerJoin(groups, eq(groups.id, groupInviteCodes.groupId))
      .where(
        and(
          eq(groupInviteCodes.code, code),
          eq(groupInviteCodes.used, false),
          gt(groupInviteCodes.expiresAt, new Date())
        )
      );

    return inviteCode;
  }

  async markGroupInviteCodeAsUsed(id: number): Promise<void> {
    await db
      .update(groupInviteCodes)
      .set({ used: true })
      .where(eq(groupInviteCodes.id, id));
  }
}

export const storage = new DatabaseStorage();