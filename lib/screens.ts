import type { ElementType } from 'react';
import { Sun, CalendarDays, Type, Square, Image, Cpu, Smile, Server, Quote, Youtube, MapPin } from 'lucide-react';

export type ScreenType =
  | 'weather'
  | 'calendar'
  | 'custom-text'
  | 'logo'
  | 'image'
  | 'system'
  | 'comic'
  | 'servers'
  | 'quote'
  | 'youtube'
  | 'journey';

export interface ScreenDefinition {
  type: ScreenType;
  title: string;
  description: string;
  icon: ElementType;
  defaultConfig: Record<string, unknown>;
  defaultDuration: number;
  defaultSubtitle: string;
}

export const SCREENS: ScreenDefinition[] = [
  {
    type: 'weather',
    title: 'Weather',
    description: 'Display current weather conditions',
    icon: Sun,
    defaultConfig: { viewMode: 'current' },
    defaultDuration: 15,
    defaultSubtitle: 'Current Conditions',
  },
  {
    type: 'calendar',
    title: 'Calendar',
    description: 'Show upcoming events from iCal',
    icon: CalendarDays,
    defaultConfig: { viewMode: 'daily' },
    defaultDuration: 15,
    defaultSubtitle: 'Daily',
  },
  {
    type: 'custom-text',
    title: 'Custom Text',
    description: 'Display custom text message',
    icon: Type,
    defaultConfig: { text: '' },
    defaultDuration: 15,
    defaultSubtitle: 'No message set',
  },
  {
    type: 'system',
    title: 'System Status',
    description: 'CPU, RAM, and Disk usage stats',
    icon: Cpu,
    defaultConfig: {},
    defaultDuration: 15,
    defaultSubtitle: 'CPU, RAM, Disk',
  },
  {
    type: 'servers',
    title: 'Infrastructure',
    description: 'Carbon Node & UGREEN NAS Status',
    icon: Server,
    defaultConfig: {},
    defaultDuration: 15,
    defaultSubtitle: 'Carbon Node & UGREEN NAS',
  },
  {
    type: 'comic',
    title: 'The New Yorker',
    description: 'Daily Cartoon from The New Yorker',
    icon: Smile,
    defaultConfig: {},
    defaultDuration: 15,
    defaultSubtitle: 'Daily Cartoon',
  },
  {
    type: 'logo',
    title: 'Carbon Logo',
    description: 'Display Carbon branding',
    icon: Square,
    defaultConfig: { fontSize: '120' },
    defaultDuration: 15,
    defaultSubtitle: 'Branding',
  },
  {
    type: 'image',
    title: 'Image',
    description: 'Display a custom image',
    icon: Image,
    defaultConfig: { url: '', fit: 'contain', grayscale: false },
    defaultDuration: 15,
    defaultSubtitle: 'No image set',
  },
  {
    type: 'quote',
    title: 'Daily Quote',
    description: 'Daily curated quote',
    icon: Quote,
    defaultConfig: {},
    defaultDuration: 15,
    defaultSubtitle: 'Curated quote of the day',
  },
  {
    type: 'youtube',
    title: 'YouTube Analytics',
    description: 'Channel stats, latest video & growth',
    icon: Youtube,
    defaultConfig: {},
    defaultDuration: 15,
    defaultSubtitle: 'Channel stats & latest video',
  },
  {
    type: 'journey',
    title: "Sophie's Journey",
    description: 'Daily translated Instagram post',
    icon: MapPin,
    defaultConfig: {},
    defaultDuration: 30,
    defaultSubtitle: 'Daily translated Instagram post',
  },
];

export function getScreen(type: ScreenType): ScreenDefinition {
  return SCREENS.find((s) => s.type === type)!;
}
