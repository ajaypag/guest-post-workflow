# Domain Bank UI Mockup

## Main Interface Design

```
┌────────────────────────────────────────────────────────────────────────┐
│ Domain Bank                                              [Settings] [?] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ Client: [All Clients ▼]  🔍 Search...     [Qualified ▼] [Export] │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ ┌───────────────┬────────────────────────────────────────────────┐     │
│ │ FILTERS       │ DOMAINS (247 qualified, 82 available)         │     │
│ ├───────────────┼────────────────────────────────────────────────┤     │
│ │               │                                                 │     │
│ │ Projects      │ ┌─────────────────────────────────────────────┴─┐   │
│ │ ☑ All (12)   │ │ ☐ Domain       Client    DR ↓  Price   Status │   │
│ │ ☐ SEO Tools  │ ├─────────────────────────────────────────────────┤   │
│ │ ☐ Marketing  │ │ ☐ ⭐ example.com  Acme Co   45   $250   ✓ Avail  [×] │   │
│ │               │ │ ☐ blog.net      TechCo    52   $300   ✓ Avail  [⭐][×] │   │
│ │ Target URLs   │ │ ☑ news.org      WebCo     38   $200   ⚠ Used   [⭐][×] │   │
│ │ ☑ All (5)    │ │ ☐ site.io       Acme Co   41   $275   ✓ Avail  [⭐][×] │   │
│ │ ☐ /seo-tools │ │ ☐ tech.com      StartUp   48   $320   ✓ Avail  [⭐][×] │   │
│ │ ☐ /marketing │ │ ☐ daily.news    MediaCo   55   $400   ⚠ Used   [⭐][×] │   │
│ │               │ │ ☐ review.site    39   5.8K     $180    ✓ Avail │   │
│ │ Metrics       │ │ ☐ portal.org     44   12.1K    $240    ✓ Avail │   │
│ │ DR: 30-70    │ │ ☐ guide.net      50   18.9K    $290    🔒 Resvd │   │
│ │ Traffic: 5K+ │ │ ☐ resource.com   46   22.3K    $310    ✓ Avail │   │
│ │ Price: < $500│ │                                                 │   │
│ │               │ │ [Load More...]                                  │   │
│ │ Categories    │ └─────────────────────────────────────────────────┘   │
│ │ ☑ Technology  │                                                       │
│ │ ☐ Business    │ ┌─────────────────────────────────────────────────┐   │
│ │ ☐ Marketing   │ │ SELECTION SUMMARY                               │   │
│ │ ☐ News        │ │ 1 domain selected                    Total: $200│   │
│ │               │ │                                                 │   │
│ │ Quality       │ │ [View Details] [Add to Order ▼] [Create Order] │   │
│ │ ☑ High        │ └─────────────────────────────────────────────────┘   │
│ │ ☑ Moderate    │                                                       │
│ │ ☐ Review      │ View: [All ▼] Showing 247 (23 bookmarked, 15 hidden) │
│ └───────────────┴───────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

## Expanded Domain Row (On Hover/Click)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ☐ example.com                               DR 45 | Traffic 10.2K   │
│   Categories: Technology, Business          Price: $250 (3-5 days)   │
│                                                                      │
│   Qualification: HIGH QUALITY                                       │
│   ✓ 120 direct keyword matches (median position: 45)               │
│   ✓ 32 related keyword matches (median position: 37)               │
│   Target URLs: /seo-tools, /marketing-guide                         │
│                                                                      │
│   [Preview Site ↗] [View Full Analysis] [Add to Selection]          │
└─────────────────────────────────────────────────────────────────────┘
```

## Mobile/Responsive View

```
┌─────────────────────────┐
│ Domain Bank             │
│ Client: ABC Corp        │
├─────────────────────────┤
│ [🔍] [Filter] [Sort ▼]  │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ ☐ example.com      │ │
│ │   DR 45 • $250     │ │
│ │   ✓ Available      │ │
│ ├─────────────────────┤ │
│ │ ☐ blog.net         │ │
│ │   DR 52 • $300     │ │
│ │   ✓ Available      │ │
│ ├─────────────────────┤ │
│ │ ☑ news.org         │ │
│ │   DR 38 • $200     │ │
│ │   ⚠ Used in #4521  │ │
│ └─────────────────────┘ │
│                         │
│ [Create Order with 1]   │
└─────────────────────────┘
```

## Status Indicators

- ✓ Available - Ready to use
- ⚠ Used - Already in an order
- 🔒 Reserved - Temporarily held
- 🔄 Refreshing - Updating metrics
- ❌ Unavailable - Cannot be used
- 💎 Premium - High-value domain

## Action Menus

### "Add to Order" Dropdown
```
Add to Order ▼
├─ Order #123 (5 items)
├─ Order #456 (12 items) 
├─ Draft Order (2 items)
└─ + Create New Order
```

### Bulk Actions (When Multiple Selected)
```
With 5 selected:
[Add All to Order] [Create Order] [Export] [Reserve]
```

## Filter Panel Details

### Advanced Filters (Collapsible Sections)
```
▼ Projects & Targets
  ☑ All Projects
  ☐ SEO Campaign (142 domains)
  ☐ Content Marketing (89 domains)
  ☐ Link Building (53 domains)
  
  Target URLs:
  ☐ https://client.com/seo-tools
  ☐ https://client.com/marketing

▼ Domain Metrics  
  Domain Rating: [30] ——●————— [70]
  Traffic: [5,000] ——————●—— [100,000]
  Price: [$100] ——●———————— [$1,000]

▼ Categories & Types
  Categories:          Types:
  ☐ Technology (45)    ☐ Blog (112)
  ☐ Business (38)     ☐ News (67)
  ☐ Marketing (29)     ☐ Magazine (34)
  
▼ Qualification
  ☑ High Quality (89)
  ☑ Qualified (158)
  ☐ Review Needed (12)
  ☐ Show Disqualified

▼ Availability
  ○ All Domains
  ● Available Only
  ○ Include Used
  ○ Show Reserved
```

## Detail Modal (Quick View)

```
┌──────────────────────────────────────────────────────────────┐
│ example.com                                           [✕]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ METRICS                    PRICING                          │
│ Domain Rating: 45          Guest Post: $250                 │
│ Traffic: 10,200/mo         Link Insert: $180                │
│ Categories: Tech, Biz      Turnaround: 3-5 days             │
│                                                              │
│ QUALIFICATION ANALYSIS                                       │
│ Status: HIGH QUALITY                                        │
│ Authority: Moderate (Direct) / Moderate (Related)           │
│                                                              │
│ Evidence:                                                    │
│ • 120 direct keyword matches                                │
│ • Median position: 45                                       │
│ • Top keywords: "seo tools", "backlink checker"             │
│                                                              │
│ AI Reasoning:                                               │
│ "Strong alignment with target keywords. The domain          │
│ consistently ranks for core SEO terms..."                   │
│                                                              │
│ TARGET URL MATCHING                                         │
│ Best for: /seo-tools (92% match)                           │
│ Also good: /marketing (78% match)                          │
│                                                              │
│ AVAILABILITY                                                │
│ ✓ Currently available                                       │
│ Last used: 2 months ago in Order #892                      │
│                                                              │
│ [Add to Selection] [View Full Details] [Visit Site ↗]       │
└──────────────────────────────────────────────────────────────┘
```

## Loading States

### Initial Load
```
┌─────────────────────────────────────────────┐
│     ⟳ Loading your domain inventory...       │
│                                              │
│     [=========>          ] 40%               │
│     Fetching qualification data...           │
└─────────────────────────────────────────────┘
```

### Metric Refresh
```
┌─────────────────────────────────────────────┐
│ example.com    45  🔄 Updating...  $250  ✓  │
│ blog.net       52  25.1K           $300  ✓  │
└─────────────────────────────────────────────┘
```

## Empty States

### No Results
```
┌─────────────────────────────────────────────┐
│                                              │
│     🔍 No domains match your filters         │
│                                              │
│     Try adjusting your criteria or           │
│     [Clear All Filters]                      │
│                                              │
└─────────────────────────────────────────────┘
```

### No Qualified Domains
```
┌─────────────────────────────────────────────┐
│                                              │
│     📊 No qualified domains yet              │
│                                              │
│     [Run Bulk Analysis] to find domains      │
│     or [Import Domains] from a list          │
│                                              │
└─────────────────────────────────────────────┘
```

## Interactive Features

### Sort Options
- Domain Name (A-Z)
- Domain Rating (High to Low)
- Traffic (High to Low)  
- Price (Low to High)
- Qualification Date (Newest)
- Availability

### Keyboard Shortcuts
- `Space` - Select/deselect domain
- `Cmd/Ctrl + A` - Select all visible
- `Cmd/Ctrl + Shift + A` - Clear selection
- `Enter` - Open detail view
- `Esc` - Close modals

### Hover Actions
- Quick preview on row hover
- Tooltip with key metrics
- Action buttons slide in

### Drag & Drop
- Drag domains to order sidebar
- Reorder selected domains
- Drop into order groups

## Color Coding

- **Green** - Available, qualified, good metrics
- **Yellow** - Used but could be reused, pending
- **Red** - Unavailable, disqualified
- **Blue** - Selected, active filters
- **Gray** - No data, loading, disabled

## Data Density Options

### Compact View
```
☐ example.com    45•10K•$250    ✓
☐ blog.net       52•25K•$300    ✓
☐ news.org       38•8K•$200     ⚠
```

### Detailed View
(As shown in main mockup)

### Card View
```
┌──────────────┐ ┌──────────────┐
│ example.com  │ │ blog.net     │
│ DR 45        │ │ DR 52        │
│ 10.2K/mo     │ │ 25.1K/mo     │
│ $250         │ │ $300         │
│ [Select]     │ │ [Select]     │
└──────────────┘ └──────────────┘
```