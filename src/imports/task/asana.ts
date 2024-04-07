import dayjs from 'dayjs';
import { ApiClient, UsersApi, TasksApi } from 'asana';
const client = ApiClient.instance;
const token = client.authentications.token;

const usersApiInstance = new UsersApi();
const tasksApiInstance = new TasksApi();

export interface AsanaUser {
  gid: string;
  email: string;
  name: string;
  photo: string;
  resource_type: string;
  workspaces: AsanaWorkspace[];
}

export interface AsanaWorkspace {
  gid: string;
  name: string;
  resource_type: string;
}

export interface AsanaTask {
  gid: string;
  completed: boolean;
  completed_at: string;
  due_at?: string | null;
  due_on?: string | null;
  modified_at?: string | null;
  name: string;
  permalink_url: string;
  projects: { gid: string; name: string; [field: string]: any }[];
  workspace: { gid: string; name?: string; [field: string]: any };
  [field: string]: any;
}

export class Asana {
  private cachedMyUser: AsanaUser | null = null;
  constructor(accessToken: string) {
    token.accessToken = accessToken;
  }

  async loadSelfUser(): Promise<AsanaUser> {
    if (this.cachedMyUser) {
      return this.cachedMyUser;
    }
    const response = await usersApiInstance.getUser('me');
    const myUser = response.data as AsanaUser;
    this.cachedMyUser = myUser;
    return myUser;
  }

  async loadSelfTasks(since: Date = new Date()): Promise<AsanaTask[]> {
    const selfUser = await this.loadSelfUser();
    const asanaTaskPromises: Promise<AsanaTask>[] = [];
    for (const workspace of selfUser.workspaces) {
      asanaTaskPromises.push(
        tasksApiInstance.getTasks({
          limit: 100,
          completed_since: dayjs(since).startOf('day').toISOString(),
          workspace: workspace.gid,
          assignee: selfUser.gid,
          opt_fields: 'completed,completed_at,due_at,due_on,modified_at,name,permalink_url,projects,projects.name,workspace,workspace.name',
        }),
      );
    }
    const asanaTaskResponses = await Promise.all(asanaTaskPromises);
    return asanaTaskResponses.map((asanaTaskResponse) => asanaTaskResponse.data);
  }

  clearCache() {
    this.cachedMyUser = null;
  }
}
