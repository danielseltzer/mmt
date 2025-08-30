# PM Memory - MMT Project

## Critical Testing Protocol

### UI Fix Verification Requirements
When finished with a UI fix or enhancement and BEFORE notifying the user that it's now fixed, VERIFY that the fix actually works at the UI layer. You should first check browser health for no console errors, but then you need to issue the click and read the contents to make sure it's actually working.

### Testing Checklist for UI Fixes
1. Run browser health check - confirms no console errors on load
2. Create and run Playwright test that performs the exact user action
3. Verify the action completes without errors
4. Check that the expected result appears in the UI
5. Only then report the fix as complete

### Never Trust These Alone
- Browser health check passing (only checks page load)
- Build success (only checks compilation)
- Unit tests passing (don't test actual UI interaction)
- API endpoint tests (don't test UI layer)

### Always Required
- Actual UI interaction testing via Playwright or similar
- Verification that the specific user action works
- Confirmation that no errors appear during the interaction