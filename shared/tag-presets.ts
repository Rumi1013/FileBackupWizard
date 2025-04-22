/**
 * Midnight Magnolia - Preset Tag Collections
 * 
 * This file contains predefined tag collections based on organizational structures
 * from common spreadsheet templates and Midnight Magnolia's specific needs.
 * These presets help users quickly apply consistent tagging across multiple files.
 */

export interface PresetTag {
  name: string;
  emoji: string;
  color: string;
  description: string;
}

export interface TagPreset {
  id: string;
  name: string;
  description: string;
  tags: PresetTag[];
}

/**
 * Midnight Magnolia brand colors
 */
export const brandColors = {
  midnightBlue: '#0A192F',
  midnightTeal: '#0A3B4D',
  magnoliaWhite: '#FAF3E0',
  richGold: '#D4AF37',
  sageGreen: '#A3B18A',
};

/**
 * Predefined tag presets for various content categories
 */
export const tagPresets: TagPreset[] = [
  {
    id: 'content-status',
    name: 'Content Status',
    description: 'Tags for tracking the production status of content',
    tags: [
      {
        name: 'Draft',
        emoji: '📝',
        color: brandColors.midnightTeal,
        description: 'Content is in draft form and needs refinement'
      },
      {
        name: 'In Review',
        emoji: '🔍',
        color: brandColors.sageGreen,
        description: 'Content is being reviewed by team members'
      },
      {
        name: 'Approved',
        emoji: '✅',
        color: brandColors.richGold,
        description: 'Content has been approved and is ready for use'
      },
      {
        name: 'Published',
        emoji: '🌟',
        color: brandColors.midnightBlue,
        description: 'Content has been published and is live'
      },
      {
        name: 'Needs Update',
        emoji: '🔄',
        color: brandColors.richGold,
        description: 'Content needs to be updated or refreshed'
      }
    ]
  },
  {
    id: 'monetization',
    name: 'Monetization Potential',
    description: 'Tags for indicating monetization potential of content',
    tags: [
      {
        name: 'High Value',
        emoji: '💰',
        color: brandColors.richGold,
        description: 'Content with direct high revenue potential'
      },
      {
        name: 'Growth Asset',
        emoji: '📈',
        color: brandColors.sageGreen,
        description: 'Content that drives growth or audience building'
      },
      {
        name: 'Lead Magnet',
        emoji: '🧲',
        color: brandColors.midnightTeal,
        description: 'Content designed to attract new audience members'
      },
      {
        name: 'Brand Building',
        emoji: '🏛️',
        color: brandColors.midnightBlue,
        description: 'Content that strengthens brand identity'
      },
      {
        name: 'Freemium',
        emoji: '🎁',
        color: brandColors.magnoliaWhite,
        description: 'Free content that supports premium offerings'
      }
    ]
  },
  {
    id: 'content-type',
    name: 'Content Type',
    description: 'Tags for categorizing different types of content',
    tags: [
      {
        name: 'Blog Post',
        emoji: '📄',
        color: brandColors.midnightTeal,
        description: 'Written blog content'
      },
      {
        name: 'Video',
        emoji: '🎥',
        color: brandColors.midnightBlue,
        description: 'Video content for YouTube or other platforms'
      },
      {
        name: 'Podcast',
        emoji: '🎙️',
        color: brandColors.richGold,
        description: 'Audio podcast episodes or segments'
      },
      {
        name: 'E-Book',
        emoji: '📚',
        color: brandColors.sageGreen,
        description: 'Longer-form downloadable book content'
      },
      {
        name: 'Social Post',
        emoji: '📱',
        color: brandColors.magnoliaWhite,
        description: 'Content for social media platforms'
      },
      {
        name: 'Template',
        emoji: '📋',
        color: brandColors.midnightTeal,
        description: 'Reusable templates for various purposes'
      }
    ]
  },
  {
    id: 'business-planning',
    name: 'Business Planning',
    description: 'Tags for business planning and strategy documents',
    tags: [
      {
        name: 'Strategy',
        emoji: '🎯',
        color: brandColors.midnightBlue,
        description: 'Strategic planning documents'
      },
      {
        name: 'Finance',
        emoji: '💵',
        color: brandColors.richGold,
        description: 'Financial plans, budgets, and projections'
      },
      {
        name: 'Marketing',
        emoji: '📣',
        color: brandColors.sageGreen,
        description: 'Marketing plans and campaign documents'
      },
      {
        name: 'Operations',
        emoji: '⚙️',
        color: brandColors.midnightTeal,
        description: 'Operational plans and processes'
      },
      {
        name: 'Research',
        emoji: '🔬',
        color: brandColors.magnoliaWhite,
        description: 'Market research and competitive analysis'
      }
    ]
  },
  {
    id: 'event-planning',
    name: 'Event Planning',
    description: 'Tags for event planning documents and assets',
    tags: [
      {
        name: 'Schedule',
        emoji: '🗓️',
        color: brandColors.midnightBlue,
        description: 'Event schedules and timelines'
      },
      {
        name: 'Vendor',
        emoji: '🤝',
        color: brandColors.richGold,
        description: 'Vendor contracts and information'
      },
      {
        name: 'Venue',
        emoji: '🏢',
        color: brandColors.midnightTeal,
        description: 'Venue details and floor plans'
      },
      {
        name: 'Marketing',
        emoji: '📣',
        color: brandColors.sageGreen,
        description: 'Event marketing and promotion materials'
      },
      {
        name: 'Budget',
        emoji: '💵',
        color: brandColors.magnoliaWhite,
        description: 'Event budget and financial tracking'
      }
    ]
  },
  {
    id: 'portfolio-management',
    name: 'Portfolio Management',
    description: 'Tags for managing creative and project portfolios',
    tags: [
      {
        name: 'Client Work',
        emoji: '👥',
        color: brandColors.midnightBlue,
        description: 'Work done for specific clients'
      },
      {
        name: 'Personal Project',
        emoji: '💫',
        color: brandColors.sageGreen,
        description: 'Personal creative projects'
      },
      {
        name: 'Case Study',
        emoji: '📊',
        color: brandColors.richGold,
        description: 'Case studies of past work'
      },
      {
        name: 'Portfolio Piece',
        emoji: '🌟',
        color: brandColors.midnightTeal,
        description: 'Highlighted pieces for portfolio showcase'
      },
      {
        name: 'Archive',
        emoji: '🗄️',
        color: brandColors.magnoliaWhite,
        description: 'Past work archived for reference'
      }
    ]
  },
  {
    id: 'adhd-organization',
    name: 'ADHD-Friendly Organization',
    description: 'Tags designed specifically for ADHD-friendly file organization',
    tags: [
      {
        name: 'Need Today',
        emoji: '⚡',
        color: brandColors.richGold,
        description: 'Files that need immediate attention today'
      },
      {
        name: 'Quick Win',
        emoji: '🏆',
        color: brandColors.sageGreen,
        description: 'Tasks that can be completed quickly for momentum'
      },
      {
        name: 'Focus Time',
        emoji: '🧠',
        color: brandColors.midnightTeal,
        description: 'Requires dedicated focus time to work on'
      },
      {
        name: 'Revisit Later',
        emoji: '⏰',
        color: brandColors.midnightBlue,
        description: 'Set aside to revisit at a specified later time'
      },
      {
        name: 'Overwhelm Risk',
        emoji: '🌊',
        color: brandColors.magnoliaWhite,
        description: 'Content that may cause overwhelm - approach with care'
      }
    ]
  },
  {
    id: 'vendor-management',
    name: 'Vendor Management',
    description: 'Tags for organizing vendor documents and relationships',
    tags: [
      {
        name: 'Contract',
        emoji: '📜',
        color: brandColors.midnightBlue,
        description: 'Vendor contracts and agreements'
      },
      {
        name: 'Invoice',
        emoji: '💼',
        color: brandColors.richGold,
        description: 'Invoices and payment information'
      },
      {
        name: 'Active Vendor',
        emoji: '✅',
        color: brandColors.sageGreen,
        description: 'Currently active vendor relationship'
      },
      {
        name: 'Potential Vendor',
        emoji: '🔍',
        color: brandColors.midnightTeal,
        description: 'Potential vendors being considered'
      },
      {
        name: 'Past Vendor',
        emoji: '🗓️',
        color: brandColors.magnoliaWhite,
        description: 'Past vendor relationships for reference'
      }
    ]
  },
  {
    id: 'brand-asset-management',
    name: 'Brand Asset Management',
    description: 'Tags for managing brand assets and guidelines',
    tags: [
      {
        name: 'Logo',
        emoji: '🎨',
        color: brandColors.midnightBlue,
        description: 'Logo files in various formats'
      },
      {
        name: 'Typography',
        emoji: '🔤',
        color: brandColors.richGold,
        description: 'Typography assets and font files'
      },
      {
        name: 'Color Palette',
        emoji: '🎭',
        color: brandColors.sageGreen,
        description: 'Brand color palette specifications'
      },
      {
        name: 'Template',
        emoji: '📋',
        color: brandColors.midnightTeal,
        description: 'Brand templates for various uses'
      },
      {
        name: 'Brand Guide',
        emoji: '📘',
        color: brandColors.magnoliaWhite,
        description: 'Official brand guidelines and manuals'
      }
    ]
  }
];

/**
 * Get all tags from all presets as a flat array
 */
export function getAllPresetTags(): PresetTag[] {
  return tagPresets.flatMap(preset => preset.tags);
}

/**
 * Get a specific preset by ID
 */
export function getPresetById(presetId: string): TagPreset | undefined {
  return tagPresets.find(preset => preset.id === presetId);
}