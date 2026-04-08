// Ego Spa & Barba — i18n Engine
// Reads translations from DATA.TRANSLATIONS, _en fields from data sections

let currentLang = 'es';

function detectLanguage() {
    const saved = localStorage.getItem('ego-lang');
    if (saved === 'es' || saved === 'en') return saved;
    const bl = (navigator.language || 'es').substring(0, 2).toLowerCase();
    return bl === 'en' ? 'en' : 'es';
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('ego-lang', lang);
    document.documentElement.lang = lang;
    refreshAllUI();
}

function toggleLanguage() {
    setLanguage(currentLang === 'es' ? 'en' : 'es');
}

function t(key, params) {
    let val = DATA.TRANSLATIONS?.[currentLang]?.[key]
           || DATA.TRANSLATIONS?.es?.[key]
           || key;
    if (params) Object.entries(params).forEach(([k, v]) => { val = val.replace(`{${k}}`, v); });
    return val;
}

function td(section, itemKey, field) {
    // For data arrays (FLOWS), find by id
    if (Array.isArray(DATA[section])) {
        const item = DATA[section].find(i => i.id === itemKey);
        if (item) return (currentLang === 'en' && item[field + '_en']) ? item[field + '_en'] : item[field];
        return itemKey;
    }
    // For data objects
    const item = DATA[section]?.[itemKey];
    if (!item) return itemKey;
    if (currentLang === 'en' && item[field + '_en']) return item[field + '_en'];
    return item[field] || itemKey;
}

function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    const toggle = document.getElementById('langToggleText');
    if (toggle) toggle.textContent = currentLang === 'es' ? 'EN' : 'ES';
}

function refreshAllUI() {
    applyLanguage();
    // Re-render dynamic content
    if (typeof loadBranches === 'function') loadBranches();
    if (typeof loadTechniques === 'function') loadTechniques();
    if (typeof loadHotelTechniques === 'function') loadHotelTechniques();
    if (typeof updateStickyFooter === 'function') updateStickyFooter();
    if (typeof updateScenarioHint === 'function') updateScenarioHint();
    // Re-render summaries if visible
    if (typeof updateFinalSummary === 'function') updateFinalSummary();
    if (typeof updateHotelFinalSummary === 'function') updateHotelFinalSummary();
    if (typeof updateSummary === 'function') updateSummary();
}
