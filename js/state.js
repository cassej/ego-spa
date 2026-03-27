const state = {
    isAuth: false,
    email: '',
    selectedBranch: null, // 'marbella', 'costa-del-este', 'san-francisco', 'el-dorado', or 'hotel-service'
    selectedBranchName: '', // Display name for WhatsApp
    currentFlow: null, // 'single', 'packs', 'hotel', or 'jetlag'
    currentStep: 0,
    // Single massage state (Spa)
    single: {
        technique: null,
        techniqueName: '',
        pricingSystem: null, // 'CodeBased', 'Tiered', or 'PackBased'
        mCode: null, // Selected code for CodeBased/PackBased techniques
        scenario: null, // Selected scenario (massage-table, tatami, etc.)
        scenarioName: '',
        basePrice: 0,
        hands: null,
        handsAddon: 0,
        duration: null,
        durationAddon: 0,
        extras: [], // Add-ons like Double Sensitive, Night Rate
        masseuseName: '',
        mobilityFee: 0,
        nightRate: 0,
        bookingDate: '',
        bookingTime: '',
        selectedScenarios: []
    },
    // Hotel service state
    hotel: {
        technique: null,
        techniqueName: '',
        pricingSystem: null,
        scenario: null,
        scenarioName: '',
        scenarioPrice: 0,
        hands: 2,
        duration: 60,
        extras: [],
        nightRate: 0
    },
    // Pack state
    pack: {
        code: null,
        name: '',
        size: null,
        sizeLabel: '',
        sessions: 0,
        basePrice: 0,
        upgradeFee: 0,
        hands: 2
    }
};

const elements = {
    authBtn: document.getElementById('authBtn'),
    authLabel: document.getElementById('authLabel'),
    authModal: document.getElementById('authModal'),
    authForm: document.getElementById('authForm'),
    emailInput: document.getElementById('emailInput'),
    closeAuthModal: document.getElementById('closeAuthModal'),
    flowSelection: document.getElementById('flowSelection'),
    singleFlow: document.getElementById('singleFlow'),
    packsFlow: document.getElementById('packsFlow'),
    hotelFlow: document.getElementById('hotelFlow'),
    jetlagFlow: document.getElementById('jetlagFlow'),
    touristFlow: document.getElementById('touristFlow'),
    membershipFlow: document.getElementById('membershipFlow'),
    backBtn: document.getElementById('backBtn'),
    stickySummary: document.getElementById('stickySummary'),
    summaryLabel: document.getElementById('summaryLabel'),
    summaryDetails: document.getElementById('summaryDetails'),
    summaryPrice: document.getElementById('summaryPrice'),
    summarySavings: document.getElementById('summarySavings'),
    sizeOptions: document.getElementById('sizeOptions')
};
