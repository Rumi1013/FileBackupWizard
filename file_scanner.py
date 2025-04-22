import os
import json
from pathlib import Path
import sys
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    stream=sys.stderr
)
logger = logging.getLogger("file_scanner")

# List of directories to exclude from scanning
EXCLUDED_DIRS = [
    '/proc', '/sys', '/dev', '/run', '/tmp', '/var/cache',
    'node_modules', '.git', '__pycache__'
]

# Set a reasonable recursion depth to avoid scanning too deep
MAX_DEPTH = 5  # Increased from 3 to allow deeper directory access

def is_excluded_path(path):
    """Check if path should be excluded from scanning"""
    path_str = str(path)
    path_parts = path_str.split(os.sep)
    
    # Check if any part of the path exactly matches an excluded directory
    return any(excluded in path_parts for excluded in EXCLUDED_DIRS)

def scan_directory(dir_path):
    try:
        logger.info(f"Attempting to scan directory: {dir_path}")
        
        # Special case for root scan in Replit environment
        if dir_path == '/' and os.path.exists('/home/runner/workspace'):
            logger.info("Root path detected, scanning workspace directory instead")
            dir_path = '/home/runner/workspace'
        
        # Safe path resolution with better error handling
        try:
            # First attempt to normalize and resolve path
            path_obj = Path(dir_path)
            # Handle relative path inputs
            if not os.path.isabs(dir_path):
                path_obj = Path(os.path.abspath(dir_path))
            
            # Expand user directory if present (e.g., ~/Documents)
            path_obj = path_obj.expanduser()
            
            # Try to resolve the path fully
            dir_path = path_obj.resolve()
            
            logger.info(f"Resolved path to: {dir_path}")
        except Exception as e:
            logger.error(f"Error resolving path {dir_path}: {e}")
            json.dump({
                "name": os.path.basename(dir_path) if dir_path else "unknown",
                "path": dir_path,
                "type": "directory",
                "children": [],
                "error": f"Invalid path: {e}",
                "status": "error"
            }, sys.stdout)
            return
            
        # Check if directory exists with detailed error
        if not dir_path.exists():
            logger.error(f"Directory not found: {dir_path}")
            parent_exists = dir_path.parent.exists() if hasattr(dir_path, 'parent') else False
            json.dump({
                "name": dir_path.name,
                "path": str(dir_path),
                "type": "directory",
                "children": [],
                "error": f"Directory not found: {dir_path}",
                "parent_exists": parent_exists,
                "status": "not_found"
            }, sys.stdout)
            return
            
        # Handle excluded directories with more context
        if is_excluded_path(dir_path):
            logger.warning(f"Skipping excluded directory: {dir_path}")
            json.dump({
                "name": dir_path.name,
                "path": str(dir_path),
                "type": "directory",
                "children": [],
                "excluded": True,
                "status": "excluded",
                "message": "This directory is excluded for security reasons"
            }, sys.stdout)
            return

        # Keep track of visited directories to avoid symlink loops
        visited_paths = set()
        
        def create_entry(path, depth=0):
            """Recursively create entries for the directory tree"""
            # Limit recursion depth
            if depth > MAX_DEPTH:
                logger.warning(f"Max depth reached at {path}")
                return {
                    "name": path.name,
                    "path": str(path),
                    "type": "directory",
                    "children": [],
                    "max_depth_reached": True
                }
                
            # Skip excluded paths
            if is_excluded_path(path):
                return None
                
            try:
                # Safely resolve path without following symlinks to check for cycles
                try:
                    real_path = str(path.resolve())
                    if real_path in visited_paths:
                        return {
                            "name": path.name,
                            "path": str(path),
                            "type": "symlink",
                            "target": real_path,
                            "cycle_detected": True
                        }
                    visited_paths.add(real_path)
                except Exception as e:
                    logger.warning(f"Error resolving path {path}: {e}")
                    return None
                
                # Basic checks to determine type
                try:
                    is_file = path.is_file()
                    is_dir = path.is_dir()
                    is_symlink = path.is_symlink()
                except (OSError, PermissionError) as e:
                    logger.warning(f"Permission error on {path}: {e}")
                    return {
                        "name": path.name,
                        "path": str(path),
                        "type": "unknown",
                        "error": str(e)
                    }
                
                # Create the entry with basic info
                entry = {
                    "name": path.name,
                    "path": str(path),
                    "type": "file" if is_file else "directory" if is_dir else "symlink" if is_symlink else "unknown"
                }

                # Add file specific info
                if is_file:
                    try:
                        stats = path.stat()
                        entry["size"] = stats.st_size
                    except Exception as e:
                        entry["size"] = 0
                        entry["stat_error"] = str(e)
                
                # Add directory specific info - children
                elif is_dir:
                    try:
                        children = []
                        # Only scan directory contents if we're not too deep
                        if depth < MAX_DEPTH:
                            # Add basic directory info
                            try:
                                stats = path.stat()
                                entry["last_modified"] = stats.st_mtime
                                entry["creation_time"] = stats.st_ctime
                            except Exception as e:
                                entry["stat_error"] = str(e)
                                
                            # Get all children, including hidden files but marking them
                            for child in path.iterdir():
                                include_file = True
                                
                                # Track hidden files but don't exclude them completely
                                if child.name.startswith('.'):
                                    include_file = True  # Changed from False to True to include hidden files
                                    
                                if include_file:
                                    child_entry = create_entry(child, depth + 1)
                                    if child_entry:
                                        # Mark if it's a hidden file
                                        if child.name.startswith('.'):
                                            child_entry["hidden"] = True
                                        children.append(child_entry)
                                        
                        # Sort children - directories first, then files
                        children = sorted(children, key=lambda x: (0 if x["type"] == "directory" else 1, x["name"]))
                        entry["children"] = children
                    except PermissionError as e:
                        logger.warning(f"Permission error reading directory {path}: {e}")
                        entry["children"] = []
                        entry["permission_error"] = True
                    except OSError as e:
                        logger.warning(f"OS error reading directory {path}: {e}")
                        entry["children"] = []
                        entry["error"] = str(e)

                return entry
            except Exception as e:
                logger.error(f"Error processing {path}: {e}")
                return {
                    "name": path.name if hasattr(path, 'name') else "unknown",
                    "path": str(path),
                    "type": "error",
                    "error": str(e)
                }

        # Start the directory scan
        logger.info(f"Starting scan of directory: {dir_path}")
        result = create_entry(dir_path)
        
        if result:
            logger.info(f"Scan completed for: {dir_path}")
            json.dump(result, sys.stdout)
        else:
            logger.error(f"Failed to scan directory: {dir_path}")
            json.dump({"error": "Failed to scan directory"}, sys.stdout)

    except Exception as e:
        logger.error(f"Unhandled exception: {e}")
        json.dump({"error": f"Scanner error: {str(e)}"}, sys.stdout)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--dir', type=str, required=True)
    args = parser.parse_args()

    # Ensure stdout is using UTF-8 encoding
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)

    scan_directory(args.dir)
    sys.stdout.flush()