import { useState } from 'react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { Database, FolderOpen, HardDrive, Cloud, Package, Github, CloudCog } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

type StorageProviderType = 'local' | 'dropbox' | 'google-drive' | 'github' | 'cloudflare' | 'mm-storage' | 'custom';

interface StorageProvider {
  id: StorageProviderType;
  name: string;
  icon: React.ReactNode;
  basePath?: string;
  description: string;
  connected: boolean;
}

interface StorageSelectorProps {
  onStorageSelect: (path: string, provider: StorageProviderType) => void;
  currentPath: string;
}

export default function StorageSelector({ onStorageSelect, currentPath }: StorageSelectorProps) {
  const [customPath, setCustomPath] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Storage providers configuration
  const storageProviders: StorageProvider[] = [
    {
      id: 'local',
      name: 'Local Files',
      icon: <HardDrive className="h-6 w-6" />,
      basePath: '/',
      description: 'Access files on this computer',
      connected: true
    },
    {
      id: 'mm-storage',
      name: 'MM Workspace',
      icon: <Package className="h-6 w-6" />,
      basePath: '/midnight-magnolia',
      description: 'Midnight Magnolia dedicated workspace',
      connected: true
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      icon: <Database className="h-6 w-6" />,
      description: 'Connect to your Dropbox account',
      connected: false
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      icon: <Cloud className="h-6 w-6" />,
      description: 'Access files from Google Drive',
      connected: false
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: <Github className="h-6 w-6" />,
      description: 'Access repositories from GitHub',
      connected: false
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare',
      icon: <CloudCog className="h-6 w-6" />,
      description: 'Access files from Cloudflare R2',
      connected: false
    }
  ];

  function handleProviderSelect(provider: StorageProvider) {
    if (provider.connected && provider.basePath) {
      onStorageSelect(provider.basePath, provider.id);
      setIsPopoverOpen(false);
    } else {
      // In a real app, this would trigger an authentication flow
      console.log(`Connect to ${provider.name} first`);
      // For now, we'll just close the popover
      setIsPopoverOpen(false);
    }
  }

  function handleCustomPathSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (customPath) {
      onStorageSelect(customPath, 'custom');
      setIsPopoverOpen(false);
    }
  }

  return (
    <div className="mb-4">
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-start border-dashed"
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            <span className="truncate">
              {currentPath || 'Select Storage Location'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Storage Systems</CardTitle>
              <CardDescription>
                Choose where to access your files
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-1 gap-2">
                {storageProviders.map((provider) => (
                  <Button
                    key={provider.id}
                    variant="outline"
                    className={`justify-start ${!provider.connected ? 'opacity-60 hover:opacity-100' : ''}`}
                    onClick={() => handleProviderSelect(provider)}
                  >
                    <div className="mr-2">
                      {provider.icon}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{provider.name}</span>
                      <span className="text-xs text-muted-foreground">{provider.description}</span>
                      {!provider.connected && (
                        <span className="text-xs text-blue-500">Connect</span>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or enter custom path
                  </span>
                </div>
              </div>
              
              <form onSubmit={handleCustomPathSubmit} className="flex space-x-2">
                <Input
                  placeholder="/path/to/directory"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit">Go</Button>
              </form>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}