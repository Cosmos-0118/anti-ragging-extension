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
