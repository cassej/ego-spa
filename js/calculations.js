/**
 * Calculate base price (without extras/addons) for single flow
 * Uses regularPrice from M_CODE_PRICING for CodeBased/PackBased
 * Uses basePrice + modifiers for Tiered
 */
function calculateSingleBasePrice() {
    if (['CodeBased', 'PackBased'].includes(state.single.pricingSystem) && state.single.mCode) {
        const mCodeData = M_CODE_PRICING[state.single.mCode];
        if (mCodeData) {
            return mCodeData.regularPrice || 0;
        }
    } else if (state.single.pricingSystem === 'Tiered' && state.single.technique) {
        if (state.single.hands !== null && state.single.duration !== null) {
            const techniqueData = TECHNIQUE_DATA[state.single.technique];
            if (techniqueData && techniqueData.basePrice) {
                let total = techniqueData.basePrice || 0;
                total += TIERED_MODIFIERS.hands[String(state.single.hands)] || 0;
                total += TIERED_MODIFIERS.duration[String(state.single.duration)] || 0;
                return total;
            }
        }
    }
    return 0;
}

/**
 * Calculate Ego Card base price (before extras/addons)
 * CodeBased/PackBased: uses egoPrice from M_CODE_PRICING
 * Tiered: applies EGO_DISCOUNT formula
 */
function calculateSingleEgoBasePrice() {
    if (['CodeBased', 'PackBased'].includes(state.single.pricingSystem) && state.single.mCode) {
        const mCodeData = M_CODE_PRICING[state.single.mCode];
        if (mCodeData) {
            return mCodeData.egoPrice || mCodeData.regularPrice || 0;
        }
    } else if (state.single.pricingSystem === 'Tiered' && state.single.technique) {
        if (state.single.hands !== null && state.single.duration !== null) {
            const techniqueData = TECHNIQUE_DATA[state.single.technique];
            if (techniqueData && techniqueData.basePrice) {
                let total = techniqueData.basePrice || 0;
                total += TIERED_MODIFIERS.hands[String(state.single.hands)] || 0;
                total += TIERED_MODIFIERS.duration[String(state.single.duration)] || 0;
                return roundTo5(Math.round(total * (1 - EGO_DISCOUNT)));
            }
        }
    }
    return 0;
}

/**
 * Calculate pack unit price per session
 * Finds matching pack by duration, takes smallest size, returns price/sessions
 */
function calculatePackUnitPrice() {
    const duration = state.single.duration;
    if (!duration || !PACK_DATA) return 0;

    // Map duration to pack code
    // M51=20min, M52=40min, M54=60min, M53=90min
    let packCode = null;
    if (duration === 20) packCode = 'M51';
    else if (duration === 40) packCode = 'M52';
    else if (duration === 60) packCode = 'M54';
    else if (duration === 90) packCode = 'M53';

    const packData = PACK_DATA[packCode];
    if (!packData) return 0;

    // Find smallest size (by sessions)
    const sizes = Object.values(packData.sizes);
    if (sizes.length === 0) return 0;

    // Sort by sessions ascending, take first
    sizes.sort((a, b) => a.sessions - b.sessions);
    const smallest = sizes[0];

    return Math.round(smallest.price / smallest.sessions);
}

function calculateSinglePrice() {
    let total = calculateSingleBasePrice();

    // Add extras
    state.single.extras.forEach(extra => {
        total += (extra.addon || 0);
    });

    // Add sensitive addon
    total += (state.single.sensitiveAddon || 0);

    // Add mobility fee
    total += (state.single.mobilityFee || 0);

    // Add night rate
    total += (state.single.nightRate || 0);

    return total;
}

function calculateBasePrice() {
    return calculateSingleBasePrice();
}

// Alias for calculateSinglePrice() for backward compatibility
function calculateTotalPrice() {
    const total = calculateSinglePrice();
    console.log('💰 Total Price Calculation:', { total, technique: state.single.technique, hands: state.single.hands, duration: state.single.duration, nightRate: state.single.nightRate, mobility: state.single.mobilityFee });
    return total;
}

function calculatePackPrice() {
    const packData = PACK_DATA[state.pack.code];
    if (!packData) return 0;

    const sizeData = packData.sizes[state.pack.size];
    if (!sizeData) return 0;

    // Always use regular price
    let total = parseInt(state.pack.basePrice) || 0;

    // Upgrade fee for 4 hands
    if (state.pack.hands === 4) {
        const upgradeFee = parseInt(packData.upgradeFee) || 0;
        const sessions = parseInt(state.pack.sessions) || 0;
        total += upgradeFee * sessions;
    }

    return total;
}

function calculateHotelPrice() {
    const key = `${state.hotel.duration}-${state.hotel.hands}`;
    const pricing = HOTEL_SERVICE_PRICING[key];

    console.log('Hotel Price Calculation:', { key, pricing, hotel: state.hotel });

    if (!pricing) return 0;

    // Always use regularPrice
    let total = pricing.regularPrice || 0;

    // Add extras
    state.hotel.extras.forEach(e => {
        total += (e.addon || 0);
    });

    // Add scenario price
    total += (state.hotel.scenarioPrice || 0);

    // Add night rate (for late bookings)
    total += (state.hotel.nightRate || 0);

    console.log('Hotel Final Price:', total);
    return total;
}

/**
 * Calculates night rate surcharge based on booking end time
 * Night rate applies when service ends at or after the configured threshold
 * NOTE: Uses browser's local timezone (assumes Panama UTC-5)
 */
function calculateNightRate(bookingState) {
    if (!bookingState.bookingDate || !bookingState.bookingTime || bookingState.duration === null) {
        bookingState.nightRate = 0;
        return;
    }

    // NOTE: This uses browser's local timezone. Assumes user is in Panama (UTC-5).
    const bookingDateTime = new Date(`${bookingState.bookingDate}T${bookingState.bookingTime}`);
    const endTime = new Date(bookingDateTime.getTime() + bookingState.duration * 60000);

    // Use configured night rate threshold (e.g. 23:00)
    const afterParts = (BUSINESS_HOURS.nightRateAfter || '23:00').split(':');
    const afterMinutes = (+afterParts[0]) * 60 + (+afterParts[1]);

    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

    // Night rate applies if end time is at or after the threshold
    const applies = endMinutes >= afterMinutes;

    console.log('🌙 Night Rate Calculation:', { bookingTime: bookingState.bookingTime, duration: bookingState.duration, endTime: endTime.toLocaleTimeString(), endMinutes, afterMinutes, applies });

    bookingState.nightRate = applies ? (ADDON_PRICING['night-rate']?.price || 0) : 0;
}
