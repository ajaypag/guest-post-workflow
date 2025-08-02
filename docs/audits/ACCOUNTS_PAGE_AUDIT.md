# Accounts Page Audit Report

## Current State Analysis

### 1. **Security & Access Control** ❌ Partial
**Current**: 
- Basic authentication check via `sessionStorage`
- Redirects non-internal users to home
- No role-based access control for admin features

**Best Practice**:
- Should use `InternalPageWrapper` for consistency
- Need explicit admin role check for sensitive actions
- Password reset should require admin role confirmation

### 2. **Data Loading & Error Handling** ⚠️ Needs Improvement
**Current**:
```javascript
try {
  const response = await fetch('/api/accounts');
  if (response.ok) {
    const data = await response.json();
    setAccounts(data.accounts || []);
  }
} catch (error) {
  console.error('Error loading accounts:', error);
}
```

**Issues**:
- No user-facing error messages
- Silent failures (console.error only)
- No retry mechanism
- No loading states for individual actions

**Best Practice**:
- Display error messages to users
- Implement retry logic for failed requests
- Show loading states for all async operations
- Handle specific error cases (401, 403, 500, etc.)

### 3. **UI/UX Design** ✅ Good, but can improve
**Current Strengths**:
- Clean table layout with hover states
- Good use of status badges with icons
- Responsive grid for stats cards
- Search and filter functionality

**Missing**:
- No pagination (will break with many accounts)
- No bulk actions
- No export functionality
- Limited action buttons (only status changes)
- No edit capability for account details

### 4. **State Management** ⚠️ Needs Optimization
**Current Issues**:
- Filters and sorting done client-side on every render
- No debouncing on search input
- Refetches all data after status update
- No optimistic updates

**Best Practice**:
```javascript
// Debounced search
const debouncedSearch = useMemo(
  () => debounce(setSearchTerm, 300),
  []
);

// Memoized filtered results
const filteredAccounts = useMemo(() => {
  return accounts.filter(/* ... */).sort(/* ... */);
}, [accounts, searchTerm, statusFilter, sortBy]);
```

### 5. **Missing Critical Features** ❌
1. **Password Reset** - Main requirement not implemented
2. **Account Editing** - Can't update contact info, company name, etc.
3. **View Account Details** - No detailed view page
4. **Activity Logs** - No audit trail for admin actions
5. **Email Verification** - Can't resend verification emails
6. **Notes Management** - Can't view/edit internal notes
7. **Pagination** - Will fail with large datasets

### 6. **Data Display** ⚠️ Incomplete
**Current**:
- Shows basic info (name, company, email)
- Shows order count and revenue
- Shows last login

**Missing**:
- Email verification status
- Credit terms/limits
- Account creation date
- Onboarding status
- Number of brands/clients

### 7. **Actions & Permissions** ❌ Limited
**Current Actions**:
- Activate/Suspend/Reactivate only
- View client (if exists)

**Missing Actions**:
- Reset password
- Edit account details
- Resend verification email
- View full account profile
- View order history
- Add/remove client associations
- Delete account (with confirmation)

### 8. **Code Quality** ⚠️ 
**Issues**:
- Large component (425 lines) - should be split
- Inline styles mixed with Tailwind
- No proper TypeScript for API responses
- Hardcoded strings (should use constants)

## Recommended Improvements

### 1. **Immediate Fixes (High Priority)**
```typescript
// Add password reset functionality
const resetPassword = async (accountId: string) => {
  if (!confirm('Reset password for this account? They will receive an email.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/accounts/${accountId}/reset-password`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      showNotification('success', 'Password reset email sent');
    } else {
      const error = await response.json();
      showNotification('error', error.message);
    }
  } catch (error) {
    showNotification('error', 'Failed to reset password');
  }
};
```

### 2. **Add InternalPageWrapper**
```typescript
export default function AccountsPage() {
  return (
    <InternalPageWrapper requireAdmin={true}>
      <AccountsPageContent />
    </InternalPageWrapper>
  );
}
```

### 3. **Implement Pagination**
```typescript
const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const ITEMS_PER_PAGE = 20;

// In API call
const response = await fetch(`/api/accounts?page=${page}&limit=${ITEMS_PER_PAGE}`);
```

### 4. **Add Account Actions Dropdown**
```typescript
<DropdownMenu>
  <DropdownMenuTrigger>
    <MoreVertical className="w-4 h-4" />
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => router.push(`/accounts/${account.id}`)}>
      View Details
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setEditingAccount(account)}>
      Edit Account
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => resetPassword(account.id)}>
      Reset Password
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => resendVerification(account.id)}>
      Resend Verification
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem 
      className="text-red-600"
      onClick={() => deleteAccount(account.id)}
    >
      Delete Account
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 5. **Add Proper Error Handling**
```typescript
const [error, setError] = useState<string | null>(null);
const [actionLoading, setActionLoading] = useState<string | null>(null);

// Wrap all actions
const handleAction = async (
  action: () => Promise<void>, 
  actionId: string,
  successMessage: string
) => {
  setActionLoading(actionId);
  setError(null);
  
  try {
    await action();
    showNotification('success', successMessage);
  } catch (error) {
    setError(error.message);
    showNotification('error', 'Action failed');
  } finally {
    setActionLoading(null);
  }
};
```

### 6. **Component Structure Refactor**
```
/app/accounts/
  page.tsx (main wrapper)
  components/
    AccountsTable.tsx
    AccountsFilters.tsx
    AccountsStats.tsx
    AccountEditModal.tsx
    AccountActions.tsx
```

## Security Considerations

1. **Admin Verification**: All sensitive actions need double-checking admin role
2. **Audit Logging**: Log all admin actions (password resets, status changes, etc.)
3. **Rate Limiting**: Implement rate limiting on password reset endpoint
4. **CSRF Protection**: Ensure all state-changing requests have CSRF protection
5. **Input Validation**: Validate all inputs on both client and server

## Conclusion

The current `/accounts` page provides basic functionality but lacks critical admin features. The most pressing needs are:

1. Password reset capability (requested feature)
2. Proper admin role verification using `InternalPageWrapper`
3. Pagination for scalability
4. Better error handling and user feedback
5. Account editing capabilities
6. Action logging for audit trails

The page follows some good UI patterns but needs significant enhancement to meet production admin panel standards.