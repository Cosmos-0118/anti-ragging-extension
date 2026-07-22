// ===== Global Form Auto-Save and Auto-Fill =====
const style = document.createElement('style');
style.textContent = `
  @keyframes siriGlow {
    0% {
      box-shadow: 0 0 10px rgba(52, 152, 219, 0.8), 0 0 20px rgba(155, 89, 182, 0.6);
      border-color: rgba(52, 152, 219, 1);
    }
    50% {
      box-shadow: 0 0 15px rgba(155, 89, 182, 0.9), 0 0 25px rgba(52, 152, 219, 0.7);
      border-color: rgba(155, 89, 182, 1);
    }
    100% {
      box-shadow: 0 0 0px transparent;
    }
  }
  .ar-autofill-glow {
    animation: siriGlow 2s ease-out forwards;
    transition: all 0.3s ease;
  }
  
  .ar-modal-overlay {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 2147483647; opacity: 0; transition: opacity 0.3s ease;
  }
  .ar-modal-overlay.ar-show { opacity: 1; }
  .ar-modal-box {
    background: #fff; border-radius: 12px; padding: 24px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    width: 320px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    transform: translateY(20px); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  .ar-modal-overlay.ar-show .ar-modal-box { transform: translateY(0); }
  .ar-modal-title { font-size: 18px; font-weight: 600; color: #333; margin: 0 0 10px 0; }
  .ar-modal-desc { font-size: 14px; color: #666; margin: 0 0 20px 0; }
  .ar-modal-actions { display: flex; gap: 12px; justify-content: center; }
  .ar-btn {
    border: none; border-radius: 6px; padding: 10px 16px; font-size: 14px; font-weight: 500;
    cursor: pointer; transition: background 0.2s;
  }
  .ar-btn-save { background: #3498db; color: #fff; }
  .ar-btn-save:hover { background: #2980b9; }
  .ar-btn-skip { background: #e0e0e0; color: #333; }
  .ar-btn-skip:hover { background: #d0d0d0; }
`;
document.head.appendChild(style);

function applyGlow(element) {
  if (!element) return;
  element.classList.add('ar-autofill-glow');
  setTimeout(() => {
    element.classList.remove('ar-autofill-glow');
  }, 2000);
}

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
          applyGlow(elToSelect.parentElement || elToSelect);
        } else if (elToSelect && elToSelect.checked) {
          filled = true;
        }
      } else if (field.type === 'checkbox') {
        if (elements[0].checked !== value) {
          elements[0].checked = value;
          elements[0].dispatchEvent(new Event('change', { bubbles: true }));
          applyGlow(elements[0].parentElement || elements[0]);
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
          applyGlow(el);
        }
      } else {
        const el = elements[0];
        if (el.value !== value) {
          el.value = value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          applyGlow(el);
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

function showCustomSaveModal(onSave, onSkip) {
  const overlay = document.createElement('div');
  overlay.className = 'ar-modal-overlay';
  
  const box = document.createElement('div');
  box.className = 'ar-modal-box';
  
  const title = document.createElement('h3');
  title.className = 'ar-modal-title';
  title.innerText = 'Save Form Details?';
  
  const desc = document.createElement('p');
  desc.className = 'ar-modal-desc';
  desc.innerText = 'Would you like to securely save these details to quickly auto-fill them next time?';
  
  const actions = document.createElement('div');
  actions.className = 'ar-modal-actions';
  
  const btnSave = document.createElement('button');
  btnSave.className = 'ar-btn ar-btn-save';
  btnSave.innerText = 'Save Details';
  
  const btnSkip = document.createElement('button');
  btnSkip.className = 'ar-btn ar-btn-skip';
  btnSkip.innerText = 'Skip';
  
  const cleanup = () => {
    overlay.classList.remove('ar-show');
    setTimeout(() => overlay.remove(), 300);
  };
  
  btnSave.addEventListener('click', () => {
    btnSave.innerText = 'Saving...';
    onSave();
    cleanup();
  });
  
  btnSkip.addEventListener('click', () => {
    onSkip();
    cleanup();
  });
  
  actions.appendChild(btnSkip);
  actions.appendChild(btnSave);
  box.appendChild(title);
  box.appendChild(desc);
  box.appendChild(actions);
  overlay.appendChild(box);
  
  document.body.appendChild(overlay);
  
  requestAnimationFrame(() => {
    overlay.classList.add('ar-show');
  });
}

let isSubmitting = false;

document.addEventListener('submit', function(e) {
  if (isSubmitting) return;
  
  if (e.target && e.target.tagName === 'FORM') {
    e.preventDefault();
    const form = e.target;
    
    showCustomSaveModal(() => {
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
      chrome.storage.local.set({ savedFormData: formData }, () => {
        isSubmitting = true;
        form.submit();
      });
    }, () => {
      isSubmitting = true;
      form.submit();
    });
  }
});

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
