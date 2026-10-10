const state = {
    gender: null, // 'men', 'women', 'couple'
    currentFlow: null, // 'single' or 'hotel'
    currentStep: 0,
    // Single massage state
    single: {
        technique: null,
        techniqueName: '',
        pricingSystem: null,
        mCode: null,
        scenario: null,
        scenarioName: '',
        basePrice: 0,
        hands: null,
        handsAddon: 0,
        duration: null,
        durationAddon: 0,
        sensitive: 'double-sensitive',
        sensitiveAddon: 25,
        extras: [],
        masseuseName: '',
        masseuses: [],
        masseusePref: 'available',
        selectedTier: 'regular', // 'regular', 'pack', or 'ego'
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
        hands: null,
        duration: null,
        extras: [],
        nightRate: 0,
        bookingDate: '',
        bookingTime: ''
    },
    // Pack state
    pack: {
        code: null,
        name: '',
        validity: '',
        size: null,
        sizeLabel: '',
        sessions: 0,
        basePrice: 0,
        upgradeFee: 0,
        hands: 2
    }
};

const elements = {
    singleFlow: document.getElementById('singleFlow'),
    hotelFlow: document.getElementById('hotelFlow'),
    packSelectionScreen: document.getElementById('packSelectionScreen'),
    backBtn: document.getElementById('backBtn'),
    stickySummary: document.getElementById('stickySummary'),
    summaryLabel: document.getElementById('summaryLabel'),
    summaryDetails: document.getElementById('summaryDetails'),
    summaryPrice: document.getElementById('summaryPrice'),
    summarySavings: document.getElementById('summarySavings')
};
