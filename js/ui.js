/**
 * Updates UI constraints for scenarios, hands, and duration options
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
        const techniqueExclusions = DATA.SCENARIO_RULES?.technique_exclusions?.[technique] || [];
        const isExcluded = techniqueExclusions.includes(scenario);
        const finalAllowed = isAllowed && !isExcluded;
        btn.classList.toggle('option-locked', !finalAllowed);
        btn.disabled = !finalAllowed;
        btn.dataset.lockReason = finalAllowed ? '' : t('common.lockReason');
    });

    // 2. Update hands availability
    const availableHands = getAvailableHands(technique);
    document.querySelectorAll('.hands-btn').forEach(btn => {
        const h = parseInt(btn.dataset.hands);
        const isLocked = !availableHands.includes(h);
        btn.classList.toggle('option-locked', isLocked);
        btn.disabled = isLocked;
        btn.dataset.lockReason = isLocked ? t('common.lockReason') : '';
    });

    // 3. Update duration availability
    const availableDurations = hands !== null
        ? getAvailableDurations(technique, hands)
        : getAvailableDurations(technique);

    document.querySelectorAll('.duration-btn').forEach(btn => {
        const d = parseInt(btn.dataset.duration);
        const isLocked = !availableDurations.includes(d);
        btn.classList.toggle('option-locked', isLocked);
        btn.disabled = isLocked;
        btn.dataset.lockReason = isLocked ? t('common.lockReason') : '';
    });
}

/**
 * Updates hotel scenario constraints based on selected technique
 */
function updateHotelConstraints() {
    const technique = state.hotel.technique;

    if (!technique) return;

    updateHotelHandsConstraints();

    let allowedScenarios = [];
    const isNuru = technique === 'nuru';

    if (isNuru) {
        allowedScenarios = ['tatami-wet'];
    } else if (technique === 'thai') {
        allowedScenarios = ['tatami-wet'];
    } else {
        allowedScenarios = ['massage-table', 'tatami-wet'];
    }

    console.log('🏨 Hotel Constraints:', { technique, allowedScenarios, isNuru });

    document.querySelectorAll('.hotel-scenario-option').forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        const scenario = radio.dataset.scenario;
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

    if (isNuru) {
        const tatamiRadio = document.querySelector('.hotel-scenario-option input[data-scenario="tatami-wet"]');
        if (tatamiRadio) {
            tatamiRadio.checked = true;
            tatamiRadio.disabled = true;
        }
        state.hotel.scenario = 'tatami-wet';
        state.hotel.scenarioName = td('SCENARIO_DATA', 'tatami-wet', 'name');
        state.hotel.scenarioPrice = HOTEL_SCENARIO_PRICE || 0;
    } else {
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
 */
function updateStickyFooter() {
    const footer = document.getElementById('stickyFooter');
    if (!footer) return;

    let content = '';
    let price = 0;

    if (state.currentFlow === 'single' && state.single.technique) {
        const techniqueName = state.single.techniqueName;
        const hands = state.single.hands;
        const duration = state.single.duration;

        const parts = [techniqueName];
        if (hands !== null) parts.push(`${hands} ${t('common.hands')}`);
        if (duration !== null) parts.push(`${duration}m`);

        content = parts.join(' | ');
        price = calculateTotalPrice();
    } else if (state.currentFlow === 'hotel' && state.hotel.technique) {
        content = `${state.hotel.techniqueName} | ${state.hotel.hands} ${t('common.hands')} | ${state.hotel.duration}${t('common.min')}`;
        price = calculateHotelPrice();
    } else {
        content = t('footer.default');
    }

    footer.querySelector('.footer-content').textContent = content;
    const priceEl = footer.querySelector('.footer-price');
    if (priceEl) priceEl.textContent = price > 0 ? `$${price}` : '';

    const nightBadge = footer.querySelector('.night-rate-badge');
    if (nightBadge) {
        nightBadge.classList.toggle('hidden', state.single.nightRate === 0);
    }
}

/**
 * Calculate Ego Card total price: ego base price + $175 annual membership
 * CodeBased/PackBased: egoPrice from M_CODE_PRICING + membership
 * Tiered: discount formula + membership
 */
function calculateEgoCardPrice() {
    const egoBasePrice = calculateSingleEgoBasePrice();
    const membershipFee = EGO_MEMBERSHIP?.firstYearPrice || 175;
    return egoBasePrice + membershipFee;
}

function updateSummary() {
    let details = '';
    let price = 0;
    let regularPrice = 0;
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
        
        regularPrice = calculateSinglePrice();
        egoPrice = calculateEgoCardPrice();
        packPrice = calculatePackUnitPrice();
        price = regularPrice;
    } else if (state.currentFlow === 'hotel' && state.hotel.technique) {
        const parts = [];
        parts.push(state.hotel.techniqueName);
        if (state.hotel.hands !== null) parts.push(`${state.hotel.hands} ${t('summary.hands').replace(':','')}`);
        if (state.hotel.duration !== null) parts.push(`${state.hotel.duration}m`);
        details = parts.join(' · ');
        
        regularPrice = calculateHotelPrice();
        // Hotel ego: use discount formula + membership
        const membershipFee = EGO_MEMBERSHIP?.firstYearPrice || 175;
        egoPrice = roundTo5(Math.round(regularPrice * (1 - EGO_DISCOUNT))) + membershipFee;
        packPrice = 0;
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
        if (finalPackPrice) finalPackPrice.textContent = packPrice > 0 ? formatPrice(packPrice) : '—';
        if (finalEgoPrice) finalEgoPrice.textContent = formatPrice(egoPrice);
        
        if (egoPriceRow) egoPriceRow.classList.remove('hidden');
        
        // Set selected tier visual state
        document.querySelectorAll('.price-tier-btn').forEach(b => {
            b.classList.remove('selected');
            if (b.dataset.tier === state.single.selectedTier) {
                b.classList.add('selected');
            }
        });
        
        // Show savings note (compare massage base prices only, without membership)
        const egoBasePrice = calculateSingleEgoBasePrice();
        const savings = calculateSingleBasePrice() - egoBasePrice;
        if (egoSavingsNote && savings > 0) {
            egoSavingsNote.textContent = t('summary.savingsNote', { amount: formatPrice(savings) });
            egoSavingsNote.classList.remove('hidden');
        } else {
            if (egoSavingsNote) egoSavingsNote.classList.add('hidden');
        }

        // Show/hide ego benefits based on selected tier
        updateEgoBenefitsVisibility();
    } else {
        if (finalRegularPrice) finalRegularPrice.textContent = '';
        if (finalPackPrice) finalPackPrice.textContent = '';
        if (finalEgoPrice) finalEgoPrice.textContent = '';
        if (egoPriceRow) egoPriceRow.classList.add('hidden');
        if (egoSavingsNote) egoSavingsNote.classList.add('hidden');
    }

    if (elements.summaryDetails) {
        elements.summaryDetails.textContent = details;
    }

    // Show/hide summary - only show on final step (step 7)
    if (price > 0 && state.currentStep === 7) {
        elements.stickySummary.classList.remove('translate-y-full');
    } else {
        elements.stickySummary.classList.add('translate-y-full');
    }
}

/**
 * Show/hide Ego Card benefits based on selected tier
 */
function updateEgoBenefitsVisibility() {
    const benefitsContainer = document.getElementById('egoBenefitsContainer');
    if (!benefitsContainer) return;

    const showBenefits = state.single.selectedTier === 'ego';
    benefitsContainer.classList.toggle('hidden', !showBenefits);

    if (showBenefits) {
        // Populate benefits list from EGO_BENEFITS data
        const benefitsList = document.getElementById('egoBenefitsList');
        if (benefitsList && EGO_BENEFITS.length > 0) {
            benefitsList.innerHTML = EGO_BENEFITS.map(benefit => {
                const text = benefit[currentLang] || benefit.es || benefit.en || '';
                return `<div class="flex items-start gap-2 text-sm">
                    <span class="text-ego-gold mt-0.5">✓</span>
                    <span class="text-ego-muted">${text}</span>
                </div>`;
            }).join('');
        }
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
    else if (state.currentFlow === 'hotel') stepContentSelector = '#hotelFlow .step-content';

    document.querySelectorAll(stepContentSelector).forEach(el => {
        el.classList.add('hidden');
    });

    // Show current step content
    if (state.currentFlow === 'single') {
        document.getElementById(`singleStep${step}`).classList.remove('hidden');

        // Restore button selections based on state
        if (state.single.technique) {
            const techBtn = document.querySelector(`.technique-btn[data-technique="${state.single.technique}"]`);
            if (techBtn) techBtn.classList.add('selected');

            if (state.single.hands !== null) {
                const handsBtn = document.querySelector(`.hands-btn[data-hands="${state.single.hands}"]`);
                if (handsBtn) handsBtn.classList.add('selected');
            }

            if (state.single.duration !== null) {
                const durationBtn = document.querySelector(`.duration-btn[data-duration="${state.single.duration}"]`);
                if (durationBtn) durationBtn.classList.add('selected');
            }

            if (state.single.scenario) {
                const scenarioBtn = document.querySelector(`.scenario-btn[data-scenario="${state.single.scenario}"]`);
                if (scenarioBtn) scenarioBtn.classList.add('selected');
            }

            updateConstraints();
        }

        if (step === 2) {
            updateConfigContinueButton();
        }

        if (step === 6) {
            updateMasseusesConstraints();
        }

        if (step === 7) {
            updateFinalSummary();
        }
    } else if (state.currentFlow === 'hotel') {
        document.getElementById(`hotelStep${step}`).classList.remove('hidden');

        if (state.hotel.technique) {
            const techBtn = document.querySelector(`.hotel-technique-btn[data-technique="${state.hotel.technique}"]`);
            if (techBtn) techBtn.classList.add('selected');

            updateHotelHandsConstraints();

            if (state.hotel.hands !== null) {
                const handsBtn = document.querySelector(`.hotel-hands-btn[data-hands="${state.hotel.hands}"]`);
                if (handsBtn) handsBtn.classList.add('selected');
            }

            if (state.hotel.duration !== null) {
                const durBtn = document.querySelector(`.hotel-duration-btn[data-duration="${state.hotel.duration}"]`);
                if (durBtn) durBtn.classList.add('selected');
            }

            if (state.hotel.scenario !== undefined && state.hotel.scenario !== null) {
                const scenarioRadio = document.querySelector(`.hotel-scenario-option input[data-scenario="${state.hotel.scenario}"]`);
                if (scenarioRadio) {
                    scenarioRadio.checked = true;
                } else {
                    const defaultRadio = document.querySelector('.hotel-scenario-option input[data-scenario=""]');
                    if (defaultRadio) defaultRadio.checked = true;
                }
            }
        }

        if (step === 2) {
            updateHotelConfigContinueButton();
        }

        if (step === 3 || step === 4) {
            updateHotelFinalSummary();
        }
    }

    // Update sticky footer visibility
    const stickyFooter = document.getElementById('stickyFooter');
    if (stickyFooter) {
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

function updateTierTotal() {
    const regularPrice = calculateSinglePrice();
    const egoPrice = calculateEgoCardPrice();
    const packPrice = calculatePackUnitPrice();

    let total = regularPrice;
    if (state.single.selectedTier === 'ego') total = egoPrice;
    else if (state.single.selectedTier === 'pack') total = packPrice > 0 ? packPrice : regularPrice;

    const finalPriceEl = document.getElementById('finalPrice');
    if (finalPriceEl) finalPriceEl.textContent = `$${total}`;
}

function updateFinalSummary() {
    document.getElementById('finalTechnique').textContent = state.single.techniqueName;
    if (state.single.selectedScenarios.length > 0) {
        const scenarioNames = state.single.selectedScenarios.map(s => td('SCENARIO_DATA', s, 'name') || s);
        document.getElementById('finalScenario').textContent = scenarioNames.join(' + ');
    } else {
        document.getElementById('finalScenario').textContent = '';
    }
    document.getElementById('finalHands').textContent = state.single.hands !== null ? state.single.hands + ' ' + t('single.handsUnit') : '';
    document.getElementById('finalDuration').textContent = state.single.duration !== null ? state.single.duration + ' ' + t('common.min') : '';

    const basePriceEl = document.getElementById('finalBasePrice');
    if (basePriceEl) {
        const basePrice = calculateBasePrice();
        basePriceEl.textContent = `$${basePrice}`;
    }

    const sensitiveText = state.single.sensitive === 'double-sensitive' ? 'Double Sensitive' : 'Sensitive';
    document.getElementById('finalSensitive').textContent = sensitiveText;
    const sensitivePriceEl = document.getElementById('finalSensitivePrice');
    if (sensitivePriceEl) {
        sensitivePriceEl.textContent = state.single.sensitiveAddon > 0 ? `+$${state.single.sensitiveAddon}` : '';
    }

    const extrasContainer = document.getElementById('extrasDetailContainer');
    if (extrasContainer) {
        if (state.single.extras.length > 0) {
            extrasContainer.innerHTML = state.single.extras.map(e => {
                const name = td('EXTRAS_DATA', e.key, 'name');
                return `<div class="flex justify-between items-center">
                    <span class="text-ego-muted text-sm pl-2">+ ${name}</span>
                    <span class="text-ego-red text-xs font-semibold">+$${e.addon}</span>
                </div>`;
            }).join('');
        } else {
            extrasContainer.innerHTML = `<div class="flex justify-between">
                <span class="text-ego-muted" data-i18n="summary.extras">Extras:</span>
                <span class="text-white" data-i18n="summary.noExtras">Sin extras</span>
            </div>`;
        }
    }

    document.getElementById('finalMasseuse').textContent = state.single.masseuses.length > 0
        ? state.single.masseuses.map(k => td('MASSEUSES', k, 'name')).join(', ')
        : t('whatsapp.noPreference');

    const mobilityRow = document.getElementById('finalMobilityRow');
    mobilityRow.classList.toggle('hidden', state.single.mobilityFee === 0);
    const mobilityPrice = document.getElementById('finalMobilityPrice');
    if (mobilityPrice) mobilityPrice.textContent = `+$${state.single.mobilityFee}`;

    const nightRateRow = document.getElementById('finalNightRateRow');
    nightRateRow.classList.toggle('hidden', state.single.nightRate === 0);
    const nightRatePrice = document.getElementById('finalNightRatePrice');
    if (nightRatePrice) nightRatePrice.textContent = `+$${state.single.nightRate}`;

    const nightRateDisclaimer = document.getElementById('nightRateDisclaimer');
    if (nightRateDisclaimer) {
        nightRateDisclaimer.classList.toggle('hidden', state.single.nightRate === 0);
    }

    document.getElementById('finalDate').textContent = state.single.bookingDate || '';
    document.getElementById('finalTime').textContent = state.single.bookingTime || '';

    updateTierTotal();
    updateNightRateDisclaimers();
}

function updateHotelFinalSummary() {
    const finalTechnique = document.getElementById('hotelFinalTechnique');
    const finalScenario = document.getElementById('hotelFinalScenario');
    const finalConfig = document.getElementById('hotelFinalConfig');
    const finalExtras = document.getElementById('hotelFinalExtras');
    const finalPrice = document.getElementById('hotelFinalPrice');
    const finalSavings = document.getElementById('hotelFinalSavings');

    const s4Technique = document.getElementById('hotelFinalTechniqueStep4');
    const s4Scenario = document.getElementById('hotelFinalScenarioStep4');
    const s4Config = document.getElementById('hotelFinalConfigStep4');
    const s4Extras = document.getElementById('hotelFinalExtrasStep4');
    const s4Price = document.getElementById('hotelFinalPriceStep4');
    const s4Savings = document.getElementById('hotelFinalSavingsStep4');

    const techniqueText = state.hotel.techniqueName || t('common.defaultMassage');
    const scenarioText = state.hotel.scenario ? td('SCENARIO_DATA', state.hotel.scenario, 'name') : state.hotel.scenarioName;
    const configText = `${state.hotel.hands} ${t('single.handsUnit')} · ${state.hotel.duration} ${t('common.min')}`;
    const extrasText = state.hotel.extras.length > 0 ? state.hotel.extras.map(e => e.key ? td('ADDON_PRICING', e.key, 'name') : e.name).join(', ') : t('summary.noExtras');

    if (finalTechnique) finalTechnique.textContent = techniqueText;
    if (finalScenario) finalScenario.textContent = scenarioText || '';
    if (finalConfig) finalConfig.textContent = configText;
    if (finalExtras) finalExtras.textContent = extrasText;

    if (s4Technique) s4Technique.textContent = techniqueText;
    if (s4Scenario) s4Scenario.textContent = scenarioText || '';
    if (s4Config) s4Config.textContent = configText;
    if (s4Extras) s4Extras.textContent = extrasText;

    const nightPrice = ADDON_PRICING['night-rate']?.price || 0;
    const hasNightRate = state.hotel.nightRate > 0;

    const nightRateRow = document.getElementById('hotelFinalNightRateRow');
    if (nightRateRow) nightRateRow.classList.toggle('hidden', !hasNightRate);
    const nightRateLabel = document.getElementById('hotelFinalNightRateLabel');
    if (nightRateLabel) nightRateLabel.textContent = t('summary.nightRate', { price: nightPrice });
    const nightRatePrice = document.getElementById('hotelFinalNightRatePrice');
    if (nightRatePrice) nightRatePrice.textContent = `+$${nightPrice}`;

    const nightRateRowS4 = document.getElementById('hotelFinalNightRateRowStep4');
    if (nightRateRowS4) nightRateRowS4.classList.toggle('hidden', !hasNightRate);
    const nightRateLabelS4 = document.getElementById('hotelFinalNightRateLabelStep4');
    if (nightRateLabelS4) nightRateLabelS4.textContent = t('summary.nightRate', { price: nightPrice });
    const nightRatePriceS4 = document.getElementById('hotelFinalNightRatePriceStep4');
    if (nightRatePriceS4) nightRatePriceS4.textContent = `+$${nightPrice}`;

    const price = calculateHotelPrice();
    if (finalPrice) finalPrice.textContent = `$${price}`;
    if (s4Price) s4Price.textContent = `$${price}`;

    if (finalSavings) finalSavings.classList.add('hidden');
    if (s4Savings) s4Savings.classList.add('hidden');
}

function updateConfigContinueButton() {
    const continueBtn = document.getElementById('singleConfigContinueBtn');
    if (!continueBtn) return;
    const bothSelected = state.single.hands !== null && state.single.duration !== null;
    continueBtn.disabled = !bothSelected;
}

function updateHotelConfigContinueButton() {
    const continueBtn = document.getElementById('hotelConfigContinueBtn');
    if (!continueBtn) return;
    const bothSelected = state.hotel.hands !== null && state.hotel.duration !== null;
    continueBtn.classList.toggle('hidden', !bothSelected);
    continueBtn.disabled = !bothSelected;
}

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

    const disclaimer = document.getElementById('hotelNightRateDisclaimer');
    if (disclaimer) {
        disclaimer.classList.toggle('hidden', state.hotel.nightRate === 0);
    }

    updateNightRateDisclaimers();
}

function updateNightRateDisclaimers() {
    const nightTime = formatTime12h(BUSINESS_HOURS.nightRateAfter || '23:00');
    const nightPrice = ADDON_PRICING['night-rate']?.price || 0;

    const singleDisclaimerText = document.getElementById('nightRateDisclaimerText');
    if (singleDisclaimerText) {
        singleDisclaimerText.innerHTML = `<span class="font-semibold">🌙 ${t('summary.nightRate', { price: nightPrice })}</span> ${t('single.nightRateDisclaimer', { time: nightTime, price: nightPrice })}`;
    }

    const hotelDisclaimerText = document.getElementById('hotelNightRateDisclaimerText');
    if (hotelDisclaimerText) {
        hotelDisclaimerText.innerHTML = `<span class="font-semibold">🌙 ${t('summary.nightRate', { price: nightPrice })}</span> ${t('single.nightRateDisclaimer', { time: nightTime, price: nightPrice })}`;
    }

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
        continueBtn.classList.remove('hidden');
        const canContinue = state.single.selectedScenarios.length >= 1;
        continueBtn.disabled = !canContinue;
        continueBtn.classList.toggle('opacity-50', !canContinue);
    } else {
        continueBtn.classList.add('hidden');
    }
}

/**
 * Load massage gender selection buttons
 */
function loadMassageSelection() {
    // Buttons are already in HTML, just need event listeners
    // Event listeners are attached in setupEventListeners()
}

/**
 * Load techniques filtered by selected gender
 */
function loadTechniques() {
    const container = document.getElementById('techniquesContainer');
    if (!container) return;

    // Get techniques available for current gender
    const genderKey = state.gender || 'men';
    const availableTechniques = MASSAGE_GENDERS[genderKey] || MASSAGE_GENDERS.men || [];

    let html = '';
    let staggerIndex = 1;

    // Group techniques by category
    const techniquesByCategory = {};

    availableTechniques.forEach(techKey => {
        const techData = TECHNIQUE_DATA[techKey];
        if (!techData) return;
        
        const category = techData.category;
        if (category && TECHNIQUE_CATEGORIES && TECHNIQUE_CATEGORIES[category]) {
            if (!techniquesByCategory[category]) {
                techniquesByCategory[category] = [];
            }
            techniquesByCategory[category].push({ key: techKey, data: techData });
        }
    });

    // Generate HTML for categorized techniques
    Object.entries(TECHNIQUE_CATEGORIES || {}).forEach(([catKey, catData]) => {
        if (techniquesByCategory[catKey] && techniquesByCategory[catKey].length > 0) {
            html += `
                <div class="col-span-2 mb-2 mt-4 fade-up stagger-${staggerIndex++}">
                    <h3 class="text-ego-gold font-display text-lg tracking-wider">${td('TECHNIQUE_CATEGORIES', catKey, 'label')}</h3>
                    ${catData.description ? `<p class="text-ego-muted text-xs mt-1">${td('TECHNIQUE_CATEGORIES', catKey, 'description')}</p>` : ''}
                </div>
            `;

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
 * Load masseuses from data.json and render as checkboxes
 */
function loadMasseuses() {
    const container = document.getElementById('masseusesList');
    if (!container || !MASSEUSES) return;

    let html = '';
    let staggerIndex = 1;

    Object.entries(MASSEUSES).forEach(([key, masseuse]) => {
        if (!masseuse.active) return;
        const name = td('MASSEUSES', key, 'name');
        html += `
            <label class="option-card rounded-lg p-3 flex items-center gap-3 cursor-pointer fade-up stagger-${staggerIndex} opacity-50 pointer-events-none" data-masseuse-key="${key}">
                <input type="checkbox" name="masseuse-select" class="custom-checkbox" data-masseuse="${key}" disabled>
                <span class="text-white text-sm font-semibold">${name}</span>
            </label>
        `;
        staggerIndex++;
    });

    container.innerHTML = html;
}

/**
 * Updates masseuse list visibility and max selection based on hands count
 */
function updateMasseusesConstraints() {
    const container = document.getElementById('masseusesList');
    const limitText = document.getElementById('masseuseLimitText');
    if (!container) return;

    const pref = document.querySelector('input[name="masseuse-pref"]:checked')?.value;
    const isSpecific = pref === 'specific';

    container.classList.toggle('hidden', !isSpecific);
    if (limitText) limitText.classList.toggle('hidden', !isSpecific);

    if (!isSpecific) {
        state.single.masseuses = [];
        container.querySelectorAll('input[name="masseuse-select"]').forEach(cb => {
            cb.checked = false;
            cb.disabled = true;
            cb.closest('label').classList.add('opacity-50', 'pointer-events-none');
        });
        return;
    }

    const maxMasseuses = state.single.hands ? Math.floor(state.single.hands / 2) : 1;
    if (limitText) {
        limitText.textContent = t('single.selectMasseuses', { n: maxMasseuses });
        limitText.classList.remove('hidden');
    }

    container.querySelectorAll('label[data-masseuse-key]').forEach(label => {
        const cb = label.querySelector('input');
        cb.disabled = false;
        label.classList.remove('opacity-50', 'pointer-events-none');
    });

    const checked = container.querySelectorAll('input[name="masseuse-select"]:checked');
    if (checked.length > maxMasseuses) {
        checked[checked.length - 1].checked = false;
    }

    state.single.masseuses = [];
    container.querySelectorAll('input[name="masseuse-select"]:checked').forEach(cb => {
        state.single.masseuses.push(cb.dataset.masseuse);
    });
}

/**
 * Load hotel techniques from data.json
 */
function loadHotelTechniques() {
    const container = document.getElementById('hotelTechniquesContainer');
    if (!container) return;

    let html = '';
    let staggerIndex = 1;

    const hotelTechniques = HOTEL_TECHNIQUES || ['tantric', 'thai', 'nuru', 'lingam'];

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

/**
 * Load pack selection screen with all available packs
 */
function loadPackSelection() {
    const container = document.getElementById('packSelectionContainer');
    if (!container || !PACK_DATA) return;

    let html = '';
    let staggerIndex = 1;

    Object.entries(PACK_DATA).forEach(([code, packData]) => {
        const name = td('PACK_DATA', code, 'name');
        const desc = td('PACK_DATA', code, 'description');
        
        // Get starting price (smallest size)
        const sizes = Object.values(packData.sizes);
        const minPrice = Math.min(...sizes.map(s => s.price));
        
        html += `
            <button class="pack-select-btn option-card w-full rounded-xl p-4 text-left fade-up stagger-${staggerIndex++}" data-pack="${code}">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-ego-red text-xs font-bold tracking-wider">${code}</p>
                        <h3 class="font-semibold text-lg mt-1">${name}</h3>
                        <p class="text-ego-muted text-xs">${desc}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-ego-gold font-display text-xl">$${minPrice}+</p>
                        <p class="text-ego-muted text-xs">${t('packs.from')}</p>
                    </div>
                </div>
            </button>
        `;
    });

    container.innerHTML = html;
}

/**
 * Show pack selection screen (called when Pack tier is selected)
 */
function showPackSelection() {
    // Hide single flow
    elements.singleFlow.classList.add('hidden');
    elements.hotelFlow.classList.add('hidden');
    
    // Show pack selection screen
    elements.packSelectionScreen.classList.remove('hidden');
    elements.backBtn.classList.remove('hidden');
    
    // Hide pack details panel initially
    const detailsPanel = document.getElementById('packDetailsPanel');
    if (detailsPanel) detailsPanel.classList.add('hidden');
    
    // Reset pack state
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
    
    // Remove selected class from all pack buttons
    document.querySelectorAll('.pack-select-btn').forEach(b => b.classList.remove('selected'));
    
    updateStickyFooter();
}

/**
 * Hide pack selection screen and return to single flow summary
 */
function hidePackSelection() {
    elements.packSelectionScreen.classList.add('hidden');
    
    if (state.currentFlow === 'single') {
        elements.singleFlow.classList.remove('hidden');
        goToStep(7); // Return to step 7 (summary)
    } else if (state.currentFlow === 'hotel') {
        elements.hotelFlow.classList.remove('hidden');
    }
}

/**
 * Populate pack size options for selected pack
 */
function populatePackSizes(packCode) {
    const packData = PACK_DATA[packCode];
    const container = document.getElementById('packSizeOptions');
    if (!packData || !container) return;

    let html = '';
    Object.entries(packData.sizes).forEach(([sizeKey, sizeData], index) => {
        html += `
            <button class="pack-size-btn option-card rounded-xl p-3 text-center fade-up stagger-${index + 1}" data-size="${sizeKey}" data-sessions="${sizeData.sessions}" data-price="${sizeData.price}" data-label="${sizeData.label}">
                <p class="font-display text-2xl text-ego-red">${sizeData.sessions}</p>
                <p class="text-xs text-ego-muted mt-1">${t('packs.sessions')}</p>
                <p class="text-xs text-ego-muted">${sizeData.label}</p>
                <p class="text-ego-gold font-semibold mt-1">$${sizeData.price}</p>
            </button>
        `;
    });
    container.innerHTML = html;
}

/**
 * Update pack detail price display
 */
function updatePackDetailPrice() {
    const priceEl = document.getElementById('packDetailPrice');
    const sessionsEl = document.getElementById('packDetailSessions');
    
    if (priceEl) {
        const price = calculatePackPrice();
        priceEl.textContent = `$${price}`;
    }
    
    if (sessionsEl && state.pack.sessions > 0) {
        sessionsEl.textContent = `${state.pack.sessions} ${t('footer.sessions')} · ${state.pack.sizeLabel}`;
    }
}

function checkDateTimeComplete() {
    const bookingDateInput = document.getElementById('bookingDate');
    const bookingTimeInput = document.getElementById('bookingTime');
    const bookBtn = document.getElementById('singleBookBtn');

    const dateFilled = bookingDateInput.value !== '';
    const timeFilled = bookingTimeInput.value !== '';
    bookBtn.disabled = !(dateFilled && timeFilled);

    const nightRateDisclaimer = document.getElementById('nightRateDisclaimer');
    if (nightRateDisclaimer) {
        const hasDuration = state.single.duration !== null;
        const dateAndTimeFilled = dateFilled && timeFilled;

        if (hasDuration && dateAndTimeFilled) {
            const prevDate = state.single.bookingDate;
            const prevTime = state.single.bookingTime;
            state.single.bookingDate = bookingDateInput.value;
            state.single.bookingTime = bookingTimeInput.value;

            calculateNightRate(state.single);

            state.single.bookingDate = prevDate;
            state.single.bookingTime = prevTime;

            nightRateDisclaimer.classList.toggle('hidden', state.single.nightRate === 0);
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
    // If on pack selection screen, go back to single flow
    if (!elements.packSelectionScreen.classList.contains('hidden')) {
        hidePackSelection();
        return;
    }

    if (state.currentStep > 1) {
        goToStep(state.currentStep - 1);
    } else {
        // Go back to massage selection
        state.currentFlow = null;
        state.currentStep = 0;
        state.gender = null;
        
        elements.singleFlow.classList.add('hidden');
        elements.hotelFlow.classList.add('hidden');
        elements.packSelectionScreen.classList.add('hidden');

        document.getElementById('massageSelection').classList.remove('hidden');

        elements.backBtn.classList.add('hidden');
        elements.stickySummary.classList.add('translate-y-full');

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
        sensitive: 'double-sensitive',
        sensitiveAddon: 25,
        extras: [],
        selectedScenarios: [],
        masseuseName: '',
        masseuses: [],
        masseusePref: 'available',
        selectedTier: 'regular',
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

    document.querySelectorAll('.option-card.selected').forEach(el => {
        el.classList.remove('selected');
    });
    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
        el.checked = false;
    });
    document.querySelectorAll('input[type="radio"]').forEach(el => {
        el.checked = false;
    });
    // Reset sensitive radio to default
    const defaultSensitive = document.querySelector('input[name="sensitive"][data-sensitive="double-sensitive"]');
    if (defaultSensitive) defaultSensitive.checked = true;
}
