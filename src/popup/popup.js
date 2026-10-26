// Store all fetched items (colleges and universities)
let allItems = [];
let activeTabId = null;

const SITE_HOSTS = ['antiragging.in', 'www.antiragging.in'];
const CONTENT_SCRIPT = 'src/content.js';

const searchInput = document.getElementById('search-input');
const resultsList = document.getElementById('results-list');
const statusMessage = document.getElementById('status-message');
const clearDataBtn = document.getElementById('clear-data-btn');
const stateBox = document.getElementById('state-box');
const stateSelect = document.getElementById('state-select');
const versionLabel = document.getElementById('version-label');

versionLabel.textContent = `v${chrome.runtime.getManifest().version} [SYSTEM_READY]`;

function setStatus(text, type) {
  statusMessage.textContent = text;
  statusMessage.className = type ? `status ${type}` : 'status';
}

// Replace the results list with a single message line
function showMessage(text, className) {
  resultsList.innerHTML = '';
  const li = document.createElement('li');
  li.className = className;
  // Messages use "\n" for line breaks; set as text so nothing is parsed as HTML
  text.split('\n').forEach((line, i) => {
    if (i > 0) li.appendChild(document.createElement('br'));
    li.appendChild(document.createTextNode(line));
  });
  resultsList.appendChild(li);
}

function isSiteUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return (protocol === 'https:' || protocol === 'http:') && SITE_HOSTS.includes(hostname);
  } catch (e) {
    return false;
  }
}

// Send a message to the page. If no content script answers (the tab was opened
// before the extension was installed or reloaded), inject it and retry once
// instead of asking the user to refresh and lose what they've typed.
function sendToPage(message, callback, retried) {
  chrome.tabs.sendMessage(activeTabId, message, function (response) {
    if (!chrome.runtime.lastError) {
      callback(response);
      return;
    }
    if (retried) {
      callback(null);
      return;
    }
    chrome.scripting.executeScript(
      { target: { tabId: activeTabId }, files: [CONTENT_SCRIPT] },
      () => {
        if (chrome.runtime.lastError) {
          callback(null);
          return;
        }
        sendToPage(message, callback, true);
      }
    );
  });
}

function showConnectionError() {
  showMessage('ERROR: UNABLE TO CONNECT TO PAGE.\nRELOAD THE ANTI-RAGGING PAGE AND TRY AGAIN.', 'no-results');
  setStatus('CONNECTION FAILED.', 'error');
}

if (clearDataBtn) {
  clearDataBtn.addEventListener('click', () => {
    chrome.storage.local.remove('savedFormData', () => {
      if (activeTabId !== null) {
        sendToPage({ action: "CLEAR_FORM" }, () => {});
      }

      // Clear the popup list because the state dropdown on the page is now blanked
      allItems = [];
      stateSelect.value = '';
      showMessage('NO DATA FOUND. PLEASE SELECT A STATE FIRST.', 'no-results');
      searchInput.value = '';

      setStatus('AUTO-FILL DATA CLEARED.', 'success');
      setTimeout(() => {
        if (statusMessage.textContent === 'AUTO-FILL DATA CLEARED.') {
          setStatus('NO DATA.');
        }
      }, 2000);
    });
  });
}

// Mirror the page's "state in which college is based" dropdown in the popup
function renderStatePicker(state) {
  if (!state || state.options.length === 0) {
    stateBox.hidden = true;
    return;
  }

  // Keep the placeholder, rebuild the rest
  while (stateSelect.options.length > 1) stateSelect.remove(1);
  state.options.forEach(opt => {
    stateSelect.add(new Option(opt.text, opt.value));
  });
  stateSelect.value = state.selected || '';
  stateBox.hidden = false;
}

function showItems(items) {
  allItems = items;
  setStatus(`${allItems.length} RECORDS FOUND.`);
  applySearch();
}

function loadState(value) {
  const stateName = stateSelect.options[stateSelect.selectedIndex]?.text || value;
  stateSelect.disabled = true;
  allItems = [];
  showMessage(`FETCHING LIST FOR ${stateName}...`, 'loading');
  setStatus('LOADING...');

  sendToPage({ action: "SET_STATE", value }, function (response) {
    stateSelect.disabled = false;

    if (!response) {
      showConnectionError();
      return;
    }
    if (response.error === 'TIMEOUT') {
      showMessage('THE WEBSITE DID NOT RETURN ANY LIST.\nIT MAY BE DOWN - TRY THE STATE AGAIN IN A MOMENT.', 'no-results');
      setStatus('SERVER TIMEOUT.', 'error');
      return;
    }
    if (!response.success) {
      showMessage('COULD NOT SET THE STATE ON THIS PAGE.', 'no-results');
      setStatus('ERROR.', 'error');
      return;
    }

    if (response.colleges.length > 0) {
      showItems(response.colleges);
      searchInput.focus();
    } else {
      showMessage(`NO INSTITUTIONS LISTED FOR ${stateName}.`, 'no-results');
      setStatus('NO DATA.');
    }
  });
}

stateSelect.addEventListener('change', () => {
  if (stateSelect.value) loadState(stateSelect.value);
});

// Fetch data from the active tab when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const activeTab = tabs && tabs[0];

  if (!activeTab || !isSiteUrl(activeTab.url)) {
    showMessage('OPEN THE STUDENT UNDERTAKING FORM ON ANTIRAGGING.IN, THEN CLICK THIS ICON AGAIN.', 'no-results');
    setStatus('NOT ON ANTI-RAGGING SITE.', 'error');
    return;
  }
  activeTabId = activeTab.id;

  sendToPage({ action: "GET_COLLEGES" }, function (response) {
    if (!response) {
      showConnectionError();
      return;
    }

    renderStatePicker(response.state);

    if (response.colleges && response.colleges.length > 0) {
      showItems(response.colleges);
    } else if (response.state && response.state.selected) {
      // State is chosen on the page but the list is empty (still loading or a
      // failed request) - ask the page to load it again
      loadState(response.state.selected);
    } else if (response.state) {
      showMessage('SELECT THE STATE ABOVE TO LOAD COLLEGES / UNIVERSITIES.', 'loading');
      setStatus('AWAITING STATE...');
      stateSelect.focus();
    } else {
      showMessage('NO DATA FOUND ON THIS PAGE.\nOPEN THE COLLEGE, UNIVERSITY OR STANDALONE UNDERTAKING FORM.', 'no-results');
      setStatus('NO DATA.');
    }
  });
});

// Filter allItems by the current search box contents and render them
function applySearch() {
  const query = searchInput.value.toLowerCase().trim();

  if (query.length === 0) {
    renderResults(allItems.slice(0, 50)); // Show top 50 initially
    return;
  }

  // Search logic: split query by space for multi-word search, or search by code
  const terms = query.split(' ').filter(t => t.length > 0);

  const filtered = allItems.filter(item => {
    const textLower = item.text.toLowerCase();
    const codeLower = item.value.toLowerCase();

    // Check if it matches code exactly
    if (codeLower.includes(query)) return true;

    // Check if all search terms are present in the text
    return terms.every(term => textLower.includes(term));
  });

  setStatus(`${filtered.length} MATCH(ES) FOUND.`);

  // Cap at 100 results for performance
  renderResults(filtered.slice(0, 100));
}

// Event listener for search input
searchInput.addEventListener('input', function () {
  if (allItems.length === 0) return;
  applySearch();
  if (searchInput.value.trim().length === 0) setStatus('AWAITING INPUT...');
});

function getTypeLabel(value) {
  const code = value.toUpperCase();
  if (code.startsWith('U-')) return 'UNIVERSITY';
  if (code.startsWith('C-')) return 'COLLEGE';
  return 'INSTITUTION';
}

// Render the results into the UI
function renderResults(items) {
  resultsList.innerHTML = '';

  if (items.length === 0) {
    showMessage('404: NO MATCHES FOUND.', 'no-results');
    return;
  }

  items.forEach(item => {
    // Skip empty placeholder option
    if (!item.value) return;

    const li = document.createElement('li');

    // Extract name without the code at the end if it's already there
    // e.g. "College Name (C-12345)" -> "College Name"
    let displayName = item.text;
    const codeSuffix = `(${item.value})`;
    if (displayName.endsWith(codeSuffix)) {
      displayName = displayName.slice(0, -(codeSuffix.length)).trim();
    }

    const typeLabel = getTypeLabel(item.value);

    // Page-supplied text goes in via textContent so it can't inject markup
    const nameEl = document.createElement('div');
    nameEl.className = 'college-name';
    nameEl.textContent = `[${typeLabel}] ${displayName}`;

    const codeEl = document.createElement('span');
    codeEl.className = 'college-code';
    codeEl.textContent = `CODE: [${item.value}]`;

    li.appendChild(nameEl);
    li.appendChild(codeEl);

    li.addEventListener('click', () => {
      selectItem(item, typeLabel);
    });

    resultsList.appendChild(li);
  });
}

function selectItem(item, typeLabel) {
  setStatus('TRANSMITTING SELECTION...');

  sendToPage({ action: "SELECT_COLLEGE", value: item.value, selectId: item.selectId }, function (response) {
    if (response && response.success) {
      setStatus(`${typeLabel} SELECTED SUCCESSFULLY!`, 'success');

      // Close popup after a short delay
      setTimeout(() => window.close(), 1000);
    } else {
      setStatus(`ERROR SELECTING ${typeLabel}.`, 'error');
    }
  });
}
