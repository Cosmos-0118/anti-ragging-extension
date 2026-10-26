(() => {
// The popup injects this file on demand when the tab was opened before the
// extension loaded, so guard against running twice in the same page.
if (window.__arCollegePickerLoaded) return;
window.__arCollegePickerLoaded = true;

// The undertaking forms (college / university / standalone) all share these ids.
// Picking a state fires the page's jQuery AJAX call that fills the name dropdown.
const STATE_SELECT_ID = 'cl_state';
const NAME_SELECT_ID = 'cl_name';
const STATE_LOAD_TIMEOUT_MS = 20000;

// After the extension is reloaded or updated, scripts left in already-open tabs
// lose access to chrome.* APIs and every call throws.
function isContextValid() {
  try {
    return Boolean(chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
}

// ===== Global Form Auto-Save and Auto-Fill =====
if (!document.getElementById('ar-picker-style')) {
  const style = document.createElement('style');
  style.id = 'ar-picker-style';
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
  (document.head || document.documentElement).appendChild(style);
}

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

// Set a select's value and fire the events the page's jQuery handlers listen for
function setSelectValue(el, value) {
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function autoFillForm() {
  if (!isContextValid()) {
    observer.disconnect();
    return;
  }

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
          setSelectValue(el, value);
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

// Coalesce bursts of DOM mutations into one storage read per frame
let autoFillScheduled = false;
const observer = new MutationObserver(function() {
  if (autoFillScheduled) return;
  autoFillScheduled = true;
  requestAnimationFrame(() => {
    autoFillScheduled = false;
    autoFillForm();
  });
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
  desc.innerText = 'Would you like to save these details on this device to quickly auto-fill them next time?';

  const actions = document.createElement('div');
  actions.className = 'ar-modal-actions';

  const btnSave = document.createElement('button');
  btnSave.type = 'button';
  btnSave.className = 'ar-btn ar-btn-save';
  btnSave.innerText = 'Save Details';

  const btnSkip = document.createElement('button');
  btnSkip.type = 'button';
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
  // Respect the page's own validation, and don't hold the form hostage if the
  // extension was reloaded and storage is no longer reachable.
  if (e.defaultPrevented || !isContextValid()) return;

  if (e.target && e.target.tagName === 'FORM') {
    e.preventDefault();
    const form = e.target;
    const submitForm = () => {
      isSubmitting = true;
      form.submit();
    };

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
      try {
        chrome.storage.local.set({ savedFormData: formData }, submitForm);
      } catch (err) {
        submitForm();
      }
    }, submitForm);
  }
});

// ===== College / University Picker =====

function collectItems() {
  // Find all select elements on the page to support both Universities and Colleges
  const selects = document.querySelectorAll('select');
  const items = [];

  selects.forEach((select, index) => {
    // Create a unique identifier if id doesn't exist
    const selectIdentifier = select.id || `ext-select-${index}`;

    // Store it in a dataset attribute so we can find it later
    select.dataset.extId = selectIdentifier;

    // Every real option in the institution dropdown counts (standalone institutes
    // don't always use C-/U- codes); elsewhere only C-/U- codes do.
    const isNameSelect = select.id === NAME_SELECT_ID;

    Array.from(select.options).forEach(option => {
      const val = option.value.trim();
      const matches = isNameSelect ? (val && !option.disabled) : /^[CU]-/i.test(val);
      if (matches) {
        items.push({
          value: val,
          text: option.text.trim(),
          selectId: selectIdentifier
        });
      }
    });
  });

  return items;
}

function getStateInfo() {
  const stateSelect = document.getElementById(STATE_SELECT_ID);
  if (!stateSelect || !document.getElementById(NAME_SELECT_ID)) return null;

  return {
    selected: stateSelect.value,
    options: Array.from(stateSelect.options)
      .filter(opt => opt.value)
      .map(opt => ({ value: opt.value, text: opt.text.trim() }))
  };
}

// Resolve once the page replaces the dropdown's options (its AJAX success handler
// calls $('#cl_name').html(result)), or with false if the server never answers.
function waitForOptionsReplaced(select, timeoutMs) {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      optionsObserver.disconnect();
      resolve(false);
    }, timeoutMs);

    const optionsObserver = new MutationObserver(() => {
      clearTimeout(timer);
      optionsObserver.disconnect();
      resolve(true);
    });
    optionsObserver.observe(select, { childList: true, subtree: true });
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

  if (request.action === "CLEAR_FORM") {
    filledFields.clear(); // Clear tracked fields so autofill can run again later

    formSchema.forEach(field => {
      const elements = getElements(field);
      if (elements.length === 0) return;

      if (field.type === 'radio' || field.type === 'checkbox') {
        elements.forEach(el => {
          if (el.checked) {
            el.checked = false;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      } else {
        const el = elements[0];
        if (el.value !== '') {
          el.value = '';
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    });

    sendResponse({ success: true });
    return;
  }

  if (request.action === "GET_COLLEGES") {
    sendResponse({ colleges: collectItems(), state: getStateInfo() });
    return;
  }

  if (request.action === "SET_STATE") {
    const stateSelect = document.getElementById(STATE_SELECT_ID);
    const nameSelect = document.getElementById(NAME_SELECT_ID);

    if (!stateSelect || !nameSelect) {
      sendResponse({ success: false, error: "NO_STATE_FIELD" });
      return;
    }
    if (!Array.from(stateSelect.options).some(opt => opt.value === request.value)) {
      sendResponse({ success: false, error: "UNKNOWN_STATE" });
      return;
    }

    // The user chose this state; stop auto-fill from switching it back
    filledFields.add('cl_state');

    const loaded = waitForOptionsReplaced(nameSelect, STATE_LOAD_TIMEOUT_MS);
    setSelectValue(stateSelect, request.value);
    applyGlow(stateSelect);

    loaded.then(ok => {
      sendResponse({
        success: ok,
        error: ok ? undefined : "TIMEOUT",
        colleges: collectItems(),
        state: getStateInfo()
      });
    });
    return true; // Keep the message channel open for the async response
  }

  if (request.action === "SELECT_COLLEGE") {
    // request contains value and selectId
    let selectElement = document.getElementById(request.selectId);

    // Fallback to dataset attribute if element didn't have an ID
    if (!selectElement) {
      selectElement = document.querySelector(`select[data-ext-id="${CSS.escape(String(request.selectId))}"]`);
    }

    if (selectElement) {
      if (selectElement.id === NAME_SELECT_ID) filledFields.add('cl_name');

      setSelectValue(selectElement, request.value);
      applyGlow(selectElement);

      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Select element not found." });
    }
  }
});
})();
