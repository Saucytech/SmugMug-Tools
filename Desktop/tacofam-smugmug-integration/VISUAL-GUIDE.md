# 🎨 TacoFam SmugMug Integration - Visual Guide

## 📸 What You'll See

### 1. Landing Page (Before Auth)
```
┌────────────────────────────────────────────────┐
│                                                │
│              📷 [Icon]                        │
│                                                │
│    TacoFam SmugMug Integration                │
│                                                │
│  Connect your SmugMug account to browse       │
│  albums and select photos for your            │
│  TacoFam articles                             │
│                                                │
│     ┌──────────────────────────┐              │
│     │ Connect SmugMug Account  │              │
│     └──────────────────────────┘              │
│                                                │
│  Don't have an API key yet? Apply here        │
│                                                │
└────────────────────────────────────────────────┘
```

### 2. Albums Grid View
```
┌────────────────────────────────────────────────────────┐
│  SmugMug Photo Browser              [Logout Button]    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Your Albums                    [Load Albums Button]  │
│                                                        │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐             │
│  │ 📁   │  │ 📁   │  │ 📁   │  │ 📁   │             │
│  │Family│  │Travel│  │Food  │  │Events│             │
│  │24 ph.│  │156ph.│  │89 ph.│  │45 ph.│             │
│  └──────┘  └──────┘  └──────┘  └──────┘             │
│                                                        │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐             │
│  │ 📁   │  │ 📁   │  │ 📁   │  │ 📁   │             │
│  │Tacos │  │Street│  │Mexico│  │Recipe│             │
│  │142ph.│  │67 ph.│  │234ph.│  │56 ph.│             │
│  └──────┘  └──────┘  └──────┘  └──────┘             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 3. Photo Selection View
```
┌──────────────────────────────────────────────────────────────┐
│  ← Back to Albums                                            │
│                                                              │
│  Tacos                                [Export 5 Selected]   │
│  5 selected                          [Download JSON]        │
│                                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐         │
│  │ 🖼️  │ │ 🖼️  │ │ 🖼️  │ │ 🖼️  │ │ 🖼️  │ │ 🖼️  │         │
│  │ ✓   │ │ ✓   │ │     │ │     │ │ ✓   │ │     │         │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘         │
│  photo1  photo2  photo3  photo4  photo5  photo6           │
│                                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐         │
│  │ 🖼️  │ │ 🖼️  │ │ 🖼️  │ │ 🖼️  │ │ 🖼️  │ │ 🖼️  │         │
│  │     │ │ ✓   │ │     │ │ ✓   │ │     │ │     │         │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘         │
│  photo7  photo8  photo9  photo10 photo11 photo12          │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Legend:
- Photos with blue ✓ are selected
- Click any photo to select/deselect
- Use Export buttons when ready
```

## 🔄 User Flow Diagram

```
┌─────────────┐
│   Start     │
│   App       │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Has OAuth Token?   │
└──────┬──────────────┘
       │
   No  │  Yes
       │   └──────────────────┐
       ▼                      ▼
┌─────────────┐      ┌──────────────┐
│  Show Login │      │ Show Albums  │
│   Button    │      │    Page      │
└──────┬──────┘      └──────┬───────┘
       │                    │
       ▼                    ▼
┌─────────────┐      ┌──────────────┐
│ Click       │      │ Click "Load  │
│ "Connect"   │      │  Albums"     │
└──────┬──────┘      └──────┬───────┘
       │                    │
       ▼                    ▼
┌─────────────┐      ┌──────────────┐
│ Redirect to │      │ Fetch Albums │
│  SmugMug    │      │  from API    │
└──────┬──────┘      └──────┬───────┘
       │                    │
       ▼                    ▼
┌─────────────┐      ┌──────────────┐
│ User        │      │ Display Grid │
│ Authorizes  │      │  of Albums   │
└──────┬──────┘      └──────┬───────┘
       │                    │
       ▼                    ▼
┌─────────────┐      ┌──────────────┐
│ Callback    │      │ Click Album  │
│ Returns     │      │              │
└──────┬──────┘      └──────┬───────┘
       │                    │
       │                    ▼
       │             ┌──────────────┐
       │             │ Fetch Photos │
       │             │  from Album  │
       │             └──────┬───────┘
       │                    │
       │                    ▼
       │             ┌──────────────┐
       │             │ Display      │
       │             │ Photo Grid   │
       │             └──────┬───────┘
       │                    │
       └────────────────────┤
                           │
                           ▼
                    ┌──────────────┐
                    │ Select       │
                    │ Photos       │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Export       │
                    │ Selected     │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Copy/Download│
                    │     JSON     │
                    └──────────────┘
```

## 📊 Data Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. User clicks "Connect"
       ▼
┌─────────────────────┐
│  /api/auth/smugmug  │
└──────┬──────────────┘
       │ 2. Requests OAuth token
       ▼
┌─────────────┐
│  SmugMug    │
│    API      │
└──────┬──────┘
       │ 3. Returns request token
       ▼
┌─────────────────────┐
│  SmugMug Auth Page  │
└──────┬──────────────┘
       │ 4. User authorizes
       ▼
┌──────────────────────────┐
│ /api/auth/smugmug/       │
│      callback            │
└──────┬───────────────────┘
       │ 5. Exchanges for access token
       ▼
┌─────────────┐
│  Browser    │
│ (Redirected)│
└──────┬──────┘
       │ 6. Token stored in localStorage
       ▼
┌─────────────────────┐
│  /api/smugmug/      │
│     albums          │
└──────┬──────────────┘
       │ 7. Fetch albums with token
       ▼
┌─────────────┐
│  SmugMug    │
│    API      │
└──────┬──────┘
       │ 8. Returns album data
       ▼
┌─────────────┐
│   Display   │
│   Albums    │
└─────────────┘
```

## 🎨 Color Scheme

- **Primary**: Blue (#2563eb) - Actions, selections
- **Success**: Green (#16a34a) - Export buttons
- **Error**: Red (#dc2626) - Error messages
- **Background**: Gray (#f9fafb) - Page background
- **Borders**: Gray (#e5e7eb) - Card borders

## 🔲 UI Components

### Buttons
```
┌─────────────────┐
│  Primary Button │  ← Blue, hover effect
└─────────────────┘

┌─────────────────┐
│  Success Button │  ← Green, for exports
└─────────────────┘

┌─────────────────┐
│   Danger Button │  ← Red, for logout
└─────────────────┘
```

### Cards
```
┌───────────────────┐
│   Card Header     │
│                   │
│   Card Content    │
│                   │
└───────────────────┘
← White, rounded corners, shadow on hover
```

### Selected States
```
┌─────────────────┐
│   🖼️ [Photo]   │  ← Normal
└─────────────────┘

┌═════════════════┐
║ ✓ 🖼️ [Photo]   ║  ← Selected (blue ring)
└═════════════════┘
```

## 📱 Responsive Design

### Desktop (≥1024px)
- 6 photos per row
- 4 albums per row
- Full sidebar

### Tablet (768-1023px)
- 4 photos per row
- 3 albums per row

### Mobile (≤767px)
- 2 photos per row
- 1 album per row
- Stacked layout

## ⚡ Interactive Elements

1. **Hover Effects**
   - Cards lift slightly (shadow)
   - Buttons darken
   - Cursor changes to pointer

2. **Click Feedback**
   - Photos show blue ring when selected
   - Buttons show pressed state
   - Loading spinners for async actions

3. **Animations**
   - Smooth transitions (200ms)
   - Fade-in for loaded content
   - Slide-in for notifications

## 🎯 Key Interactions

```
[Album Card]
  │
  ├─ Hover: Shadow appears
  ├─ Click: Navigate to photos
  └─ Shows: Name + photo count

[Photo Thumbnail]
  │
  ├─ Hover: Border highlights
  ├─ Click: Toggle selection
  ├─ Selected: Blue ring appears
  └─ Shows: Filename below

[Export Button]
  │
  ├─ Hover: Darkens
  ├─ Click: Copies to clipboard
  └─ Feedback: Alert confirmation
```

This gives you a complete visual understanding of what the app looks like and how users interact with it! 🎨
