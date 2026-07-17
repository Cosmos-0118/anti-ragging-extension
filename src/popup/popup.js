// Store all fetched items (colleges and universities)
let allItems = [];

const searchInput = document.getElementById('search-input');
const resultsList = document.getElementById('results-list');
const statusMessage = document.getElementById('status-message');

// Fetch data from the active tab when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const activeTab = tabs[0];
  
  chrome.tabs.sendMessage(activeTab.id, { action: "GET_COLLEGES" }, function (response) {
    if (chrome.runtime.lastError) {
      // Content script is not injected or page not fully loaded
      resultsList.innerHTML = '<li class="error">ERROR: UNABLE TO CONNECT TO PAGE.<br>PLEASE REFRESH THE ANTI-RAGGING PAGE.</li>';
      statusMessage.textContent = 'CONNECTION FAILED.';
      statusMessage.className = 'status error';
      return;
    }
    
    if (response && response.colleges && response.colleges.length > 0) {
      allItems = response.colleges;
      statusMessage.textContent = `${allItems.length} RECORDS FOUND.`;
      renderResults(allItems.slice(0, 50)); // Show top 50 initially
    } else {
      resultsList.innerHTML = '<li class="no-results">NO DATA FOUND ON THIS PAGE.</li>';
      statusMessage.textContent = 'NO DATA.';
    }
  });
});

// Event listener for search input
searchInput.addEventListener('input', function (e) {
  const query = e.target.value.toLowerCase().trim();
  
  if (query.length === 0) {
    renderResults(allItems.slice(0, 50));
    statusMessage.textContent = 'AWAITING INPUT...';
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
  
  statusMessage.textContent = `${filtered.length} MATCH(ES) FOUND.`;
  
  // Cap at 100 results for performance
  renderResults(filtered.slice(0, 100));
});

// Render the results into the UI
function renderResults(items) {
  resultsList.innerHTML = '';
  
  if (items.length === 0) {
    resultsList.innerHTML = '<li class="no-results">404: NO MATCHES FOUND.</li>';
    return;
  }
  
  items.forEach((item, index) => {
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
    
    const isUni = item.value.toUpperCase().startsWith('U-');
    const typeLabel = isUni ? 'UNIVERSITY' : 'COLLEGE';
    
    li.innerHTML = `
      <div class="college-name">[${typeLabel}] ${displayName}</div>
      <span class="college-code">CODE: [${item.value}]</span>
    `;
    
    li.addEventListener('click', () => {
      selectItem(item, typeLabel);
    });
    
    resultsList.appendChild(li);
  });
}

function selectItem(item, typeLabel) {
  statusMessage.textContent = 'TRANSMITTING SELECTION...';
  
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "SELECT_COLLEGE", value: item.value, selectId: item.selectId }, function (response) {
      if (response && response.success) {
        statusMessage.textContent = `${typeLabel} SELECTED SUCCESSFULLY!`;
        statusMessage.className = 'status success';
        
        // Optional: close the popup after a brief delay
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        statusMessage.textContent = `ERROR SELECTING ${typeLabel}.`;
        statusMessage.className = 'status error';
      }
    });
  });
}
