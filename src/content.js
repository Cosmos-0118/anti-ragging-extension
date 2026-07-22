// ===== Global Form Auto-Save and Auto-Fill =====
const formSchema = [
  { key: "firstname", id: "first_name", name: "firstname", type: "text" },
  { key: "midname", id: "middle_name", name: "midname", type: "text" },
  { key: "surname", id: "surname", name: "surname", type: "text" },
  { key: "mobile", id: "mobile", name: "mobile", type: "text" },
  { key: "email", id: "email", name: "email", type: "email" },
  { key: "gender", id: "gender", name: "gender", type: "select-one" },
  { key: "city", id: "city", name: "city", type: "text" },
  { key: "state", id: "state", name: "state", type: "select-one" },
  { key: "nationality", id: "nationality", name: "nationality", type: "select-one" },
  { key: "pr_name", id: "pr_name", name: "pr_name", type: "text" },
  { key: "pr_number", id: "pr_number", name: "pr_number", type: "text" },
  { key: "pr_email", id: "pr_email", name: "pr_email", type: "email" },
  { key: "pr_city", id: "pr_city", name: "pr_city", type: "text" },
  { key: "pr_state", id: "pr_state", name: "pr_state", type: "select-one" },
  { key: "pr_address", id: "pr_address", name: "pr_address", type: "textarea" },
  { key: "cl_state", id: "cl_state", name: "cl_state", type: "select-one" },
  { key: "cl_name", id: "cl_name", name: "", type: "select-one" },
  { key: "dir_title", id: "dir_title", name: "dir_title", type: "select-one" },
  { key: "dir_name", id: "dir_name", name: "dir_name", type: "text" },
  { key: "cl_phone", id: "cl__phone", name: "cl_phone", type: "text" },
  { key: "cl_landline", id: "cl__landline", name: "cl_landline", type: "text" },
  { key: "crs_cat", id: "crs_cat", name: "crs_cat", type: "select-one" },
  { key: "crs_name", id: "crs_name", name: "crs_name", type: "text" },
  { key: "crs_st_num", id: "crs_st_num", name: "crs_st_num", type: "text" },
  { key: "crs_year", id: "crs_year", name: "crs_year", type: "select-one" },
  { key: "police_station", id: "police_station", name: "police_station", type: "text" },
  { key: "ugc_regulation", id: "", name: "ugc_regulation", type: "checkbox" },
  { key: "ugc_judgment", id: "", name: "ugc_judgment", type: "checkbox" },
  { key: "ugc_promise", id: "", name: "ugc_promise", type: "checkbox" },
  { key: "ugc_promise2", id: "", name: "ugc_promise2", type: "checkbox" },
  { key: "ugc_promise3", id: "", name: "ugc_promise3", type: "checkbox" },
  { key: "sv_ragged", id: "", name: "sv_ragged", type: "radio" },
  { key: "sv_rag", id: "", name: "sv_rag", type: "radio" },
  { key: "sv_rag_phn", id: "sv_rg_phn", name: "sv_rag_phn", type: "text" },
  { key: "sv_rag_hp", id: "", name: "sv_rag_hp", type: "radio" },
  { key: "final", id: "", name: "final", type: "radio" }
];

const filledFields = new Set();

function getElements(field) {
  if (field.name) {
    const els = document.getElementsByName(field.name);
    if (els.length > 0) return Array.from(els);
  }
  if (field.id) {
    const el = document.getElementById(field.id);
    if (el) return [el];
  }
  return [];
}

function autoFillForm() {
  chrome.storage.local.get('savedFormData', function(data) {
    if (!data.savedFormData) return;
    const formData = data.savedFormData;
    
    formSchema.forEach(field => {
      if (filledFields.has(field.key)) return;
      if (!(field.key in formData)) return;
      
      const elements = getElements(field);
      if (elements.length === 0) return;
      
      const value = formData[field.key];
      let filled = false;
      
      if (field.type === 'radio') {
        const elToSelect = elements.find(el => el.value === value);
        if (elToSelect && !elToSelect.checked) {
          elToSelect.checked = true;
          elToSelect.dispatchEvent(new Event('change', { bubbles: true }));
          filled = true;
        } else if (elToSelect && elToSelect.checked) {
          filled = true;
        }
      } else if (field.type === 'checkbox') {
        if (elements[0].checked !== value) {
          elements[0].checked = value;
          elements[0].dispatchEvent(new Event('change', { bubbles: true }));
        }
        filled = true;
      } else if (field.type === 'select-one') {
        const el = elements[0];
        const optionExists = Array.from(el.options).some(opt => opt.value === value);
        if (optionExists) {
          el.value = value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          filled = true;
        }
      } else {
        const el = elements[0];
        if (el.value !== value) {
          el.value = value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        filled = true;
      }
      
      if (filled) filledFields.add(field.key);
    });
  });
}

const observer = new MutationObserver(function() {
  autoFillForm();
});
observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
autoFillForm();

document.addEventListener('submit', function(e) {
  if (e.target && e.target.tagName === 'FORM') {
    const wantToSave = confirm("Anti-Ragging Extension: Do you want to save all form details for next time?");
    if (wantToSave) {
      const formData = {};
      formSchema.forEach(field => {
        const elements = getElements(field);
        if (elements.length === 0) return;
        
        if (field.type === 'radio') {
          const checkedEl = elements.find(el => el.checked);
          if (checkedEl) formData[field.key] = checkedEl.value;
        } else if (field.type === 'checkbox') {
          formData[field.key] = elements[0].checked;
        } else {
          formData[field.key] = elements[0].value;
        }
      });
      chrome.storage.local.set({ savedFormData: formData });
    }
  }
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  
  if (request.action === "SCRAPE_PAGE") {
    const inputs = document.querySelectorAll('input, select, textarea');
    const scrapedData = [];
    inputs.forEach(input => {
      let options = undefined;
      if (input.tagName === 'SELECT') {
        options = Array.from(input.options).map(o => ({ value: o.value, text: o.text }));
      }
      scrapedData.push({
        id: input.id,
        name: input.name,
        type: input.type || input.tagName,
        value: input.value,
        options: options
      });
    });
    sendResponse({ scrapedData: scrapedData });
    return true;
  }
  
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
