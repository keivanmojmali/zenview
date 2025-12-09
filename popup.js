document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('toggle');
  const status = document.getElementById('status');
  const shortcutInfo = document.getElementById('shortcut-info');
  const settingsBtn = document.getElementById('settings-btn');
  const youtubeContent = document.getElementById('youtube-content');
  const notYoutube = document.getElementById('not-youtube');

  function updateShortcutDisplay() {
    chrome.storage.sync.get(['customShortcut'], (result) => {
      const shortcut = result.customShortcut || { key: 'F', ctrl: true, shift: true, alt: false, meta: false };
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      let shortcutText = '';
      if (shortcut.ctrl) shortcutText += (isMac ? 'Ctrl+' : 'Ctrl+');
      if (shortcut.meta) shortcutText += (isMac ? '⌘+' : 'Win+');
      if (shortcut.alt) shortcutText += (isMac ? 'Option+' : 'Alt+');
      if (shortcut.shift) shortcutText += 'Shift+';
      shortcutText += shortcut.key.toUpperCase();
      
      shortcutInfo.innerHTML = `Press <strong>${shortcutText}</strong> to toggle`;
    });
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    
    if (!currentTab.url || !currentTab.url.includes('youtube.com')) {
      youtubeContent.style.display = 'none';
      notYoutube.style.display = 'block';
      status.textContent = 'Not on YouTube';
      return;
    }

    if (!currentTab.url.includes('/watch')) {
      status.textContent = 'Go to a video page';
      toggle.style.opacity = '0.5';
      toggle.style.pointerEvents = 'none';
      return;
    }

    status.textContent = 'Ready';
    updateShortcutDisplay();

    chrome.tabs.sendMessage(currentTab.id, { action: 'getState' }, (response) => {
      if (chrome.runtime.lastError) {
        status.textContent = 'Refresh page';
        return;
      }
      
      if (response && response.enabled) {
        toggle.classList.add('active');
        status.textContent = 'ZenView ON';
      } else {
        toggle.classList.remove('active');
        status.textContent = 'ZenView OFF';
      }
    });

    toggle.addEventListener('click', function() {
      chrome.tabs.sendMessage(currentTab.id, { action: 'toggle' }, (response) => {
        if (chrome.runtime.lastError) {
          status.textContent = 'Refresh page';
          return;
        }
        
        if (response && response.enabled) {
          toggle.classList.add('active');
          status.textContent = 'ZenView ON';
        } else {
          toggle.classList.remove('active');
          status.textContent = 'ZenView OFF';
        }
      });
    });
  });

  settingsBtn.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
});