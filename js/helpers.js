/**
 * Maps hands + duration to M-codes for M11-M18 pricing system
 */
function findMCode(hands, duration) {
    if (hands === 2) {
        if (duration === 20) return 'M11';
        if (duration === 40) return 'M12';
        if (duration === 60) return 'M13';
        if (duration === 90) return 'M14';
    }
    if (hands === 4) {
        if (duration === 40) return 'M15';
        if (duration === 75) return 'M16';
    }
    if (hands === 6 && duration === 60) return 'M17';
    if (hands === 8 && duration === 60) return 'M18';
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

    if (techniqueData.pricingSystem === 'M11-M18' && techniqueData.allowedCodes) {
        // M11-M18 system: derive combinations from allowedCodes
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
    const branchText = state.selectedBranchName ? `\n🏢 UBICACIÓN: ${state.selectedBranchName}` : '';

    if (state.currentFlow === 'single') {
        const extras = state.single.extras.map(e => e.name).join(', ') || 'Sensitive';
        const masseuse = state.single.masseuseName || 'Sin preferencia';
        const mobility = state.single.mobilityFee > 0 ? 'Sí (+$25)' : 'No';
        const nightRateText = state.single.nightRate > 0 ? '\n🌙 Incluye Night Rate (+$25)' : '';
        const egoCardText = state.isAuth ? '\n💳 Ego Card aplicado' : '';

        let scenarios = state.single.scenarioName;
        if (state.single.technique === 'circuit' || state.single.technique === 'circuit-deluxe') {
            scenarios = state.single.selectedScenarios.map(s => SCENARIO_DATA[s].name).join(', ');
        }

        const total = calculateSinglePrice();
        const discountedTotal = state.isAuth ? Math.round(total * (1 - EGO_DISCOUNT)) : total;
        const finalPrice = state.isAuth ? discountedTotal : total;

        message = `🔥 NUEVA RESERVA - SINGLE MASSAGE
${branchText}
    📋 TÉCNICA: ${state.single.techniqueName}
    🛋️ ESCENARIO: ${scenarios}
    👆 MANOS: ${state.single.hands}
    ⏱️ DURACIÓN: ${state.single.duration} min

    ✨ PRAECOQUIS: ${extras}
    👩‍🦰 MASAJISTA: ${masseuse}
    🚚 TRASLADO: ${mobility}

    📅 FECHA: ${state.single.bookingDate}
    🕕 HORA: ${state.single.bookingTime}

    💰 PRECIO FINAL: $${finalPrice}${nightRateText}${egoCardText}`;

        if (state.isAuth) {
            message += `\n📧 Ego Card: ${state.email}`;
        }
    } else if (state.currentFlow === 'packs') {
        const price = state.isAuth ? Math.round(calculatePackPrice() * (1 - EGO_DISCOUNT)) : calculatePackPrice();

        message = `🔥 NUEVA RESERVA - PACK
${branchText}
    📦 PAQUETE: ${state.pack.code} - ${state.pack.name}
    📏 TAMAÑO: ${state.pack.sizeLabel} (${state.pack.sessions} sesiones)
    👆 MANOS: ${state.pack.hands}
    💰 TOTAL: $${price}`;

        if (state.isAuth) {
            message += `\n📧 Ego Card: ${state.email}`;
        }
    } else if (state.currentFlow === 'hotel') {
        const price = calculateHotelPrice();
        const finalPrice = state.isAuth ? Math.round(price * (1 - EGO_DISCOUNT)) : price;

        message = `🔥 NUEVA RESERVA - HOTEL/HOME SERVICE
${branchText}
    📋 TÉCNICA: ${state.hotel.techniqueName}
    🛋️ ESCENARIO: ${state.hotel.scenarioName}
    👆 MANOS: ${state.hotel.hands}
    ⏱️ DURACIÓN: ${state.hotel.duration} min

    📅 FECHA: ${state.hotel.bookingDate}
    🕕 HORA: ${state.hotel.bookingTime}

    💰 PRECIO FINAL: $${finalPrice}`;

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

function generateMembershipWhatsAppMessage() {
    const membership = EGO_MEMBERSHIP;
    let message = `🎫 *NUEVA MEMBRESÍA EGO CARD*\n\n`;
    message += `📦 *Membresía:* ${membership.name}\n`;
    message += `💰 *Precio Primer Año:* $${membership.firstYearPrice}\n`;
    message += `📧 *Email:* ${state.email || 'No proporcionado'}\n`;
    message += `🏢 *Filial:* ${state.selectedBranchName || 'No seleccionada'}\n`;
    message += `\n${membership.description}`;
    return encodeURIComponent(message);
}
