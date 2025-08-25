# Expanded Domain Details UX Research & Redesign Plan

## **Executive Summary**
The expanded domain view is the core decision-making interface that "sells everything about what we do." Users need to quickly answer: **"Should I use this domain? If yes, what page should I target?"** The current layout has information hierarchy issues that make it difficult for users to make confident decisions.

## **Current System Analysis**

### **Domain Intelligence Section**
**What it does:**
1. **Quality Assessment** - Shows qualification date and status
2. **AI Analysis** - Provides AI reasoning for qualification
3. **Keyword Analysis** - Analyzes client keywords vs target site keywords
4. **Supporting Evidence** - Shows actual keywords found and their ranking positions
5. **Content Strategy** - Recommends content approach based on analysis

**Key Metrics Explained:**
- **Overlap Type**: 
  - `direct` = Site ranks for your exact niche keywords
  - `related` = Site ranks for broader industry topics  
  - `both` = Has direct niche keywords AND related industry topics
  - `none` = No topical relevance found

- **Authority Strength** (FOUND - not removed):
  - **Direct Authority**: How well the site ranks for your exact keywords
  - **Related Authority**: How well the site ranks for broader industry keywords
  - Values: `strong` (top 1-3 pages), `moderate` (pages 4-6), `weak` (page 7+)

- **Supporting Evidence**:
  - **Direct Keywords**: Exact match keywords found
  - **Related Keywords**: Industry-adjacent keywords found
  - **Median Position**: Average ranking position for those keywords

### **Target Page Analysis Section**
**What it does:**
1. **AI Recommended Target** - Shows the primary suggested URL
2. **Page Analysis** - Scrollable list of analyzed target pages with match quality
3. **Match Quality Metrics** - Shows direct/related keyword counts per URL
4. **Evidence** - Detailed analysis of why each URL is a good/poor match

**Current Issues Identified:**
- Match quality numbers (direct 0, related 7) lack context
- Scrollable area was too small (fixed to h-[28rem])
- No clear hierarchy between "best match" vs "other options"

### **Project Context Section**
**What it does:**
- Shows what target URLs the domain was originally vetted against
- Displays original keywords used for analysis
- Provides historical context for the qualification

## **User Decision-Making Analysis**

### **Primary User Questions:**
1. **"Should I use this domain?"** - Need quality assessment and evidence
2. **"What page should I target?"** - Need clear recommendation with reasoning
3. **"Why is this a good match?"** - Need evidence and keyword overlap data
4. **"Is this better than other options?"** - Need comparative context

### **Current UX Problems:**
1. **Information Overload** - Too much data with equal visual weight
2. **Poor Scannability** - Dense text blocks, no visual hierarchy
3. **Duplicate Information** - Target URLs appear in multiple sections
4. **Buried Action Items** - AI recommendations not prominently featured
5. **Unclear Metrics** - Numbers without proper context/explanation
6. **Context vs Decision Confusion** - Historical data mixed with actionable insights

## **Competitive Analysis**
**What users expect from similar tools (Ahrefs, SEMrush):**
- **Executive summary first** - Key metrics and recommendations prominently displayed
- **Progressive disclosure** - Summary view with option to drill deeper
- **Clear visual hierarchy** - Important information stands out
- **Action-oriented layout** - What to do next is obvious
- **Scannable format** - Quick decisions possible without reading everything

## **Redesign Principles**

### **1. Information Architecture Hierarchy**
```
TIER 1 (Hero/Summary): 
- AI Recommended Target URL (prominent)
- Quality Score (visual indicator)
- Key Evidence Summary (1-2 lines)

TIER 2 (Supporting Details):
- Match Quality Breakdown
- Alternative Target Options (collapsed)
- Keyword Evidence (collapsed)

TIER 3 (Context/Background):
- Full AI Analysis
- Project Context
- Domain Metrics
```

### **2. Progressive Disclosure Strategy**
- **Collapsed by default**: Show summary data with expansion options
- **Smart defaults**: Most important information visible immediately
- **Expand for details**: Full data available when needed
- **Visual indicators**: Clear icons/badges for quality levels

### **3. Decision-Focused Layout**
- **Lead with recommendation** - AI suggested target as hero element
- **Evidence hierarchy** - Best evidence first, supporting data follows
- **Clear CTAs** - Obvious next steps (use this domain/target this page)
- **Comparative context** - How this compares to other options

## **Proposed Redesign Structure**

### **Section 1: Executive Summary (Always Visible)**
```
┌─ AI RECOMMENDED TARGET ────────────────────┐
│ 🎯 https://example.com/best-page/          │
│ ⭐ Excellent Match | Direct: 8 Related: 7  │
│ 📝 "Strong keyword overlap with direct     │
│     ranking evidence for target terms"     │
└───────────────────────────────────────────┘
```

### **Section 2: Evidence Summary (Collapsible)**
```
▼ Supporting Evidence
├─ Direct Keywords: 8 found (avg rank: 12.3)
├─ Related Keywords: 15 found (avg rank: 18.7)  
├─ Authority: Strong direct, Moderate related
└─ Content Strategy: Short-tail focus recommended
```

### **Section 3: Alternative Targets (Collapsible)**
```
▼ Other Target Options (2 analyzed)
├─ /secondary-page/ - Good match (Direct: 3, Related: 12)
└─ /third-option/ - Fair match (Direct: 1, Related: 8)
```

### **Section 4: Full Analysis (Collapsible)**
```
▼ Detailed Analysis
├─ AI Reasoning: [Full qualification text]
├─ Keyword Evidence: [Full keyword lists]
└─ Project Context: [Vetted against info]
```

## **Implementation Plan**

### **Phase 1: Core Layout Restructure**
- [ ] Create executive summary section with AI recommendation as hero
- [ ] Add visual quality indicators (stars, badges, color coding)
- [ ] Implement progressive disclosure with collapsible sections
- [ ] Improve information hierarchy with proper typography scale

### **Phase 2: Content & Context Improvements**
- [ ] Add explanatory text for all numeric metrics
- [ ] Create comparison context between target options
- [ ] Implement smart defaults for collapsed sections
- [ ] Add visual indicators for match quality levels

### **Phase 3: Enhanced User Experience**
- [ ] Add quick action buttons (Use Domain, Target Page)
- [ ] Implement smart tooltips for complex metrics
- [ ] Create visual comparisons between alternatives
- [ ] Add contextual help text throughout

## **Success Metrics**
- **Reduced time to decision** - Users can evaluate domains faster
- **Increased confidence** - Clear evidence supports recommendations
- **Better understanding** - Metrics have clear explanations
- **Improved conversion** - More domains selected for use

## **Next Steps**
1. **Code audit complete** - Understanding current implementation ✓
2. **Create mockups** - Design new progressive disclosure layout
3. **Implement core structure** - Build collapsible sections with summaries
4. **Test with users** - Validate decision-making improvements
5. **Iterate based on feedback** - Refine based on actual usage

---

**Key Insight**: The current layout treats all information as equally important. The redesign should create a clear hierarchy that supports quick decision-making while maintaining access to detailed analysis for users who need it.