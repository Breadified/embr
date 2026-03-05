# Integration Tests Directory

This directory contains integration tests that verify multiple components working together.

## Structure
- `auth-flow/` - Complete authentication flows
- `activity-sessions/` - End-to-end activity tracking
- `offline-sync/` - Offline/online synchronization tests

## Test Types
- **Auth Integration**: Welcome → Auth → Onboarding → Dashboard
- **Activity Flows**: Start activity → Use timer → Complete session
- **Sync Testing**: Offline actions → Online sync validation
- **Edge Cases**: Network failures, state corruption, recovery

## Example Integration Test
```typescript
describe('Activity Session Flow', () => {
  it('should complete nursing session end-to-end', async () => {
    // Render app in test state
    const { getByText, getByTestId } = render(<App />);
    
    // Navigate to nursing
    fireEvent.press(getByText('Nursing'));
    
    // Start timer
    fireEvent.press(getByText('Start'));
    
    // Wait for timer to run
    await waitFor(() => expect(getByText('00:01')).toBeTruthy());
    
    // Complete session
    fireEvent.press(getByText('Complete Session'));
    
    // Verify session saved
    expect(getByText('Session completed')).toBeTruthy();
  });
});
```