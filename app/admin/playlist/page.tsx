'use client';

import React, { useState, useEffect } from 'react';
import {
  Sun,
  CalendarDays,
  Type,
  Plus,
  Clock,
  ChevronDown,
  GripVertical,
  SlidersHorizontal,
  X,
  Cloud,
  CornerDownRight,
  Eye
} from 'lucide-react';
import { fetchPlaylist, updatePlaylist } from '@/app/actions';
import type { PlaylistItem } from '@/lib/playlist';

/*
  -------------------------------------------------------------------------
  FONTS & CONFIGURATION NOTE:
  For the best experience, this component relies on two Google Fonts:
  1. Serif: "Cormorant Garamond" (for headers)
  2. Mono: "JetBrains Mono" (for technical data)

  In a Next.js App Router project, you should configure these in layout.tsx
  or tailwind.config.js. For this standalone component, I have included
  a <style> tag to inject them for immediate preview.
  -------------------------------------------------------------------------
*/

// --- TYPES ---

type PluginType = 'weather' | 'calendar' | 'custom-text';

// --- HELPERS ---

/**
 * Calculates if a playlist item is currently active based on its schedule
 */
function isItemActive(item: PlaylistItem): boolean {
  if (item.scheduleMode !== 'fixed-time' || !item.startTime || !item.endTime) {
    return false;
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = item.startTime.split(':').map(Number);
  const [endHour, endMin] = item.endTime.split(':').map(Number);

  const startTimeInMinutes = startHour * 60 + startMin;
  const endTimeInMinutes = endHour * 60 + endMin;

  return currentTime >= startTimeInMinutes && currentTime <= endTimeInMinutes;
}

/**
 * Generates a unique ID for new playlist items
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- COMPONENT ---

export default function PlaylistManager() {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load playlist on mount
  useEffect(() => {
    async function loadPlaylist() {
      try {
        const data = await fetchPlaylist();
        setPlaylist(data);
      } catch (error) {
        console.error('Failed to load playlist:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPlaylist();
  }, []);

  // Helper: Save playlist to backend
  async function savePlaylistToBackend(items: PlaylistItem[]) {
    try {
      await updatePlaylist(items);
    } catch (error) {
      console.error('Failed to save playlist:', error);
    }
  }

  // Helper: Add a new weather plugin
  async function addWeatherPlugin() {
    const newItem: PlaylistItem = {
      id: generateId(),
      type: 'weather',
      title: 'Weather',
      subtitle: 'Coordinates: Not Set',
      scheduleMode: 'cycle',
      config: {
        location: '',
        latitude: null,
        longitude: null,
      },
      lastUpdated: 'Just now',
    };

    const updatedPlaylist = [...playlist, newItem];
    setPlaylist(updatedPlaylist);
    await savePlaylistToBackend(updatedPlaylist);
  }

  // Helper: Remove an item from the playlist
  async function removeItem(id: string) {
    const updatedPlaylist = playlist.filter(item => item.id !== id);
    setPlaylist(updatedPlaylist);
    await savePlaylistToBackend(updatedPlaylist);
  }

  // Helper: Render Icon based on type
  const renderPluginIcon = (type: PluginType, colorClass: string) => {
    switch (type) {
      case 'weather': return <Sun className={`w-5 h-5 ${colorClass} stroke-1`} />;
      case 'calendar': return <CalendarDays className={`w-5 h-5 ${colorClass} stroke-1`} />;
      case 'custom-text': return <Type className={`w-5 h-5 ${colorClass} stroke-1`} />;
      default: return <Sun className={`w-5 h-5 ${colorClass} stroke-1`} />;
    }
  };

  // Helper: Render Wireframe Preview
  const renderPreview = (type: PluginType, groupHoverClass: string) => {
    if (type === 'weather') {
      return (
        <div className="flex flex-col items-center gap-1">
          <Cloud className={`w-3 h-3 text-[#A8A29E] ${groupHoverClass}`} />
          <div className={`w-6 h-px bg-[#A8A29E] ${groupHoverClass.replace('text-', 'bg-')}`}></div>
        </div>
      );
    }
    if (type === 'calendar') {
      return (
         <div className="absolute inset-0 flex gap-0.5 justify-center py-2 px-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`w-px h-full bg-[#E7E5E4] ${groupHoverClass.replace('text-secondary', 'bg-[#0055FF]/20')}`}></div>
            ))}
         </div>
      );
    }
    return <span className="font-serif italic text-[8px] text-[#A8A29E]">Hello World</span>;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1C1917] p-6 md:p-12 font-sans selection:bg-[#FF3300] selection:text-white">

      {/* Injecting Fonts for standalone preview fidelity */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=JetBrains+Mono:wght@300;400;500&display=swap');
        .font-serif { font-family: 'Cormorant Garamond', serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      {/* OUTER FRAME */}
      <div className="max-w-5xl mx-auto relative min-h-[80vh] border-l border-r border-[#E7E5E4] md:px-12">

        {/* HEADER */}
        <header className="mb-16 pt-4">
          <div className="flex flex-col md:flex-row justify-between items-end border-b border-[#1C1917] pb-6 relative">
            {/* Decorative Notch */}
            <div className="absolute -bottom-[1px] left-0 w-12 h-[3px] bg-[#FF3300]"></div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#FF3300]"></span>
                <span className="font-mono text-[10px] tracking-[0.2em] text-[#A8A29E] uppercase block">
                  System // Config
                </span>
              </div>
              <h1 className="text-6xl font-serif font-light tracking-tight text-[#1C1917]">
                Playlist<span className="text-[#FF3300]">.</span>
              </h1>
            </div>

            <div className="flex gap-6 mt-6 md:mt-0">
              <button className="group flex items-center gap-2 text-xs font-mono tracking-widest hover:text-[#0055FF] transition-colors">
                [ + ADD GROUP ]
              </button>
              {/* Primary Action Button */}
              <button
                onClick={addWeatherPlugin}
                className="group flex items-center gap-2 text-xs font-mono tracking-widest bg-[#FF3300] text-white px-5 py-2 hover:bg-[#1C1917] transition-colors shadow-sm"
              >
                <Plus className="w-3 h-3" />
                ADD PLUGIN
              </button>
            </div>
          </div>
        </header>

        {/* TIMELINE CONTROLS */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">

            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-[#0055FF]" />
              <span className="uppercase tracking-widest font-bold text-[#0055FF]">
                Timeline Scope: All Day
              </span>
            </div>

            {/* Technical Inputs */}
            <div className="flex items-center gap-8 border-b border-[#E7E5E4] pb-2 md:border-none md:pb-0">

              <div className="flex items-center gap-3 group">
                <label className="text-[#A8A29E] uppercase group-hover:text-[#0055FF] transition-colors">Start</label>
                <div className="relative">
                  <select className="appearance-none bg-transparent border-b border-[#A8A29E] pr-6 py-1 focus:outline-none focus:border-[#0055FF] cursor-pointer font-medium text-[#1C1917]">
                    <option>00:00</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-0 top-1/2 -translate-y-1/2 text-[#A8A29E] pointer-events-none" />
                </div>
              </div>

              <span className="text-[#E7E5E4] hidden md:inline">—</span>

              <div className="flex items-center gap-3 group">
                <label className="text-[#A8A29E] uppercase group-hover:text-[#0055FF] transition-colors">End</label>
                <div className="relative">
                  <select className="appearance-none bg-transparent border-b border-[#A8A29E] pr-6 py-1 focus:outline-none focus:border-[#0055FF] cursor-pointer font-medium text-[#1C1917]">
                    <option>23:45</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-0 top-1/2 -translate-y-1/2 text-[#A8A29E] pointer-events-none" />
                </div>
              </div>

              <div className="w-px h-4 bg-[#E7E5E4] hidden md:block"></div>

              <div className="flex items-center gap-3 group">
                <label className="text-[#A8A29E] uppercase group-hover:text-[#0055FF] transition-colors">Cycle</label>
                <div className="relative">
                  <select className="appearance-none bg-transparent border-b border-[#A8A29E] pr-6 py-1 focus:outline-none focus:border-[#0055FF] cursor-pointer font-medium text-[#1C1917]">
                    <option>15m</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-0 top-1/2 -translate-y-1/2 text-[#A8A29E] pointer-events-none" />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* LIST HEADER */}
        <div className="grid grid-cols-12 gap-4 border-b border-[#1C1917]/10 pb-2 mb-4 font-mono text-[10px] text-[#A8A29E] uppercase tracking-widest px-4">
          <div className="col-span-1"></div> {/* Placeholder for drag handle */}
          <div className="col-span-1">No.</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-2">Preview</div>
          <div className="col-span-4">Description</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Settings</div>
        </div>

        {/* LIST CONTAINER */}
        <div className="flex flex-col space-y-3">
          {isLoading ? (
            <div className="text-center py-12 font-mono text-sm text-[#A8A29E]">
              Loading playlist...
            </div>
          ) : playlist.length === 0 ? (
            <div className="text-center py-12 font-mono text-sm text-[#A8A29E]">
              No plugins yet. Click "ADD PLUGIN" to get started.
            </div>
          ) : (
            playlist.map((item, index) => {
              const isActive = isItemActive(item);

            return (
              <div
                key={item.id}
                className={`
                  group relative bg-white transition-all duration-300 border
                  ${isActive
                    ? 'border-transparent hover:border-[#0055FF] shadow-sm hover:shadow-md'
                    : 'border-[#E7E5E4] hover:border-[#0055FF]'}
                `}
              >
                {/* Active Indicator: Orange Bar */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF3300]"></div>
                )}

                {/* Inactive Decorative Corner: Tech Triangle */}
                {!isActive && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-r-[6px] border-transparent group-hover:border-[#0055FF] transition-all"></div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 pl-6">

                  {/* Drag Handle (Left) */}
                  <div className="col-span-1">
                    <button className="cursor-grab hover:text-[#0055FF] text-[#A8A29E] transition-colors flex items-center justify-center p-1">
                      <GripVertical className="w-5 h-5 stroke-1" />
                    </button>
                  </div>

                  {/* Index */}
                  <div className={`col-span-1 font-mono text-xl font-bold ${isActive ? 'text-[#FF3300]' : 'text-[#A8A29E] group-hover:text-[#0055FF] transition-colors'}`}>
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  {/* Icon */}
                  <div className="col-span-1">
                    {renderPluginIcon(
                      item.type,
                      isActive
                        ? 'text-[#FF3300]'
                        : 'text-[#1C1917] group-hover:text-[#0055FF] transition-colors'
                    )}
                  </div>

                  {/* Wireframe Preview */}
                  <div className="col-span-2">
                    <div className="w-20 h-12 border border-[#E7E5E4] group-hover:border-[#0055FF]/30 flex items-center justify-center bg-[#FAFAF9] relative overflow-hidden">
                      {renderPreview(item.type, isActive ? 'text-[#FF3300]' : 'group-hover:text-[#0055FF]')}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-span-4">
                    <h3 className="font-serif text-2xl text-[#1C1917] leading-none mb-1 group-hover:text-[#0055FF] transition-colors">
                      {item.title}
                    </h3>
                    <p className="font-mono text-[10px] text-[#A8A29E] uppercase tracking-wider">
                      {item.subtitle}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    {isActive ? (
                      <div className="flex items-center gap-2 px-3 py-1 w-fit bg-[#FF3300]/5 border border-[#FF3300]/20 rounded-full">
                        <div className="w-1.5 h-1.5 bg-[#FF3300] rounded-full animate-pulse"></div>
                        <span className="font-mono text-[10px] uppercase text-[#FF3300] font-bold">Broadcasting</span>
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] text-[#A8A29E] border-b border-[#A8A29E] pb-0.5">
                        Updated {item.lastUpdated}
                      </span>
                    )}
                  </div>

                  {/* Settings Actions */}
                  <div className="col-span-1 flex justify-end gap-3 text-[#A8A29E]">
                    <button className="hover:text-[#0055FF] transition-colors">
                      <SlidersHorizontal className="w-4 h-4 stroke-1" />
                    </button>
                    {isActive && (
                       <button className="hover:text-[#0055FF] transition-colors">
                          <Eye className="w-4 h-4 stroke-1" />
                       </button>
                    )}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="hover:text-[#FF3300] transition-colors"
                    >
                      <X className="w-4 h-4 stroke-1" />
                    </button>
                  </div>

                </div>
              </div>
            );
          }))}
        </div>

        {/* FOOTER / SMART RULES */}
        <div className="mt-12 border-t border-[#E7E5E4] pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1 border border-[#E7E5E4] rounded">
                <CornerDownRight className="w-3 h-3 text-[#0055FF]" />
              </div>
              <h4 className="font-serif text-lg text-[#1C1917] italic">Smart Rules</h4>
            </div>

            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] uppercase text-[#A8A29E] tracking-widest">
                Action when Stagnant:
              </span>
              <button className="group font-mono text-xs border border-[#E7E5E4] px-3 py-1 hover:border-[#0055FF] transition-colors flex items-center gap-2 bg-white">
                <span className="group-hover:text-[#0055FF]">NEVER SKIP</span>
                <ChevronDown className="w-3 h-3 text-[#A8A29E] group-hover:text-[#0055FF]" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
