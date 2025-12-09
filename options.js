document.addEventListener('DOMContentLoaded', function() {
  const shortcutDisplay = document.getElementById('shortcut-display');
  const shortcutKeys = document.getElementById('shortcut-keys');
  const saveBtn = document.getElementById('save-btn');
  const resetBtn = document.getElementById('reset-btn');
  const statusMessage = document.getElementById('status-message');

  const defaultShortcut = { key: 'F', ctrl: true, shift: true, alt: false, meta: false };
  
  let currentShortcut = { ...defaultShortcut };
  let pendingShortcut = null;
  let isRecording = false;

  // Get the appropriate modifier key name for the OS
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierName = isMac ? '⌘' : 'Ctrl';

  function formatKeyName(key) {
    // Map special keys to display names
    const keyMap = {
      'Control': isMac ? 'Ctrl' : 'Ctrl',
      'Shift': 'Shift',
      'Alt': isMac ? 'Option' : 'Alt',
      'Meta': '⌘',
      ' ': 'Space',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'Escape': 'Esc',
      'Backspace': '⌫',
      'Delete': 'Del',
      'Enter': '↵',
      'Tab': 'Tab'
    };
    
    return keyMap[key] || key.toUpperCase();
  }

  function renderShortcut(shortcut) {
    shortcutKeys.innerHTML = '';
    
    const keys = [];
    if (shortcut.ctrl) keys.push(isMac ? 'Ctrl' : 'Ctrl');
    if (shortcut.meta) keys.push('⌘');
    if (shortcut.alt) keys.push(isMac ? 'Option' : 'Alt');
    if (shortcut.shift) keys.push('Shift');
    if (shortcut.key) keys.push(formatKeyName(shortcut.key));
    
    keys.forEach((key, index) => {
      const badge = document.createElement('span');
      badge.className = 'key-badge';
      badge.textContent = key;
      shortcutKeys.appendChild(badge);
      
      if (index < keys.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'key-separator';
        sep.textContent = '+';
        shortcutKeys.appendChild(sep);
      }
    });
  }

  function loadSettings() {
    chrome.storage.sync.get(['customShortcut'], (result) => {
      currentShortcut = result.customShortcut || { ...defaultShortcut };
      pendingShortcut = { ...currentShortcut };
      renderShortcut(currentShortcut);
    });
  }

  function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${isError ? 'error' : 'success'}`;
    statusMessage.style.display = 'block';
    
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  }

  function startRecording() {
    isRecording = true;
    shortcutDisplay.classList.add('recording');
    pendingShortcut = { key: '', ctrl: false, shift: false, alt: false, meta: false };
  }

  function stopRecording() {
    isRecording = false;
    shortcutDisplay.classList.remove('recording');
  }

  function validateShortcut(shortcut) {
    if (!shortcut.key) {
      return { valid: false, message: 'Please press a key (not just modifiers)' };
    }
    
    const hasModifier = shortcut.ctrl || shortcut.shift || shortcut.alt || shortcut.meta;
    if (!hasModifier) {
      return { valid: false, message: 'At least one modifier key is recommended' };
    }
    
    return { valid: true };
  }

  function handleKeyDown(e) {
    if (!isRecording) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Build the shortcut from the event
    const newShortcut = {
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
      meta: e.metaKey,
      key: ''
    };
    
    // Check if a non-modifier key was pressed
    const isModifier = ['Control', 'Shift', 'Alt', 'Meta'].includes(e.key);
    
    if (!isModifier) {
      // Capture the main key
      newShortcut.key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      pendingShortcut = newShortcut;
      
      renderShortcut(pendingShortcut);
      stopRecording();
    } else {
      // Just show the modifiers being held
      renderShortcut(newShortcut);
    }
  }

  function handleKeyUp(e) {
    if (!isRecording) return;
    
    // If user releases without pressing a non-modifier key, show current state
    if (pendingShortcut && !pendingShortcut.key) {
      renderShortcut(pendingShortcut.key ? pendingShortcut : currentShortcut);
    }
  }

  function handleBlur() {
    if (isRecording) {
      stopRecording();
      // Restore the current shortcut display if nothing was captured
      if (!pendingShortcut || !pendingShortcut.key) {
        pendingShortcut = { ...currentShortcut };
        renderShortcut(currentShortcut);
      }
    }
  }

  function saveSettings() {
    if (!pendingShortcut || !pendingShortcut.key) {
      showStatus('No shortcut recorded. Click to record one.', true);
      return;
    }
    
    const validation = validateShortcut(pendingShortcut);
    if (!validation.valid) {
      showStatus(validation.message, true);
      return;
    }

    chrome.storage.sync.set({ customShortcut: pendingShortcut }, () => {
      if (chrome.runtime.lastError) {
        showStatus('Error saving settings', true);
        return;
      }
      
      currentShortcut = { ...pendingShortcut };
      
      // Broadcast to all YouTube tabs
      chrome.runtime.sendMessage({ 
        action: 'broadcastShortcut', 
        shortcut: pendingShortcut 
      }).catch(() => {});
      
      showStatus('Shortcut saved!');
    });
  }

  function resetToDefault() {
    pendingShortcut = { ...defaultShortcut };
    currentShortcut = { ...defaultShortcut };
    renderShortcut(defaultShortcut);
    
    chrome.storage.sync.set({ customShortcut: defaultShortcut }, () => {
      // Broadcast to all YouTube tabs
      chrome.runtime.sendMessage({ 
        action: 'broadcastShortcut', 
        shortcut: defaultShortcut 
      }).catch(() => {});
      
      showStatus('Reset to Ctrl+Shift+F');
    });
  }

  // Event listeners
  shortcutDisplay.addEventListener('click', () => {
    if (!isRecording) {
      startRecording();
      shortcutDisplay.focus();
    }
  });

  shortcutDisplay.addEventListener('focus', () => {
    if (!isRecording) {
      startRecording();
    }
  });

  shortcutDisplay.addEventListener('keydown', handleKeyDown);
  shortcutDisplay.addEventListener('keyup', handleKeyUp);
  shortcutDisplay.addEventListener('blur', handleBlur);
  
  // Handle Escape to cancel recording
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isRecording) {
      stopRecording();
      pendingShortcut = { ...currentShortcut };
      renderShortcut(currentShortcut);
    }
  });

  saveBtn.addEventListener('click', saveSettings);
  resetBtn.addEventListener('click', resetToDefault);

  // Initialize
  loadSettings();
});
