// Ego Spa & Barba — Booking Widget
// Main entry point

let DATA;
let EGO_DISCOUNT, PACK_DATA, M_CODE_PRICING, HOTEL_SERVICE_PRICING, TECHNIQUE_DATA, SCENARIO_DATA, TIERED_MODIFIERS, WHATSAPP_NUMBER, BRANCHES, TECHNIQUE_CATEGORIES, EGO_MEMBERSHIP, ADDON_PRICING, BUSINESS_HOURS, HOTEL_TECHNIQUES, HOTEL_SCENARIO_PRICE;

async function init() {
    console.log('🚀 Initializing Ego Spa Booking Widget...');
    
    try {
        const res = await fetch('./data.json');
        DATA = await res.json();

        // Initialize global constants from DATA
        EGO_DISCOUNT = DATA.EGO_DISCOUNT;
        PACK_DATA = DATA.PACK_DATA;
        M_CODE_PRICING = DATA.M_CODE_PRICING;
        HOTEL_SERVICE_PRICING = DATA.HOTEL_SERVICE_PRICING;
        TECHNIQUE_DATA = DATA.TECHNIQUE_DATA;
        SCENARIO_DATA = DATA.SCENARIO_DATA;
        TIERED_MODIFIERS = DATA.TIERED_MODIFIERS;
        WHATSAPP_NUMBER = DATA.WHATSAPP_NUMBER;
        BRANCHES = DATA.BRANCHES;
        TECHNIQUE_CATEGORIES = DATA.TECHNIQUE_CATEGORIES;
        EGO_MEMBERSHIP = DATA.EGO_MEMBERSHIP;
        ADDON_PRICING = DATA.ADDON_PRICING;
        BUSINESS_HOURS = DATA.BUSINESS_HOURS;
        HOTEL_TECHNIQUES = DATA.HOTEL_TECHNIQUES;
        HOTEL_SCENARIO_PRICE = DATA.HOTEL_SCENARIO_PRICE;

        // Initialize i18n
        currentLang = detectLanguage();
        document.documentElement.lang = currentLang;

        // Load branches and techniques dynamically from data.json
        loadBranches();
        loadTechniques();
        loadHotelTechniques();

        // Apply initial language to static HTML
        applyLanguage();

        // Update hotel scenario prices from data
        updateHotelScenarioPrices();

        // Setup all event listeners
        setupEventListeners();
        
        console.log('✅ Initialization complete.');
    } catch (error) {
        console.error('❌ Failed to initialize booking widget:', error);
    }
}

// Start the application
init();

function updateHotelScenarioPrices() {
    const price = DATA.HOTEL_SCENARIO_PRICE || 25;
    document.querySelectorAll('input[name="hotel-scenario"][data-price]').forEach(input => {
        if (input.dataset.scenario) {
            input.dataset.price = price;
        }
    });
    document.querySelectorAll('.hotel-scenario-price-display').forEach(el => {
        el.textContent = '+$' + price;
    });
}
