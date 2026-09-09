/**
 * Updates UI constraints for scenarios, hands, and duration options
 * Implements "Visible but Locked" UX pattern
 */
function updateConstraints() {
    const technique = state.single.technique;
    const hands = state.single.hands;
    const duration = state.single.duration;

    if (!technique) return;

    const techniqueData = TECHNIQUE_DATA[technique];
    console.log('🔒 Update Constraints:', { technique, hands, duration, allowedScenarios: techniqueData.allowedScenarios });

    // 1. Update scenario availability
    document.querySelectorAll('.scenario-btn').forEach(btn => {
        const scenario = btn.dataset.scenario;
        const isAllowed = techniqueData.allowedScenarios.includes(scenario);

        // Check technique exclusions from config
        const techniqueExclusions = DATA.SCENARIO_RULES?.technique_exclusions?.[technique] || [];
        const isExcluded = techniqueExclusions.includes(scenario);

        const finalAllowed = isAllowed && !isExcluded;
        btn.classList.toggle('option-locked', !finalAllowed);
        btn.disabled = !finalAllowed;
        btn.dataset.lockReason = finalAllowed ? '' : t('common.lockReason');
    });

    // 2. Update hands availability
    // Show all hands available for this technique, regardless of selected duration
    // (Duration choice does not limit hands choice)
    const availableHands = getAvailableHands(technique);

    document.querySelectorAll('.hands-btn').forEach(btn => {
        const h = parseInt(btn.dataset.hands);
        const isLocked = !availableHands.includes(h);
        btn.classList.toggle('option-locked', isLocked);
        btn.disabled = isLocked;
        btn.dataset.lockReason = isLocked ? t('common.lockReason') : '';
    });

    // 3. Update duration availability
    // If hands are selected, show only durations that work with them
    // (Hands choice limits duration choice)
    const availableDurations = hands !== null
        ? getAvailableDurations(technique, hands)
        : getAvailableDurations(technique);

    document.querySelectorAll('.duration-btn').forEach(btn => {
        const d = parseInt(btn.dataset.duration);
        let isLocked = !availableDurations.includes(d);
        let lockReason = isLocked ? t('common.lockReason') : '';

        btn.classList.toggle('option-locked', isLocked);
        btn.disabled = isLocked;
        btn.dataset.lockReason = lockReason;
    });
}

/**
 * Updates hotel scenario constraints based on selected technique
 * Hotel + Nuru = Tatami Wet ONLY (no "Sin escenario", auto-select, locked)
 * Hotel + Thai = Tatami Dry ONLY
 * Hotel + All other techniques = Sin escenario + Massage Table + Tatami Dry
 */
function updateHotelConstraints() {
    const technique = state.hotel.technique;

    if (!technique) return;

    // Update hands constraints based on technique
    updateHotelHandsConstraints();

    // Hotel scenario constraints
    let allowedScenarios = [];
    const isNuru = technique === 'nuru';

    if (isNuru) {
        // Nuru = Tatami Wet ONLY
        allowedScenarios = ['tatami-wet'];
    } else if (technique === 'thai') {
        // Thai = Tatami Wet ONLY
        allowedScenarios = ['tatami-wet'];
    } else {
        // All other techniques = Table + Tatami Wet (no Tantric Couch)
        allowedScenarios = ['massage-table', 'tatami-wet'];
    }

    console.log('🏨 Hotel Constraints:', { technique, allowedScenarios, isNuru });

    // Update scenario availability for radio button options
    document.querySelectorAll('.hotel-scenario-option').forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        const scenario = radio.dataset.scenario;

        // For nuru: "Sin escenario" (empty scenario) is NOT allowed
        // For all others: "Sin escenario" is always allowed
        const isEmptyScenario = !scenario;
        const isScenarioAllowed = allowedScenarios.includes(scenario);
        const isAllowed = isNuru ? isScenarioAllowed : (isEmptyScenario || isScenarioAllowed);

        option.classList.toggle('option-locked', !isAllowed);
        option.classList.toggle('disabled', !isAllowed);
        option.style.display = isAllowed ? '' : 'none';
        radio.disabled = !isAllowed;

        if (!isAllowed && radio.checked) {
            radio.checked = false;
        }
    });

    // For nuru: auto-select tatami-wet and lock it
    if (isNuru) {
        const tatamiRadio = document.querySelector('.hotel-scenario-option input[data-scenario="tatami-wet"]');
        if (tatamiRadio) {
            tatamiRadio.checked = true;
            tatamiRadio.disabled = true; // Lock it
        }
        state.hotel.scenario = 'tatami-wet';
        state.hotel.scenarioName = td('SCENARIO_DATA', 'tatami-wet', 'name');
        state.hotel.scenarioPrice = HOTEL_SCENARIO_PRICE || 0;
    } else {
        // For non-nuru: if no scenario is currently checked, check "Sin escenario"
        const anyChecked = document.querySelector('.hotel-scenario-option input[name="hotel-scenario"]:checked');
        if (!anyChecked) {
            const defaultRadio = document.querySelector('.hotel-scenario-option input[data-scenario=""]');
            if (defaultRadio) defaultRadio.checked = true;
            state.hotel.scenario = null;
            state.hotel.scenarioName = '';
            state.hotel.scenarioPrice = 0;
        }
    }
}

/**
 * Updates the sticky footer with current selection and price
 * Shows technique, hands, duration, and calculated price
 */
function updateStickyFooter() {
    const footer = document.getElementById('stickyFooter');
    if (!footer) return;

    // Start with branch if selected
    let content = '';
    let price = 0;

    if (state.selectedBranchName) {
        content = `📍 ${state.selectedBranchName}`;
    }

    if (state.currentFlow === 'single' && state.single.technique) {
        const techniqueName = state.single.techniqueName;
        const hands = state.single.hands;
        const duration = state.single.duration;

        const parts = [techniqueName];
        if (hands !== null) parts.push(`${hands} ${t('common.hands')}`);
        if (duration !== null) parts.push(`${duration}m`);

        if (content) content += ' | ';
        content += parts.join(' | ');
        price = calculateTotalPrice();
    } else if (state.currentFlow === 'packs' && state.pack.code) {
        if (content) content += ' | ';
        content += `${state.pack.code} - ${state.pack.sizeLabel} (${state.pack.sessions} ${t('footer.sessions')})`;
        price = calculatePackPrice();
    } else if (state.currentFlow === 'hotel' && state.hotel.technique) {
        if (content) content += ' | ';
        content += `${state.hotel.techniqueName} | ${state.hotel.hands} ${t('common.hands')} | ${state.hotel.duration}${t('common.min')}`;
        price = calculateHotelPrice();
    } else if (!state.currentFlow) {
        content = content || t('footer.default');
    }

    footer.querySelector('.footer-content').textContent = content;
    const priceEl = footer.querySelector('.footer-price');
    if (priceEl) priceEl.textContent = price > 0 ? `$${price}` : '';

    const nightBadge = footer.querySelector('.night-rate-badge');
    if (nightBadge) {
        nightBadge.classList.toggle('hidden', state.single.nightRate === 0);
    }
}

function updateSummary() {
    let details = '';
    let price = 0;
    let regularPrice = 0;
    let packPrice = 0;
    let egoPrice = 0;

    if (state.currentFlow === 'single' && state.single.technique) {
        const parts = [];
        parts.push(state.single.techniqueName);
        if (state.single.selectedScenarios.length > 0) {
            const scenarioNames = state.single.selectedScenarios.map(s => td('SCENARIO_DATA', s, 'name') || s);
            parts.push(scenarioNames.join(' + '));
        }
        if (state.single.hands !== null) {
            parts.push(`${state.single.hands} ${t('summary.hands').replace(':','')}`);
        }
        if (state.single.duration !== null) {
            parts.push(`${state.single.duration}m`);
        }
        if (state.single.extras.length > 0) {
            parts.push(t('common.extrasCount', { count: state.single.extras.length }));
        }
        details = parts.join(' · ');
        
        // Calculate all three prices
        regularPrice = calculateSinglePrice();
        packPrice = regularPrice; // Pack price per session is same as regular for single
        egoPrice = Math.round(regularPrice * (1 - EGO_DISCOUNT));
        price = regularPrice; // Default displayed price
    } else if (state.currentFlow === 'packs' && state.pack.code) {
        const parts = [];
        parts.push(state.pack.code);
        if (state.pack.size) {
            parts.push(state.pack.sizeLabel);
        }
        parts.push(`${state.pack.hands} ${t('summary.hands').replace(':','')}`);
        details = parts.join(' · ');
        
        // For packs, calculate per-session prices
        regularPrice = calculatePackPrice();
        packPrice = regularPrice;
        egoPrice = Math.round(regularPrice * (1 - EGO_DISCOUNT));
        price = regularPrice;
    }

    // Update the three price displays
    const finalRegularPrice = document.getElementById('finalRegularPrice');
    const finalPackPrice = document.getElementById('finalPackPrice');
    const finalEgoPrice = document.getElementById('finalEgoPrice');
    const egoPriceRow = document.getElementById('egoPriceRow');
    const egoSavingsNote = document.getElementById('egoSavingsNote');

    if (regularPrice > 0) {
        if (finalRegularPrice) finalRegularPrice.textContent = formatPrice(regularPrice);
        if (finalPackPrice) finalPackPrice.textContent = formatPrice(packPrice);
        if (finalEgoPrice) finalEgoPrice.textContent = formatPrice(egoPrice);
        
        // Show ego price row
        if (egoPriceRow) egoPriceRow.classList.remove('hidden');
        
        // Show savings note
        const savings = regularPrice - egoPrice;
        if (egoSavingsNote && savings > 0) {
            egoSavingsNote.textContent = t('summary.savingsNote', { amount: formatPrice(savings) });
            egoSavingsNote.classList.remove('hidden');
        }
    } else {
        if (finalRegularPrice) finalRegularPrice.textContent = '';
        if (finalPackPrice) finalPackPrice.textContent = '';
        if (finalEgoPrice) finalEgoPrice.textContent = '';
        if (egoPriceRow) egoPriceRow.classList.add('hidden');
        if (egoSavingsNote) egoSavingsNote.classList.add('hidden');
    }

    elements.summaryDetails.textContent = details;

    // Show/hide summary - only show on final step (step 6)
    // Show/hide summary - only show on final step (step 6)
    if (price > 0 && state.currentStep === 6) {
        elements.stickySummary.classList.remove('translate-y-full');
    } else {
        elements.stickySummary.classList.add('translate-y-full');
    }
}

function goToStep(step) {
    console.log(`➡️ Going to Step ${step} from ${state.currentStep}, flow: ${state.currentFlow}`);
    state.currentStep = step;

    // Update step indicators
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (i + 1 < step) dot.classList.add('completed');
        if (i + 1 === step) dot.classList.add('active');
    });

    // Hide all step content in current flow
    let stepContentSelector = '.step-content';
    if (state.currentFlow === 'single') stepContentSelector = '#singleFlow .step-content';
    else if (state.currentFlow === 'packs') stepContentSelector = '#packsFlow .step-content';
    else if (state.currentFlow === 'hotel') stepContentSelector = '#hotelFlow .step-content';

    document.querySelectorAll(stepContentSelector).forEach(el => {
        el.classList.add('hidden');
    });

    // Show current step content
    if (state.currentFlow === 'single') {
        document.getElementById(`singleStep${step}`).classList.remove('hidden');

        // Restore button selections based on state
        if (state.single.technique) {
            // Restore technique selection
            const techBtn = document.querySelector(`.technique-btn[data-technique="${state.single.technique}"]`);
            if (techBtn) techBtn.classList.add('selected');

            // Restore hands selection
            if (state.single.hands !== null) {
                const handsBtn = document.querySelector(`.hands-btn[data-hands="${state.single.hands}"]`);
                if (handsBtn) handsBtn.classList.add('selected');
            }

            // Restore duration selection
            if (state.single.duration !== null) {
                const durationBtn = document.querySelector(`.duration-btn[data-duration="${state.single.duration}"]`);
                if (durationBtn) durationBtn.classList.add('selected');
            }

            // Restore scenario selection
            if (state.single.scenario) {
                const scenarioBtn = document.querySelector(`.scenario-btn[data-scenario="${state.single.scenario}"]`);
                if (scenarioBtn) scenarioBtn.classList.add('selected');
            }

            // Update constraints to reflect current state
            updateConstraints();
        }

        // Update continue button state on step 2
        if (step === 2) {
            updateConfigContinueButton();
        }

        // Update final summary on step 6
        if (step === 7) {
            updateFinalSummary();
        }
    } else if (state.currentFlow === 'packs') {
        document.getElementById(`packStep${step}`).classList.remove('hidden');
    } else if (state.currentFlow === 'hotel') {
        document.getElementById(`hotelStep${step}`).classList.remove('hidden');

        // Restore hotel selections
        if (state.hotel.technique) {
            const techBtn = document.querySelector(`.hotel-technique-btn[data-technique="${state.hotel.technique}"]`);
            if (techBtn) techBtn.classList.add('selected');

            // Restore hands constraints for this technique
            updateHotelHandsConstraints();

            // Restore hands selection
            if (state.hotel.hands !== null) {
                const handsBtn = document.querySelector(`.hotel-hands-btn[data-hands="${state.hotel.hands}"]`);
                if (handsBtn) handsBtn.classList.add('selected');
            }

            // Restore duration selection
            if (state.hotel.duration !== null) {
                const durBtn = document.querySelector(`.hotel-duration-btn[data-duration="${state.hotel.duration}"]`);
                if (durBtn) durBtn.classList.add('selected');
            }

            // Restore scenario radio button selection
            if (state.hotel.scenario !== undefined && state.hotel.scenario !== null) {
                const scenarioRadio = document.querySelector(`.hotel-scenario-option input[data-scenario="${state.hotel.scenario}"]`);
                if (scenarioRadio) {
                    scenarioRadio.checked = true;
                } else {
                    // Check the "Sin escenario" option
                    const defaultRadio = document.querySelector('.hotel-scenario-option input[data-scenario=""]');
                    if (defaultRadio) defaultRadio.checked = true;
                }
            }
        }

        // Update continue button state on step 2
        if (step === 2) {
            updateHotelConfigContinueButton();
        }

        // Populate final summary on step 3
        if (step === 3) {
            updateHotelFinalSummary();
        }

        // Populate final summary on step 4
        if (step === 4) {
            updateHotelFinalSummary();
        }
    }

    // Update sticky footer visibility
    const stickyFooter = document.getElementById('stickyFooter');
    if (stickyFooter) {
        // Don't show on final step (step 6)
        if (state.currentFlow === 'single' && step >= 1 && step <= 6) {
            stickyFooter.classList.add('visible');
        } else {
            stickyFooter.classList.remove('visible');
        }
    }

    // Show back button
    elements.backBtn.classList.remove('hidden');

    updateSummary();
}

function updateFinalSummary() {
    document.getElementById('finalTechnique').textContent = state.single.techniqueName;
    // Show all selected scenarios
    if (state.single.selectedScenarios.length > 0) {
        const scenarioNames = state.single.selectedScenarios.map(s => td('SCENARIO_DATA', s, 'name') || s);
        document.getElementById('finalScenario').textContent = scenarioNames.join(' + ');
    } else {
        document.getElementById('finalScenario').textContent = '';
    }
    document.getElementById('finalHands').textContent = state.single.hands !== null ? state.single.hands + ' ' + t('single.handsUnit') : '';
    document.getElementById('finalDuration').textContent = state.single.duration !== null ? state.single.duration + ' ' + t('common.min') : '';

    const sensitiveText = state.single.sensitive === 'double-sensitive' ? 'Double Sensitive' : 'Sensitive';
    document.getElementById('finalSensitive').textContent = sensitiveText;

    const extrasText = state.single.extras.map(e => e.name).join(', ') || t('summary.noExtras');
    document.getElementById('finalExtras').textContent = extrasText;

    document.getElementById('finalMasseuse').textContent = state.single.masseuseName || t('whatsapp.noPreference');

    const mobilityRow = document.getElementById('finalMobilityRow');
    mobilityRow.classList.toggle('hidden', state.single.mobilityFee === 0);

    const nightRateRow = document.getElementById('finalNightRateRow');
    nightRateRow.classList.toggle('hidden', state.single.nightRate === 0);

    // Update night rate disclaimer visibility
    const nightRateDisclaimer = document.getElementById('nightRateDisclaimer');
    if (nightRateDisclaimer) {
        nightRateDisclaimer.classList.toggle('hidden', state.single.nightRate === 0);
    }

    document.getElementById('finalDate').textContent = state.single.bookingDate || '';
    document.getElementById('finalTime').textContent = state.single.bookingTime || '';

    const total = calculateSinglePrice();
    document.getElementById('finalPrice').textContent = `$${total}`;

    updateNightRateDisclaimers();
}

function updateHotelFinalSummary() {
    console.log('Updating hotel final summary, state:', state.hotel);

    const finalTechnique = document.getElementById('hotelFinalTechnique');
    const finalScenario = document.getElementById('hotelFinalScenario');
    const finalConfig = document.getElementById('hotelFinalConfig');
    const finalExtras = document.getElementById('hotelFinalExtras');
    const finalPrice = document.getElementById('hotelFinalPrice');
    const finalSavings = document.getElementById('hotelFinalSavings');

    // Step 4 summary elements
    const s4Technique = document.getElementById('hotelFinalTechniqueStep4');
    const s4Scenario = document.getElementById('hotelFinalScenarioStep4');
    const s4Config = document.getElementById('hotelFinalConfigStep4');
    const s4Extras = document.getElementById('hotelFinalExtrasStep4');
    const s4Price = document.getElementById('hotelFinalPriceStep4');
    const s4Savings = document.getElementById('hotelFinalSavingsStep4');

    const techniqueText = state.hotel.techniqueName || t('common.defaultMassage');
    const scenarioText = state.hotel.scenario ? td('SCENARIO_DATA', state.hotel.scenario, 'name') : state.hotel.scenarioName;
    const configText = `${state.hotel.hands} ${t('single.handsUnit')} · ${state.hotel.duration} ${t('common.min')}`;
    const extrasText = state.hotel.extras.length > 0 ? state.hotel.extras.map(e => e.name).join(', ') : t('summary.noExtras');

    // Update step 3 summary
    if (finalTechnique) finalTechnique.textContent = techniqueText;
    if (finalScenario) finalScenario.textContent = scenarioText || '';
    if (finalConfig) finalConfig.textContent = configText;
    if (finalExtras) finalExtras.textContent = extrasText;

    // Update step 4 summary
    if (s4Technique) s4Technique.textContent = techniqueText;
    if (s4Scenario) s4Scenario.textContent = scenarioText || '';
    if (s4Config) s4Config.textContent = configText;
    if (s4Extras) s4Extras.textContent = extrasText;

    // Night rate rows
    const nightPrice = ADDON_PRICING['night-rate']?.price || 0;
    const hasNightRate = state.hotel.nightRate > 0;

    // Step 3 night rate
    const nightRateRow = document.getElementById('hotelFinalNightRateRow');
    if (nightRateRow) nightRateRow.classList.toggle('hidden', !hasNightRate);
    const nightRateLabel = document.getElementById('hotelFinalNightRateLabel');
    if (nightRateLabel) nightRateLabel.textContent = t('summary.nightRate', { price: nightPrice });
    const nightRatePrice = document.getElementById('hotelFinalNightRatePrice');
    if (nightRatePrice) nightRatePrice.textContent = `+$${nightPrice}`;

    // Step 4 night rate
    const nightRateRowS4 = document.getElementById('hotelFinalNightRateRowStep4');
    if (nightRateRowS4) nightRateRowS4.classList.toggle('hidden', !hasNightRate);
    const nightRateLabelS4 = document.getElementById('hotelFinalNightRateLabelStep4');
    if (nightRateLabelS4) nightRateLabelS4.textContent = t('summary.nightRate', { price: nightPrice });
    const nightRatePriceS4 = document.getElementById('hotelFinalNightRatePriceStep4');
    if (nightRatePriceS4) nightRatePriceS4.textContent = `+$${nightPrice}`;

    const price = calculateHotelPrice();
    console.log('Hotel price calculated:', price);
    if (finalPrice) finalPrice.textContent = `$${price}`;
    if (s4Price) s4Price.textContent = `$${price}`;

    if (state.isAuth) {
        // Calculate regular price for comparison
        const key = `${state.hotel.duration}-${state.hotel.hands}`;
        let regularPrice = HOTEL_SERVICE_PRICING[key]?.regularPrice || 0;
        state.hotel.extras.forEach(e => { regularPrice += e.addon; });
        regularPrice += (state.hotel.nightRate || 0);
        regularPrice += (state.hotel.scenarioPrice || 0);

        const savings = regularPrice - price;
        const savingsText = t('summary.savings', { amount: `$${savings}` });

        if (finalSavings) {
            finalSavings.textContent = savingsText;
            finalSavings.classList.remove('hidden');
        }
        if (s4Savings) {
            s4Savings.textContent = savingsText;
            s4Savings.classList.remove('hidden');
        }
    } else {
        if (finalSavings) finalSavings.classList.add('hidden');
        if (s4Savings) s4Savings.classList.add('hidden');
    }
}

function updateConfigContinueButton() {
    const continueBtn = document.getElementById('singleConfigContinueBtn');
    if (!continueBtn) return;

    // Enable button only when both hands and duration are selected
    const bothSelected = state.single.hands !== null && state.single.duration !== null;
    continueBtn.disabled = !bothSelected;
}

function updateHotelConfigContinueButton() {
    const continueBtn = document.getElementById('hotelConfigContinueBtn');
    if (!continueBtn) return;

    // Show button only when both hands and duration are selected
    const bothSelected = state.hotel.hands !== null && state.hotel.duration !== null;
    continueBtn.classList.toggle('hidden', !bothSelected);
    continueBtn.disabled = !bothSelected;
}

/**
 * Updates hotel hands button constraints based on selected technique
 * Uses HOTEL_TECHNIQUE_HANDS config to determine allowed hands per technique
 */
function updateHotelHandsConstraints() {
    const allowedHands = HOTEL_TECHNIQUE_HANDS?.[state.hotel.technique];
    if (!allowedHands) return;

    document.querySelectorAll('.hotel-hands-btn').forEach(btn => {
        const h = parseInt(btn.dataset.hands);
        const valid = allowedHands.includes(h);
        btn.classList.toggle('disabled', !valid);
        if (!valid && btn.classList.contains('selected')) {
            btn.classList.remove('selected');
            state.hotel.hands = null;
        }
    });

    if (typeof updateHotelValidCombos === 'function') updateHotelValidCombos();
}

/**
 * Checks hotel date/time completeness and calculates night rate automatically
 */
function checkHotelDateTimeComplete() {
    const hotelDateInput = document.getElementById('hotelDate');
    const hotelTimeInput = document.getElementById('hotelTime');

    if (!hotelDateInput || !hotelTimeInput) return;

    const dateFilled = hotelDateInput.value !== '';
    const timeFilled = hotelTimeInput.value !== '';

    if (dateFilled && timeFilled && state.hotel.duration !== null) {
        state.hotel.bookingDate = hotelDateInput.value;
        state.hotel.bookingTime = hotelTimeInput.value;

        calculateNightRate(state.hotel);
        updateHotelFinalSummary();
        updateStickyFooter();
    }

    // Update night rate disclaimer visibility
    const disclaimer = document.getElementById('hotelNightRateDisclaimer');
    if (disclaimer) {
        if (state.hotel.nightRate > 0) {
            disclaimer.classList.remove('hidden');
        } else {
            disclaimer.classList.add('hidden');
        }
    }

    updateNightRateDisclaimers();
}

/**
 * Updates all night rate disclaimer text with dynamic time and price values
 * Called after night rate calculation and on language change
 */
function updateNightRateDisclaimers() {
    const nightTime = formatTime12h(BUSINESS_HOURS.nightRateAfter || '23:00');
    const nightPrice = ADDON_PRICING['night-rate']?.price || 0;

    // Single flow disclaimer
    const singleDisclaimerText = document.getElementById('nightRateDisclaimerText');
    if (singleDisclaimerText) {
        singleDisclaimerText.innerHTML = `<span class="font-semibold">🌙 ${t('summary.nightRate', { price: nightPrice })}</span> ${t('single.nightRateDisclaimer', { time: nightTime, price: nightPrice })}`;
    }

    // Hotel flow disclaimer
    const hotelDisclaimerText = document.getElementById('hotelNightRateDisclaimerText');
    if (hotelDisclaimerText) {
        hotelDisclaimerText.innerHTML = `<span class="font-semibold">🌙 ${t('summary.nightRate', { price: nightPrice })}</span> ${t('single.nightRateDisclaimer', { time: nightTime, price: nightPrice })}`;
    }

    // Single flow final summary night rate row
    const nightRateLabel = document.getElementById('finalNightRateLabel');
    const nightRatePriceEl = document.getElementById('finalNightRatePrice');
    const nightRateNoteEl = document.getElementById('finalNightRateNote');
    if (nightRateLabel) nightRateLabel.textContent = t('summary.nightRate', { price: nightPrice });
    if (nightRatePriceEl) nightRatePriceEl.textContent = `+$${nightPrice}`;
    if (nightRateNoteEl) nightRateNoteEl.textContent = t('summary.nightRateNote', { time: nightTime });
}

function updateScenarioHint() {
    const hintEl = document.getElementById('scenarioHint');
    if (!hintEl) return;

    // Get max scenarios from config based on duration (couple override)
    const isCouple = state.single.technique?.includes('-couple');
    const maxScenarios = getMaxScenarios(state.single.technique, state.single.duration);

    if (maxScenarios > 1) {
        const selected = state.single.selectedScenarios.length;
        const remaining = Math.max(0, maxScenarios - selected);

        hintEl.classList.remove('hidden');
        if (remaining > 0 && selected === 0) {
            hintEl.textContent = t('scenarios.selectAtLeast', { max: maxScenarios });
            hintEl.className = 'text-ego-red text-xs mt-2';
        } else if (remaining > 0) {
            hintEl.textContent = t('scenarios.selectUpTo', { count: remaining });
            hintEl.className = 'text-ego-muted text-xs mt-2';
        } else {
            hintEl.textContent = selected === 1 ? t('scenarios.selected', { n: selected }) : t('scenarios.selectedPlural', { n: selected });
            hintEl.className = 'text-ego-gold text-xs mt-2';
        }
    } else {
        hintEl.classList.add('hidden');
    }

    // Update scenario section header with dynamic limit
    const scenarioHeader = document.getElementById('scenarioHeaderLimit');
    if (scenarioHeader) {
        if (isCouple) {
            scenarioHeader.textContent = t('scenarios.coupleHeader');
            scenarioHeader.classList.remove('hidden');
        } else if (maxScenarios > 1) {
            scenarioHeader.textContent = t('scenarios.selectUpToMax', { max: maxScenarios });
            scenarioHeader.classList.remove('hidden');
        } else {
            scenarioHeader.classList.add('hidden');
        }
    }
}

function updateScenarioContinueButton() {
    const continueBtn = document.getElementById('scenarioContinueBtn');
    if (!continueBtn) return;

    const maxScenarios = getMaxScenarios(state.single.technique, state.single.duration);

    if (maxScenarios > 1) {
        // Show continue button for multi-scenario techniques
        continueBtn.classList.remove('hidden');
        const canContinue = state.single.selectedScenarios.length >= 1;
        continueBtn.disabled = !canContinue;
        continueBtn.classList.toggle('opacity-50', !canContinue);
    } else {
        // Hide continue button for single scenario techniques
        continueBtn.classList.add('hidden');
    }
}

function loadServiceTypes() {
    const container = document.getElementById('serviceTypeSelection');
    if (!container) return;

    // Attach event listeners to service type buttons
    document.querySelectorAll('.service-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const service = btn.dataset.service;
            state.serviceType = service;

            document.getElementById('serviceTypeSelection').classList.add('hidden');

            if (service === 'hotel') {
                // Direct to Hotel Flow
                state.currentFlow = 'hotel';
                state.currentStep = 1;
                elements.hotelFlow.classList.remove('hidden');
                elements.backBtn.classList.remove('hidden');
                goToStep(1);
            } else if (service === 'branches') {
                // Show branch selection
                document.getElementById('branchSelection').classList.remove('hidden');
                loadBranches();
            } else if (service === 'schedules') {
                // Show schedules modal
                const hoursModal = document.getElementById('hoursModal');
                if (hoursModal) {
                    hoursModal.classList.remove('hidden');
                    hoursModal.classList.add('flex');
                }
                // Return to service type selection after closing modal
                document.getElementById('serviceTypeSelection').classList.remove('hidden');
            }

            updateStickyFooter();
        });
    });
}

function loadBranches() {
    const container = document.getElementById('branchesContainer');
    if (!container) return;

    let html = '';
    let staggerIndex = 2;

    // Add spa branches from data.json
    Object.entries(BRANCHES).forEach(([branchKey, branchData]) => {
        const branchLabel = td('BRANCHES', branchKey, 'label');
        html += `
            <button class="branch-btn option-card rounded-2xl p-6 text-left fade-up stagger-${staggerIndex}" data-branch="${branchKey}" aria-label="${branchData.name}">
                <div class="flex items-start gap-4">
                    <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-ego-red/20 to-transparent flex items-center justify-center flex-shrink-0">
                        <svg class="w-7 h-7 text-ego-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-display text-2xl tracking-wide mb-1">${branchData.name.toUpperCase()}</h3>
                        <p class="text-ego-muted text-sm">${td('BRANCHES', branchKey, 'description')}</p>
                    </div>
                    <svg class="w-6 h-6 text-ego-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                </div>
            </button>
        `;
        staggerIndex++;
    });

    container.innerHTML = html;

    // Attach event listeners to dynamically created branch buttons
    document.querySelectorAll('.branch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const branch = btn.dataset.branch;
            state.selectedBranch = branch;
            state.selectedBranchName = BRANCHES[branch]?.name || branch;

            document.getElementById('branchSelection').classList.add('hidden');
            // Go directly to single flow (no flow selection screen)
            state.currentFlow = 'single';
            state.currentStep = 1;
            elements.singleFlow.classList.remove('hidden');
            elements.backBtn.classList.remove('hidden');
            goToStep(1);
            updateSummary();

            updateStickyFooter();
        });
    });
}

/**
 * Load techniques from data.json and group them by categories
 */
function loadTechniques() {
    const container = document.getElementById('techniquesContainer');
    if (!container) return;

    let html = '';
    let staggerIndex = 1;

    // Group techniques by category
    const techniquesByCategory = {};
    const uncategorizedTechniques = [];

    // First, categorize all techniques
    Object.entries(TECHNIQUE_DATA).forEach(([techKey, techData]) => {
        const category = techData.category;
        if (category && TECHNIQUE_CATEGORIES && TECHNIQUE_CATEGORIES[category]) {
            if (!techniquesByCategory[category]) {
                techniquesByCategory[category] = [];
            }
            techniquesByCategory[category].push({ key: techKey, data: techData });
        } else {
            uncategorizedTechniques.push({ key: techKey, data: techData });
        }
    });

    // Generate HTML for categorized techniques
    Object.entries(TECHNIQUE_CATEGORIES || {}).forEach(([catKey, catData]) => {
        if (techniquesByCategory[catKey] && techniquesByCategory[catKey].length > 0) {
            // Add category header
            html += `
                <div class="col-span-2 mb-2 mt-4 fade-up stagger-${staggerIndex++}">
                    <h3 class="text-ego-gold font-display text-lg tracking-wider">${td('TECHNIQUE_CATEGORIES', catKey, 'label')}</h3>
                    ${catData.description ? `<p class="text-ego-muted text-xs mt-1">${td('TECHNIQUE_CATEGORIES', catKey, 'description')}</p>` : ''}
                </div>
            `;

            // Add techniques in this category
            techniquesByCategory[catKey].forEach(({ key, data }) => {
                const desc = td('TECHNIQUE_DATA', key, 'description') || '';
                html += `
                    <button class="technique-btn option-card rounded-xl p-4 text-center fade-up stagger-${staggerIndex++}" data-technique="${key}">
                        <h3 class="font-semibold text-lg">${data.name}</h3>
                        <p class="technique-desc text-ego-muted text-xs mt-1 opacity-0 max-h-0 overflow-hidden transition-all duration-300">${desc}</p>
                    </button>
                `;
            });
        }
    });

    // Add uncategorized techniques if any
    if (uncategorizedTechniques.length > 0) {
        html += `
            <div class="col-span-2 mb-2 mt-4 fade-up stagger-${staggerIndex++}">
                <h3 class="text-ego-muted font-display text-sm tracking-wider">OTRAS TÉCNICAS</h3>
            </div>
        `;

        uncategorizedTechniques.forEach(({ key, data }) => {
            const desc = td('TECHNIQUE_DATA', key, 'description') || '';
            html += `
                <button class="technique-btn option-card rounded-xl p-4 text-center fade-up stagger-${staggerIndex++}" data-technique="${key}">
                    <h3 class="font-semibold text-lg">${data.name}</h3>
                    <p class="technique-desc text-ego-muted text-xs mt-1 opacity-0 max-h-0 overflow-hidden transition-all duration-300">${desc}</p>
                </button>
            `;
        });
    }

    container.innerHTML = html;
}

/**
 * Load extras from data.json and render as checkboxes
 */
function loadExtras() {
    const container = document.getElementById('extrasContainer');
    if (!container || !EXTRAS_DATA) return;

    let html = '';
    let staggerIndex = 1;

    Object.entries(EXTRAS_DATA).forEach(([key, extra]) => {
        const name = td('EXTRAS_DATA', key, 'name');
        const desc = td('EXTRAS_DATA', key, 'description');
        html += `
            <label class="option-card rounded-xl p-4 flex items-center gap-4 cursor-pointer fade-up stagger-${staggerIndex}">
                <input type="checkbox" name="extra-option" class="custom-checkbox" data-extra="${key}" data-addon="${extra.price}">
                <div class="flex-1">
                    <h3 class="font-semibold">${name}</h3>
                    <p class="text-ego-muted text-sm">${desc}</p>
                </div>
            </label>
        `;
        staggerIndex++;
    });

    container.innerHTML = html;
}

/**
 * Load hotel techniques from data.json (simplified, no categories needed for hotel)
 */
function loadHotelTechniques() {
    const container = document.getElementById('hotelTechniquesContainer');
    if (!container) return;

    let html = '';
    let staggerIndex = 1;

    // Hotel techniques - from config
    const hotelTechniques = HOTEL_TECHNIQUES || ['tantric', 'thai', 'nuru', 'lingam', 'circuit', 'cocktail'];

    hotelTechniques.forEach(techKey => {
        const techData = TECHNIQUE_DATA[techKey];
        if (techData) {
            const desc = td('TECHNIQUE_DATA', techKey, 'description') || '';
            html += `
                <button class="hotel-technique-btn option-card rounded-xl p-4 text-center fade-up stagger-${staggerIndex++}" data-technique="${techKey}">
                    <h3 class="font-semibold text-lg">${techData.name}</h3>
                    <p class="technique-desc text-ego-muted text-xs mt-1 opacity-0 max-h-0 overflow-hidden transition-all duration-300">${desc}</p>
                </button>
            `;
        }
    });

    container.innerHTML = html;
}

/**
 * Load hotel hands and duration options dynamically from HOTEL_SERVICE_PRICING
 */
function loadHotelConfig() {
    const handsContainer = document.getElementById('hotelHandsContainer');
    const durationContainer = document.getElementById('hotelDurationContainer');
    if (!handsContainer || !durationContainer) return;

    // Extract unique hands values and unique duration values from pricing data
    const handsSet = new Set();
    const durationSet = new Set();
    Object.values(HOTEL_SERVICE_PRICING).forEach(item => {
        handsSet.add(item.hands);
        durationSet.add(item.duration);
    });

    const handsValues = [...handsSet].sort((a, b) => a - b);
    const durationValues = [...durationSet].sort((a, b) => a - b);

    let handsHtml = '';
    handsValues.forEach((h, i) => {
        handsHtml += `
            <button class="hotel-hands-btn option-card rounded-xl p-3 text-center fade-up stagger-${i + 1}" data-hands="${h}">
                <p class="font-display text-2xl text-ego-gold">${h}</p>
            </button>`;
    });
    handsContainer.innerHTML = handsHtml;

    let durHtml = '';
    durationValues.forEach((d, i) => {
        durHtml += `
            <button class="hotel-duration-btn option-card rounded-xl p-3 text-center fade-up stagger-${i + 1}" data-duration="${d}">
                <p class="font-display text-xl text-ego-gold">${d}</p>
                <p class="text-xs text-ego-muted">min</p>
            </button>`;
    });
    durationContainer.innerHTML = durHtml;
}

function loadTouristPacks() {
    const container = document.getElementById('touristPacksContainer');
    // Placeholder - tourist packs will be loaded from data.json in the future
    container.innerHTML = `
        <div class="bg-ego-blue/10 border border-ego-blue/30 rounded-xl p-6 text-center">
            <p class="text-ego-blue font-semibold mb-2">${t('tourist.comingSoon')}</p>
            <p class="text-ego-muted text-sm">${t('tourist.comingSoonDesc')}</p>
        </div>
    `;
}

function loadPacks() {
    const container = document.getElementById('packsContainer');
    if (!container) return;
    container.innerHTML = '';

    Object.entries(PACK_DATA).forEach(([code, packData], index) => {
        const btn = document.createElement('button');
        btn.className = `pack-btn option-card w-full rounded-xl p-4 text-left fade-up stagger-${index + 1}`;
        btn.dataset.pack = code;
        btn.innerHTML = `
            <div>
                <p class="text-ego-red text-xs font-bold tracking-wider">${code}</p>
                <h3 class="font-semibold text-lg mt-1">${td('PACK_DATA', code, 'name')}</h3>
                <p class="text-ego-muted text-xs">${td('PACK_DATA', code, 'description')}</p>
            </div>
        `;
        container.appendChild(btn);

        btn.addEventListener('click', () => {
            document.querySelectorAll('.pack-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            state.pack.code = code;
            state.pack.name = packData.name;
            state.pack.validity = packData.validity || '';

            populateSizeOptions();
            setTimeout(() => goToStep(2), 200);
        });
    });
}

function populateSizeOptions() {
    const packData = PACK_DATA[state.pack.code];
    elements.sizeOptions.innerHTML = '';

    Object.entries(packData.sizes).forEach(([sizeKey, sizeData], index) => {
        const btn = document.createElement('button');
        btn.className = `size-btn option-card rounded-xl p-4 text-center fade-up stagger-${index + 1}`;
        btn.dataset.size = sizeKey;
        btn.dataset.sessions = sizeData.sessions;
        btn.dataset.price = sizeData.price;
        btn.dataset.label = sizeData.label;
        btn.innerHTML = `
      <p class="font-display text-3xl text-ego-red">${sizeData.sessions}</p>
      <p class="text-sm mt-1">${t('packs.sessions')}</p>
      <p class="text-xs text-ego-muted mt-1">${sizeData.label}</p>
    `;
        elements.sizeOptions.appendChild(btn);

        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            state.pack.size = btn.dataset.size;
            state.pack.sizeLabel = btn.dataset.label;
            state.pack.sessions = parseInt(btn.dataset.sessions) || 1;
            state.pack.basePrice = parseInt(btn.dataset.price) || 0;

            setTimeout(() => goToStep(3), 200);
        });
    });
}

function checkDateTimeComplete() {
    const bookingDateInput = document.getElementById('bookingDate');
    const bookingTimeInput = document.getElementById('bookingTime');
    const bookBtn = document.getElementById('singleBookBtn');

    const dateFilled = bookingDateInput.value !== '';
    const timeFilled = bookingTimeInput.value !== '';
    bookBtn.disabled = !(dateFilled && timeFilled);

    // Update night rate disclaimer visibility
    const nightRateDisclaimer = document.getElementById('nightRateDisclaimer');
    if (nightRateDisclaimer) {
        const hasDuration = state.single.duration !== null;
        const dateAndTimeFilled = dateFilled && timeFilled;

        if (hasDuration && dateAndTimeFilled) {
            // Temporarily set booking date/time for calculation
            const prevDate = state.single.bookingDate;
            const prevTime = state.single.bookingTime;
            state.single.bookingDate = bookingDateInput.value;
            state.single.bookingTime = bookingTimeInput.value;

            calculateNightRate(state.single);

            // Restore previous values
            state.single.bookingDate = prevDate;
            state.single.bookingTime = prevTime;

            // Show disclaimer if night rate applies
            if (state.single.nightRate > 0) {
                nightRateDisclaimer.classList.remove('hidden');
            } else {
                nightRateDisclaimer.classList.add('hidden');
            }
        } else {
            nightRateDisclaimer.classList.add('hidden');
        }
    }

    if (dateFilled && timeFilled && state.single.duration !== null) {
        state.single.bookingDate = bookingDateInput.value;
        state.single.bookingTime = bookingTimeInput.value;

        calculateNightRate(state.single);
        updateFinalSummary();
        updateStickyFooter();
    }

    updateNightRateDisclaimers();
}

function goBack() {
    if (state.currentStep > 1) {
        goToStep(state.currentStep - 1);
    } else {
        // Go back to flow selection or branch selection
        state.currentFlow = null;
        state.currentStep = 0;
        elements.singleFlow.classList.add('hidden');
        elements.packsFlow.classList.add('hidden');
        elements.hotelFlow.classList.add('hidden');
        elements.jetlagFlow.classList.add('hidden');
        elements.touristFlow.classList.add('hidden');
        elements.membershipFlow.classList.add('hidden');

        if (state.serviceType === 'hotel') {
            // Hotel goes back to service type selection
            state.serviceType = null;
            state.selectedBranch = null;
            state.selectedBranchName = '';
            document.getElementById('serviceTypeSelection').classList.remove('hidden');
        } else {
            state.serviceType = null;
            state.selectedBranch = null;
            state.selectedBranchName = '';
            document.getElementById('serviceTypeSelection').classList.remove('hidden');
        }

        elements.backBtn.classList.add('hidden');
        elements.stickySummary.classList.add('translate-y-full');

        // Reset selections (but keep branch)
        resetSelections();
    }
}

function resetSelections() {
    state.single = {
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
        sensitive: 'sensitive',
        sensitiveAddon: 0,
        extras: [],
        selectedScenarios: [],
        masseuseName: '',
        mobilityFee: 0,
        nightRate: 0,
        bookingDate: '',
        bookingTime: ''
    };
    state.pack = {
        code: null,
        name: '',
        validity: '',
        size: null,
        sizeLabel: '',
        sessions: 0,
        basePrice: 0,
        upgradeFee: 0,
        hands: 2
    };
    state.hotel = {
        technique: null,
        techniqueName: '',
        pricingSystem: null,
        scenario: null,
        scenarioName: '',
        hands: null,
        duration: null,
        extras: [],
        nightRate: 0,
        bookingDate: '',
        bookingTime: ''
    };

    // Remove selected class from all buttons
    document.querySelectorAll('.option-card.selected').forEach(el => {
        el.classList.remove('selected');
    });
    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
        el.checked = false;
    });
}
