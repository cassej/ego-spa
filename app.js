// Ego Spa & Barba — Booking Widget
// Main entry point

let DATA;
let EGO_DISCOUNT, PACK_DATA, M_CODE_PRICING, HOTEL_SERVICE_PRICING, TECHNIQUE_DATA, SCENARIO_DATA, TIERED_MODIFIERS, WHATSAPP_NUMBER, BRANCHES, TECHNIQUE_CATEGORIES, EGO_MEMBERSHIP;

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

        // Initialize i18n
        currentLang = detectLanguage();
        document.documentElement.lang = currentLang;

        // Load branches and techniques dynamically from data.json
        loadBranches();
        loadTechniques();
        loadHotelTechniques();

        // Apply initial language to static HTML
        applyLanguage();

        // Setup all event listeners
        setupEventListeners();
        
        console.log('✅ Initialization complete.');
    } catch (error) {
        console.error('❌ Failed to initialize booking widget:', error);
    }
}

// Start the application
init();
