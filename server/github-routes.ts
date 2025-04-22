import { Router, Request, Response, NextFunction } from 'express';
import { listUserRepositories, getRepositoryUsage, archiveRepository, deleteRepository, getGitHubToken } from './services/github';

const router = Router();

/**
 * Get all repositories for authenticated user
 * GET /api/github/repos
 */
router.get('/repos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string;
    try {
      token = await getGitHubToken();
    } catch (err) {
      return res.status(401).json({ error: 'No GitHub token found. Please authenticate first.' });
    }
    
    const repositories = await listUserRepositories(token);
    
    // Return repositories grouped by usage status
    const grouped = repositories.reduce((acc, repo) => {
      if (!acc[repo.usage_status!]) {
        acc[repo.usage_status!] = [];
      }
      acc[repo.usage_status!].push(repo);
      return acc;
    }, {} as Record<string, any[]>);
    
    res.json({
      total: repositories.length,
      active: grouped.active?.length || 0,
      inactive: grouped.inactive?.length || 0,
      dormant: grouped.dormant?.length || 0,
      repositories: grouped
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get detailed usage stats for a repository
 * GET /api/github/repos/:owner/:repo/usage
 */
router.get('/repos/:owner/:repo/usage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    let token: string;
    try {
      token = await getGitHubToken();
    } catch (err) {
      return res.status(401).json({ error: 'No GitHub token found. Please authenticate first.' });
    }
    
    const usageData = await getRepositoryUsage(token, owner, repo);
    res.json(usageData);
  } catch (error) {
    next(error);
  }
});

/**
 * Archive a repository
 * POST /api/github/repos/:owner/:repo/archive
 */
router.post('/repos/:owner/:repo/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    let token: string;
    try {
      token = await getGitHubToken();
    } catch (err) {
      return res.status(401).json({ error: 'No GitHub token found. Please authenticate first.' });
    }
    
    const success = await archiveRepository(token, owner, repo);
    res.json({ success, message: `Repository ${owner}/${repo} has been archived.` });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a repository
 * DELETE /api/github/repos/:owner/:repo
 */
router.delete('/repos/:owner/:repo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    let token: string;
    try {
      token = await getGitHubToken();
    } catch (err) {
      return res.status(401).json({ error: 'No GitHub token found. Please authenticate first.' });
    }
    
    const success = await deleteRepository(token, owner, repo);
    res.json({ success, message: `Repository ${owner}/${repo} has been deleted.` });
  } catch (error) {
    next(error);
  }
});

/**
 * Batch archive dormant repositories
 * POST /api/github/repos/batch-archive
 * Body: { repositories: [{ owner: string, repo: string }] }
 */
router.post('/repos/batch-archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { repositories } = req.body;
    let token: string;
    try {
      token = await getGitHubToken();
    } catch (err) {
      return res.status(401).json({ error: 'No GitHub token found. Please authenticate first.' });
    }
    
    if (!repositories || !Array.isArray(repositories) || repositories.length === 0) {
      return res.status(400).json({ error: 'No repositories provided for batch archiving.' });
    }
    
    const results = [];
    
    for (const { owner, repo } of repositories) {
      try {
        const success = await archiveRepository(token, owner, repo);
        results.push({ owner, repo, success, message: `Repository ${owner}/${repo} has been archived.` });
      } catch (error: any) {
        results.push({ 
          owner, 
          repo, 
          success: false, 
          message: `Failed to archive ${owner}/${repo}: ${error?.message || 'Unknown error'}`
        });
      }
    }
    
    res.json({ results });
  } catch (error) {
    next(error);
  }
});

/**
 * Batch delete dormant repositories
 * POST /api/github/repos/batch-delete
 * Body: { repositories: [{ owner: string, repo: string }] }
 */
router.post('/repos/batch-delete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { repositories } = req.body;
    let token: string;
    try {
      token = await getGitHubToken();
    } catch (err) {
      return res.status(401).json({ error: 'No GitHub token found. Please authenticate first.' });
    }
    
    if (!repositories || !Array.isArray(repositories) || repositories.length === 0) {
      return res.status(400).json({ error: 'No repositories provided for batch deletion.' });
    }
    
    const results = [];
    
    for (const { owner, repo } of repositories) {
      try {
        const success = await deleteRepository(token, owner, repo);
        results.push({ owner, repo, success, message: `Repository ${owner}/${repo} has been deleted.` });
      } catch (error: any) {
        results.push({ 
          owner, 
          repo, 
          success: false, 
          message: `Failed to delete ${owner}/${repo}: ${error?.message || 'Unknown error'}`
        });
      }
    }
    
    res.json({ results });
  } catch (error) {
    next(error);
  }
});

export default router;