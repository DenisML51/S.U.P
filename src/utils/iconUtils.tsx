import React from 'react';
import * as LucideIcons from 'lucide-react';

export const CUSTOM_ICONS: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  'Pentagram': (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2L9 9H2L8 14L5 21L12 17L19 21L16 14L22 9H15L12 2Z" />
    </svg>
  ),
  'BookMagic': (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M12 6v6" />
      <path d="M9 9h6" />
    </svg>
  ),
};

export const getLucideIcon = (iconName: string, props?: any) => {
  const CustomIcon = CUSTOM_ICONS[iconName];
  if (CustomIcon) {
    const size = props?.size || 24;
    return <CustomIcon width={size} height={size} {...props} />;
  }

  const Icon = (LucideIcons as any)[iconName];
  if (!Icon) {
    return <LucideIcons.Circle {...props} />;
  }
  return <Icon {...props} />;
};

export const LUCIDE_PICKER_ICONS = [
  'Zap', 'Flame', 'Sparkles', 'Star', 'Sword', 'Shield', 'Swords', 'Axe', 
  'Heart', 'Brain', 'Eye', 'Droplet', 'Target', 'Activity', 'Circle', 
  'Square', 'Triangle', 'Diamond', 'Hexagon', 'Feather', 'Wind', 'CloudRain', 
  'Sun', 'Moon', 'CloudLightning', 'Snowflake', 'Skull', 'Ghost', 'Wand2', 
  'Gem', 'Crown', 'Bookmark', 'FlaskConical', 'FlaskRound', 'Scroll', 'Component', 
  'Dna', 'Magnet', 'Microscope', 'Palette', 'Backpack', 'Coins', 'Hammer', 
  'Key', 'Map', 'Music', 'Search', 'Settings', 'Tool', 'Trash2', 'User', 
  'Wand', 'Anchor', 'Beer', 'Bell', 'Book', 'Box', 'Briefcase', 'Camera', 
  'Clock', 'Coffee', 'Compass', 'CupSoda', 'Dice5', 'Egg', 'Fish', 'GlassWater', 
  'GripHorizontal', 'Home', 'Image', 'Info', 'Leaf', 'Link', 'Lock', 'Mail', 
  'MapPin', 'Menu', 'MessageSquare', 'Mic', 'MoonStar', 'Mountain', 'Navigation', 
  'Package', 'Paperclip', 'Phone', 'Play', 'Power', 'Printer', 'Puzzle', 'Radio', 
  'RefreshCw', 'Scissors', 'Share2', 'ShoppingBag', 'ShoppingCart', 'Smile', 
  'Speaker', 'SunMedium', 'Table', 'Tag', 'Terminal', 'ThumbsUp', 'Ticket', 
  'Timer', 'Truck', 'Tv', 'Umbrella', 'Unlock', 'Upload', 'Video', 'Volume2', 
  'Watch', 'Wifi', 'Wine', 'X', 'ZapOff'
];

export const CUSTOM_PICKER_ICONS = Object.keys(CUSTOM_ICONS);
export const ALL_AVAILABLE_ICONS = [...CUSTOM_PICKER_ICONS, ...LUCIDE_PICKER_ICONS];
