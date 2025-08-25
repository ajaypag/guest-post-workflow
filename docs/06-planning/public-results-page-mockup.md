# Public Vetted Sites Results Page - Mockup

## URL Pattern
`/vetted-sites/results/[shareToken]`

## Page Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│                          [Linkio Logo]                                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    🎥 Personalized Video Message                 │ │
│  │  ┌────────────────────────────────────────────────────────────┐  │ │
│  │  │                                                            │  │ │
│  │  │                   [Loom/YouTube Embed]                    │  │ │
│  │  │                                                            │  │ │
│  │  └────────────────────────────────────────────────────────────┘  │ │
│  │                                                                  │ │
│  │  "Hi [Prospect Name], we've analyzed 50+ guest posting sites   │ │
│  │   specifically for your target URLs. Check out these amazing    │ │
│  │   opportunities we found for you..."                             │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                   Your Vetted Guest Post Sites                   │ │
│  │                                                                  │ │
│  │  We analyzed 127 sites and found 43 high-quality matches for:   │ │
│  │  • squarefoothomes.com/real-estate/waterfront-homes-in-florida  │ │
│  │                                                                  │ │
│  │  ┌─────────────────────────────────────────────────────────┐    │ │
│  │  │ 🎯 43 Qualified Sites | 💰 Avg Cost: $179 | ⚡ 24hr TAT │    │ │
│  │  └─────────────────────────────────────────────────────────┘    │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Filter: [High Quality ▼] [All Industries ▼] [All Prices ▼]      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Domain              | DR | Traffic | Match | Price | Quality     │ │
│  │─────────────────────────────────────────────────────────────────│ │
│  │ techblog.com       | 72 | 125K    | 94%  | $149  | ⭐⭐⭐⭐⭐   │ │
│  │ businessnews.io    | 68 | 89K     | 91%  | $199  | ⭐⭐⭐⭐⭐   │ │
│  │ startupworld.com   | 64 | 45K     | 88%  | $129  | ⭐⭐⭐⭐     │ │
│  │ ... (40 more sites)                                              │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │              🚀 Ready to Get Started?                             │ │
│  │                                                                  │ │
│  │   [Create Free Account & Claim These Results]                    │ │
│  │                                                                  │ │
│  │   ✓ Instant access to all 43 vetted sites                       │ │
│  │   ✓ Contact information for publishers                           │ │
│  │   ✓ One-click order creation                                     │ │
│  │   ✓ Managed outreach service available                           │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Trusted by 500+ agencies | 10,000+ successful placements        │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Video Section (Optional)
- Shows if `proposalVideoUrl` is provided
- Embedded Loom/YouTube video
- Custom message from `proposalMessage`
- Personalized greeting if prospect name available

### 2. Results Summary
- Shows target URLs that were analyzed
- Key metrics (total sites found, avg cost, etc.)
- Builds excitement about the data

### 3. Vetted Sites Table
- Reuses existing VettedSitesClient component
- Shows actual data (not just a preview)
- Interactive filters to explore data
- Match scores visible (builds trust)
- Retail prices shown (not wholesale)

### 4. Call-to-Action Section
- Prominent "Create Account & Claim" button
- Value props clearly listed
- Single action to signup + claim
- Trust signals at bottom

### 5. Data Shown
- Domain names ✅
- Domain metrics (DR, traffic) ✅
- Match scores ✅
- Retail prices ✅
- Quality ratings ✅

### 6. Data Hidden (Until Claimed)
- Export/download functionality ❌
- Publisher contact info ❌
- Wholesale prices ❌
- Internal notes ❌
- Create workflow buttons ❌

## Technical Implementation

```typescript
// Page Components Structure
<PublicResultsLayout>
  <VideoSection video={proposalVideoUrl} message={proposalMessage} />
  <ResultsSummary targetUrls={targetUrls} totalSites={43} />
  <VettedSitesTable 
    domains={domains}
    isPublic={true}  // Disables interactive features
    showPrices={true} // Shows retail prices
  />
  <CallToActionSection shareToken={token} />
  <TrustSignals />
</PublicResultsLayout>
```

## User Flow

1. **Sales sends link** → Prospect clicks
2. **Watches video** (if provided) → Gets personalized context
3. **Sees impressive data** → 43 qualified sites found!
4. **Explores results** → Can filter and sort
5. **Gets excited** → Wants to claim these results
6. **Clicks CTA** → Goes to `/vetted-sites/claim/[token]`
7. **Signs up** → Creates account + claims in one step
8. **Email verification** → Confirms email
9. **Access granted** → Full access to vetted sites + order creation

## Success Metrics
- View-to-claim conversion rate (target: 30%+)
- Time on page (target: 3+ minutes)
- Filter interactions (shows engagement)
- Video watch completion (if provided)