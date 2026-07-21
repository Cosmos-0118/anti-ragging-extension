// ===== Auto-apply saved college after state selection =====
// The college dropdown loads dynamically after the user picks a state.
// We use a MutationObserver to watch for new <option> elements being added
// to any <select>, and auto-select the saved college when it appears.
(function autoApplySavedSelection() {
  chrome.storage.local.get('savedSelection', function (data) {
    if (!data.savedSelection) return;

    const saved = data.savedSelection;
    let applied = false;

    // Try to apply the saved value to any select that contains it
    function scanAndApply() {
      if (applied) return;

      const selects = document.querySelectorAll('select');
      selects.forEach(function (select) {
        if (applied) return;
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].value.trim() === saved.value) {
            select.value = saved.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('input', { bubbles: true }));
            applied = true;
            break;
          }
        }
      });
      return applied;
    }

    // Initial check in case options are already present
    if (scanAndApply()) return;

    // Watch for dynamically added options (loaded after state selection)
    const observer = new MutationObserver(function () {
      if (scanAndApply()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    // Safety: stop observing after 60s to prevent memory leaks
    setTimeout(function () {
      if (!applied) observer.disconnect();
    }, 60000);
  });
})();

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  
  if (request.action === "GET_COLLEGES") {
    // Find all select elements on the page to support both Universities and Colleges
    const selects = document.querySelectorAll('select');
    const items = [];
    
    selects.forEach((select, index) => {
      // Create a unique identifier if id doesn't exist
      const selectIdentifier = select.id || `ext-select-${index}`;
      
      // Store it in a dataset attribute so we can find it later
      select.dataset.extId = selectIdentifier;
      
      const options = select.options;
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const val = option.value.trim();
        
        // Include if it starts with C- or U- (case insensitive)
        if (/^[CU]-/i.test(val)) {
          items.push({
            value: val,
            text: option.text.trim(),
            selectId: selectIdentifier
          });
        }
      }
    });
    
    sendResponse({ colleges: items });
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === "SELECT_COLLEGE") {
    // request contains value and selectId
    let selectElement = document.getElementById(request.selectId);
    
    // Fallback to dataset attribute if element didn't have an ID
    if (!selectElement) {
        selectElement = document.querySelector(`select[data-ext-id="${request.selectId}"]`);
    }
    
    if (selectElement) {
      // Update the value
      selectElement.value = request.value;
      
      // Dispatch a change event so any existing javascript on the page registers the change
      const event = new Event('change', { bubbles: true });
      selectElement.dispatchEvent(event);
      
      // Also dispatch input event just in case
      const inputEvent = new Event('input', { bubbles: true });
      selectElement.dispatchEvent(inputEvent);
      
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Select element not found." });
    }
    
    return true;
  }
});
