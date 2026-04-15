# ZentraBite Dashboard — Setup Instructions

## What These Files Are

These are the REAL production files for your ZentraBite merchant CRM dashboard.
They go into your `apps/dashboard` folder inside your zentrabite project.

## Step-by-Step Setup (Windows PowerShell)

### 1. Open PowerShell and navigate to your project

```powershell
cd C:\path\to\your\zentrabite\apps\dashboard
```

### 2. Create a fresh Next.js app (if you haven't already)

```powershell
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

When it asks questions, press Enter for all defaults.

### 3. Install the extra package you need

```powershell
npm install lucide-react
```

### 4. Copy these files into your project

Replace the following files with the ones from this download:

```
apps/dashboard/
├── app/
│   ├── globals.css          ← REPLACE
│   ├── layout.tsx           ← REPLACE
│   ├── page.tsx             ← REPLACE
│   ├── dashboard/
│   │   └── page.tsx         ← NEW
│   ├── customers/
│   │   └── page.tsx         ← NEW
│   ├── orders/
│   │   └── page.tsx         ← NEW
│   ├── campaigns/
│   │   └── page.tsx         ← NEW
│   ├── analytics/
│   │   └── page.tsx         ← NEW
│   ├── menu/
│   │   └── page.tsx         ← NEW
│   └── settings/
│       └── page.tsx         ← NEW
├── components/
│   ├── dashboard-sidebar.tsx ← NEW
│   ├── dashboard-topbar.tsx  ← NEW
│   ├── page-header.tsx       ← NEW
│   ├── stat-card.tsx         ← NEW
│   └── empty-state.tsx       ← NEW
├── lib/
│   └── navigation.ts        ← NEW
└── tailwind.config.ts        ← REPLACE
```

### 5. Create the folders that don't exist yet

```powershell
mkdir app\dashboard
mkdir app\customers
mkdir app\orders
mkdir app\campaigns
mkdir app\analytics
mkdir app\menu
mkdir app\settings
mkdir components
mkdir lib
```

### 6. Run the project

```powershell
npm run dev
```

Open your browser to http://localhost:3000

### 7. What you should see

- A dark premium dashboard with a sidebar on the left
- ZentraBite branding at the top of the sidebar
- 7 navigation items that all work
- Each page has real content matching the demo
- Green accent colour, glass-morphism cards
- Smooth page transitions

## Common Errors and Fixes

### Error: "Module not found: Can't resolve 'lucide-react'"
Fix: Run `npm install lucide-react`

### Error: "Module not found: Can't resolve '@/components/...'"
Fix: Make sure your tsconfig.json has this path alias:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
If you used --src-dir, your files should be in `src/app/`, `src/components/`, etc.
If you did NOT use --src-dir, change "@/*" to ["./*"]

### Error: "Cannot find module '@/lib/navigation'"
Fix: Same as above — check your tsconfig.json paths

### Page shows default Next.js page instead of dashboard
Fix: Make sure you replaced `app/page.tsx` with the one from this download

### Sidebar doesn't highlight the active page
Fix: Make sure you're navigating to /dashboard, /customers, etc. not just /

## File Structure Explained

- `lib/navigation.ts` — The SINGLE source of truth for all nav items. 
  Add a page here and it appears in the sidebar automatically.

- `components/dashboard-sidebar.tsx` — The left sidebar. Uses navigation.ts 
  for items. Highlights the active route using usePathname().

- `components/dashboard-topbar.tsx` — The top bar. Shows the current page 
  title dynamically based on the URL.

- `app/layout.tsx` — The root layout. Loads fonts, renders sidebar + topbar, 
  wraps all page content.

- `app/[page]/page.tsx` — Each page renders inside the layout automatically.

## What to Build Next

After this shell is working:
1. Connect to Supabase (replace sample data with real database queries)
2. Add authentication (Supabase Auth)
3. Build the Stripe integration (billing)
4. Wire up Twilio (SMS campaigns)
5. Add real-time updates (Supabase Realtime for the Kanban board)
