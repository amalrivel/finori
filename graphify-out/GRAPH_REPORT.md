# Graph Report - finori  (2026-11-15)

## Corpus Check
- 117 files · ~79,330 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .css 2, .example 1)

## Summary
- 1020 nodes · 2296 edges · 57 communities (48 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `709ccb9b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Dashboard dari data tersimpan
- sidebar.tsx
- accordion
- Styling & Customization
- package.json
- shadcn/ui
- transaction-json-import.tsx
- The Design System Page
- components.json
- compilerOptions
- Base vs Radix
- Component Composition
- dropdown-menu (Radix `DropdownMenu` → Base UI `Menu`)
- form
- finance-provider.tsx
- shadcn MCP Server
- showcase-coverage.mjs
- AGENTS
- shadcn logo
- openai
- File icon
- Globe icon
- Next.js wordmark
- Vercel triangle logo
- Browser window icon
- select
- Per-component notes
- app/layout.tsx
- Design Systems from DESIGN.md
- dashboard-charts.tsx
- alert-dialog
- ApiError
- toast
- popover
- Chat & Messaging
- dependencies
- tooltip
- dialog
- Target wrapper shapes (golden-derived specifics)
- Customization & Theming
- scroll-area
- hover-card → preview-card
- Registry Authoring and Addresses
- display-misc.md
- Forms & Inputs
- Class-string rewrites (layer 2)
- avatar
- progress
- Radix UI -> Base UI migration
- Consumer-side prop changes (call sites, not wrappers)
- devDependencies
- color-pair.tsx
- scripts
- state-matrix.tsx
- overlays.md
- finance.ts
- separator

## God Nodes (most connected - your core abstractions)
1. `Button()` - 37 edges
2. `TransactionJsonImport()` - 36 edges
3. `TransactionDetails()` - 35 edges
4. `react` - 34 edges
5. `Analytics()` - 34 edges
6. `TransactionForm()` - 34 edges
7. `AccountActions()` - 30 edges
8. `AccountDetails()` - 28 edges
9. `formatMoney()` - 28 edges
10. `Transactions()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Tampilan grafik` --references--> `DashboardCharts()`  [INFERRED]
  docs/dashboard.md → src/components/dashboard-charts.tsx
- `Coverage matrix` --references--> `Button()`  [INFERRED]
  .agents/skills/migrate-radix-to-base/universal-patterns.md → src/components/ui/button.tsx
- `Radix → Base UI props mapping: menu family` --references--> `Label()`  [INFERRED]
  .agents/skills/migrate-radix-to-base/menus.md → src/components/ui/label.tsx
- `Part-rename quick reference` --references--> `Label()`  [INFERRED]
  .agents/skills/migrate-radix-to-base/universal-patterns.md → src/components/ui/label.tsx
- `Base UI only props worth knowing` --references--> `ToggleGroup()`  [INFERRED]
  .agents/skills/migrate-radix-to-base/disclosure.md → src/components/ui/toggle-group.tsx

## Import Cycles
- None detected.

## Communities (57 total, 9 thin omitted)

### Community 0 - "Dashboard dari data tersimpan"
Cohesion: 0.11
Nodes (16): Dashboard dari data tersimpan, Data lama berkategori Lainnya, Detail transaksi, Tampilan grafik, Google Drive dan CRUD transaksi, Pemakaian, Pemeliharaan dan batas integrasi, Setup Google Cloud (+8 more)

### Community 1 - "sidebar.tsx"
Cohesion: 0.06
Nodes (48): @base-ui/react, cn, Layout(), AppSidebar(), navigation, overviewLinks, DashboardHeader(), FieldSeparator() (+40 more)

### Community 2 - "accordion"
Cohesion: 0.05
Nodes (47): accordion, Accordion.Content → Accordion.Panel, Accordion.Header → Accordion.Header, Accordion.Item → Accordion.Item, Accordion.Root → Accordion.Root, Accordion.Trigger → Accordion.Trigger, Base UI only props worth knowing, Base UI only props worth knowing (+39 more)

### Community 3 - "Styling & Customization"
Cohesion: 0.15
Nodes (13): Built-in variants first, className for layout only, Contents, No manual dark: color overrides, No manual z-index on overlay components, No raw color values for status/state indicators, No space-x-* / space-y-*, Prefer size-* over w-* h-* when equal (+5 more)

### Community 4 - "package.json"
Cohesion: 0.09
Nodes (22): eslintConfig, name, private, version, babel-plugin-react-compiler, eslint, eslint-config-next, eslint-config-prettier (+14 more)

### Community 5 - "shadcn/ui"
Cohesion: 0.12
Nodes (17): Icons, Icons in Button use data-icon attribute, No sizing classes on icons inside components, Pass icons as component objects, not string keys, Component Docs, Examples, and Usage, Component Selection, Critical Rules, Current Project Context (+9 more)

### Community 6 - "transaction-json-import.tsx"
Cohesion: 0.08
Nodes (98): class-variance-authority, @hookform/resolvers, lucide-react, react, react-hook-form, Loading(), AccountPage(), instant (+90 more)

### Community 7 - "The Design System Page"
Cohesion: 0.17
Nodes (12): Checklist, Components: Tiers and Block Anatomy, Contents, Do and Don't, Edge Cases, Foundations, Helpers, Page Outline (+4 more)

### Community 8 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 10 - "Base vs Radix"
Cohesion: 0.22
Nodes (9): Accordion, Base vs Radix, Button / trigger as non-button element (base only), Composition: asChild (radix) vs render (base), Contents, Select, Select — multiple selection and object values (base only), Slider (+1 more)

### Community 11 - "Component Composition"
Cohesion: 0.15
Nodes (13): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+5 more)

### Community 12 - "dropdown-menu (Radix `DropdownMenu` → Base UI `Menu`)"
Cohesion: 0.04
Nodes (48): Arrow / Item / Group / Label / CheckboxItem / RadioGroup / RadioItem / ItemIndicator / Separator / Sub / SubTrigger / SubContent, Arrow → Menu.Arrow, Base UI only, data attributes, CSS variables, Base UI only props worth knowing (Menu), Base UI only props worth knowing (NavigationMenu), CheckboxItem → Menu.CheckboxItem, Content → ContextMenu.Portal > Positioner > Popup, Content → Menu.Portal > Menu.Positioner > Menu.Popup (+40 more)

### Community 13 - "form"
Cohesion: 0.18
Nodes (13): Base UI only props worth knowing (form-wide), CSS variables, Data attributes, form, Form.Control → Field.Control, Form.Field → Field.Root, Form.Label → Field.Label, Form.Message → Field.Error (+5 more)

### Community 14 - "finance-provider.tsx"
Cohesion: 0.09
Nodes (33): save(), logout(), FinanceContext, FinanceProvider(), addTransactions(), deleteAccount(), deleteTransaction(), saveAccount() (+25 more)

### Community 15 - "shadcn MCP Server"
Cohesion: 0.50
Nodes (4): Configuring Registries, Setup, shadcn MCP Server, Tools

### Community 16 - "showcase-coverage.mjs"
Cohesion: 0.25
Nodes (6): components, missing, source, [uiArg, ...roots], uiDir, walk()

### Community 17 - "AGENTS"
Cohesion: 0.67
Nodes (3): AGENTS, graphify, This is NOT the Next.js you know

### Community 25 - "select"
Cohesion: 0.05
Nodes (44): Base UI only props worth knowing (checkbox), Base UI only props worth knowing (radio-group), Base UI only props worth knowing (select), Base UI only props worth knowing (slider), Base UI only props worth knowing (switch), checkbox, Checkbox.Indicator → Checkbox.Indicator, Checkbox.Root → Checkbox.Root (+36 more)

### Community 26 - "Per-component notes"
Cohesion: 0.08
Nodes (24): accordion, asChild -> render, breadcrumb / marker (Slot users), Coverage matrix, CSS custom properties, Data attributes / class hooks, dialog / alert-dialog / sheet, Doc-validation TODOs (before specs are final) (+16 more)

### Community 27 - "app/layout.tsx"
Cohesion: 0.28
Nodes (6): next-themes, geistMono, inter, metadata, RootLayout(), ThemeProvider()

### Community 28 - "Design Systems from DESIGN.md"
Cohesion: 0.18
Nodes (11): Contents, Design Systems from DESIGN.md, Inputs to Confirm, Report Back, Step 1: Scaffold, Step 2: Install Everything, Step 3: Read the DESIGN.md, Step 4: Map Tokens to the Theme (+3 more)

### Community 29 - "dashboard-charts.tsx"
Cohesion: 0.14
Nodes (16): recharts, config, formatChartDate(), ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent() (+8 more)

### Community 30 - "alert-dialog"
Cohesion: 0.17
Nodes (12): Action → (no primitive), alert-dialog, Base UI only props worth knowing (alert-dialog), Cancel → Close, Content → Popup, CSS variables (alert-dialog), Data attributes (alert-dialog), Overlay → Backdrop (+4 more)

### Community 31 - "ApiError"
Cohesion: 0.07
Nodes (51): nextConfig, googleapis, next, @supabase/supabase-js, client, admin, clients, options (+43 more)

### Community 32 - "toast"
Cohesion: 0.18
Nodes (11): Base UI only props worth knowing, CSS variables, Data attributes, toast, Toast.Action → Toast.Action, Toast.Close → Toast.Close, Toast.Description → Toast.Description, Toast.Provider → Toast.Provider (+3 more)

### Community 33 - "popover"
Cohesion: 0.18
Nodes (11): Anchor → Positioner `anchor` prop, Arrow → Arrow, Base UI only props worth knowing (popover), Close → Close, Content → Positioner + Popup, CSS variables (popover), Data attributes (popover), popover (+3 more)

### Community 34 - "Chat & Messaging"
Cohesion: 0.18
Nodes (11): Assistant activity uses Trace, Attachments use Attachment, Chat & Messaging, Code and tool output use CodeBlock, Contents, Escape hatch: the scroller hooks, Message rows use Message, Message surfaces use Bubble (+3 more)

### Community 35 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, @base-ui/react, class-variance-authority, cn, google-auth-library, googleapis, @hookform/resolvers, lucide-react (+11 more)

### Community 36 - "tooltip"
Cohesion: 0.20
Nodes (10): Arrow → Arrow, Base UI only props worth knowing (tooltip), Content → Positioner + Popup, CSS variables (tooltip), Data attributes (tooltip), Portal → Portal, Provider → Provider, Root → Root (+2 more)

### Community 37 - "dialog"
Cohesion: 0.20
Nodes (10): Base UI only props worth knowing (dialog), Content → Popup, CSS variables (dialog), Data attributes (dialog), dialog, Overlay → Backdrop, Portal → Portal, Root → Root (+2 more)

### Community 38 - "Target wrapper shapes (golden-derived specifics)"
Cohesion: 0.20
Nodes (9): Accordion animation placement, Button, Conventions, DropdownMenu / ContextMenu SubContent, Select, SubTrigger open styling, Tabs, Target wrapper shapes (golden-derived specifics) (+1 more)

### Community 39 - "Customization & Theming"
Cohesion: 0.20
Nodes (10): Adding Custom Colors, Border Radius, Changing the Theme, Checking for Updates, Color Variables, Contents, Customization & Theming, Customizing Components (+2 more)

### Community 40 - "scroll-area"
Cohesion: 0.22
Nodes (9): Base UI only props worth knowing, CSS variables, Data attributes, scroll-area, ScrollArea.Corner → ScrollArea.Corner, ScrollArea.Root → ScrollArea.Root, ScrollArea.Viewport → ScrollArea.Viewport, ScrollAreaScrollbar → ScrollArea.Scrollbar (+1 more)

### Community 41 - "hover-card → preview-card"
Cohesion: 0.22
Nodes (9): Arrow → Arrow, Base UI only props worth knowing (preview-card), Content → Positioner + Popup, CSS variables (preview-card), Data attributes (preview-card), hover-card → preview-card, Portal → Portal, Root → Root (+1 more)

### Community 42 - "Registry Authoring and Addresses"
Cohesion: 0.13
Nodes (15): Commands, Contents, Presets, shadcn CLI Reference, Switching Presets, Templates, Address Schemes, Build and Verify (+7 more)

### Community 43 - "display-misc.md"
Cohesion: 0.29
Nodes (6): AccessibleIcon (radix `AccessibleIcon.Root`: `label` required), AspectRatio (radix `AspectRatio.Root`: `asChild`, `ratio` default `1`), Label (radix `Label.Root`: `asChild`, `htmlFor`), No Base UI counterpart, Radix UI → Base UI props mapping: progress, scroll-area, separator, avatar, toast, form, VisuallyHidden (radix `VisuallyHidden.Root`: `asChild`)

### Community 44 - "Forms & Inputs"
Cohesion: 0.25
Nodes (8): Buttons inside inputs use InputGroup + InputGroupAddon, Contents, Field validation and disabled states, FieldSet + FieldLegend for grouping related fields, Forms & Inputs, Forms use FieldGroup + Field, InputGroup requires InputGroupInput/InputGroupTextarea, Option sets (2–7 choices) use ToggleGroup

### Community 45 - "Class-string rewrites (layer 2)"
Cohesion: 0.33
Nodes (6): Animation idiom, Class-string rewrites (layer 2), CSS variables, Data-attribute selectors, Disabled-state hooks, Element changes kill pseudo-class variants

### Community 46 - "avatar"
Cohesion: 0.29
Nodes (7): avatar, Avatar.Fallback → Avatar.Fallback, Avatar.Image → Avatar.Image, Avatar.Root → Avatar.Root, Base UI only props worth knowing, CSS variables, Data attributes

### Community 47 - "progress"
Cohesion: 0.33
Nodes (6): Base UI only props worth knowing, CSS variables, Data attributes, progress, Progress.Indicator → Progress.Indicator, Progress.Root → Progress.Root

### Community 48 - "Radix UI -> Base UI migration"
Cohesion: 0.29
Nodes (6): Hard rules, Modes, Preflight (always), Radix UI -> Base UI migration, Strategy: golden pair first, transformation engine second, Verify and report

### Community 49 - "Consumer-side prop changes (call sites, not wrappers)"
Cohesion: 0.33
Nodes (5): Callback signature rule, Consumer-side prop changes (call sites, not wrappers), Per component, Sweep procedure, Universal

### Community 50 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, babel-plugin-react-compiler, eslint, eslint-config-next, eslint-config-prettier, prettier, prettier-plugin-tailwindcss, supabase (+6 more)

### Community 51 - "color-pair.tsx"
Cohesion: 0.60
Nodes (5): ColorPair(), contrast(), luminance(), toHex(), toRgb()

### Community 52 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, dev, dev:account, format, format:check, lint, start (+4 more)

### Community 55 - "finance.ts"
Cohesion: 0.06
Nodes (59): Perhitungan, zod, loopbackHosts, POST(), upload(), currencies, Currency, currencyDecimals() (+51 more)

### Community 56 - "separator"
Cohesion: 0.40
Nodes (5): Base UI only props worth knowing, CSS variables, Data attributes, separator, Separator.Root → Separator

## Knowledge Gaps
- **136 isolated node(s):** `react-dom`, `shadcn`, `tw-animate-css`, `@tailwindcss/turbopack`, `@types/node` (+131 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 595 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Label()` connect `sidebar.tsx` to `transaction-json-import.tsx`, `dropdown-menu (Radix `DropdownMenu` → Base UI `Menu`)`, `form`, `progress`, `select`, `Per-component notes`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **What connects `react-dom`, `shadcn`, `tw-animate-css` to the rest of the system?**
  _136 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard dari data tersimpan` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `Radix → Base UI props mapping: menu family` connect `dropdown-menu (Radix `DropdownMenu` → Base UI `Menu`)` to `sidebar.tsx`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `sidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05621621621621622 - nodes in this community are weakly interconnected._
- **Why does `react` connect `transaction-json-import.tsx` to `sidebar.tsx`, `package.json`, `finance-provider.tsx`, `color-pair.tsx`, `state-matrix.tsx`, `app/layout.tsx`, `dashboard-charts.tsx`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `accordion` be split into smaller, more focused modules?**
  _Cohesion score 0.04698581560283688 - nodes in this community are weakly interconnected._