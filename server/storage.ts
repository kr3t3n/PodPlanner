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
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createGroup(group: InsertGroup): Promise<Group>;
  getGroup(id: number): Promise<Group | undefined>;
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  getGroupMembers(groupId: number): Promise<GroupMember[]>;
  createEpisode(episode: InsertEpisode): Promise<Episode>;
  getGroupEpisodes(groupId: number): Promise<Episode[]>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  getGroupTopics(groupId: number): Promise<Topic[]>;
  createTopicComment(comment: InsertTopicComment): Promise<TopicComment>;
  getTopicComments(topicId: number): Promise<TopicComment[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private groups: Map<number, Group>;
  private groupMembers: Map<number, GroupMember>;
  private episodes: Map<number, Episode>;
  private topics: Map<number, Topic>;
  private topicComments: Map<number, TopicComment>;
  sessionStore: session.Store;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.groups = new Map();
    this.groupMembers = new Map();
    this.episodes = new Map();
    this.topics = new Map();
    this.topicComments = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user = { id, ...insertUser };
    this.users.set(id, user);
    return user;
  }

  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const id = this.currentId++;
    const group = { id, ...insertGroup };
    this.groups.set(id, group);
    return group;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async addGroupMember(insertMember: InsertGroupMember): Promise<GroupMember> {
    const id = this.currentId++;
    const member = { id, ...insertMember };
    this.groupMembers.set(id, member);
    return member;
  }

  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    return Array.from(this.groupMembers.values()).filter(
      (member) => member.groupId === groupId,
    );
  }

  async createEpisode(insertEpisode: InsertEpisode): Promise<Episode> {
    const id = this.currentId++;
    const episode = { id, ...insertEpisode };
    this.episodes.set(id, episode);
    return episode;
  }

  async getGroupEpisodes(groupId: number): Promise<Episode[]> {
    return Array.from(this.episodes.values()).filter(
      (episode) => episode.groupId === groupId,
    );
  }

  async createTopic(insertTopic: InsertTopic): Promise<Topic> {
    const id = this.currentId++;
    const topic = { id, ...insertTopic };
    this.topics.set(id, topic);
    return topic;
  }

  async getGroupTopics(groupId: number): Promise<Topic[]> {
    return Array.from(this.topics.values()).filter(
      (topic) => topic.groupId === groupId,
    );
  }

  async createTopicComment(insertComment: InsertTopicComment): Promise<TopicComment> {
    const id = this.currentId++;
    const comment = { id, ...insertComment };
    this.topicComments.set(id, comment);
    return comment;
  }

  async getTopicComments(topicId: number): Promise<TopicComment[]> {
    return Array.from(this.topicComments.values()).filter(
      (comment) => comment.topicId === topicId,
    );
  }
}

export const storage = new MemStorage();
