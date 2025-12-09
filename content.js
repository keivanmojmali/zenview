// ZenView - Content Script
// IMPORTANT: No chrome API calls with callbacks allowed here!
// They cause "Extension context invalidated" errors when extension reloads.

let isZenViewMode = false;
const zenViewClass = 'youtube-zenview-extension';

// Default shortcut - can be updated via message from popup/options
let shortcut = { key: 'F', ctrl: true, shift: true, alt: false, meta: false };

// Load custom shortcut on script load
function loadCustomShortcut() {
  if (!isExtensionContextValid()) return;
  try {
    chrome.storage.sync.get(['customShortcut'], (result) => {
      if (result.customShortcut) {
        shortcut = result.customShortcut;
      }
    });
  } catch (e) {
    // Ignore errors - use default shortcut
  }
}

function isOnYouTube() {
  return window.location.hostname.includes('youtube.com');
}

function isWatchPage() {
  return window.location.pathname === '/watch';
}

// Helper to safely check if extension context is valid
function isExtensionContextValid() {
  try {
    return !!chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

function safeSendMessage(message) {
  if (!isExtensionContextValid()) return;
  try {
    chrome.runtime.sendMessage(message).catch(() => {
      // Ignore promise rejections
    });
  } catch (e) {
    // Ignore synchronous errors
  }
}

function toggleZenViewMode() {
  if (!isOnYouTube() || !isWatchPage()) return;
  
  const body = document.body;
  
  if (isZenViewMode) {
    body.classList.remove(zenViewClass);
    isZenViewMode = false;
  } else {
    body.classList.add(zenViewClass);
    isZenViewMode = true;
  }
  
  // Fire and forget - no callback
  safeSendMessage({ 
    action: 'zenViewToggled', 
    enabled: isZenViewMode 
  });
}

function handleKeyboardShortcut(event) {
  const eventKey = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  const shortcutKey = shortcut.key?.length === 1 ? shortcut.key.toUpperCase() : (shortcut.key || 'F');
  
  if (eventKey === shortcutKey && 
      event.ctrlKey === (shortcut.ctrl || false) && 
      event.shiftKey === (shortcut.shift || false) && 
      event.altKey === (shortcut.alt || false) &&
      event.metaKey === (shortcut.meta || false)) {
    event.preventDefault();
    toggleZenViewMode();
  }
}

// Message listener - this is safe because Chrome just disconnects it when orphaned
// (it doesn't invoke a callback, it receives messages)
try {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Check if extension context is valid
    if (!isExtensionContextValid()) return;

    try {
      if (request.action === 'toggle') {
        toggleZenViewMode();
        try {
          sendResponse({ enabled: isZenViewMode });
        } catch (e) {
          // Ignore sendResponse errors
        }
      }
      
      if (request.action === 'getState') {
        try {
          sendResponse({ enabled: isZenViewMode });
        } catch (e) {
          // Ignore sendResponse errors
        }
      }
      
      // Receive shortcut updates from options page
      if (request.action === 'updateShortcut' && request.shortcut) {
        shortcut = request.shortcut;
        try {
          sendResponse({ success: true });
        } catch (e) {
          // Ignore sendResponse errors
        }
      }
    } catch (e) {
      // Ignore errors
    }
    return true;
  });
} catch (e) {
  // Extension already invalidated at load time
}

document.addEventListener('keydown', handleKeyboardShortcut);

// Load custom shortcut when script first runs
loadCustomShortcut();

// That's it! No storage.get, no storage.onChanged, no callbacks.
// The shortcut defaults to Ctrl+Shift+F.
// Custom shortcuts are sent via message from the options page.
