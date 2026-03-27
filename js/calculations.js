function calculateSinglePrice() {
    let total = 0;

    // Base price
    if (['CodeBased', 'PackBased'].includes(state.single.pricingSystem) && state.single.mCode) {
        const mCodeData = M_CODE_PRICING[state.single.mCode];
        if (mCodeData) {
            total = state.isAuth ? (mCodeData.egoPrice || 0) : (mCodeData.regularPrice || 0);
        }
    } else if (state.single.pricingSystem === 'Tiered' && state.single.technique) {
        // Only calculate if hands and duration are selected
        if (state.single.hands !== null && state.single.duration !== null) {
            const techniqueData = TECHNIQUE_DATA[state.single.technique];
            if (techniqueData && techniqueData.basePrice) {
                total = techniqueData.basePrice || 0;
                total += TIERED_MODIFIERS.hands[String(state.single.hands)] || 0;
                total += TIERED_MODIFIERS.duration[String(state.single.duration)] || 0;
            }
        }
    }

    // Add extras
    state.single.extras.forEach(extra => {
        total += (extra.addon || 0);
    });

    // Add mobility fee
    total += (state.single.mobilityFee || 0);

    // Add night rate
    total += (state.single.nightRate || 0);

    return total;
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

    let total = parseInt(state.pack.basePrice) || 0;

    if (state.pack.hands === 4) {
        const upgradeFee = parseInt(packData.upgradeFee) || 0;
        const sessions = parseInt(state.pack.sessions) || 0;
        const upgradeTotal = upgradeFee * sessions;
        total += upgradeTotal;
    }

    return total;
}

function calculateHotelPrice() {
    const key = `${state.hotel.duration}-${state.hotel.hands}`;
    const pricing = HOTEL_SERVICE_PRICING[key];

    console.log('Hotel Price Calculation:', { key, pricing, hotel: state.hotel });

    if (!pricing) return 0;

    let total = state.isAuth ? (pricing.egoPrice || 0) : (pricing.regularPrice || 0);

    // Add scenario price (optional)
    total += (state.hotel.scenarioPrice || 0);

    // Add extras
    state.hotel.extras.forEach(e => {
        total += (e.addon || 0);
    });

    // Add night rate (for late bookings)
    total += (state.hotel.nightRate || 0);

    console.log('Hotel Final Price:', total);
    return total;
}

/**
 * Calculates night rate surcharge based on booking end time
 * Night rate applies when service ends between midnight and 6 AM
 * NOTE: Uses browser's local timezone (assumes Panama UTC-5)
 */
function calculateNightRate() {
    if (!state.single.bookingDate || !state.single.bookingTime || state.single.duration === null) {
        state.single.nightRate = 0;
        return;
    }

    // NOTE: This uses browser's local timezone. Assumes user is in Panama (UTC-5).
    // For production, consider proper timezone handling if users book from other timezones.
    const bookingDateTime = new Date(`${state.single.bookingDate}T${state.single.bookingTime}`);
    const endTime = new Date(bookingDateTime.getTime() + state.single.duration * 60000);

    // Night rate applies if massage ends at midnight (00:00) or later, before 6:00 AM
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();
    const isAfterMidnight = endHour >= 0 && endHour < 6;

    console.log('🌙 Night Rate Calculation:', { bookingTime: state.single.bookingTime, duration: state.single.duration, endTime: endTime.toLocaleTimeString(), endHour, endMinute, isAfterMidnight });

    state.single.nightRate = isAfterMidnight ? 25 : 0;
}
