// Handle keyboard command from chrome.commands
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-fullscreen') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('youtube.com')) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' }).catch(() => {});
      }
    });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'zenViewToggled' && sender.tab) {
    chrome.action.setBadgeText({
      text: request.enabled ? 'ON' : '',
      tabId: sender.tab.id
    });
    
    chrome.action.setBadgeBackgroundColor({
      color: request.enabled ? '#4285f4' : '#000000',
      tabId: sender.tab.id
    });
  }
  
  // Options page requesting to broadcast shortcut to all YouTube tabs
  if (request.action === 'broadcastShortcut' && request.shortcut) {
    chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'updateShortcut', 
          shortcut: request.shortcut 
        }).catch(() => {});
      });
    });
    sendResponse({ success: true });
  }
  
  return true;
});

// Reset badge when tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
    chrome.action.setBadgeText({ text: '', tabId: tabId });
    
    // Send current shortcut to the newly loaded content script
    chrome.storage.sync.get(['customShortcut'], (result) => {
      if (result.customShortcut) {
        chrome.tabs.sendMessage(tabId, { 
          action: 'updateShortcut', 
          shortcut: result.customShortcut 
        }).catch(() => {});
      }
    });
  }
});

// Update badge when switching tabs
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    
    if (tab.url && tab.url.includes('youtube.com/watch')) {
      chrome.tabs.sendMessage(activeInfo.tabId, { action: 'getState' })
        .then(response => {
          chrome.action.setBadgeText({
            text: response && response.enabled ? 'ON' : '',
            tabId: activeInfo.tabId
          });
        })
        .catch(() => {
          chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId });
        });
    } else {
      chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId });
    }
  });
});
