function setupEventListeners() {

    // Back button
    elements.backBtn.addEventListener('click', goBack);

    // ============================================
    // MASSAGE GENDER SELECTION
    // ============================================
    document.querySelectorAll('.massage-gender-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const gender = btn.dataset.gender;
            state.gender = gender;

            document.getElementById('massageSelection').classList.add('hidden');

            // Load techniques for this gender and go to single flow
            loadTechniques();
            state.currentFlow = 'single';
            state.currentStep = 1;
            elements.singleFlow.classList.remove('hidden');
            elements.backBtn.classList.remove('hidden');
            goToStep(1);

            updateStickyFooter();
        });
    });

    // ============================================
    // SINGLE MASSAGE FLOW
    // ============================================

    // Step 1: Technique (event delegation)
    document.getElementById('techniquesContainer').addEventListener('click', (e) => {
        const btn = e.target.closest('.technique-btn');
        if (!btn) return;

        const techniqueKey = btn.dataset.technique;

        // If clicking the already-selected technique → advance
        if (btn.classList.contains('selected')) {
            setTimeout(() => goToStep(2), 200);
            return;
        }

        // First tap: select and show description
        document.querySelectorAll('.technique-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        state.single.technique = techniqueKey;
        state.single.techniqueName = td('TECHNIQUE_DATA', techniqueKey, 'name');
        state.single.pricingSystem = TECHNIQUE_DATA[techniqueKey].pricingSystem;

        resetToTechniqueDefaults(techniqueKey);
        updateConstraints();
        updateStickyFooter();
    });

    // Step 2: Hands selection
    document.querySelectorAll('.hands-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const h = parseInt(btn.dataset.hands);

            if (btn.classList.contains('option-locked')) return;

            document.querySelectorAll('.hands-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            state.single.hands = h;

            const technique = state.single.technique;

            updateConstraints();

            const currentDurationBtn = document.querySelector('.duration-btn.selected');
            const durationIsLocked = currentDurationBtn && currentDurationBtn.classList.contains('option-locked');

            if (durationIsLocked && state.single.duration !== null) {
                const newDuration = findNearestDuration(technique, h, state.single.duration);
                if (newDuration !== null) {
                    state.single.duration = newDuration;
                    if (['CodeBased', 'PackBased'].includes(state.single.pricingSystem)) {
                        state.single.mCode = findMCode(h, newDuration, TECHNIQUE_DATA[technique]?.allowedCodes);
                    }
                    document.querySelectorAll('.duration-btn').forEach(dBtn => {
                        const d = parseInt(dBtn.dataset.duration);
                        dBtn.classList.toggle('selected', d === newDuration);
                    });
                }
            } else if (state.single.duration !== null && ['CodeBased', 'PackBased'].includes(state.single.pricingSystem)) {
                state.single.mCode = findMCode(h, state.single.duration, TECHNIQUE_DATA[technique]?.allowedCodes);
            }

            updateStickyFooter();
            updateMasseusesConstraints();
            updateConfigContinueButton();
        });
    });

    // Step 2: Duration selection
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const d = parseInt(btn.dataset.duration);

            if (btn.classList.contains('option-locked')) return;

            document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            state.single.duration = d;

            const technique = state.single.technique;

            updateConstraints();

            const currentHandsBtn = document.querySelector('.hands-btn.selected');
            const handsAreLocked = currentHandsBtn && currentHandsBtn.classList.contains('option-locked');

            if (handsAreLocked && state.single.hands !== null) {
                const newHands = findNearestHands(technique, d, state.single.hands);
                if (newHands !== null) {
                    state.single.hands = newHands;
                    if (['CodeBased', 'PackBased'].includes(state.single.pricingSystem)) {
                        state.single.mCode = findMCode(newHands, d, TECHNIQUE_DATA[technique]?.allowedCodes);
                    }
                    document.querySelectorAll('.hands-btn').forEach(hBtn => {
                        const h = parseInt(hBtn.dataset.hands);
                        hBtn.classList.toggle('selected', h === newHands);
                    });
                }
            } else if (state.single.hands !== null && ['CodeBased', 'PackBased'].includes(state.single.pricingSystem)) {
                state.single.mCode = findMCode(state.single.hands, d, TECHNIQUE_DATA[technique]?.allowedCodes);
            }

            updateStickyFooter();
            updateConfigContinueButton();
        });
    });

    // Step 3: Scenario selection
    document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('option-locked')) return;

            const scenario = btn.dataset.scenario;
            const scenarioData = SCENARIO_DATA[scenario];

            const techniqueExclusions = DATA.SCENARIO_RULES?.technique_exclusions?.[state.single.technique] || [];
            if (techniqueExclusions.includes(scenario)) {
                alert(t('scenarios.notAvailable'));
                return;
            }

            const maxScenarios = getMaxScenarios(state.single.technique, state.single.duration);

            if (maxScenarios > 1) {
                const isSelected = btn.classList.contains('selected');

                if (!isSelected && state.single.selectedScenarios.length >= maxScenarios) {
                    alert(t('scenarios.maxReached', { max: maxScenarios }));
                    return;
                }

                btn.classList.toggle('selected');

                if (btn.classList.contains('selected')) {
                    state.single.selectedScenarios.push(scenario);
                } else {
                    state.single.selectedScenarios = state.single.selectedScenarios.filter(s => s !== scenario);
                }

                if (state.single.selectedScenarios.length > 0) {
                    state.single.scenario = state.single.selectedScenarios[0];
                    state.single.scenarioName = td('SCENARIO_DATA', state.single.scenario, 'name') || '';
                }

                updateScenarioHint();
                updateStickyFooter();
                updateScenarioContinueButton();
            } else {
                document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');

                state.single.scenario = scenario;
                state.single.scenarioName = td('SCENARIO_DATA', scenario, 'name');
                state.single.selectedScenarios = [scenario];

                updateScenarioHint();
                updateStickyFooter();
                updateScenarioContinueButton();

                setTimeout(() => goToStep(4), 200);
            }
        });
    });

    // Scenario continue button
    document.getElementById('scenarioContinueBtn')?.addEventListener('click', () => {
        if (state.single.selectedScenarios.length >= 1) {
            goToStep(4);
        }
    });

    // Step 4: Sensitive / Double Sensitive
    document.querySelectorAll('input[name="sensitive"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const sensitiveType = radio.dataset.sensitive;
            const addon = parseInt(radio.dataset.addon) || 0;
            state.single.sensitive = sensitiveType;
            state.single.sensitiveAddon = addon;
        });
    });

    document.getElementById('sensitiveContinueBtn')?.addEventListener('click', () => goToStep(5));

    // Step 5: Additional Options (checkboxes)
    document.getElementById('extrasContainer')?.addEventListener('change', (e) => {
        if (e.target.matches('input[name="extra-option"]')) {
            state.single.extras = [];
            document.querySelectorAll('input[name="extra-option"]:checked').forEach(cb => {
                const key = cb.dataset.extra;
                state.single.extras.push({
                    key: key,
                    name: td('EXTRAS_DATA', key, 'name'),
                    addon: parseInt(cb.dataset.addon) || 0
                });
            });
            updateStickyFooter();
        }
    });

    // Add continue button to Step 5
    const extrasContinueBtn = document.createElement('button');
    extrasContinueBtn.className = 'btn-primary w-full py-4 rounded-xl font-semibold text-white uppercase tracking-wider mt-4';
    extrasContinueBtn.setAttribute('data-i18n', 'single.continue');
    extrasContinueBtn.textContent = t('single.continue');
    extrasContinueBtn.addEventListener('click', () => goToStep(6));
    document.getElementById('singleStep5').appendChild(extrasContinueBtn);

    // Step 6: Logistics (masseuse preference and mobility)
    document.querySelectorAll('input[name="masseuse-pref"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const travelFeeNotice = document.getElementById('travelFeeNotice');
            state.single.masseusePref = radio.value;

            if (radio.value === 'specific') {
                state.single.mobilityFee = 35;
                if (travelFeeNotice) travelFeeNotice.classList.remove('hidden');
            } else {
                state.single.masseuses = [];
                state.single.mobilityFee = 0;
                if (travelFeeNotice) travelFeeNotice.classList.add('hidden');
            }
            updateMasseusesConstraints();
            updateStickyFooter();
        });
    });

    // Masseuse selection checkboxes
    document.getElementById('masseusesList')?.addEventListener('change', (e) => {
        if (e.target.matches('input[name="masseuse-select"]')) {
            const maxMasseuses = state.single.hands ? Math.floor(state.single.hands / 2) : 1;
            const checked = document.querySelectorAll('input[name="masseuse-select"]:checked');

            if (checked.length > maxMasseuses) {
                e.target.checked = false;
                return;
            }

            state.single.masseuses = [];
            checked.forEach(cb => {
                state.single.masseuses.push(cb.dataset.masseuse);
            });
            updateStickyFooter();
        }
    });

    // Add continue button to Step 6
    const logisticsContinueBtn = document.createElement('button');
    logisticsContinueBtn.className = 'btn-primary w-full py-4 rounded-xl font-semibold text-white uppercase tracking-wider mt-4';
    logisticsContinueBtn.setAttribute('data-i18n', 'single.continue');
    logisticsContinueBtn.textContent = t('single.continue');
    logisticsContinueBtn.addEventListener('click', () => goToStep(7));
    document.getElementById('singleStep6').querySelector('.space-y-4').appendChild(logisticsContinueBtn);

    const bookingDateInput = document.getElementById('bookingDate');
    const bookingTimeInput = document.getElementById('bookingTime');
    const bookBtn = document.getElementById('singleBookBtn');

    bookingDateInput.addEventListener('change', checkDateTimeComplete);
    bookingTimeInput.addEventListener('change', checkDateTimeComplete);

    // Step 2 Continue button
    const singleConfigContinueBtn = document.getElementById('singleConfigContinueBtn');
    if (singleConfigContinueBtn) {
        singleConfigContinueBtn.addEventListener('click', () => {
            goToStep(3);
        });
    }

    // Price tier selection
    document.querySelectorAll('.price-tier-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tier = btn.dataset.tier;
            state.single.selectedTier = tier;
            
            if (tier === 'pack') {
                // Show pack selection screen
                showPackSelection();
            } else {
                // Regular or Ego Card - just update the display
                updateSummary();
                updateTierTotal();
                updateEgoBenefitsVisibility();
            }
        });
    });

    // Book single massage
    document.getElementById('singleBookBtn').addEventListener('click', () => {
        const message = generateWhatsAppMessage();
        window.open(`https://wa.me/${DATA.WHATSAPP_NUMBER}?text=${message}`, '_blank');
    });

    // ============================================
    // PACK SELECTION SCREEN
    // ============================================

    // Pack selection buttons (delegated)
    document.getElementById('packSelectionContainer')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.pack-select-btn');
        if (!btn) return;

        const code = btn.dataset.pack;
        const packData = PACK_DATA[code];
        if (!packData) return;

        // Update selection
        document.querySelectorAll('.pack-select-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        // Update state
        state.pack.code = code;
        state.pack.name = packData.name;
        state.pack.validity = packData.validity || '';
        state.pack.upgradeFee = packData.upgradeFee || 0;

        // Show pack details panel
        const detailsPanel = document.getElementById('packDetailsPanel');
        if (detailsPanel) {
            detailsPanel.classList.remove('hidden');
            
            // Update title and description
            const titleEl = document.getElementById('packDetailTitle');
            const descEl = document.getElementById('packDetailDesc');
            if (titleEl) titleEl.textContent = `${code} - ${td('PACK_DATA', code, 'name')}`;
            if (descEl) descEl.textContent = td('PACK_DATA', code, 'description');

            // Populate size options
            populatePackSizes(code);

            // Reset size selection
            state.pack.size = null;
            state.pack.sizeLabel = '';
            state.pack.sessions = 0;
            state.pack.basePrice = 0;

            // Reset upgrade to 2 hands
            state.pack.hands = 2;
            document.querySelectorAll('.pack-upgrade-btn').forEach(b => {
                b.classList.toggle('selected', b.dataset.upgrade === '2');
            });

            // Update price
            updatePackDetailPrice();
        }
    });

    // Pack size selection (delegated)
    document.getElementById('packSizeOptions')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.pack-size-btn');
        if (!btn) return;

        document.querySelectorAll('.pack-size-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        state.pack.size = btn.dataset.size;
        state.pack.sizeLabel = btn.dataset.label;
        state.pack.sessions = parseInt(btn.dataset.sessions) || 1;
        state.pack.basePrice = parseInt(btn.dataset.price) || 0;

        updatePackDetailPrice();
    });

    // Pack upgrade selection
    document.querySelectorAll('.pack-upgrade-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pack-upgrade-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.pack.hands = parseInt(btn.dataset.upgrade) || 2;
            updatePackDetailPrice();
        });
    });

    // Book pack
    document.getElementById('packBookBtn')?.addEventListener('click', () => {
        const message = generatePackWhatsAppMessage();
        window.open(`https://wa.me/${DATA.WHATSAPP_NUMBER}?text=${message}`, '_blank');
    });

    // Back to summary from pack selection
    document.getElementById('packBackToSummaryBtn')?.addEventListener('click', () => {
        hidePackSelection();
    });

    // ============================================
    // HOTEL SERVICES FLOW
    // ============================================

    // Step 1: Technique (event delegation)
    document.getElementById('hotelTechniquesContainer').addEventListener('click', (e) => {
        const btn = e.target.closest('.hotel-technique-btn');
        if (!btn) return;

        const technique = btn.dataset.technique;

        if (btn.classList.contains('selected')) {
            setTimeout(() => goToStep(2), 200);
            return;
        }

        document.querySelectorAll('.hotel-technique-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        const techniqueData = TECHNIQUE_DATA[technique];

        state.hotel.technique = technique;
        state.hotel.techniqueName = td('TECHNIQUE_DATA', technique, 'name');
        state.hotel.pricingSystem = techniqueData.pricingSystem;

        updateHotelConstraints();
    });

    // Step 2: Hands (event delegation)
    document.getElementById('hotelHandsContainer').addEventListener('click', (e) => {
        const btn = e.target.closest('.hotel-hands-btn');
        if (!btn || btn.classList.contains('opacity-30')) return;

        document.querySelectorAll('.hotel-hands-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        state.hotel.hands = parseInt(btn.dataset.hands) || 2;

        updateHotelValidCombos();
        updateHotelConfigContinueButton();

        const durationBtn = document.querySelector(`.hotel-duration-btn[data-duration="${state.hotel.duration}"]`);
        if (state.currentStep === 4 && durationBtn && durationBtn.classList.contains('selected')) {
            updateHotelFinalSummary();
        }
    });

    // Step 2: Duration (event delegation)
    document.getElementById('hotelDurationContainer').addEventListener('click', (e) => {
        const btn = e.target.closest('.hotel-duration-btn');
        if (!btn || btn.classList.contains('opacity-30')) return;

        document.querySelectorAll('.hotel-duration-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        state.hotel.duration = parseInt(btn.dataset.duration) || 60;

        updateHotelConfigContinueButton();

        const handsBtn = document.querySelector(`.hotel-hands-btn[data-hands="${state.hotel.hands}"]`);
        if (state.currentStep === 4 && handsBtn && handsBtn.classList.contains('selected')) {
            updateHotelFinalSummary();
        }
    });

    // Step 2 Continue button
    const hotelConfigContinueBtn = document.getElementById('hotelConfigContinueBtn');
    if (hotelConfigContinueBtn) {
        hotelConfigContinueBtn.addEventListener('click', () => {
            goToStep(3);
        });
    }

    // Step 3: Scenario options (radio buttons)
    document.querySelectorAll('.hotel-scenario-option').forEach(option => {
        option.addEventListener('change', () => {
            const radio = option.querySelector('input[type="radio"]');
            const scenario = radio.dataset.scenario;
            const price = HOTEL_SCENARIO_PRICE || 0;

            state.hotel.scenario = scenario || null;
            state.hotel.scenarioName = scenario ? td('SCENARIO_DATA', scenario, 'name') : '';
            state.hotel.scenarioPrice = scenario ? (HOTEL_SCENARIO_PRICE || 0) : 0;

            updateHotelFinalSummary();
        });
    });

    // Step 3: Extras (mutual exclusion)
    document.querySelectorAll('input[name="hotel-praecoquis"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const extraKey = radio.dataset.extra;
            const addon = parseInt(radio.dataset.addon) || 0;

            state.hotel.extras = [{
                key: extraKey,
                name: radio.parentElement.querySelector('h3').textContent,
                addon: addon
            }];

            updateHotelFinalSummary();
        });
    });

    // Step 3 Continue button
    const hotelStep3ContinueBtn = document.getElementById('hotelStep3ContinueBtn');
    if (hotelStep3ContinueBtn) {
        hotelStep3ContinueBtn.addEventListener('click', () => {
            goToStep(4);
        });
    }

    // Hotel date/time inputs
    const hotelDateInput = document.getElementById('hotelDate');
    const hotelTimeInput = document.getElementById('hotelTime');
    if (hotelDateInput) hotelDateInput.addEventListener('change', () => { state.hotel.bookingDate = hotelDateInput.value; checkHotelDateTimeComplete(); });
    if (hotelTimeInput) hotelTimeInput.addEventListener('change', () => { state.hotel.bookingTime = hotelTimeInput.value; checkHotelDateTimeComplete(); });

    // Book hotel service
    document.getElementById('hotelBookBtn').addEventListener('click', () => {
        const message = generateHotelWhatsAppMessage();
        window.open(`https://wa.me/${DATA.WHATSAPP_NUMBER}?text=${message}`, '_blank');
    });

    // Set initial state
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Ego Spa Booking Widget initialized');
    });
}

function updateHotelValidCombos() {
    document.querySelectorAll('.hotel-duration-btn').forEach(btn => {
        const dur = btn.dataset.duration;
        const key = `${dur}-${state.hotel.hands}`;
        const valid = !!HOTEL_SERVICE_PRICING[key];
        btn.classList.toggle('disabled', !valid);
        if (!valid && btn.classList.contains('selected')) {
            btn.classList.remove('selected');
            state.hotel.duration = null;
        }
    });
}
