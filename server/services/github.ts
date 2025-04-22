import { Octokit } from 'octokit';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  created_at: string; // Now enforced to be non-null in the implementation
  updated_at: string; // Now enforced to be non-null in the implementation
  pushed_at: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  archived: boolean;
  disabled: boolean;
  open_issues_count: number;
  license: string | null;
  visibility: string;
  default_branch: string;
  last_activity_date: Date;
  activity_score?: number;
  usage_status?: 'active' | 'inactive' | 'dormant';
}

// Token stored in memory during application runtime
let githubToken: string | null = process.env.GITHUB_TOKEN || null;

export async function getGitHubToken(): Promise<string> {
  if (!githubToken) {
    throw new Error('GitHub token not found in environment variables');
  }
  return githubToken;
}

export async function setGitHubToken(token: string): Promise<void> {
  githubToken = token;
}

export async function listUserRepositories(token: string): Promise<Repository[]> {
  const octokit = new Octokit({ auth: token });
  
  try {
    // Get all repositories for the authenticated user
    const result = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
      direction: 'desc'
    });
    
    if (!result.data) {
      throw new Error('No data returned from GitHub API');
    }
    
    // Process and analyze each repository
    const repos = result.data.map(repo => {
      const repoObj: Repository = { 
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description || null,
        created_at: repo.created_at || '',
        updated_at: repo.updated_at || '',
        pushed_at: repo.pushed_at,
        size: repo.size,
        stargazers_count: repo.stargazers_count,
        watchers_count: repo.watchers_count,
        forks_count: repo.forks_count,
        archived: repo.archived,
        disabled: repo.disabled,
        open_issues_count: repo.open_issues_count,
        license: repo.license?.name || null,
        visibility: repo.visibility || 'private',
        default_branch: repo.default_branch || 'main',
        last_activity_date: new Date(repo.pushed_at || Date.now())
      };
      
      // Calculate activity score based on recent activity, stars, forks, etc.
      const daysSinceLastActivity = Math.floor((Date.now() - new Date(repo.pushed_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
      
      // Activity score factors in recency of updates, stars, forks, and open issues
      repoObj.activity_score = calculateActivityScore(
        daysSinceLastActivity,
        repo.stargazers_count,
        repo.forks_count,
        repo.open_issues_count
      );
      
      // Determine usage status based on activity score
      if (repoObj.activity_score > 70) {
        repoObj.usage_status = 'active';
      } else if (repoObj.activity_score > 30) {
        repoObj.usage_status = 'inactive';
      } else {
        repoObj.usage_status = 'dormant';
      }
      
      return repoObj;
    });
    
    return repos;
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error);
    throw error;
  }
}

function calculateActivityScore(
  daysSinceLastActivity: number,
  stars: number,
  forks: number,
  issues: number
): number {
  // Score based on recency (max 60 points)
  let recencyScore = 0;
  if (daysSinceLastActivity < 7) {
    recencyScore = 60; // Very active - updated within a week
  } else if (daysSinceLastActivity < 30) {
    recencyScore = 50; // Active - updated within a month
  } else if (daysSinceLastActivity < 90) {
    recencyScore = 40; // Somewhat active - updated within 3 months
  } else if (daysSinceLastActivity < 180) {
    recencyScore = 30; // Not very active - updated within 6 months
  } else if (daysSinceLastActivity < 365) {
    recencyScore = 15; // Inactive - updated within a year
  } else {
    recencyScore = 5; // Dormant - not updated in over a year
  }
  
  // Score based on community engagement (max 40 points)
  const starScore = Math.min(stars * 2, 20); // 2 points per star, max 20
  const forkScore = Math.min(forks * 3, 15); // 3 points per fork, max 15
  const issueScore = Math.min(issues, 5); // 1 point per open issue, max 5
  
  return recencyScore + starScore + forkScore + issueScore;
}

export async function getRepositoryUsage(token: string, owner: string, repo: string): Promise<any> {
  const octokit = new Octokit({ auth: token });
  
  try {
    // Get commit activity
    const commitActivity = await octokit.rest.repos.getCommitActivityStats({
      owner,
      repo
    });
    
    // Get code frequency
    const codeFrequency = await octokit.rest.repos.getCodeFrequencyStats({
      owner,
      repo
    });
    
    // Get contributors
    const contributors = await octokit.rest.repos.getContributorsStats({
      owner,
      repo
    });
    
    return {
      commitActivity: commitActivity.data,
      codeFrequency: codeFrequency.data,
      contributors: contributors.data
    };
  } catch (error) {
    console.error(`Error fetching repository usage for ${owner}/${repo}:`, error);
    throw error;
  }
}

export async function archiveRepository(token: string, owner: string, repo: string): Promise<boolean> {
  const octokit = new Octokit({ auth: token });
  
  try {
    await octokit.rest.repos.update({
      owner,
      repo,
      archived: true
    });
    
    return true;
  } catch (error) {
    console.error(`Error archiving repository ${owner}/${repo}:`, error);
    throw error;
  }
}

export async function deleteRepository(token: string, owner: string, repo: string): Promise<boolean> {
  const octokit = new Octokit({ auth: token });
  
  try {
    await octokit.rest.repos.delete({
      owner,
      repo
    });
    
    return true;
  } catch (error) {
    console.error(`Error deleting repository ${owner}/${repo}:`, error);
    throw error;
  }
}