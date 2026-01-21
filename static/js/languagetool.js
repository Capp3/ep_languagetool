/**
 * ep_languagetool - LanguageTool integration for Etherpad
 * Client-side JavaScript
 */

let pluginConfig = {};
let debounceTimer = null;
let currentMatches = [];
let lastCheckedText = '';
let lastCheckedTextHash = null;
let lastCheckedRevision = null;
let isChecking = false;
let checkQueue = [];
let errorAttributes = new Map(); // Map of character positions to error data
let errorAttributeKey = 'ep_languagetool_error';
let currentPopup = null; // Current popup element
let currentPopupErrorId = null; // ID of error currently shown in popup
let checkCache = new Map(); // Cache for recent checks (text hash -> result)
const MAX_CACHE_SIZE = 10; // Maximum number of cached results

/**
 * Initialize plugin after editor loads
 */
exports.postAceInit = (hookName, args, callback) => {
  // Get configuration from clientVars
  if (window.clientVars && window.clientVars.ep_languagetool) {
    pluginConfig = window.clientVars.ep_languagetool;
    console.log('[ep_languagetool] Client initialized with config:', pluginConfig);
  }

  // Set up manual check button handler
  // Wait a bit for toolbar to be ready
  setTimeout(() => {
    setupToolbarButton();
  }, 500);

  // Initialize tracking variables
  const initialText = getPadText();
  lastCheckedTextHash = hashText(initialText);
  lastCheckedRevision = getCurrentRevision();

  // Set up click handlers for error highlights
  setupErrorClickHandlers();

  // Set up keyboard handler (ESC to close popup)
  setupKeyboardHandlers();

  // Clear cache on pad change (if padId available)
  if (window.pad && window.pad.padId) {
    // Clear cache when switching pads
    const originalPadId = window.pad.padId;
    const checkPadChange = setInterval(() => {
      if (window.pad && window.pad.padId && window.pad.padId !== originalPadId) {
        clearCache();
        clearInterval(checkPadChange);
      }
    }, 1000);
  }

  callback();
};

/**
 * Simple hash function for text comparison
 * @param {string} text - Text to hash
 * @returns {string} Hash of the text
 */
function hashText(text) {
  // Simple hash function for quick comparison
  // Using a simple djb2-like hash
  let hash = 0;
  if (text.length === 0) return hash.toString();
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

/**
 * Get current pad revision number
 * @returns {number|null} Current revision number or null if unavailable
 */
function getCurrentRevision() {
  try {
    // Try to get revision from pad object
    if (window.pad && window.pad.head) {
      return window.pad.head;
    }

    // Try to get from editorInfo
    if (window.editorInfo && window.editorInfo.ace_getRep) {
      const rep = window.editorInfo.ace_getRep();
      if (rep && rep.head) {
        return rep.head;
      }
    }

    return null;
  } catch (error) {
    console.warn('[ep_languagetool] Could not get revision:', error);
    return null;
  }
}

/**
 * Check if content has changed since last check
 * @param {string} currentText - Current pad text
 * @returns {boolean} True if content has changed
 */
function hasContentChanged(currentText) {
  // If we've never checked, content has changed
  if (lastCheckedTextHash === null) {
    return true;
  }

  // Compare text hash
  const currentHash = hashText(currentText);
  if (currentHash !== lastCheckedTextHash) {
    return true;
  }

  // Also check revision number if available
  const currentRevision = getCurrentRevision();
  if (currentRevision !== null && lastCheckedRevision !== null) {
    if (currentRevision !== lastCheckedRevision) {
      return true;
    }
  }

  return false;
}

/**
 * Check cache for recent check result
 * @param {string} textHash - Hash of text to check
 * @returns {object|null} Cached result or null
 */
function getCachedResult(textHash) {
  return checkCache.get(textHash) || null;
}

/**
 * Store check result in cache
 * @param {string} textHash - Hash of checked text
 * @param {object} result - Check result
 */
function cacheResult(textHash, result) {
  // Limit cache size
  if (checkCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry (first key)
    const firstKey = checkCache.keys().next().value;
    checkCache.delete(firstKey);
  }

  checkCache.set(textHash, {
    result: result,
    timestamp: Date.now()
  });
}

/**
 * Clear check cache
 */
function clearCache() {
  checkCache.clear();
}

/**
 * Handle editor edit events for real-time checking
 */
exports.aceEditEvent = (hookName, args, callback) => {
  // Only check if auto-check is enabled
  if (!pluginConfig.autoCheck) {
    return callback();
  }

  // Don't trigger if we're already checking
  if (isChecking) {
    return callback();
  }

  // Clear existing debounce timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // Set new debounce timer
  const delay = pluginConfig.debounceDelay || 2000;
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    scheduleCheck();
  }, delay);

  callback();
};

/**
 * Schedule a check (handles queue and prevents duplicate checks)
 */
function scheduleCheck() {
  // Don't schedule if already checking
  if (isChecking) {
    return;
  }

  // Get current text
  const currentText = getPadText();

  // Check if content has actually changed
  if (!hasContentChanged(currentText)) {
    return; // No changes, skip check
  }

  // Perform check
  performCheck(false);
}

/**
 * Translate attributes to CSS classes for error highlighting
 * This hook converts Etherpad attributes to CSS classes
 */
exports.aceAttribsClasses = (hookName, context, callback) => {
  const key = context.key;
  const value = context.value;

  // Check if this is our error attribute
  if (key === errorAttributeKey && value) {
    // Return CSS class for error highlighting
    callback(['ep_languagetool-error']);
    return;
  }

  callback([]);
};

/**
 * Populate DOM line with error highlighting
 * This hook is called when rendering each line in the editor
 */
exports.acePopulateDOMLine = (hookName, context, callback) => {
  const domline = context.domline;
  const cls = context.cls;

  // Check if this line has error attributes
  if (domline && domline.hasAttribute && domline.hasAttribute('data-ep-languagetool-error')) {
    // Add error class if not already present
    if (cls && cls.indexOf('ep_languagetool-error') === -1) {
      cls.push('ep_languagetool-error');
    }
  }

  callback();
};

/**
 * Set up toolbar button handler
 */
function setupToolbarButton() {
  // Register command handler for toolbar button
  if (window.toolbar && window.toolbar.registerAceCommand) {
    window.toolbar.registerAceCommand('checkGrammar', () => {
      handleToolbarButtonClick();
    });
  }

  // Also try to find button by class/id and add click handler directly
  setTimeout(() => {
    const button = findToolbarButton();
    if (button) {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleToolbarButtonClick();
      });
    }
  }, 1000);
}

/**
 * Find the toolbar button element
 * @returns {HTMLElement|null} Button element or null
 */
function findToolbarButton() {
  // Try multiple selectors to find the button
  const selectors = [
    '[data-l10n-id="ep_languagetool.checkGrammar"]',
    '.buttonicon-checkGrammar',
    '[title*="Check Grammar"]',
    '[title*="checkGrammar"]'
  ];

  for (const selector of selectors) {
    const button = document.querySelector(selector);
    if (button) {
      return button;
    }
  }

  // Try to find by command attribute
  const buttons = document.querySelectorAll('.toolbar button, .toolbar .buttonicon');
  for (const btn of buttons) {
    if (btn.getAttribute('data-command') === 'checkGrammar' ||
        btn.onclick && btn.onclick.toString().includes('checkGrammar')) {
      return btn;
    }
  }

  return null;
}

/**
 * Handle toolbar button click
 */
function handleToolbarButtonClick() {
  // Don't trigger if already checking
  if (isChecking) {
    console.log('[ep_languagetool] Check already in progress');
    return;
  }

  // Update button state
  setToolbarButtonState('checking');

  // Perform check with force flag
  performCheck(true).finally(() => {
    // Reset button state after check completes
    setToolbarButtonState('idle');
  });
}

/**
 * Set toolbar button state
 * @param {string} state - Button state: 'idle', 'checking', 'error'
 */
function setToolbarButtonState(state) {
  const button = findToolbarButton();
  if (!button) return;

  // Remove all state classes
  button.classList.remove('ep-languagetool-checking', 'ep-languagetool-error', 'ep-languagetool-success');

  switch (state) {
    case 'checking':
      button.classList.add('ep-languagetool-checking');
      button.disabled = true;
      button.title = 'Checking grammar...';
      // Add spinner or loading indicator
      if (!button.querySelector('.ep-languagetool-spinner')) {
        const spinner = document.createElement('span');
        spinner.className = 'ep-languagetool-spinner';
        spinner.textContent = '⏳';
        button.appendChild(spinner);
      }
      break;

    case 'error':
      button.classList.add('ep-languagetool-error');
      button.disabled = false;
      button.title = 'Error checking grammar. Click to retry.';
      // Remove spinner
      const spinner = button.querySelector('.ep-languagetool-spinner');
      if (spinner) spinner.remove();
      break;

    case 'success':
      button.classList.add('ep-languagetool-success');
      button.disabled = false;
      const matchCount = currentMatches.length;
      button.title = matchCount > 0
        ? `Found ${matchCount} error(s)`
        : 'No errors found';
      // Remove spinner
      const spinner2 = button.querySelector('.ep-languagetool-spinner');
      if (spinner2) spinner2.remove();
      // Reset after 2 seconds
      setTimeout(() => {
        setToolbarButtonState('idle');
      }, 2000);
      break;

    case 'idle':
    default:
      button.disabled = false;
      button.title = 'Check Grammar';
      // Remove spinner
      const spinner3 = button.querySelector('.ep-languagetool-spinner');
      if (spinner3) spinner3.remove();
      break;
  }
}

/**
 * Perform grammar check
 * @param {boolean} force - Force immediate check (bypass debounce and change detection)
 * @returns {Promise} Promise that resolves when check completes
 */
async function performCheck(force = false) {
  // Prevent concurrent checks
  if (isChecking && !force) {
    console.log('[ep_languagetool] Check already in progress, skipping');
    return;
  }

  try {
    // Set checking flag
    isChecking = true;

    // Clear any pending debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    // Get pad text
    const padText = getPadText();

    // Skip if text hasn't changed (unless forced)
    if (!force && !hasContentChanged(padText)) {
      isChecking = false;
      return;
    }

    // Skip if text is empty
    if (!padText || padText.trim().length === 0) {
      currentMatches = [];
      lastCheckedText = padText;
      lastCheckedTextHash = hashText(padText);
      lastCheckedRevision = getCurrentRevision();
      isChecking = false;
      return;
    }

    // Calculate text hash for caching
    const textHash = hashText(padText);

    // Check cache first (unless forced)
    if (!force) {
      const cachedResult = getCachedResult(textHash);
      if (cachedResult && cachedResult.result) {
        // Use cached result
        currentMatches = Array.isArray(cachedResult.result.matches)
          ? cachedResult.result.matches
          : [];
        lastCheckedText = padText;
        lastCheckedTextHash = textHash;
        lastCheckedRevision = getCurrentRevision();

        // Apply highlights
        applyErrorHighlights(currentMatches, padText);

        console.log('[ep_languagetool] Using cached result');
        isChecking = false;
        return;
      }
    }

    // Clear previous matches and highlights before new check
    currentMatches = [];
    clearErrorHighlights();

    // Clear cache if forcing check
    if (force) {
      clearCache();
    }

    // Update tracking variables
    lastCheckedText = padText;
    lastCheckedTextHash = textHash;
    lastCheckedRevision = getCurrentRevision();

    // Get language from configuration (default to English)
    // Language is configured in settings.json, no auto-detection
    const language = pluginConfig.defaultLanguage || 'en';

    // Get pad ID if available (for server-side text extraction fallback)
    const padId = window.pad && window.pad.padId ? window.pad.padId : null;

    // Call server endpoint
    const response = await fetch('/ep_languagetool/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: padText,
        language: language,
        padId: padId
      })
    });

    // Handle different response statuses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorCode = errorData.code || 'UNKNOWN_ERROR';
      const errorMessage = errorData.message || `Check failed: ${response.status}`;

      // Handle specific error codes
      if (errorCode === 'SERVICE_UNAVAILABLE') {
        throw new Error('LanguageTool server is not available. Please check your configuration.');
      } else if (errorCode === 'TIMEOUT') {
        throw new Error('Request timed out. The text may be too long.');
      } else if (errorCode === 'RATE_LIMIT') {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        throw new Error(errorMessage);
      }
    }

    const result = await response.json();

    // Validate response structure
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response from server');
    }

    // Store matches for rendering
    currentMatches = Array.isArray(result.matches) ? result.matches : [];

    // Cache the result
    cacheResult(textHash, result);

    // Verify content hasn't changed during check (handle concurrent edits)
    const currentTextAfterCheck = getPadText();
    const currentHashAfterCheck = hashText(currentTextAfterCheck);

    // If content changed during check, the matches might be stale
    if (currentHashAfterCheck !== lastCheckedTextHash) {
      console.log('[ep_languagetool] Content changed during check, matches may be stale');
      // Clear cache for this text since it's outdated
      checkCache.delete(textHash);
      // Optionally: Schedule another check
      // For now, we'll keep the matches but they might be slightly outdated
    }

    // Log results
    if (currentMatches.length > 0) {
      console.log(`[ep_languagetool] Found ${currentMatches.length} error(s)`);
      // Show success message for manual checks
      if (force) {
        showSuccessMessage(`Found ${currentMatches.length} error(s)`);
      }
    } else {
      console.log('[ep_languagetool] No errors found');
      // Show success message for manual checks
      if (force) {
        showSuccessMessage('No errors found');
      }
    }

    // Apply error highlighting to editor
    applyErrorHighlights(currentMatches, padText);

    // Update toolbar button state
    if (force) {
      // Manual check - show success state
      setToolbarButtonState('success');
    }

  } catch (error) {
    console.error('[ep_languagetool] Error performing check:', error);

    // Clear matches on error
    currentMatches = [];

    // Reset tracking on error (allow retry)
    // Don't update lastCheckedTextHash so we can retry

    // Update toolbar button state on error
    if (force) {
      setToolbarButtonState('error');
      // Show error message to user
      showErrorMessage(error.message || 'Failed to check grammar. Please try again.');
    }

    // Log error details
    if (error.message) {
      console.error('[ep_languagetool] Error details:', error.message);
    }
  } finally {
    // Always clear checking flag
    isChecking = false;
  }
}

/**
 * Get current pad text using Etherpad's editor API
 * @returns {string} Pad text content
 */
function getPadText() {
  try {
    // Method 1: Use editorInfo API if available
    if (window.editorInfo && window.editorInfo.ace_exportText) {
      return window.editorInfo.ace_exportText();
    }

    // Method 2: Use ace_getRep to get representation
    if (window.ace && typeof window.ace.ace_getRep === 'function') {
      const rep = window.ace.ace_getRep();
      if (rep && rep.lines && Array.isArray(rep.lines)) {
        return rep.lines
          .map(line => line.text || '')
          .join('\n');
      }
    }

    // Method 3: Try to get text from DOM (fallback)
    const editor = document.getElementById('innerdocbody');
    if (editor) {
      return editor.innerText || editor.textContent || '';
    }

    console.warn('[ep_languagetool] Could not extract pad text using any method');
    return '';
  } catch (error) {
    console.error('[ep_languagetool] Error getting pad text:', error);
    return '';
  }
}

/**
 * Apply error highlights to the editor
 * @param {Array} matches - Array of LanguageTool match objects
 * @param {string} text - Full pad text
 */
function applyErrorHighlights(matches, text) {
  try {
    // Clear previous error attributes
    clearErrorHighlights();

    if (!matches || matches.length === 0) {
      return;
    }

    // Get editor representation
    if (!window.ace || !window.ace.ace_getRep) {
      console.warn('[ep_languagetool] Cannot apply highlights: editor not available');
      return;
    }

    const rep = window.ace.ace_getRep();
    if (!rep || !rep.lines) {
      console.warn('[ep_languagetool] Cannot apply highlights: no lines in representation');
      return;
    }

    // Build character position map
    let charPos = 0;
    const lineCharMap = []; // Maps character position to line number

    rep.lines.forEach((line, lineIndex) => {
      const lineText = line.text || '';
      const lineLength = lineText.length;

      // Map each character in this line
      for (let i = 0; i < lineLength; i++) {
        lineCharMap[charPos] = {
          lineIndex: lineIndex,
          charInLine: i
        };
        charPos++;
      }

      // Add newline character
      if (lineIndex < rep.lines.length - 1) {
        lineCharMap[charPos] = {
          lineIndex: lineIndex,
          charInLine: lineLength,
          isNewline: true
        };
        charPos++;
      }
    });

    // Apply attributes for each match
    matches.forEach((match, matchIndex) => {
      const offset = match.offset || 0;
      const length = match.length || 0;
      const endOffset = offset + length;

      // Find which lines contain this error
      const startPos = lineCharMap[offset];
      const endPos = lineCharMap[Math.min(endOffset - 1, lineCharMap.length - 1)];

      if (!startPos || !endPos) {
        console.warn(`[ep_languagetool] Could not map match ${matchIndex} to lines`);
        return;
      }

      // Apply attribute to characters in the range
      // We'll use Etherpad's attribute system
      const startLine = startPos.lineIndex;
      const endLine = endPos.lineIndex;
      const startChar = startPos.charInLine;
      const endChar = endPos.charInLine;

      // Store error data for this range
      const errorId = `error_${matchIndex}_${offset}_${length}`;
      errorAttributes.set(errorId, {
        match: match,
        startLine: startLine,
        endLine: endLine,
        startChar: startChar,
        endChar: endChar,
        offset: offset,
        length: length
      });

      // Apply attribute using editorInfo API
      if (window.editorInfo && window.editorInfo.ace_setAttributeOnSelection) {
        // We need to set attributes on the range
        // This is a simplified approach - in practice, we'd need to use
        // ace_performDocumentApplyAttributesToCharRange or similar
        applyAttributeToRange(startLine, startChar, endLine, endChar, errorId);
      }
    });

    // Trigger editor update to show highlights
    if (window.ace && window.ace.ace_doUpdate) {
      window.ace.ace_doUpdate();
    }

  } catch (error) {
    console.error('[ep_languagetool] Error applying highlights:', error);
  }
}

/**
 * Apply attribute to a character range using Etherpad's editor API
 * @param {number} startLine - Start line index
 * @param {number} startChar - Start character in line
 * @param {number} endLine - End line index
 * @param {number} endChar - End character in line
 * @param {string} errorId - Error identifier
 */
function applyAttributeToRange(startLine, startChar, endLine, endChar, errorId) {
  try {
    // Use Etherpad's editor API to apply attributes
    // We'll use ace_callWithAce to ensure we're in the right context
    if (window.editorInfo && window.editorInfo.ace_callWithAce) {
      window.editorInfo.ace_callWithAce((ace) => {
        // Apply attribute using the attribute pool
        if (ace.ace_performDocumentApplyAttributesToCharRange) {
          ace.ace_performDocumentApplyAttributesToCharRange(
            startLine,
            startChar,
            endLine,
            endChar,
            errorAttributeKey,
            errorId,
            true // add attribute
          );
        } else if (ace.ace_setAttributeOnSelection) {
          // Alternative: use selection-based approach
          // This requires setting selection first, which is more complex
          console.warn('[ep_languagetool] ace_performDocumentApplyAttributesToCharRange not available');
        }
      }, 'applyLanguagetoolAttributes', true);
    } else {
      // Fallback: use DOM manipulation directly
      // This is less ideal but may work for basic highlighting
      console.warn('[ep_languagetool] Using DOM-based highlighting fallback');
      applyDOMHighlights(startLine, startChar, endLine, endChar, errorId);
    }
  } catch (error) {
    console.error('[ep_languagetool] Error applying attribute to range:', error);
  }
}

/**
 * Fallback method: Apply highlights directly to DOM
 * This is used when Etherpad's attribute API is not available
 */
function applyDOMHighlights(startLine, startChar, endLine, endChar, errorId) {
  try {
    // Find the line elements in the DOM
    const editor = document.getElementById('innerdocbody');
    if (!editor) return;

    const lines = editor.querySelectorAll('.ace-line');
    if (!lines || lines.length === 0) return;

    // Apply highlight to the specified line range
    for (let lineIdx = startLine; lineIdx <= endLine && lineIdx < lines.length; lineIdx++) {
      const lineElement = lines[lineIdx];
      if (!lineElement) continue;

      // Get text nodes in this line
      const textNodes = getTextNodesIn(lineElement);
      let charCount = 0;

      textNodes.forEach((textNode) => {
        const text = textNode.textContent;
        const textLength = text.length;

        // Check if this text node overlaps with our error range
        const nodeStart = charCount;
        const nodeEnd = charCount + textLength;

        if (lineIdx === startLine && lineIdx === endLine) {
          // Error is within a single line
          if (nodeEnd > startChar && nodeStart < endChar) {
            const highlightStart = Math.max(0, startChar - nodeStart);
            const highlightEnd = Math.min(textLength, endChar - nodeStart);

            if (highlightStart < highlightEnd) {
              wrapTextNode(textNode, highlightStart, highlightEnd, errorId);
            }
          }
        } else if (lineIdx === startLine) {
          // Start of multi-line error
          if (nodeEnd > startChar) {
            const highlightStart = Math.max(0, startChar - nodeStart);
            wrapTextNode(textNode, highlightStart, textLength, errorId);
          }
        } else if (lineIdx === endLine) {
          // End of multi-line error
          if (nodeStart < endChar) {
            const highlightEnd = Math.min(textLength, endChar - nodeStart);
            wrapTextNode(textNode, 0, highlightEnd, errorId);
          }
        } else {
          // Middle of multi-line error - highlight entire node
          wrapTextNode(textNode, 0, textLength, errorId);
        }

        charCount += textLength;
      });
    }
  } catch (error) {
    console.error('[ep_languagetool] Error applying DOM highlights:', error);
  }
}

/**
 * Get all text nodes within an element
 */
function getTextNodesIn(node) {
  const textNodes = [];
  if (node.nodeType === 3) {
    textNodes.push(node);
  } else {
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
      textNodes.push(...getTextNodesIn(children[i]));
    }
  }
  return textNodes;
}

/**
 * Wrap a portion of a text node with a span for highlighting
 */
function wrapTextNode(textNode, start, end, errorId) {
  try {
    const text = textNode.textContent;
    if (start >= end || start < 0 || end > text.length) return;

    const beforeText = text.substring(0, start);
    const highlightText = text.substring(start, end);
    const afterText = text.substring(end);

    const parent = textNode.parentNode;
    if (!parent) return;

    // Create new nodes
    const beforeNode = document.createTextNode(beforeText);
    const highlightSpan = document.createElement('span');
    highlightSpan.className = 'ep_languagetool-error';
    highlightSpan.setAttribute('data-ep-languagetool-error', errorId);
    highlightSpan.textContent = highlightText;
    const afterNode = document.createTextNode(afterText);

    // Replace text node with new nodes
    parent.insertBefore(beforeNode, textNode);
    parent.insertBefore(highlightSpan, textNode);
    parent.insertBefore(afterNode, textNode);
    parent.removeChild(textNode);
  } catch (error) {
    console.error('[ep_languagetool] Error wrapping text node:', error);
  }
}

/**
 * Clear all error highlights from the editor
 */
function clearErrorHighlights() {
  try {
    // Close any open popup
    closePopup();

    // Clear error attributes map
    errorAttributes.clear();

    // Remove attributes from editor
    if (window.editorInfo && window.editorInfo.ace_getRep) {
      const rep = window.editorInfo.ace_getRep();
      if (rep && rep.lines) {
        // We would need to iterate through lines and remove attributes
        // For now, we'll rely on the next check to clear old highlights
        // This could be enhanced to actively remove attributes
      }
    }

    // Trigger editor update
    if (window.ace && window.ace.ace_doUpdate) {
      window.ace.ace_doUpdate();
    }
  } catch (error) {
    console.error('[ep_languagetool] Error clearing highlights:', error);
  }
}

/**
 * Set up click handlers for error highlights
 */
function setupErrorClickHandlers() {
  // Use event delegation on the editor container
  const editor = document.getElementById('innerdocbody');
  if (!editor) {
    // Retry after a delay if editor not ready
    setTimeout(setupErrorClickHandlers, 1000);
    return;
  }

  // Remove existing handler if any
  editor.removeEventListener('click', handleErrorClick);

  // Add click handler
  editor.addEventListener('click', handleErrorClick, true);
}

/**
 * Handle click on error highlights
 */
function handleErrorClick(event) {
  try {
    // Find the clicked element with error class
    let target = event.target;
    let errorElement = null;

    // Traverse up the DOM to find error element
    while (target && target !== document.body) {
      if (target.classList && target.classList.contains('ep_languagetool-error')) {
        errorElement = target;
        break;
      }
      target = target.parentElement;
    }

    if (!errorElement) {
      // Clicked outside error - close popup if open
      closePopup();
      return;
    }

    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();

    // Get error ID from element
    const errorId = errorElement.getAttribute('data-ep-languagetool-error') ||
                   errorElement.getAttribute('data-error-id');

    if (!errorId) {
      console.warn('[ep_languagetool] Error element has no ID');
      return;
    }

    // Get error data
    const errorData = errorAttributes.get(errorId);
    if (!errorData) {
      console.warn('[ep_languagetool] Error data not found for ID:', errorId);
      return;
    }

    // Show popup
    showPopup(errorElement, errorData, errorId);

  } catch (error) {
    console.error('[ep_languagetool] Error handling click:', error);
  }
}

/**
 * Show popup with error information
 * @param {HTMLElement} element - Element that was clicked
 * @param {object} errorData - Error data from errorAttributes map
 * @param {string} errorId - Error identifier
 */
function showPopup(element, errorData, errorId) {
  try {
    // Close existing popup if any
    closePopup();

    const match = errorData.match;
    if (!match) {
      console.warn('[ep_languagetool] No match data in errorData');
      return;
    }

    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'ep_languagetool-popup';
    popup.setAttribute('data-error-id', errorId);

    // Get error message
    const errorMessage = match.message || match.shortMessage || 'Error detected';
    const suggestions = match.replacements || [];

    // Build popup HTML
    let popupHTML = `
      <h4>${escapeHtml(errorMessage)}</h4>
      <div class="error-message">${escapeHtml(match.shortMessage || '')}</div>
    `;

    // Add suggestions if available
    if (suggestions.length > 0) {
      popupHTML += '<div class="suggestions">';
      popupHTML += '<strong>Suggestions:</strong>';
      suggestions.forEach((suggestion, index) => {
        const suggestionText = suggestion.value || suggestion;
        popupHTML += `
          <div class="suggestion" data-suggestion-index="${index}">
            ${escapeHtml(suggestionText)}
          </div>
        `;
      });
      popupHTML += '</div>';
    }

    // Add action buttons
    popupHTML += `
      <div class="actions">
        <button class="btn btn-accept" data-action="accept">Accept</button>
        <button class="btn btn-reject" data-action="reject">Reject</button>
      </div>
    `;

    popup.innerHTML = popupHTML;

    // Position popup near clicked element
    positionPopup(popup, element);

    // Add to document
    document.body.appendChild(popup);

    // Store reference
    currentPopup = popup;
    currentPopupErrorId = errorId;

    // Set up popup event handlers
    setupPopupHandlers(popup, errorData, errorId);

    // Focus first suggestion or accept button
    const firstSuggestion = popup.querySelector('.suggestion');
    if (firstSuggestion) {
      firstSuggestion.focus();
    }

  } catch (error) {
    console.error('[ep_languagetool] Error showing popup:', error);
  }
}

/**
 * Position popup near clicked element
 * @param {HTMLElement} popup - Popup element
 * @param {HTMLElement} element - Clicked element
 */
function positionPopup(popup, element) {
  try {
    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Position below element, centered horizontally
    const left = rect.left + scrollX + (rect.width / 2) - (popup.offsetWidth / 2);
    const top = rect.bottom + scrollY + 5; // 5px gap

    // Ensure popup stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let finalLeft = left;
    let finalTop = top;

    // Adjust horizontal position if needed
    if (finalLeft < scrollX + 10) {
      finalLeft = scrollX + 10;
    } else if (finalLeft + popup.offsetWidth > scrollX + viewportWidth - 10) {
      finalLeft = scrollX + viewportWidth - popup.offsetWidth - 10;
    }

    // Adjust vertical position if popup would go off bottom
    if (finalTop + popup.offsetHeight > scrollY + viewportHeight - 10) {
      // Position above element instead
      finalTop = rect.top + scrollY - popup.offsetHeight - 5;
    }

    popup.style.left = finalLeft + 'px';
    popup.style.top = finalTop + 'px';

  } catch (error) {
    console.error('[ep_languagetool] Error positioning popup:', error);
    // Fallback: center on screen
    popup.style.left = '50%';
    popup.style.top = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
  }
}

/**
 * Set up event handlers for popup
 * @param {HTMLElement} popup - Popup element
 * @param {object} errorData - Error data
 * @param {string} errorId - Error identifier
 */
function setupPopupHandlers(popup, errorData, errorId) {
  // Handle suggestion clicks
  const suggestions = popup.querySelectorAll('.suggestion');
  suggestions.forEach((suggestion, index) => {
    suggestion.addEventListener('click', () => {
      const suggestionText = suggestion.textContent.trim();
      acceptSuggestion(errorData, suggestionText, errorId);
    });
  });

  // Handle accept button
  const acceptBtn = popup.querySelector('.btn-accept');
  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      const firstSuggestion = errorData.match.replacements && errorData.match.replacements[0];
      const suggestionText = firstSuggestion ? (firstSuggestion.value || firstSuggestion) : '';
      if (suggestionText) {
        acceptSuggestion(errorData, suggestionText, errorId);
      } else {
        // No suggestion - just close popup
        closePopup();
      }
    });
  }

  // Handle reject button
  const rejectBtn = popup.querySelector('.btn-reject');
  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => {
      rejectSuggestion(errorId);
    });
  }

  // Close popup on outside click
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick, true);
  }, 100);
}

/**
 * Handle click outside popup
 */
function handleOutsideClick(event) {
  if (currentPopup && !currentPopup.contains(event.target)) {
    closePopup();
  }
}

/**
 * Set up keyboard handlers (ESC to close)
 */
function setupKeyboardHandlers() {
  document.removeEventListener('keydown', handleKeyboard);
  document.addEventListener('keydown', handleKeyboard);
}

/**
 * Handle keyboard events
 */
function handleKeyboard(event) {
  if (event.key === 'Escape' && currentPopup) {
    closePopup();
    event.preventDefault();
  }
}

/**
 * Close popup
 */
function closePopup() {
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
    currentPopupErrorId = null;
    document.removeEventListener('click', handleOutsideClick, true);
  }
}

/**
 * Accept a suggestion and replace text
 * @param {object} errorData - Error data
 * @param {string} suggestionText - Text to replace with
 * @param {string} errorId - Error identifier
 */
function acceptSuggestion(errorData, suggestionText, errorId) {
  try {
    const match = errorData.match;
    const offset = errorData.offset || match.offset || 0;
    const length = errorData.length || match.length || 0;

    // Get pad text
    const padText = getPadText();

    // Replace text
    const newText = padText.substring(0, offset) +
                   suggestionText +
                   padText.substring(offset + length);

    // Apply replacement using editor API
    if (window.editorInfo && window.editorInfo.ace_replaceRange) {
      // We need to convert character offset to line/char position
      const rep = window.editorInfo.ace_getRep();
      if (rep && rep.lines) {
        let charPos = 0;
        let startLine = 0;
        let startChar = 0;
        let endLine = 0;
        let endChar = 0;

        // Find line/char positions
        for (let i = 0; i < rep.lines.length; i++) {
          const lineText = rep.lines[i].text || '';
          const lineLength = lineText.length;

          if (charPos <= offset && offset < charPos + lineLength) {
            startLine = i;
            startChar = offset - charPos;
          }

          if (charPos <= offset + length && offset + length <= charPos + lineLength) {
            endLine = i;
            endChar = offset + length - charPos;
            break;
          }

          charPos += lineLength + 1; // +1 for newline
        }

        // Replace using editor API
        window.editorInfo.ace_callWithAce((ace) => {
          if (ace.ace_replaceRange) {
            ace.ace_replaceRange(
              { line: startLine, ch: startChar },
              { line: endLine, ch: endChar },
              suggestionText
            );
          }
        }, 'acceptLanguagetoolSuggestion', true);
      }
    }

    // Close popup
    closePopup();

    // Remove error from attributes
    errorAttributes.delete(errorId);

    // Clear highlights (they'll be refreshed on next check)
    clearErrorHighlights();

    // Update last checked text to trigger new check
    lastCheckedText = '';
    lastCheckedTextHash = null;

    console.log('[ep_languagetool] Accepted suggestion:', suggestionText);

  } catch (error) {
    console.error('[ep_languagetool] Error accepting suggestion:', error);
    closePopup();
  }
}

/**
 * Reject a suggestion (just close popup)
 * @param {string} errorId - Error identifier
 */
function rejectSuggestion(errorId) {
  closePopup();
  // Optionally: mark as ignored for this session
  console.log('[ep_languagetool] Rejected suggestion for error:', errorId);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show error message to user
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
  try {
    // Remove any existing notifications first
    const existingNotifications = document.querySelectorAll('.ep-languagetool-notification');
    existingNotifications.forEach(n => {
      if (n.parentNode) {
        n.parentNode.removeChild(n);
      }
    });

    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'ep-languagetool-notification ep-languagetool-error-notification';
    notification.textContent = message;

    // Style it
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      z-index: 10001;
      max-width: 300px;
      font-size: 14px;
      word-wrap: break-word;
    `;

    // Add to document
    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 5000);

    // Also allow click to dismiss
    notification.addEventListener('click', () => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    });

  } catch (error) {
    console.error('[ep_languagetool] Error showing error message:', error);
  }
}

/**
 * Show success message to user
 * @param {string} message - Success message to display
 */
function showSuccessMessage(message) {
  try {
    // Remove any existing notifications first
    const existingNotifications = document.querySelectorAll('.ep-languagetool-notification');
    existingNotifications.forEach(n => {
      if (n.parentNode) {
        n.parentNode.removeChild(n);
      }
    });

    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'ep-languagetool-notification ep-languagetool-success-notification';
    notification.textContent = message;

    // Style it
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      z-index: 10001;
      max-width: 300px;
      font-size: 14px;
      word-wrap: break-word;
    `;

    // Add to document
    document.body.appendChild(notification);

    // Remove after 3 seconds (shorter for success messages)
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);

    // Also allow click to dismiss
    notification.addEventListener('click', () => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    });

  } catch (error) {
    console.error('[ep_languagetool] Error showing success message:', error);
  }
}
