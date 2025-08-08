# Order Flow Detailed Walkthrough

## Scenario: Sarah from TechGadgets Inc Orders Guest Posts

### Step 1: Order Creation (External User)

**Click 1: Sarah navigates to /orders/new**

**Expected**: 
- Form to enter advertiser details
- Basic order information input

**Actual**: 
- Loading spinner "Creating New Order"
- Auto-creates draft order with status='draft', state='configuring'
- Immediately redirects to /orders/[id]/edit

**Issues**:
1. ❌ No initial form for advertiser name
2. ❌ No way to specify order basics before creation
3. ❌ Order created with empty advertiser info

### Step 2: Order Configuration (Edit Page)

**Sarah lands on /orders/[id]/edit**

**UI Layout**:
```
+------------------+------------------+------------------------+
| Select Brands    | Target Pages     | Order Details         |
| ☐ BestBuy       | (Shows targets   | (Shows line items     |
| ☐ Amazon        |  for selected    |  based on client      |
| ☐ Target        |  brands)         |  selections)          |
+------------------+------------------+------------------------+
```

**Click 2: Sarah selects BestBuy**
- Checkbox checked
- Link count input appears (default: 1)
- Target pages for BestBuy appear in middle column

**Click 3: Sarah sets BestBuy link count to 2**
- Updates link count input
- Two line items appear in right column for BestBuy

**Click 4: Sarah selects Amazon**
- Checkbox checked
- Link count stays at 1
- Amazon target pages added to middle column

**Current State**:
- 2 clients selected (BestBuy: 2 links, Amazon: 1 link)
- 3 line items in order details
- No target pages selected yet
- No anchor text entered

**Click 5-7: Sarah selects target pages**
- For BestBuy Link 1: Selects "bestbuy.com/smartphones"
- For BestBuy Link 2: Selects "bestbuy.com/accessories"
- For Amazon Link 1: Selects "amazon.com/electronics"

**Click 8-10: Sarah enters anchor text**
- BestBuy Link 1: "premium phone accessories"
- BestBuy Link 2: "smartphone cases and covers"
- Amazon Link 1: "tech gadget accessories"

**Auto-save Status**:
- ✅ Saves every 2 seconds (debounced)
- Shows "Saving..." → "Saved" indicator

### Step 3: Order Submission

**Click 11: Sarah clicks "Review & Submit Order"**

**What happens**:
1. Modal appears showing order summary
2. Order details listed by client
3. Total price shown

**Click 12: Sarah confirms submission in modal**

**API Call**: POST /api/orders/[id]/submit
- Updates status: 'draft' → 'pending_confirmation'
- Updates state: 'configuring' → 'awaiting_review'
- Redirects to /orders/[id]

**Issues**:
1. ❌ No advertiser name/company collected
2. ❌ No special instructions field
3. ❌ No delivery timeline options

### Step 4: External User Goes Back to Edit

**Sarah realizes she needs to add one more link**

**Click 13: Sarah navigates to /orders/[id]**
- Sees order in "Awaiting Confirmation" status
- Progress tracker shows order is pending internal review

**Click 14: Sarah clicks "Edit Order"**
- ✅ Edit button is visible (order status is pending_confirmation)
- Redirects to /orders/[id]/edit

**Sarah's edits**:
- **Click 15**: Increases BestBuy link count from 2 to 3
- **Click 16**: Selects target page for new link
- **Click 17**: Adds anchor text "mobile accessories"

**Click 18: Sarah clicks "Save Changes"**

**Expected**: Order should update and allow re-submission
**Actual**: 
- Modal shows "Confirm Order Updates"
- After confirmation, calls POST /api/orders/[id]/submit
- ❌ **BUG**: Submit endpoint only works for 'draft' status
- Error: "Order must be in draft status to submit"

**CRITICAL ISSUE**: No resubmission flow exists!
- Edit page allows changes to pending_confirmation orders
- But submit endpoint rejects non-draft orders
- No API endpoint for resubmitting edited orders

### Step 5: Internal User Reviews Order

**John (internal user) sees new order notification**

**Click 19: John navigates to /orders/[id]**
- Sees order in "Awaiting Confirmation" status
- Order details show 3 links across 2 clients
- ❌ No "Confirm Order" button visible on main page

**Click 20: John navigates to /orders/[id]/confirm**
- ✅ Dedicated confirmation page for internal users
- Shows order summary
- Lists all target pages with keyword status

**Target Page Status**:
```
☐ bestbuy.com/smartphones - No keywords
☐ bestbuy.com/accessories - No keywords  
☐ amazon.com/electronics - No keywords
```

**Click 21: John selects all pages without keywords**
- All 3 checkboxes selected (auto-selected by default)

**Click 22: John clicks "Generate Keywords"**
- Shows "Processing 1/3: bestbuy.com/smartphones"
- Generates keywords for each page
- Updates to show "✓ 5 keywords" for each page

**Click 23: John selects user to assign projects to**
- UserSelector dropdown shows internal users
- John selects "Mike" from dropdown

**Click 24: John clicks "Confirm Order"**

**What happens**:
1. POST /api/orders/[id]/confirm called
2. Creates bulk analysis projects:
   - "Order #abc123 - BestBuy" project
   - "Order #abc123 - Amazon" project
3. Updates order status: 'pending_confirmation' → 'confirmed'
4. Updates order state: 'awaiting_review' → 'analyzing'
5. Redirects to /orders/[id]/detail → /orders/[id]

### Step 6: Bulk Analysis Setup

**John is redirected to /orders/[id]**

**Order Status**: "Finding Sites" (analyzing state)

**Click 25: John clicks on "View" next to BestBuy analysis**
- ❌ Button exists but no navigation defined
- Should link to /bulk-analysis/[projectId]

**ISSUE**: No clear path from order to bulk analysis project!

### Step 7: Adding Domains (Manual Process)

**John manually navigates to /bulk-analysis**

**Click 26: John finds "Order #abc123 - BestBuy" project**
- Opens bulk analysis project
- Project shows:
  - Auto-apply keywords from target pages
  - Tags: order, 3 links, order-group:[id], target-page:[ids]

**Click 27-35: John adds domains**
- Manually adds domains via UI or CSV import:
  - techblog.com (DR: 75, Traffic: 50k)
  - gadgetreview.net (DR: 68, Traffic: 30k)
  - electronicsweekly.com (DR: 82, Traffic: 120k)
  - phonearena.com (DR: 71, Traffic: 45k)
  - bestbuyblog.com (DR: 65, Traffic: 25k)

**Click 36: John qualifies domains**
- Marks 3 as "high_quality"
- Marks 2 as "good_quality"

### Step 8: Submitting Domains to Client

**CRITICAL GAP**: How do domains get from bulk analysis to order?

**Expected Flow**:
1. Select domains in bulk analysis
2. Click "Submit to Client"
3. Creates site submissions for order

**Actual**:
- ❌ No "Submit to Client" button in bulk analysis
- ❌ No API endpoint to bridge domains to orders
- ❌ Site-selections endpoint expects domains but no trigger

**WORKAROUND** (if implemented):
**Click 37: John navigates to order site-selections API**
- Would need to manually POST to /api/orders/[id]/groups/[groupId]/site-selections
- With domain IDs from bulk analysis

### Step 9: External User Site Review

**Assuming sites were submitted somehow**

**Click 38: Sarah refreshes /orders/[id]**
- Order now shows "Ready for Review" status
- Site recommendations section appears

**What Sarah sees**:
```
Site Recommendations
BestBuy: 3 sites pending review

[Expand button missing - hardcoded to show inline]

🌐 techblog.com
   DR: 70  Traffic: 10,000  $100  [❌] [✓]
   
🌐 gadgetreview.net  
   DR: 70  Traffic: 10,000  $100  [❌] [✓]
```

**Issues**:
1. ❌ DR/Traffic values are hardcoded (always 70/10,000)
2. ❌ No expand/collapse toggle (state exists but no button)
3. ❌ Special instructions textarea shown but not saved
4. ✅ Approve/Reject buttons work

**Click 39-41: Sarah reviews sites**
- Approves techblog.com
- Approves gadgetreview.net  
- Rejects electronicsweekly.com (too expensive)

**API Calls**: POST /api/orders/[id]/groups/[groupId]/submissions/[id]/review
- Updates submission status
- Records review timestamp and user

### Step 10: Post-Review Status

**After all sites reviewed**:
- ❌ Order remains in 'site_review' state
- ❌ No automatic progression to next state
- ❌ No notification to internal team

**Expected**: Order should move to 'payment_pending' or 'in_progress'
**Actual**: Manual intervention required to update state

## Summary of Critical Issues

### 🚨 Blockers (Prevents Core Functionality)

1. **No Resubmission Flow**
   - Edit page allows editing pending_confirmation orders
   - Submit endpoint only accepts draft orders
   - External users cannot resubmit after initial submission

2. **No Bridge from Bulk Analysis to Orders**
   - Domains added to bulk analysis projects
   - No UI/API to submit these domains as site recommendations
   - Site-selections endpoint exists but no trigger mechanism

3. **No Order State Progression**
   - Order stuck in site_review after all sites reviewed
   - No automatic state updates
   - Manual database update required

### ❌ Major Issues (Broken Features)

4. **Missing Advertiser Information**
   - No form to collect advertiser name/company
   - Orders created with empty advertiser fields
   - No way to add this info later

5. **Hardcoded Domain Metrics**
   - All domains show DR: 70, Traffic: 10,000
   - Real metrics not stored or displayed
   - Misleading information for decision making

6. **No Navigation to Bulk Analysis**
   - "View" button exists but doesn't link anywhere
   - Users must manually find projects
   - No clear connection between orders and analysis

### 🐛 UI/UX Issues

7. **Missing Expand/Collapse for Sites**
   - expandedSubmission state exists in code
   - No toggle button to expand/collapse per client
   - Sites always shown inline

8. **No Confirm Order Button on Main Page**
   - Internal users must know to navigate to /confirm
   - Not discoverable from main order page

9. **Special Instructions Not Saved**
   - Textarea shown for site submissions
   - Value not persisted in submission metadata

### 📊 Data Flow Issues

10. **Project Assignment Confusion**
    - Projects can be assigned to users
    - But order assignment separate
    - No clear ownership model

11. **No Notification System**
    - State changes don't notify users
    - External users don't know when sites ready
    - Internal users don't know about approvals

## Recommended Fix Priority

1. **Implement Resubmission API** - Without this, orders get stuck
2. **Create Bulk Analysis → Order Bridge** - Core feature completely missing
3. **Add State Progression Logic** - Orders need to flow automatically
4. **Store/Display Real Domain Metrics** - Critical for decision making
5. **Add Advertiser Info Collection** - Basic order data missing