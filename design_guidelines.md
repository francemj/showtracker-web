# TV Show Tracking Application - Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from TV Time and Trakt.tv's clean show cataloging interfaces, combined with modern streaming service aesthetics (Netflix, Disney+). Focus on visual-rich content with prominent show posters and intuitive progress tracking.

## Color Palette (User-Specified)
- Primary: #6366F1 (indigo)
- Secondary: #8B5CF6 (purple)
- Background: #F8FAFC (light grey)
- Text: #1E293B (dark slate)
- Accent: #10B981 (emerald)
- Card Background: #FFFFFF (white)

## Typography
- **Headings**: Poppins (600-700 weight)
  - H1: text-4xl/text-5xl
  - H2: text-3xl
  - H3: text-2xl
  - H4: text-xl
- **Body**: Inter (400-500 weight)
  - Body text: text-base
  - Small text: text-sm
  - Captions: text-xs

## Layout System
**Spacing Units**: Use Tailwind spacing of 2, 4, 6, 8, 12, and 16 for consistency
- Container max-width: max-w-7xl
- Section padding: py-8 to py-16
- Card padding: p-4 to p-6
- Grid gaps: gap-4 to gap-6

## Core Components

### Navigation
**Sidebar Navigation** (fixed left side, desktop)
- Width: w-64
- Dark overlay with slight transparency
- Logo at top (p-6)
- Navigation items with icons (Lucide React)
- Active state: indigo background with rounded corners
- Mobile: Collapsible hamburger menu

### Dashboard/Home Page
**Hero Section** (no traditional hero needed)
- Jump directly into "Continue Watching" carousel
- Horizontal scrolling cards showing in-progress shows
- Large show posters (16:9 aspect ratio) with overlay progress bars
- Show title and next episode info on hover

**Three-Column Grid Layout**:
- "Currently Watching" - 3 columns on desktop, 1 on mobile
- "Want to Watch" - 3 columns
- "Completed" - 3 columns

### Show Cards
- Poster image (2:3 aspect ratio) as primary visual
- Rounded corners (rounded-lg)
- Shadow on hover (hover:shadow-xl transition)
- Overlay gradient on hover showing quick actions
- Progress bar at bottom (emerald accent color)
- Episode count badge (top-right corner)

### Search Interface
- Prominent search bar at page top (sticky)
- Full-width with rounded-full styling
- Live search results dropdown
- Result cards showing poster thumbnail, title, year, rating
- "Add to Collection" button with category selector dropdown

### Show Detail Page
**Layout**:
- Left column (1/3): Large poster, primary actions ("Mark Watched", category selector)
- Right column (2/3): Show information, season/episode grid

**Season/Episode List**:
- Accordion-style season sections
- Episode grid: 2 columns on desktop showing episode thumbnail, title, air date
- Checkbox for watched status
- Progress indicator showing completion percentage per season

### Progress Tracking Elements
- **Episode Progress Bars**: Height h-2, rounded-full, emerald accent
- **Season Completion**: Circular progress indicators
- **Show Statistics**: Card-based metrics (Total Shows, Episodes Watched, Hours Watched)

## Component Patterns

### Cards
- White background with subtle shadow (shadow-md)
- Border radius: rounded-lg
- Padding: p-4 or p-6
- Hover state: shadow-lg with subtle scale (hover:scale-105)

### Buttons
- Primary: indigo background, white text, rounded-lg, px-6 py-3
- Secondary: purple background with same styling
- Ghost: transparent with indigo text and border
- Icon buttons: rounded-full, p-2, hover background change

### Forms
- Input fields: rounded-lg, border with focus ring in indigo
- Labels: text-sm font-medium in dark slate
- Dropdowns: Custom styled with Lucide chevrons / checkmarks

## Grid Systems
- Show grids: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6`
- Dashboard sections: `grid grid-cols-1 lg:grid-cols-3 gap-8`
- Episode lists: `grid grid-cols-1 md:grid-cols-2 gap-4`

## Images
**Show Posters**: Critical throughout the application
- Display prominently in all show cards (2:3 aspect ratio)
- Source from TMDB API
- Fallback placeholder for missing posters
- Lazy loading implementation

**Episode Thumbnails**: In show detail pages
- 16:9 aspect ratio
- Smaller scale in episode lists

## Interactions
- Smooth transitions (transition-all duration-200)
- Hover effects on cards (shadow and subtle scale)
- Progress bars animate on update
- Skeleton loaders for async content

## Responsive Behavior
- Desktop (lg+): Sidebar visible, multi-column grids
- Tablet (md): 2-column grids, collapsible sidebar
- Mobile: Single column, bottom navigation alternative, stack all sections

## Key User Flows
1. **Adding Shows**: Search → Preview card → Select category → Add with animation
2. **Tracking Progress**: Show detail → Episode list → Quick checkbox toggle OR batch season completion
3. **Import**: Upload CSV → Review matches → Confirm import → Shows added to collection

This design creates a visually-rich, poster-forward experience that makes browsing and managing a TV show collection engaging while maintaining clean information hierarchy and efficient progress tracking.