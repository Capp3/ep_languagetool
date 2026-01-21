# Testing Guide for ep_languagetool

## Overview

This document provides testing guidelines and scenarios for the ep_languagetool plugin.

## Prerequisites

1. Etherpad instance running
2. LanguageTool server running (local Docker or remote)
3. Plugin installed in Etherpad
4. Configuration set in `settings.json`

## Test Scenarios

### 1. Configuration Testing

#### Test 1.1: Default Configuration
- **Setup**: No `ep_languagetool` section in `settings.json`
- **Expected**: Plugin uses defaults (English, auto-check enabled, 2s debounce)
- **Verify**: Check console logs for default config

#### Test 1.2: Custom Configuration
- **Setup**: Add custom config to `settings.json`
- **Expected**: Plugin uses custom values
- **Verify**: Check console logs and behavior matches config

#### Test 1.3: Language Configuration
- **Setup**: Set `defaultLanguage` to different values (`en`, `de`, `fr`)
- **Expected**: Checks use specified language
- **Verify**: Check API calls include correct language parameter

### 2. Real-Time Checking

#### Test 2.1: Auto-Check Enabled
- **Setup**: `autoCheck: true`
- **Steps**: Type text in pad
- **Expected**: Check triggers 2 seconds after typing stops
- **Verify**: Console logs show check triggered

#### Test 2.2: Auto-Check Disabled
- **Setup**: `autoCheck: false`
- **Steps**: Type text in pad
- **Expected**: No automatic checks
- **Verify**: Only manual button triggers checks

#### Test 2.3: Debounce Timing
- **Setup**: Set `debounceDelay: 3000`
- **Steps**: Type continuously, then stop
- **Expected**: Check triggers 3 seconds after last keystroke
- **Verify**: Timing matches configured delay

#### Test 2.4: Change Detection
- **Steps**:
  1. Type text, wait for check
  2. Don't change text
  3. Wait for another check trigger
- **Expected**: Second check skipped (no changes)
- **Verify**: Console shows "skipping check - no changes"

### 3. Manual Check Button

#### Test 3.1: Button Click
- **Steps**: Click "Check Grammar" button
- **Expected**: Immediate check triggered (bypasses debounce)
- **Verify**: Button shows loading state, then success/error

#### Test 3.2: Button States
- **Steps**: Click button multiple times
- **Expected**:
  - Button disabled during check
  - Loading spinner shown
  - Success/error state after completion
- **Verify**: Visual states match behavior

#### Test 3.3: Button During Auto-Check
- **Steps**: Trigger auto-check, then click button
- **Expected**: Manual check takes priority, auto-check cancelled
- **Verify**: Only one check runs

### 4. Error Highlighting

#### Test 4.1: Error Display
- **Steps**: Type text with grammar errors
- **Expected**: Errors highlighted with blue wavy underlines
- **Verify**: Underlines appear on error locations

#### Test 4.2: Multiple Errors
- **Steps**: Type text with multiple errors
- **Expected**: All errors highlighted
- **Verify**: All error locations have underlines

#### Test 4.3: Error Clearing
- **Steps**:
  1. Type text with errors
  2. Fix errors
  3. Wait for check
- **Expected**: Old highlights cleared, new highlights applied
- **Verify**: Only current errors highlighted

### 5. Popup Interactions

#### Test 5.1: Popup Display
- **Steps**: Click on underlined error
- **Expected**: Popup appears with error message and suggestions
- **Verify**: Popup content matches error data

#### Test 5.2: Accept Suggestion
- **Steps**: Click "Accept" or click a suggestion
- **Expected**: Text replaced with suggestion
- **Verify**: Error underline removed, text updated

#### Test 5.3: Reject Suggestion
- **Steps**: Click "Reject"
- **Expected**: Popup closes, error remains
- **Verify**: Text unchanged, popup closed

#### Test 5.4: Popup Positioning
- **Steps**: Click error near viewport edges
- **Expected**: Popup positioned within viewport
- **Verify**: Popup fully visible

#### Test 5.5: ESC Key
- **Steps**: Open popup, press ESC
- **Expected**: Popup closes
- **Verify**: Popup removed from DOM

#### Test 5.6: Outside Click
- **Steps**: Open popup, click outside
- **Expected**: Popup closes
- **Verify**: Popup removed from DOM

### 6. Error Handling

#### Test 6.1: LanguageTool Unavailable
- **Setup**: Stop LanguageTool server or use invalid URL
- **Steps**: Trigger check
- **Expected**: Error notification shown, graceful degradation
- **Verify**: User-friendly error message displayed

#### Test 6.2: Network Error
- **Setup**: Disconnect network or use unreachable URL
- **Steps**: Trigger check
- **Expected**: Network error handled gracefully
- **Verify**: Error notification with retry option

#### Test 6.3: Rate Limiting
- **Setup**: Trigger many rapid checks
- **Steps**: Exceed rate limit
- **Expected**: Rate limit error handled
- **Verify**: Appropriate error message shown

#### Test 6.4: Timeout
- **Setup**: Use very large text or slow server
- **Steps**: Trigger check that times out
- **Expected**: Timeout error handled
- **Verify**: Timeout message shown

#### Test 6.5: Invalid Response
- **Setup**: Mock invalid API response
- **Steps**: Trigger check
- **Expected**: Error handled gracefully
- **Verify**: Error notification shown

### 7. Performance Testing

#### Test 7.1: Large Pad (10-20 pages)
- **Steps**: Create large pad, trigger check
- **Expected**: Check completes without performance issues
- **Verify**: Response time acceptable, no UI freezing

#### Test 7.2: Concurrent Users (3 users)
- **Steps**: 3 users editing same pad simultaneously
- **Expected**: Checks work for all users, no conflicts
- **Verify**: Each user sees their own error highlights

#### Test 7.3: Rapid Typing
- **Steps**: Type very quickly
- **Expected**: Debounce prevents excessive API calls
- **Verify**: Check triggers only after typing stops

#### Test 7.4: Cache Performance
- **Steps**:
  1. Check same text twice
  2. Verify cache hit
- **Expected**: Second check uses cache (faster)
- **Verify**: Console shows "Using cached result"

### 8. Language Testing

#### Test 8.1: English (Default)
- **Setup**: `defaultLanguage: "en"`
- **Steps**: Type English text with errors
- **Expected**: Errors detected correctly
- **Verify**: Appropriate suggestions shown

#### Test 8.2: German
- **Setup**: `defaultLanguage: "de"`
- **Steps**: Type German text
- **Expected**: German grammar rules applied
- **Verify**: German-specific errors detected

#### Test 8.3: Language Change
- **Setup**: Change `defaultLanguage` in settings
- **Steps**: Restart Etherpad, trigger check
- **Expected**: New language used
- **Verify**: API calls use new language

### 9. Integration Testing

#### Test 9.1: Multiple Pads
- **Steps**: Open multiple pads, check each
- **Expected**: Each pad checked independently
- **Verify**: Cache cleared between pads

#### Test 9.2: Pad Switching
- **Steps**: Switch between pads
- **Expected**: Highlights cleared, cache cleared
- **Verify**: No stale highlights

#### Test 9.3: Pad Export
- **Steps**: Export pad with errors
- **Expected**: Export works normally
- **Verify**: Errors don't affect export

### 10. Edge Cases

#### Test 10.1: Empty Pad
- **Steps**: Check empty pad
- **Expected**: No check performed, no errors
- **Verify**: Console shows "skipping empty text"

#### Test 10.2: Very Long Text
- **Steps**: Check text > 60k characters
- **Expected**: Text truncated, warning shown
- **Verify**: Check completes, warning logged

#### Test 10.3: Special Characters
- **Steps**: Check text with special characters
- **Expected**: Handled correctly
- **Verify**: No encoding issues

#### Test 10.4: Concurrent Edits
- **Steps**: Multiple users edit while check running
- **Expected**: Check completes, stale detection works
- **Verify**: Console shows stale warning if needed

## Performance Benchmarks

### Expected Performance
- **Debounce delay**: 2 seconds (configurable)
- **API response time**: < 5 seconds for typical text
- **Highlight rendering**: < 100ms for 10 errors
- **Cache hit**: < 10ms

### Load Testing
- **Concurrent users**: 3 users per pad
- **Pad size**: 10-20 pages (acceptable)
- **Check frequency**: Max 1 check per 2 seconds per user

## Troubleshooting

### Common Issues

1. **No highlights appearing**
   - Check browser console for errors
   - Verify LanguageTool API is responding
   - Check CSS is loaded

2. **Popup not showing**
   - Check click handlers are set up
   - Verify error elements have correct classes
   - Check z-index conflicts

3. **Checks not triggering**
   - Verify `autoCheck` is enabled
   - Check debounce timer is working
   - Verify change detection

4. **API errors**
   - Check LanguageTool server is running
   - Verify `apiUrl` in settings
   - Check network connectivity

## Test Checklist

- [ ] Configuration loading
- [ ] Real-time checking
- [ ] Manual button
- [ ] Error highlighting
- [ ] Popup interactions
- [ ] Error handling
- [ ] Performance (large pads)
- [ ] Concurrent users
- [ ] Language configuration
- [ ] Edge cases
