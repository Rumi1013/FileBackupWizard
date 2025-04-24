export type StorageProviderType = 'local' | 'dropbox' | 'google-drive' | 'github' | 'cloudflare' | 'mm-storage' | 
  'home-dir' | 'downloads-dir' | 'documents-dir' | 'pictures-dir' | 'workspace-dir' | 'custom';

export interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink' | 'unknown' | 'error';
  children?: DirectoryEntry[];
  size?: number;
  hidden?: boolean;
  error?: string;
  max_depth_reached?: boolean;
  status?: string;
  last_modified?: number;
  permission_error?: boolean;
  cycle_detected?: boolean;
  suggestion?: string;
  suggestedPath?: string;
  message?: string;
  excluded?: boolean;
  restricted?: boolean;
  assessment?: {
    qualityScore: 'Good' | 'Medium' | 'Poor';
    monetizationEligible: boolean;
    needsDeletion: boolean;
  }
}