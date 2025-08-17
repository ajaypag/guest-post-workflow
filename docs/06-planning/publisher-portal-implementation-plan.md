# Publisher Portal Implementation Plan

## Executive Summary
This document outlines the comprehensive implementation plan for the Publisher Portal, designed to integrate seamlessly with the existing Guest Post Workflow application. The portal will follow established design patterns, reuse existing components, and maintain consistency with the current user experience.

## Design Philosophy
- **Consistency First**: Mirror existing patterns from account portal
- **Mobile-Responsive**: Follow mobile-first approach like existing app
- **Progressive Enhancement**: Start simple, add complexity based on user needs
- **Reuse Over Rebuild**: Leverage existing components and patterns

## 1. Navigation & Layout Architecture

### Publisher User Type Integration
```typescript
// Extend existing user types in auth system
UserType: 'internal' | 'account' | 'publisher'
```

### Navigation Structure
Following the existing Header.tsx pattern, publisher navigation will include:

```
Publisher Portal Navigation:
├── Dashboard (Overview & stats)
├── My Websites
│   ├── Claimed Websites (list view)
│   ├── Claim New Website (wizard)
│   └── Performance Analytics
├── Offerings
│   ├── Active Offerings
│   ├── Pricing Rules
│   └── Availability Calendar
├── Orders
│   ├── Active Orders
│   ├── Order History
│   └── Content Requirements
├── Earnings
│   ├── Payment History
│   ├── Pending Payments
│   └── Tax Documents
└── Settings
    ├── Profile
    ├── Payment Methods
    └── Content Guidelines
```

### Layout Component
Create `/app/publisher/layout.tsx` following AccountLayout pattern:
- Sidebar navigation on desktop (3/12 columns)
- Dropdown navigation on mobile
- Breadcrumbs with consistent styling
- User context in header

## 2. Dashboard Design

### Publisher Dashboard (`/app/publisher/page.tsx`)
Following the AccountDashboard pattern with stat cards:

```
Top Stats Row (5 columns on desktop, 2 on mobile):
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Total       │ Active      │ This Month  │ Avg Response│ Reliability │
│ Websites    │ Orders      │ Earnings    │ Time        │ Score       │
│ 12          │ 5           │ $3,450      │ 2.5 days    │ 94%         │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

Main Content Grid (2 columns on desktop):
┌─────────────────────────────┬─────────────────────────────┐
│ Recent Orders               │ Top Performing Websites      │
│ • Table with status badges  │ • List with metrics         │
│ • Quick actions             │ • Revenue charts            │
└─────────────────────────────┴─────────────────────────────┘

Bottom Section:
┌────────────────────────────────────────────────────────────┐
│ Performance Trends (Line chart)                            │
│ • Orders completed over time                               │
│ • Revenue trends                                           │
│ • Response time improvements                               │
└────────────────────────────────────────────────────────────┘
```

## 3. Website Management Interface

### My Websites List (`/app/publisher/websites/page.tsx`)
Using ResponsiveTable component pattern:

**Desktop View:**
```
┌──┬────────────────┬──────────┬─────────┬──────────┬──────────┬─────────┐
│☐ │ Website        │ Status   │ DR      │ Traffic  │ Earnings │ Actions │
├──┼────────────────┼──────────┼─────────┼──────────┼──────────┼─────────┤
│☐ │ techblog.com   │ ● Active │ 65      │ 45K/mo   │ $2,340   │ [···]   │
│☐ │ fitnesshub.io  │ ● Active │ 42      │ 12K/mo   │ $890     │ [···]   │
│☐ │ traveltips.net │ ○ Paused │ 38      │ 8K/mo    │ $0       │ [···]   │
└──┴────────────────┴──────────┴─────────┴──────────┴──────────┴─────────┘
```

**Mobile View (Card Pattern):**
```
┌────────────────────────┐
│ techblog.com          │
│ Status: ● Active      │
│ DR: 65 | 45K/mo       │
│ Earnings: $2,340      │
│ [Manage] [View Stats] │
└────────────────────────┘
```

### Website Detail View (`/app/publisher/websites/[id]/page.tsx`)
Following the client detail page pattern:

```
Header Section:
┌─────────────────────────────────────────────────────────┐
│ ← Back to Websites                                     │
│                                                         │
│ [Website Logo] techblog.com                           │
│ Domain Rating: 65 | Traffic: 45K/mo | Status: Active  │
│                                          [Edit] [Pause]│
└─────────────────────────────────────────────────────────┘

Tab Navigation:
[Overview] [Offerings] [Orders] [Analytics] [Settings]

Content Area (varies by tab)
```

## 4. Offerings Management

### Offerings List (`/app/publisher/offerings/page.tsx`)
Grid layout with cards:

```
Filter Bar:
[All Websites ▼] [All Types ▼] [Active Only ☑] [Search...]

Offerings Grid (responsive):
┌─────────────────────┐ ┌─────────────────────┐
│ Guest Post          │ │ Link Insertion      │
│ techblog.com       │ │ techblog.com       │
│ Base: $450         │ │ Base: $250         │
│ TAT: 7 days        │ │ TAT: 3 days        │
│ ● Active           │ │ ● Active           │
│ [Edit] [Duplicate] │ │ [Edit] [Duplicate] │
└─────────────────────┘ └─────────────────────┘
```

### Offering Edit Modal
Using ResponsiveModal component:

```
┌─────────────────────────────────────┐
│ Edit Offering                    [X]│
├─────────────────────────────────────┤
│ Website: techblog.com               │
│ Type: [Guest Post ▼]                │
│                                     │
│ Pricing                             │
│ Base Price: [$450    ]              │
│ Currency: [USD ▼]                   │
│                                     │
│ Content Requirements                │
│ Min Words: [1500    ]               │
│ Max Words: [3000    ]               │
│ ☑ Dofollow links                   │
│ ☑ Include images                   │
│                                     │
│ Turnaround Time                     │
│ [7] days                            │
│                                     │
├─────────────────────────────────────┤
│            [Cancel] [Save Changes]  │
└─────────────────────────────────────┘
```

## 5. Pricing Rules Interface

### Pricing Rules Builder (`/app/publisher/offerings/[id]/pricing/page.tsx`)
Following the form patterns from workflow steps:

```
Rule Builder Interface:
┌──────────────────────────────────────────────────┐
│ Pricing Rules for Guest Post - techblog.com     │
├──────────────────────────────────────────────────┤
│ + Add New Rule                                   │
│                                                  │
│ Rule 1: Bulk Discount                      [▼]  │
│ ├─ IF quantity >= 5                             │
│ ├─ THEN apply 10% discount                      │
│ └─ Priority: 1                    [Edit] [Delete]│
│                                                  │
│ Rule 2: Tech Niche Premium                 [▼]  │
│ ├─ IF niche = "Technology"                      │
│ ├─ THEN add $50 fee                             │
│ └─ Priority: 2                    [Edit] [Delete]│
│                                                  │
│ [Test Rules] [Save All Rules]                   │
└──────────────────────────────────────────────────┘
```

## 6. Website Claiming Workflow

### Claim Website Wizard (`/app/publisher/claim/page.tsx`)
Multi-step form following existing wizard patterns:

```
Step 1: Find Your Websites
┌─────────────────────────────────────┐
│ Enter your business email:          │
│ [editor@techblog.com    ]           │
│                                     │
│ We'll search for websites           │
│ associated with this email.         │
│                                     │
│                    [Search →]       │
└─────────────────────────────────────┘

Step 2: Select Websites
┌─────────────────────────────────────┐
│ We found 3 potential matches:       │
│                                     │
│ ☑ techblog.com (High confidence)   │
│    Domain matches email             │
│                                     │
│ ☑ techreview.net (Medium)          │
│    Found in publisher records       │
│                                     │
│ ☐ oldsite.com (Low)                │
│    Mentioned in notes               │
│                                     │
│         [← Back] [Verify Selected →]│
└─────────────────────────────────────┘

Step 3: Verification
┌─────────────────────────────────────┐
│ Choose verification method:          │
│                                     │
│ ○ Email verification                │
│   We'll send a code to your email  │
│                                     │
│ ○ DNS verification                  │
│   Add a TXT record to your domain  │
│                                     │
│ ○ File upload                       │
│   Upload a file to your website    │
│                                     │
│        [← Back] [Start Verification]│
└─────────────────────────────────────┘
```

## 7. Order Management

### Publisher Orders View (`/app/publisher/orders/page.tsx`)
Reuse existing order components with publisher context:

```
Active Orders Table:
┌────┬──────────┬────────────┬─────────┬──────────┬─────────┐
│ ID │ Client   │ Article    │ Status  │ Deadline │ Actions │
├────┼──────────┼────────────┼─────────┼──────────┼─────────┤
│#234│ LinkioCo │ SEO Guide  │ Writing │ 3 days   │ [View]  │
│#233│ TechInc  │ AI Trends  │ Review  │ 5 days   │ [View]  │
└────┴──────────┴────────────┴─────────┴──────────┴─────────┘
```

## 8. Component Reuse Strategy

### Existing Components to Reuse:
1. **ResponsiveTable** - For all data tables
2. **ResponsiveModal** - For all modals/dialogs
3. **Header** - Extended with publisher navigation
4. **NotificationBell** - For publisher notifications
5. **StatusBadge** - For order/website statuses
6. **LoadingSpinner** - For async operations
7. **EmptyState** - For empty lists
8. **CopyButton** - For sharing links
9. **Form inputs** - Consistent styling

### New Publisher-Specific Components:
1. **WebsiteCard** - Display website with metrics
2. **OfferingCard** - Display offering details
3. **PricingRuleBuilder** - Visual rule builder
4. **EarningsChart** - Revenue visualizations
5. **PublisherStatCard** - Publisher-specific metrics
6. **ClaimingWizard** - Multi-step claim process
7. **AvailabilityCalendar** - Manage availability

## 9. Mobile-First Implementation

### Responsive Breakpoints:
- **Mobile**: < 640px (default)
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Mobile Optimizations:
1. **Touch-friendly**: Min 44px touch targets
2. **Swipe gestures**: For navigation
3. **Bottom sheets**: For mobile modals
4. **Sticky headers**: For context
5. **Collapsible sections**: Save space

## 10. Authentication & Permissions

### Publisher Auth Flow:
```typescript
// Extend AuthServiceServer
async function getPublisherSession(request: Request) {
  const session = await getSession(request);
  if (session?.userType !== 'publisher') {
    redirect('/publisher/login');
  }
  return session;
}
```

### Permission Checks:
```typescript
// Publisher can only see their own data
const publisher = await getPublisher(session.userId);
const websites = await getPublisherWebsites(publisher.id);
```

## 11. Implementation Phases

### Phase 1: Foundation (Week 1)
1. Publisher auth integration
2. Layout and navigation
3. Dashboard with basic stats
4. Website list view

### Phase 2: Core Features (Week 2)
1. Website detail pages
2. Offerings management
3. Basic pricing rules
4. Order list view

### Phase 3: Advanced Features (Week 3)
1. Website claiming workflow
2. Pricing rule builder
3. Performance analytics
4. Earnings tracking

### Phase 4: Polish & Testing (Week 4)
1. Mobile optimizations
2. Error handling
3. Loading states
4. User testing

## 12. File Structure

```
/app/publisher/
├── layout.tsx                    # Publisher layout wrapper
├── page.tsx                      # Dashboard
├── login/
│   └── page.tsx                 # Publisher login
├── websites/
│   ├── page.tsx                 # Website list
│   ├── [id]/
│   │   ├── page.tsx            # Website detail
│   │   ├── offerings/
│   │   ├── analytics/
│   │   └── settings/
│   └── claim/
│       └── page.tsx            # Claim wizard
├── offerings/
│   ├── page.tsx                # All offerings
│   ├── new/
│   └── [id]/
│       ├── page.tsx           # Edit offering
│       └── pricing/
├── orders/
│   ├── page.tsx               # Order list
│   └── [id]/
│       └── page.tsx          # Order detail
├── earnings/
│   ├── page.tsx              # Earnings overview
│   └── history/
└── settings/
    ├── page.tsx              # Settings hub
    ├── profile/
    ├── payments/
    └── guidelines/

/components/publisher/
├── PublisherHeader.tsx
├── PublisherSidebar.tsx
├── WebsiteCard.tsx
├── OfferingCard.tsx
├── PricingRuleBuilder.tsx
├── ClaimingWizard.tsx
├── EarningsChart.tsx
└── AvailabilityCalendar.tsx
```

## 13. API Routes

```
/app/api/publisher/
├── auth/
│   ├── login/
│   └── logout/
├── dashboard/
│   └── stats/
├── websites/
│   ├── route.ts              # List websites
│   └── [id]/
│       ├── route.ts         # Website CRUD
│       └── analytics/
├── offerings/
│   ├── route.ts            # List/create
│   └── [id]/
│       ├── route.ts       # Update/delete
│       └── pricing/
├── claims/
│   ├── initiate/
│   ├── verify/
│   └── status/
└── orders/
    ├── route.ts
    └── [id]/
```

## 14. Testing Strategy

### Component Testing:
- Unit tests for new components
- Integration tests for workflows
- Visual regression tests

### User Testing:
- Publisher onboarding flow
- Claiming process
- Offering management
- Order fulfillment

## 15. Performance Considerations

### Optimizations:
1. **Lazy loading**: Routes and components
2. **Pagination**: For large lists
3. **Caching**: Dashboard stats
4. **Debouncing**: Search and filters
5. **Virtual scrolling**: For long lists

## Next Steps

1. Review and approve this plan
2. Begin Phase 1 implementation
3. Create publisher auth endpoints
4. Build layout and navigation
5. Implement dashboard

This plan ensures the publisher portal integrates seamlessly with the existing application while providing a tailored experience for publisher users.