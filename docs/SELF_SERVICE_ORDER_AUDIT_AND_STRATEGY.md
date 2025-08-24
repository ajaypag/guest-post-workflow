# Self-Service Order Workflow Audit & Implementation Strategy

**Date**: 2025-08-23  
**Context**: Enable account users to create vetted domain orders without internal bottlenecks

---

## 🔍 AUDIT FINDINGS

### **Current Workflow Issues Identified**
1. **Order edit page missing domain column** - Users can't see which specific vetted domains they're ordering
2. **Pricing disconnect** - Edit page uses estimated pricing instead of real vetted site pricing
3. **Status/state workflow blocks account users** - Internal confirmation required before progression
4. **Line items show but users can't take meaningful action** - Stuck waiting for internal "ready for review"

### **Gap Analysis Results**

| Component | Current State | Required for Self-Service | Status |
|-----------|--------------|---------------------------|--------|
| **Domain Display** | ❌ No domain column in edit table | ✅ Need prominent domain column | 🔥 Critical Gap |
| **Pricing Integration** | ❌ Uses `estimatedPricePerLink` | ✅ Use `PricingService.getDomainPrice()` | 🔥 Critical Gap |
| **Target URL Selection** | ✅ CreateTargetPageModal exists | ✅ Already flexible via "+ Add new" | ✅ Already Works |
| **State/Status Logic** | ❌ Internal-dependent flow | ✅ Self-service progression | 🔥 Critical Gap |

### **Technical Infrastructure Assessment**

**✅ EXISTING ASSETS**:
- `PricingService.getDomainPrice(domain)` - Real pricing lookup
- `assignedDomain` field in line items schema  
- `CreateTargetPageModal` - Flexible URL input
- Status/state progression logic framework

**❌ MISSING INTEGRATION**:
- Domain column display in edit UI
- Real pricing integration in edit flow
- Self-service status progression

---

## 🎯 IMPLEMENTATION STRATEGY

### **Core Vision Validation**
User's proposed workflow: `Draft (with domains + real pricing)` → `Internal confirms feasibility` → `User final review` → `Pay`

**STRATEGY CONFIRMED**: Keep internal quality gate but enable rich self-service draft creation.

### **Key Changes Required**

#### **1. Enhanced Draft Order Edit Page**
- **Add Domain Column**: Show `assignedDomain` prominently in table
- **Real Pricing Integration**: Replace estimated with `PricingService.getDomainPrice()`
- **Domain-Rich Display**: Users see exactly what they're ordering

#### **2. Status/State Flow Modification**  
- **Draft Status Enhancement**: Allow rich domain + pricing configuration
- **Internal Quality Gate**: Keep feasibility confirmation step
- **Self-Service Progression**: Remove blocks for draft management

#### **3. Table View Logic Updates**
- **Status-Based Rendering**: Modify conditions for displaying different table components
- **Account User Permissions**: Enable draft editing capabilities

---

## 📋 IMPLEMENTATION TASK LIST

### **Phase 1: Core Edit Page Enhancement** (High Priority)

#### **Task 1.1: Add Domain Column to Edit Table**
- [ ] Add domain column to desktop table view (line 1976 in edit/page.tsx)
- [ ] Add domain display to mobile card view (line 1902 in edit/page.tsx)  
- [ ] Add domain column to grouped view table (line 2093+ in edit/page.tsx)
- [ ] Test responsive display across all screen sizes

#### **Task 1.2: Integrate Real Pricing Service**
- [ ] Replace `estimatedPricePerLink` with `PricingService.getDomainPrice()` calls
- [ ] Update pricing calculation logic in `updatePricing()` function
- [ ] Modify line item creation to use real domain prices
- [ ] Add loading states for pricing lookups
- [ ] Handle pricing lookup failures gracefully

#### **Task 1.3: Update Line Item Interface**
- [ ] Add domain field to `OrderLineItem` interface (line 23)
- [ ] Update line item mapping logic to include domain data
- [ ] Ensure domain data persists through state updates

### **Phase 2: Status/State Flow Updates** (High Priority)

#### **Task 2.1: Modify Table View Conditions**
- [ ] Update `LineItemsDisplay` display conditions (line 1166 in page.tsx)
- [ ] Allow account users to see/edit draft line items
- [ ] Test status-based table rendering logic

#### **Task 2.2: Enable Account User Draft Management**
- [ ] Remove internal-only restrictions on draft editing
- [ ] Allow account users to add/remove domains from drafts
- [ ] Enable self-service draft confirmation

### **Phase 3: Integration Testing** (Medium Priority)

#### **Task 3.1: Vetted Sites → Order Flow Testing**
- [ ] Test adding vetted domains to new orders
- [ ] Test adding vetted domains to existing draft orders  
- [ ] Verify pricing accuracy from vetted sites data
- [ ] Test target URL selection with vetted domains

#### **Task 3.2: User Experience Testing**
- [ ] Test account user draft creation workflow
- [ ] Test internal user feasibility confirmation step
- [ ] Test order progression through all states
- [ ] Verify responsive design across devices

#### **Task 3.3: Edge Case Testing**
- [ ] Test pricing lookup failures
- [ ] Test mixed vetted/non-vetted domain orders
- [ ] Test concurrent user editing scenarios
- [ ] Test status transition edge cases

---

## 🧪 TESTING STRATEGY

### **Unit Tests**
- [ ] PricingService integration with edit page
- [ ] Domain display component rendering
- [ ] Status/state logic modifications

### **Integration Tests**  
- [ ] Vetted sites → order flow end-to-end
- [ ] Account user draft management permissions
- [ ] Internal confirmation workflow

### **User Acceptance Tests**
- [ ] Account user can create rich domain drafts
- [ ] Internal users can confirm feasibility
- [ ] Order progression works without blocks
- [ ] Pricing accuracy matches vetted sites

### **Performance Tests**
- [ ] Pricing lookup performance with multiple domains
- [ ] Table rendering performance with domain data
- [ ] Edit page responsiveness under load

---

## 🎯 SUCCESS CRITERIA

**Phase 1 Complete When**:
- Account users see domain columns in edit page
- Real pricing displays instead of estimates
- Domain data persists through edit operations

**Phase 2 Complete When**:
- Account users can self-manage draft orders
- Internal confirmation step works as quality gate
- Status transitions don't block self-service

**Full Success When**:
- Account users can create vetted domain orders independently
- Internal team confirms feasibility efficiently  
- Order progression flows smoothly to payment
- System handles edge cases gracefully

---

## 🚨 RISKS & MITIGATION

**Risk**: Pricing lookup performance impact  
**Mitigation**: Implement caching and batch lookups

**Risk**: Complex status/state logic breaks  
**Mitigation**: Comprehensive testing of all state transitions

**Risk**: Account users create invalid orders  
**Mitigation**: Client-side validation and internal confirmation step

**Risk**: UI becomes cluttered with domain column  
**Mitigation**: Responsive design and mobile-optimized layouts

---

*This strategy enables the self-service vetted domain ordering workflow while maintaining quality controls and system stability.*