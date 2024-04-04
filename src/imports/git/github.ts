import { Octokit } from 'octokit';
import { OctokitResponse } from '@octokit/types';

interface GithubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string | null;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  [property: string]: any;
}

interface GithubSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GithubSearchResultItem[];
}

interface GithubSearchResultItem {
  [property: string]: any;
}

export class Github {
  private octokit: Octokit;
  private cachedMyUser: GithubUser | null = null;

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  async loadSelfUser(): Promise<GithubUser> {
    if (this.cachedMyUser) {
      return this.cachedMyUser;
    }
    const myGihubUserResponse: OctokitResponse<GithubUser, 200> = await this.octokit.rest.users.getAuthenticated();
    this.cachedMyUser = myGihubUserResponse.data;
    return this.cachedMyUser;
  }

  async searchSelfCommits(since: Date = new Date(), page: number = 1): Promise<GithubSearchResult> {
    const myUser = await this.loadSelfUser();
    const searchCommitResponse = await this.octokit.rest.search.commits({
      q: `user:${myUser.login} committer-date:>=${since.toLocaleDateString('sv-SE')}`,
      per_page: 100,
      page: page,
    });
    return searchCommitResponse.data;
  }

  async clearCache() {
    this.cachedMyUser = null;
  }
}
