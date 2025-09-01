# Publishers Table - AI Extraction Guidelines (Corrected Fields)

## Overview
Extract publisher information from email trails using AI reasoning. Remember: emails contain both our outreach and publisher replies - extract ONLY from publisher replies, ignore our pitches.

## Field Definitions & Examples

### email (VARCHAR(255) REQUIRED UNIQUE)
**What it is**: Publisher's business contact email (from their reply, not our outreach).

**Examples**:
- ✅ Good: "contact@publishinghouse.com", "sarah@techblog.io", "info@contentmarketing.co.uk"
- ❌ Bad: "not-an-email", "@company.com", "email", anything without @ symbol

**Email Trail Context**: Extract from publisher's reply email address or signature, NOT from our outreach emails.

---

### companyName (VARCHAR(255) REQUIRED)
**What it is**: Publisher's business/company name (from their reply content, signatures, or email domain).

**Examples**:
- ✅ Good: "Acme Publishing", "TechCrunch Media", "Sarah's Writing Services", "Digital Marketing Pro"
- ❌ Bad: "john@gmail.com", "N/A", "undefined", "123", single letters, our company name

**Email Trail Context**: Extract from publisher signatures, "We are..." statements, or infer from their business email domain.

---

### contactName (VARCHAR(255) DEFAULT 'Unknown')
**What it is**: Name of the person replying (publisher's contact person).

**Examples**:
- ✅ Good: "John Smith", "Sarah Johnson-Williams", "Li Wei", "José García"
- ❌ Bad: "TechCorp Inc", "info@email.com", company names, our team member names

**Email Trail Context**: Extract from publisher's email signature or "Hi, I'm [Name]" introductions in their replies.

---

### phone (VARCHAR(50) OPTIONAL)
**What it is**: Publisher's business phone (if they provide it in their reply).

**Examples**:
- ✅ Good: "+1-555-123-4567", "(555) 123-4567", "555.123.4567 ext 123", "+44 20 7123 4567"
- ❌ Bad: "123", "555-CALL-NOW", "000-000-0000", "123-456-789", our phone numbers

**Email Trail Context**: Extract only if publisher provides their phone in signature or contact details.

---

### paymentEmail (VARCHAR(255) OPTIONAL)
**What it is**: Separate email for payments (PayPal, invoicing) if different from main contact.

**Examples**:
- ✅ Good: "billing@publisher.com", "payments@techblog.io", "sarah.payments@company.com"
- ❌ Bad: Same as main email, our payment emails, invalid formats

**Email Trail Context**: Extract only if publisher mentions specific payment contact in their reply.

---

### paymentMethod (VARCHAR(50) DEFAULT 'paypal')
**What it is**: Publisher's preferred payment method.

**Examples**:
- ✅ Good: "paypal", "wire", "check", "stripe", "bank_transfer"
- ❌ Bad: Our payment preferences, specific account numbers, unclear methods

**Email Trail Context**: Extract only if publisher mentions payment preferences like "PayPal only" or "we accept wire transfers".

---

### internalNotes (TEXT OPTIONAL)
**What it is**: Important information the AI thinks our team should know for review.

**Examples**:
- ✅ Good: "Mentions 24-hour turnaround", "Requires pre-approval of all content", "Only accepts finance topics"
- ❌ Bad: Repeating basic contact info, our internal processes, unimportant details

**Email Trail Context**: Extract business-critical information from publisher replies that affects our workflow.

---

### confidenceScore (DECIMAL(3,2) REQUIRED)
**What it is**: AI's confidence in extraction accuracy (0.00 to 1.00).

**Scoring Guidelines**:
- **0.90-1.00**: Clear business information, distinguishable publisher reply
- **0.70-0.89**: Most information clear, some uncertainty about publisher vs outreach  
- **0.50-0.69**: Mixed email trail, partial information extracted
- **0.00-0.49**: Mostly our outreach content, very little clear publisher info

**Email Trail Context**: Lower confidence if difficult to distinguish our emails from publisher replies.

---

## System-Managed Fields (Don't Extract)

These fields are set by the system, not extracted from emails:

- **emailVerified**: Always `false` (system will verify later)
- **status**: Always `'pending'` (shadow publisher status) 
- **accountStatus**: Always `'shadow'` (unclaimed account)
- **source**: Always `'manyreach'` (import source identifier)
- **sourceMetadata**: System stores original email content as JSON
- **createdAt/updatedAt**: System timestamps

## Fields Moved to Other Tables (Technical Debt)

These fields exist in publishers table but should NOT be extracted (will be migrated):

- ❌ **contentGuidelines** → Moving to publisherOfferings table
- ❌ **prohibitedTopics** → Moving to publisherOfferings table  
- ❌ **turnaroundTime** → Moving to publisherOfferings table

**Reason**: These are service-specific, not publisher-wide (different for guest posts vs link insertions).

## Email Trail Processing Instructions

### Critical Context
Publisher emails contain **both our outreach AND their replies**. AI must:

1. **Identify publisher content**: Look for reply markers ("> Original message", "On [date] you wrote", quoted sections)
2. **Extract from replies only**: Ignore our pitch content, focus on their business information
3. **Use reply signatures**: Publisher contact details usually in their email signature
4. **Recognize their voice**: "We are...", "Our rates are...", "We offer..." statements

### Example Email Trail Context
```
From: john@techblog.com
Subject: Re: Guest Post Opportunity

Hi,

Thanks for reaching out. We are TechBlog Media and we do offer guest posting services.

Our rates are $200 for a guest post with 2 dofollow links. Payment via PayPal only.
Turnaround is typically 5 business days.

Best regards,
John Smith
TechBlog Media
Phone: (555) 123-4567

> ---- Original Message ----
> From: our-team@linkio.com  
> Hi there! We're LinkIO and we help businesses...
> [OUR OUTREACH CONTENT - IGNORE THIS]
```

**Extract From**: Publisher's reply portion only  
**Ignore**: Our original outreach message (quoted section)

## Output Format
```json
{
  "email": "john@techblog.com",
  "companyName": "TechBlog Media", 
  "contactName": "John Smith",
  "phone": "(555) 123-4567",
  "paymentEmail": null,
  "paymentMethod": "paypal",
  "internalNotes": "5 business day turnaround mentioned, $200 guest posts with 2 dofollow links",
  "confidenceScore": 0.95
}
```

## AI Processing Quality Control

### High Confidence Indicators (0.90-1.00)
- Clear separation between our outreach and publisher reply
- Publisher provides specific business information
- Contact details in professional signature
- Pricing and service details mentioned

### Medium Confidence Indicators (0.70-0.89) 
- Some publisher reply content identifiable
- Basic contact information available
- Some uncertainty about what's ours vs theirs

### Low Confidence Indicators (0.50-0.69)
- Difficult to separate our content from theirs
- Minimal publisher business information
- Generic or auto-reply responses

### Very Low Confidence (0.00-0.49)
- Mostly our outreach content visible
- No clear publisher response
- Auto-reply or out-of-office messages
- Flag for manual review