# BrandIntelligenceGenerator Component Guide

Complete documentation for the Brand Intelligence System UI component.

## Overview

The `BrandIntelligenceGenerator` component provides a multi-phase user interface for the Brand Intelligence System. It follows the same proven patterns as `AgenticOutlineGeneratorV2` for handling long-running AI operations with polling and session management.

## Component Location

```
components/ui/BrandIntelligenceGenerator.tsx
```

## Interface

```typescript
interface BrandIntelligenceGeneratorProps {
  clientId: string;
  onComplete?: (brief: string) => void;
}
```

**Props:**
- `clientId` (required): UUID of the client for brand intelligence generation
- `onComplete` (optional): Callback fired when final brand brief is completed

## Architecture Pattern

### Multi-Phase Workflow

The component manages a 4-phase workflow:

1. **Research Phase**: AI conducts deep business research (15-20 minutes)
2. **Input Phase**: Client provides additional context (one-time input)
3. **Brief Phase**: AI generates comprehensive brand brief
4. **Completed Phase**: Display final brief with editing capabilities

### State Management

```typescript
// Phase tracking
type CurrentPhase = 'research' | 'input' | 'brief' | 'completed';
type ResearchStatus = 'idle' | 'queued' | 'in_progress' | 'completed' | 'error';
type BriefStatus = 'idle' | 'queued' | 'in_progress' | 'completed' | 'error';

// Component state structure
const [currentPhase, setCurrentPhase] = useState<CurrentPhase>('research');
const [researchStatus, setResearchStatus] = useState<ResearchStatus>('idle');
const [briefStatus, setBriefStatus] = useState<BriefStatus>('idle');
```

### Session Resumability

Following the `AgenticOutlineGeneratorV2` pattern:
- Loads existing session on component mount
- Resumes polling for active operations
- Preserves all state across page refreshes
- Handles session lookup by client ID

## Key Features

### 1. Research Phase
- **Start Button**: Triggers OpenAI Deep Research
- **Progress Tracking**: Real-time status with elapsed time counter
- **Polling**: 5-second intervals for status updates
- **Error Handling**: Retry capability with error display

### 2. Input Phase  
- **Research Results Display**: Formatted analysis with identified gaps
- **Gap Visualization**: Categorized questions with importance levels
- **One-time Input Form**: 10,000 character limit with warning
- **Input Validation**: Prevents empty submissions

### 3. Brief Phase
- **Automatic Trigger**: Starts after client input submission
- **Progress Indicators**: Similar to research phase polling
- **Session Management**: Tracks separate brief session ID

### 4. Completed Phase
- **Brief Display**: Markdown-formatted final brief
- **Edit Capabilities**: In-place editing with 50,000 character limit
- **Copy to Clipboard**: One-click copying functionality
- **Regeneration**: Option to start completely new intelligence

## UI Components Used

### Icons (from Lucide React)
- `Bot` - Main branding and action buttons
- `CheckCircle` - Success states
- `AlertCircle` - Error states
- `Loader2` - Loading animations
- `Clock` - Time-related indicators
- `MessageSquare` - Input phase
- `FileText` - Brief display
- `Edit3` - Edit functionality
- `Copy` - Copy actions
- `Sparkles` - Generation actions

### External Dependencies
- `MarkdownPreview` - For formatted content display
- Standard React hooks (`useState`, `useEffect`, `useRef`)

## API Integration

### Endpoints Used
1. `GET /api/clients/[id]/brand-intelligence/latest` - Session loading
2. `POST /api/clients/[id]/brand-intelligence/start-research` - Start research
3. `GET /api/clients/[id]/brand-intelligence/status` - Status polling
4. `POST /api/clients/[id]/brand-intelligence/submit-input` - Client input
5. `POST /api/clients/[id]/brand-intelligence/generate-brief` - Brief generation
6. `PATCH /api/clients/[id]/brand-intelligence/brief` - Manual editing

### Polling Pattern
```typescript
const startPolling = (pollSessionId: string) => {
  const pollInterval = setInterval(async () => {
    // Fetch status every 5 seconds
    // Update UI state based on response
    // Handle completion and errors
    // Auto-stop polling when done
  }, 5000);
};
```

## Error Handling

### Comprehensive Error States
- Network failures during API calls
- Research operation failures
- Brief generation failures  
- Input validation errors
- Session loading errors

### User Experience
- Clear error messages with retry options
- Non-blocking errors (continue polling)
- Graceful degradation for missing data
- Progress preservation across errors

## Usage Examples

### Basic Usage
```typescript
import { BrandIntelligenceGenerator } from '@/components/ui/BrandIntelligenceGenerator';

function ClientPage({ clientId }: { clientId: string }) {
  return (
    <div className="space-y-6">
      <h2>Brand Intelligence</h2>
      <BrandIntelligenceGenerator 
        clientId={clientId}
        onComplete={(brief) => console.log('Brief completed:', brief)}
      />
    </div>
  );
}
```

### With Integration Callback
```typescript
function ClientDashboard({ clientId }: { clientId: string }) {
  const handleBriefComplete = (brief: string) => {
    // Update parent state
    // Trigger notifications
    // Navigate to next step
    // Save to local storage
  };

  return (
    <BrandIntelligenceGenerator 
      clientId={clientId}
      onComplete={handleBriefComplete}
    />
  );
}
```

## Styling

### CSS Classes Used
- Tailwind CSS utility classes
- Responsive design patterns
- Consistent spacing with `space-y-*`
- Color scheme: Purple primary, blue secondary, standard grays
- Interactive states: hover, disabled, focus

### Visual Design
- **Header**: Gradient purple-to-indigo background
- **Phases**: Clearly separated with borders and spacing
- **Progress**: Loading spinners and status indicators
- **Forms**: Standard input styling with character limits
- **Actions**: Prominent buttons for primary actions

## Performance Considerations

### Polling Optimization
- 5-second intervals (not too frequent)
- Automatic cleanup on unmount
- Session-based lookup (efficient)
- Counter for debugging and user feedback

### Memory Management
- Proper cleanup of intervals
- State updates only when necessary
- Memoized callbacks where appropriate
- Controlled component updates

## Integration Requirements

### Prerequisites
1. Client must exist in database
2. API endpoints must be deployed
3. Database migration must be applied
4. User must be authenticated

### Client Page Integration
The component is designed to be integrated into client management pages:
- Client details view
- Client dashboard
- Brand management section
- Content creation workflow

## Testing Considerations

### Test Cases
1. **Mount Behavior**: Session loading and initial state
2. **Research Flow**: Start, polling, completion, errors
3. **Input Validation**: Character limits, empty submissions
4. **Brief Generation**: Trigger, polling, completion
5. **Edit Functionality**: In-place editing and saving
6. **Error Recovery**: Retry mechanisms and state recovery

### Mock Data Requirements
- Sample client IDs
- Mock research output with gaps
- Sample brief content
- Error responses for testing

## Accessibility

### ARIA Support
- Proper labeling for form inputs
- Status announcements for screen readers
- Keyboard navigation support
- Focus management during phase transitions

### Visual Accessibility
- High contrast color schemes
- Clear visual hierarchy
- Loading states with text alternatives
- Error states with clear messaging

## Browser Support

### Compatibility
- Modern browsers with ES2020 support
- React 18+ compatibility
- Next.js 15+ app router support
- Mobile responsive design

### Required Browser APIs
- `fetch` API for HTTP requests
- `navigator.clipboard` for copy functionality
- `setInterval`/`clearInterval` for polling
- Local storage for potential session backup

## Future Enhancements

### Planned Features
1. **Progress Visualization**: Visual progress bars for long operations
2. **Brief Templates**: Pre-built templates for different industries
3. **Export Options**: PDF, Word, or other format exports
4. **Collaboration**: Multi-user editing and comments
5. **Version History**: Track brief changes over time
6. **AI Suggestions**: Smart editing suggestions during manual editing

### Performance Optimizations
1. **Caching**: Browser-based caching for completed briefs
2. **Lazy Loading**: Component code splitting
3. **Streaming**: Real-time updates instead of polling
4. **Offline Support**: Local storage backup for resilience

## Troubleshooting

### Common Issues
1. **Polling Not Starting**: Check session loading and API responses
2. **Progress Not Updating**: Verify API endpoints and response format
3. **Input Not Submitting**: Check validation and character limits
4. **Brief Not Loading**: Verify database state and API permissions
5. **Edit Not Saving**: Check PATCH endpoint and request format

### Debug Tools
- Browser console logging throughout component lifecycle
- Polling counter for tracking API calls
- Component state inspection via React DevTools
- Network tab monitoring for API requests