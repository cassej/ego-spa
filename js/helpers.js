/**
 * Maps hands + duration to codes for CodeBased and PackBased pricing systems
 */
function findMCode(hands, duration) {
    // M-codes for CodeBased system
    if (hands === 2) {
        if (duration === 20) return 'M11';
        if (duration === 40) return 'M12';
        if (duration === 60) return 'M13';
        if (duration === 90) return 'M14';
    }
    if (hands === 4) {
        if (duration === 40) return 'M15';
        if (duration === 75) return 'M16';
        if (duration === 90) return 'P01'; // PackBased default
    }
    if (hands === 6 && duration === 60) return 'M17';
    if (hands === 8 && duration === 60) return 'M18';
    if (hands === 8 && duration === 120) return 'P03'; // PackBased
    return null;
}

/**
 * Get all valid {hands, duration} combinations for a technique
 * @param {string} techniqueKey - The technique key
 * @returns {Array<{hands: number, duration: number}>}
 */
function getValidCombinations(techniqueKey) {
    const techniqueData = TECHNIQUE_DATA[techniqueKey];
    if (!techniqueData) return [];

    if ((techniqueData.pricingSystem === 'CodeBased' || techniqueData.pricingSystem === 'PackBased') && techniqueData.allowedCodes) {
        // CodeBased/PackBased system: derive combinations from allowedCodes
        return techniqueData.allowedCodes
            .map(code => M_CODE_PRICING[code])
            .filter(pricing => pricing && pricing.hands && pricing.duration)
            .map(pricing => ({ hands: pricing.hands, duration: pricing.duration }));
    }

    if (techniqueData.allowedCombinations) {
        // Tiered system: use allowedCombinations directly
        return techniqueData.allowedCombinations.map(c => ({ hands: c.hands, duration: c.duration }));
    }

    return [];
}

/**
 * Get all available hands for a technique
 * @param {string} techniqueKey - The technique key
 * @param {number|null} durationFilter - Optional duration to filter by
 * @returns {number[]} - Sorted array of available hands counts
 */
function getAvailableHands(techniqueKey, durationFilter = null) {
    const combos = getValidCombinations(techniqueKey);

    if (durationFilter === null) {
        // Return all unique hands
        return [...new Set(combos.map(c => c.hands))].sort((a, b) => a - b);
    }

    // Filter by duration
    const filtered = combos
        .filter(c => c.duration === durationFilter)
        .map(c => c.hands);
    return [...new Set(filtered)].sort((a, b) => a - b);
}

/**
 * Get all available durations for a technique
 * @param {string} techniqueKey - The technique key
 * @param {number|null} handsFilter - Optional hands to filter by
 * @returns {number[]} - Sorted array of available durations
 */
function getAvailableDurations(techniqueKey, handsFilter = null) {
    const combos = getValidCombinations(techniqueKey);

    if (handsFilter === null) {
        // Return all unique durations
        return [...new Set(combos.map(c => c.duration))].sort((a, b) => a - b);
    }

    // Filter by hands
    const filtered = combos
        .filter(c => c.hands === handsFilter)
        .map(c => c.duration);
    return [...new Set(filtered)].sort((a, b) => a - b);
}

/**
 * Check if a specific hands/duration combination is valid for a technique
 * @param {string} techniqueKey - The technique key
 * @param {number} hands - Hands count
 * @param {number} duration - Duration in minutes
 * @returns {boolean}
 */
function isValidCombination(techniqueKey, hands, duration) {
    const combos = getValidCombinations(techniqueKey);
    return combos.some(c => c.hands === hands && c.duration === duration);
}

/**
 * Find the nearest available duration for given hands
 * @param {string} techniqueKey - The technique key
 * @param {number} hands - Target hands count
 * @param {number} targetDuration - Preferred duration
 * @returns {number|null} - Nearest available duration or null
 */
function findNearestDuration(techniqueKey, hands, targetDuration) {
    const available = getAvailableDurations(techniqueKey, hands);

    if (available.length === 0) return null;

    return available.reduce((prev, curr) => {
        return Math.abs(curr - targetDuration) < Math.abs(prev - targetDuration) ? curr : prev;
    });
}

/**
 * Find the nearest available hands for given duration
 * @param {string} techniqueKey - The technique key
 * @param {number} duration - Target duration
 * @param {number} targetHands - Preferred hands count
 * @returns {number|null} - Nearest available hands or null
 */
function findNearestHands(techniqueKey, duration, targetHands) {
    const available = getAvailableHands(techniqueKey, duration);

    if (available.length === 0) return null;

    return available.reduce((prev, curr) => {
        return Math.abs(curr - targetHands) < Math.abs(prev - targetHands) ? curr : prev;
    });
}

/**
 * Resets single service state to technique defaults
 * Called when technique changes to ensure valid configuration
 */
function resetToTechniqueDefaults(technique) {
    const techniqueData = TECHNIQUE_DATA[technique];

    // Reset all values - no defaults
    state.single.hands = null;
    state.single.duration = null;
    state.single.mCode = null;
    state.single.scenario = null;
    state.single.scenarioName = '';
    state.single.selectedScenarios = [];
}

function formatPrice(price) {
    return `$${price}`;
}

function generateWhatsAppMessage() {
    let message = '';

    // Add Branch info
    const branchText = state.selectedBranchName ? `\n🏢 ${t('whatsapp.location')}: ${state.selectedBranchName}` : '';

    if (state.currentFlow === 'single') {
        const extras = state.single.extras.map(e => e.name).join(', ') || t('whatsapp.sensitive');
        const masseuse = state.single.masseuseName || t('whatsapp.noPreference');
        const mobility = state.single.mobilityFee > 0 ? t('whatsapp.yes') : t('whatsapp.no');
        const nightRateText = state.single.nightRate > 0 ? `\n🌙 ${t('whatsapp.nightRate')}` : '';
        const egoCardText = state.isAuth ? `\n💳 ${t('whatsapp.egoCard')}` : '';

        let scenarios = state.single.scenarioName;
        if (state.single.technique === 'circuit' || state.single.technique === 'circuit-deluxe') {
            scenarios = state.single.selectedScenarios.map(s => td('SCENARIO_DATA', s, 'name')).join(', ');
        }

        const total = calculateSinglePrice();
        const discountedTotal = state.isAuth ? Math.round(total * (1 - EGO_DISCOUNT)) : total;
        const finalPrice = state.isAuth ? discountedTotal : total;

        message = `🔥 ${t('whatsapp.newBookingSingle')}
${branchText}
    📋 ${t('whatsapp.technique')}: ${state.single.techniqueName}
    🛋️ ${t('whatsapp.scenario')}: ${scenarios}
    👆 ${t('whatsapp.hands')}: ${state.single.hands}
    ⏱️ ${t('whatsapp.duration')}: ${state.single.duration} min

    ✨ ${t('whatsapp.extras')}: ${extras}
    👩‍🦰 ${t('whatsapp.masseuse')}: ${masseuse}
    🚚 ${t('whatsapp.mobility')}: ${mobility}

    📅 ${t('whatsapp.date')}: ${state.single.bookingDate}
    🕕 ${t('whatsapp.time')}: ${state.single.bookingTime}

    💰 ${t('whatsapp.finalPrice')}: $${finalPrice}${nightRateText}${egoCardText}`;

        if (state.isAuth) {
            message += `\n📧 Ego Card: ${state.email}`;
        }
    } else if (state.currentFlow === 'packs') {
        const price = state.isAuth ? Math.round(calculatePackPrice() * (1 - EGO_DISCOUNT)) : calculatePackPrice();

        message = `🔥 ${t('whatsapp.newBookingPack')}
${branchText}
    📦 ${t('whatsapp.pack')}: ${state.pack.code} - ${state.pack.name}
    📏 ${t('whatsapp.size')}: ${state.pack.sizeLabel} (${state.pack.sessions} ${t('footer.sessions')})
    👆 ${t('whatsapp.hands')}: ${state.pack.hands}
    💰 ${t('whatsapp.total')}: $${price}`;

        if (state.isAuth) {
            message += `\n📧 Ego Card: ${state.email}`;
        }
    } else if (state.currentFlow === 'hotel') {
        const price = calculateHotelPrice();
        const finalPrice = state.isAuth ? Math.round(price * (1 - EGO_DISCOUNT)) : price;

        message = `🔥 ${t('whatsapp.newBookingHotel')}
${branchText}
    📋 ${t('whatsapp.technique')}: ${state.hotel.techniqueName}
    🛋️ ${t('whatsapp.scenario')}: ${state.hotel.scenarioName}
    👆 ${t('whatsapp.hands')}: ${state.hotel.hands}
    ⏱️ ${t('whatsapp.duration')}: ${state.hotel.duration} min

    📅 ${t('whatsapp.date')}: ${state.hotel.bookingDate}
    🕕 ${t('whatsapp.time')}: ${state.hotel.bookingTime}

    💰 ${t('whatsapp.finalPrice')}: $${finalPrice}`;

        if (state.isAuth) {
            message += `\n📧 Ego Card: ${state.email}`;
        }
    }

    return encodeURIComponent(message);
}

function generateHotelWhatsAppMessage() {
    // Use the same generateWhatsAppMessage function for consistency
    const message = generateWhatsAppMessage();
    // Don't encode here - generateWhatsAppMessage already does it
    return message;
}

function getMaxScenarios(technique, duration) {
    if (technique?.includes('-couple')) return 1;
    return DATA.SCENARIO_RULES?.limits_by_duration?.[duration] || 1;
}

function generateMembershipWhatsAppMessage() {
    const membership = EGO_MEMBERSHIP;
    let message = `🎫 *${t('whatsapp.newMembership')}*\n\n`;
    message += `📦 *${t('whatsapp.membership')}:* ${membership.name}\n`;
    message += `💰 *${t('whatsapp.priceFirstYear')}:* $${membership.firstYearPrice}\n`;
    message += `📧 *${t('whatsapp.email')}:* ${state.email || 'No proporcionado'}\n`;
    message += `🏢 *${t('whatsapp.branch')}:* ${state.selectedBranchName || 'No seleccionada'}\n`;
    message += `\n${membership.description}`;
    return encodeURIComponent(message);
}
