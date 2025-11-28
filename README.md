# Carbon

A Next.js-based e-ink display management system with a dynamic playlist manager for rotating content.

## Features

- **Playlist Manager**: Web-based UI to manage and schedule display content
- **Plugin System**: Support for multiple content types (Weather, Calendar, Custom Text)
- **Smart Scheduling**: Fixed-time scheduling and cycle modes for content rotation
- **E-ink Optimization**: Screenshot rendering with dithering for e-ink displays
- **JSON Storage**: Simple file-based persistence for playlist data

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 with Tailwind CSS
- **Rendering**: Puppeteer + Sharp for e-ink image processing
- **Icons**: Lucide React
- **Storage**: JSON file-based storage

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
carbon/
├── app/
│   ├── actions.ts              # Server actions for playlist management
│   ├── admin/
│   │   └── playlist/
│   │       └── page.tsx        # Playlist manager UI
│   ├── api/
│   │   └── render/
│   │       └── route.ts        # E-ink rendering endpoint
│   └── screens/
│       └── weather/            # Content display screens
├── lib/
│   ├── playlist.ts             # Playlist storage logic
│   └── ipma.ts                 # Weather integration
├── data/
│   └── playlist.json           # Playlist data storage
└── public/                     # Static assets
```

## Usage

### Playlist Manager

Navigate to `/admin/playlist` to:
- Add new content plugins
- Configure scheduling (cycle or fixed-time)
- Reorder and manage active content
- Remove plugins

### Content Types

**Weather**: Display weather information with coordinates
- Configurable location and coordinates
- Integration with weather APIs

**Calendar**: Show year progress or date information
- Configurable target year

**Custom Text**: Display custom messages
- Fully customizable text content

### Rendering API

The `/api/render` endpoint generates optimized e-ink images:

```
GET /api/render?screen=weather&humidity=65
```

Returns a dithered black & white PNG optimized for e-ink displays (800x480).

## Data Storage

Playlist data is stored in `data/playlist.json`. The file is automatically created on first run with sample data.

### Playlist Item Structure

```json
{
  "id": "unique-id",
  "type": "weather|calendar|custom-text",
  "title": "Display Title",
  "subtitle": "Description",
  "scheduleMode": "cycle|fixed-time",
  "startTime": "08:00",
  "endTime": "09:00",
  "config": {},
  "lastUpdated": "timestamp"
}
```

## Configuration

### Fonts

The playlist manager uses Google Fonts:
- **Serif**: Cormorant Garamond (headers)
- **Mono**: JetBrains Mono (technical data)

These are loaded via CDN in the component. For production, consider importing them in `layout.tsx`.

### E-ink Display Settings

Default viewport: 800x480px
Configured in `/app/api/render/route.ts`

## Contributing

This is a personal project. Feel free to fork and customize for your own use.

## License

Private project - all rights reserved.
