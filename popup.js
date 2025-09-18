// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const grabButton = document.getElementById('grabButton');
  const output = document.getElementById('output');
  const timerDisplay = document.getElementById('timerDisplay');
  const timerStart = document.getElementById('timerStart');
  const timerReset = document.getElementById('timerReset');
  if (!grabButton) return;
  // Timer state
  let timerInterval = null;
  let elapsedSeconds = 0;

  function formatTime(sec) {
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function updateTimerDisplay() {
    if (timerDisplay) timerDisplay.textContent = formatTime(elapsedSeconds);
  }

  function startTimer() {
    if (timerInterval) return; // already running
    timerInterval = setInterval(() => {
      elapsedSeconds += 1;
      updateTimerDisplay();
    }, 1000);
  }

  function resetTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    elapsedSeconds = 0;
    updateTimerDisplay();
  }

  // Wire timer buttons if present
  if (timerStart) timerStart.addEventListener('click', startTimer);
  if (timerReset) timerReset.addEventListener('click', resetTimer);
  // initialize display
  updateTimerDisplay();
  function requestSelectionAndFill() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs || !tabs[0]) return;
      const tabId = tabs[0].id;

      // Try to ask the content script first
      chrome.tabs.sendMessage(tabId, { action: 'getSelection' }, function(response) {
        if (chrome.runtime.lastError || !response) {
          // If no receiver, fallback to injection using scripting.executeScript
          // This runs inside the page context where `document` is available
          chrome.scripting.executeScript(
            { target: { tabId: tabId }, func: function() {
                try {
                  var range;
                  if (document.selection && document.selection.createRange) {
                    range = document.selection.createRange();
                    return { html: range.htmlText };
                  } else if (window.getSelection) {
                    var selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                      range = selection.getRangeAt(0);
                      var clonedSelection = range.cloneContents();
                      var div = document.createElement('div');
                      div.appendChild(clonedSelection);
                      return { html: div.innerHTML };
                    } else {
                      return { html: '' };
                    }
                  } else {
                    return { html: '' };
                  }
                } catch (e) {
                  return { html: '' };
                }
              }
            },
            (injectionResults) => {
              if (chrome.runtime.lastError || !injectionResults || !injectionResults[0]) {
                output.value = '';
              } else {
                const result = injectionResults[0].result;
                output.value = (result && typeof result.html === 'string') ? result.html : '';
              }
            }
          );
        } else {
          output.value = (response && typeof response.html === 'string') ? response.html : '';
        }
      });
    });
  }

  // Fetch selection immediately when popup opens
  requestSelectionAndFill();

  // Keep button for manual refresh
  grabButton.addEventListener('click', requestSelectionAndFill);
});