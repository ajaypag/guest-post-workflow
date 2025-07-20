# V2 Mock Agent Test Plan

## Test URL
https://164.postflow.outreachlabs.net/workflow/fd279319-f12d-4671-96fe-35c06065174b?step=5

## Pre-Test Setup
1. Open Browser Developer Tools (F12)
2. Go to Console tab
3. Clear console
4. Keep Network tab open in background

## Test Sequence

### Test 1: Basic Mock Generation
1. Navigate to Article Draft step (step 5)
2. Click "🧠 AI Agent V2" tab
3. Enable "Test Mode" toggle (yellow banner)
4. Click "Start Mock Generation"
5. **Expected Console Output:**
   ```
   [MOCK V2] MOCK MODE: Starting simulated V2 generation...
   [MOCK V2] Workflow ID: fd279319-f12d-4671-96fe-35c06065174b
   [MOCK V2] Outline length: XXX characters
   ```

### Test 2: Verify onComplete Callback
1. Wait for generation to complete (10 seconds)
2. **Expected Console Output:**
   ```
   [MOCK V2] ✅ Mock generation complete!
   [MOCK V2] 📊 Mock article length: XXXX characters
   [MOCK V2] 🔄 Calling onComplete callback...
   [ArticleDraftStepClean] Mock onComplete called with article length: XXXX
   [ArticleDraftStepClean] Calling onChange with updated outputs
   ```

### Test 3: Verify Auto-Save Trigger
1. After generation completes, wait 2-3 seconds
2. **Expected Console Output:**
   ```
   🟡 FormComponent onChange called: {fullArticle: ..., agentVersion: "v2-mock"}
   🔎 Checking fullArticle:
      Old exists: false, length: 0
      New exists: true, length: XXXX
   ✅ Critical field "fullArticle" has changed
   🔄 Critical field changed, triggering auto-save
   ⏱️ Auto-saving after 2 seconds of inactivity
   🟢 handleSave called: {isManualSave: false}
   ```

### Test 4: Check Network Activity
1. Switch to Network tab
2. Look for POST request to `/api/workflows/[id]`
3. Check request payload contains:
   - fullArticle (should have content)
   - agentGenerated: true
   - agentVersion: "v2-mock"

### Test 5: Test Navigation Guard
1. Try to switch to "ChatGPT.com" tab
2. **Expected:** Warning dialog about unsaved changes
3. Click "Cancel" to stay

### Test 6: Test Page Navigation
1. Try to click on a different workflow step
2. **Expected:** Warning dialog asking to save
3. Click "Save" 
4. **Expected Console Output:**
   ```
   Saving your changes...
   ✅ Changes saved successfully
   ```

### Test 7: Verify Data Persistence
1. After save completes, navigate to a different step
2. Navigate back to Article Draft step
3. Go to AI Agent V2 tab
4. **Expected:** The mock article should still be visible in the full article field

## Diagnostic Commands to Run in Console

After test completion, run these in the console:

```javascript
// Check if data is in local state
console.log('Current step outputs:', window.__NEXT_DATA__);

// Check localStorage for any cached data
console.log('LocalStorage workflow data:', localStorage.getItem('workflow-fd279319-f12d-4671-96fe-35c06065174b'));
```

## Common Issues to Look For

1. **No onChange Called:**
   - The V2 component might not be calling onComplete
   - Check for any errors in console

2. **onChange Called but No Save:**
   - Auto-save timer might not be working
   - Check if hasChangedCriticalField is detecting changes

3. **Save Called but Data Lost:**
   - Network request might be failing
   - Database might not be accepting the data
   - Data might be too large

4. **Data Saved but Not Displayed:**
   - Page might not be loading the saved data
   - State might not be updating correctly

## Debug Data to Collect

Please collect and share:
1. Full console log from start to finish
2. Network tab screenshot showing save requests
3. Any error messages
4. The request/response bodies from the save API call