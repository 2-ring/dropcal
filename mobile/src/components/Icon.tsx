import React from 'react';
import { ViewStyle } from 'react-native';
import {
  Feather,
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
  AntDesign,
} from '@expo/vector-icons';

/**
 * Phosphor icon names used in the web app
 */
export type PhosphorIconName =
  // Navigation & UI
  | 'Sidebar'
  | 'SidebarSimple'
  | 'X'
  | 'CaretDown'
  | 'CaretUp'
  | 'CaretLeft'
  | 'CaretRight'
  | 'CaretCircleRight'
  | 'ArrowSquareOut'
  | 'ArrowSquareUpRight'
  | 'ArrowsClockwise'
  | 'ArrowFatUp'
  | 'ArrowLeft'
  | 'Equals'
  // Calendar & Time
  | 'Calendar'
  | 'CalendarBlank'
  | 'CalendarStar'
  | 'Clock'
  // Communication & Social
  | 'Envelope'
  | 'ChatCircle'
  | 'ChatCircleDots'
  | 'PaperPlaneTilt'
  | 'Mailbox'
  | 'HandWaving'
  // Location & Maps
  | 'MapPin'
  | 'Globe'
  // Files & Documents
  | 'Files'
  | 'File'
  | 'BookOpenText'
  | 'ClipboardText'
  | 'Pen'
  | 'TextAlignLeft'
  // Media
  | 'Images'
  | 'Image'
  | 'Microphone'
  // User & Auth
  | 'User'
  | 'SignIn'
  | 'SignOut'
  | 'FingerprintSimple'
  // Status & Indicators
  | 'Check'
  | 'CheckFat'
  | 'Warning'
  | 'Info'
  | 'FirstAid'
  | 'Bell'
  // Branding
  | 'GoogleLogo'
  | 'MicrosoftOutlookLogo'
  | 'AppleLogo'
  // Other
  | 'Link'
  | 'Lifebuoy'
  | 'ShootingStar'
  | 'GraduationCap'
  | 'Binoculars'
  | 'PaintBrush'
  | 'Sparkle'
  // Month Icons
  | 'Snowflake'
  | 'Heart'
  | 'Plant'
  | 'FlowerTulip'
  | 'Flower'
  | 'Sun'
  | 'Waves'
  | 'Leaf'
  | 'Ghost'
  | 'Coffee'
  | 'Tree'
  // Additional icons
  | 'Moon'
  | 'Home'
  | 'Settings'
  | 'Question';

export interface IconProps {
  /** Icon name from Phosphor Icons */
  name: PhosphorIconName;
  /** Icon size in pixels */
  size?: number;
  /** Icon color */
  color?: string;
  /** Icon weight/style (not all weights supported in React Native) */
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  /** Custom style */
  style?: ViewStyle;
}

/**
 * Icon component that maps Phosphor icon names to @expo/vector-icons
 * Provides a consistent interface for icons across the mobile app
 */
export function Icon({
  name,
  size = 24,
  color = '#000000',
  weight = 'regular',
  style,
}: IconProps) {
  // Map Phosphor icons to @expo/vector-icons
  // Using Feather, MaterialCommunityIcons, Ionicons, and FontAwesome5
  const iconMap: Record<
    PhosphorIconName,
    { family: 'Feather' | 'MaterialCommunityIcons' | 'Ionicons' | 'FontAwesome5' | 'AntDesign'; name: string }
  > = {
    // Navigation & UI
    Sidebar: { family: 'Feather', name: 'sidebar' },
    SidebarSimple: { family: 'Feather', name: 'sidebar' },
    X: { family: 'Feather', name: 'x' },
    CaretDown: { family: 'Feather', name: 'chevron-down' },
    CaretUp: { family: 'Feather', name: 'chevron-up' },
    CaretLeft: { family: 'Feather', name: 'chevron-left' },
    CaretRight: { family: 'Feather', name: 'chevron-right' },
    CaretCircleRight: { family: 'Ionicons', name: 'chevron-forward-circle-outline' },
    ArrowSquareOut: { family: 'Feather', name: 'external-link' },
    ArrowSquareUpRight: { family: 'Feather', name: 'external-link' },
    ArrowsClockwise: { family: 'Feather', name: 'refresh-cw' },
    ArrowFatUp: { family: 'Feather', name: 'arrow-up' },
    ArrowLeft: { family: 'Feather', name: 'arrow-left' },
    Equals: { family: 'Feather', name: 'minus' },

    // Calendar & Time
    Calendar: { family: 'Feather', name: 'calendar' },
    CalendarBlank: { family: 'Feather', name: 'calendar' },
    CalendarStar: { family: 'MaterialCommunityIcons', name: 'calendar-star' },
    Clock: { family: 'Feather', name: 'clock' },

    // Communication & Social
    Envelope: { family: 'Feather', name: 'mail' },
    ChatCircle: { family: 'Ionicons', name: 'chatbubble-outline' },
    ChatCircleDots: { family: 'Ionicons', name: 'chatbubbles-outline' },
    PaperPlaneTilt: { family: 'Feather', name: 'send' },
    Mailbox: { family: 'MaterialCommunityIcons', name: 'mailbox' },
    HandWaving: { family: 'MaterialCommunityIcons', name: 'hand-wave' },

    // Location & Maps
    MapPin: { family: 'Feather', name: 'map-pin' },
    Globe: { family: 'Feather', name: 'globe' },

    // Files & Documents
    Files: { family: 'Feather', name: 'file-text' },
    File: { family: 'Feather', name: 'file' },
    BookOpenText: { family: 'Feather', name: 'book-open' },
    ClipboardText: { family: 'Feather', name: 'clipboard' },
    Pen: { family: 'Feather', name: 'edit-3' },
    TextAlignLeft: { family: 'Feather', name: 'align-left' },

    // Media
    Images: { family: 'Feather', name: 'image' },
    Image: { family: 'Feather', name: 'image' },
    Microphone: { family: 'Feather', name: 'mic' },

    // User & Auth
    User: { family: 'Feather', name: 'user' },
    SignIn: { family: 'Feather', name: 'log-in' },
    SignOut: { family: 'Feather', name: 'log-out' },
    FingerprintSimple: { family: 'MaterialCommunityIcons', name: 'fingerprint' },

    // Status & Indicators
    Check: { family: 'Feather', name: 'check' },
    CheckFat: { family: 'Feather', name: 'check-circle' },
    Warning: { family: 'Feather', name: 'alert-triangle' },
    Info: { family: 'Feather', name: 'info' },
    FirstAid: { family: 'MaterialCommunityIcons', name: 'medical-bag' },
    Bell: { family: 'Feather', name: 'bell' },

    // Branding
    GoogleLogo: { family: 'AntDesign', name: 'google' },
    MicrosoftOutlookLogo: { family: 'MaterialCommunityIcons', name: 'microsoft-outlook' },
    AppleLogo: { family: 'AntDesign', name: 'apple1' },

    // Other
    Link: { family: 'Feather', name: 'link' },
    Lifebuoy: { family: 'Feather', name: 'life-buoy' },
    ShootingStar: { family: 'MaterialCommunityIcons', name: 'star-shooting' },
    GraduationCap: { family: 'Ionicons', name: 'school-outline' },
    Binoculars: { family: 'MaterialCommunityIcons', name: 'binoculars' },
    PaintBrush: { family: 'MaterialCommunityIcons', name: 'brush' },
    Sparkle: { family: 'Ionicons', name: 'sparkles-outline' },

    // Month Icons
    Snowflake: { family: 'Ionicons', name: 'snow-outline' },
    Heart: { family: 'Feather', name: 'heart' },
    Plant: { family: 'MaterialCommunityIcons', name: 'sprout' },
    FlowerTulip: { family: 'MaterialCommunityIcons', name: 'flower-tulip' },
    Flower: { family: 'MaterialCommunityIcons', name: 'flower' },
    Sun: { family: 'Feather', name: 'sun' },
    Waves: { family: 'MaterialCommunityIcons', name: 'waves' },
    Leaf: { family: 'Ionicons', name: 'leaf-outline' },
    Ghost: { family: 'Ionicons', name: 'logo-ghost' },
    Coffee: { family: 'Feather', name: 'coffee' },
    Tree: { family: 'MaterialCommunityIcons', name: 'pine-tree' },

    // Additional icons
    Moon: { family: 'Feather', name: 'moon' },
    Home: { family: 'Feather', name: 'home' },
    Settings: { family: 'Feather', name: 'settings' },
    Question: { family: 'Feather', name: 'help-circle' },
  };

  const iconConfig = iconMap[name];

  if (!iconConfig) {
    console.warn(`Icon "${name}" not found in icon map`);
    return null;
  }

  const { family, name: iconName } = iconConfig;

  // Render the appropriate icon component
  switch (family) {
    case 'Feather':
      return <Feather name={iconName as any} size={size} color={color} style={style} />;
    case 'MaterialCommunityIcons':
      return <MaterialCommunityIcons name={iconName as any} size={size} color={color} style={style} />;
    case 'Ionicons':
      return <Ionicons name={iconName as any} size={size} color={color} style={style} />;
    case 'FontAwesome5':
      return <FontAwesome5 name={iconName as any} size={size} color={color} style={style} />;
    case 'AntDesign':
      return <AntDesign name={iconName as any} size={size} color={color} style={style} />;
    default:
      return null;
  }
}
