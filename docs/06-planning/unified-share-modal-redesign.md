# Unified Share Modal Redesign

## Problem: Fragmented UX
- Duplicate message fields (video message vs email message)
- Inconsistent validation (share allowed with 0 domains, email blocked)
- Separate "Add Video" vs "Send Email" sections
- Confusing user workflow

## Solution: Single Unified Interface

### 1. Always Allow Share Link Generation
- Share links work regardless of domain count (user may want to bookmark/save)
- Remove qualification check from link generation
- Keep qualification check only for email sending

### 2. Single "Share Customization" Section
Replace fragmented sections with one unified interface:

```
┌─ Share Vetted Sites Results ─────────────────┐
│                                              │
│ [Share URL: ████████████████████] [Copy]     │
│                                              │
│ ╭── Customize Share (Optional) ──────────╮   │
│ │                                        │   │
│ │ Video URL: [________________]          │   │
│ │ Custom Message: [____________]         │   │
│ │                                        │   │
│ │ ☐ Send via email                      │   │
│ │   └─ Email: [______________]           │   │
│ │   └─ Name:  [______________]           │   │
│ │                                        │   │
│ │ [Save Customization] [Send Email]     │   │
│ │                                        │   │
│ ╰────────────────────────────────────────╯   │
│                                              │
│ [Revoke Share Link]                          │
└──────────────────────────────────────────────┘
```

### 3. Unified State Management
- Single message field (shared between video and email)
- Single video URL field
- Email fields only appear when email toggle is checked
- Save customization updates the share link metadata
- Send email uses the same customization data

### 4. Smart Validation
- ✅ Share link generation: Always allowed
- ✅ Customization save: Always allowed (good for bookmarking)
- ❌ Email sending: Blocked if 0 qualified domains

### 5. Clear User Flow
1. Generate share link (always works)
2. Optionally customize with video/message
3. Optionally send via email (if qualified domains exist)
4. All customization data is shared/unified

## Benefits
- Single source of truth for message/video
- Clear, logical workflow
- No duplicate fields
- Consistent validation logic
- Professional UX