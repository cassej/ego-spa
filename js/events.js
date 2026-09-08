function setupEventListeners() {


    // Hours modal
    const hoursBtn = document.getElementById('hoursBtn');
    const hoursModal = document.getElementById('hoursModal');
    const closeHoursModal = document.getElementById('closeHoursModal');

    hoursBtn.addEventListener('click', () => {
        hoursModal.classList.remove('hidden');
        hoursModal.classList.add('flex');
    });

    closeHoursModal.addEventListener('click', () => {
        hoursModal.classList.add('hidden');
        hoursModal.classList.remove('flex');
    });




    // Back button
    elements.backBtn.addEventListener('click', goBack);

    // ============================================
    // SINGLE MASSAGE FLOW
    // ============================================

    // Step 1: Technique (using event delegation for dynamically loaded buttons)
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

        // Reset to technique defaults
        resetToTechniqueDefaults(techniqueKey);

        // Update constraints
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

            // Update constraints FIRST to lock incompatible durations
            updateConstraints();

            // Then check if current duration is still valid (not locked)
            const currentDurationBtn = document.querySelector('.duration-btn.selected');
            const durationIsLocked = currentDurationBtn && currentDurationBtn.classList.contains('option-locked');

            // If current duration became locked, switch to nearest available
            if (durationIsLocked && state.single.duration !== null) {
                const newDuration = findNearestDuration(technique, h, state.single.duration);
                if (newDuration !== null) {
                    state.single.duration = newDuration;
                    if (['CodeBased', 'PackBased'].includes(state.single.pricingSystem)) {
                        state.single.mCode = findMCode(h, newDuration);
                    }
                    // Update UI for duration buttons
                    document.querySelectorAll('.duration-btn').forEach(dBtn => {
                        const d = parseInt(dBtn.dataset.duration);
                        dBtn.classList.toggle('selected', d === newDuration);
                    });
                }
            } else if (state.single.duration !== null && ['CodeBased', 'PackBased'].includes(state.single.pricingSystem)) {
                state.single.mCode = findMCode(h, state.single.duration);
            }

            updateStickyFooter();

            // Check if continue button should be enabled
            updateConfigContinueButton();
        });
    });

    // Step 3: Duration selection
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const d = parseInt(btn.dataset.duration);

            if (btn.classList.contains('option-locked')) return;

            document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            state.single.duration = d;

            const technique = state.single.technique;

            // Update constraints FIRST to lock incompatible hands
            updateConstraints();

            // Then check if current hands are still valid (not locked)
            const currentHandsBtn = document.querySelector('.hands-btn.selected');
            const handsAreLocked = currentHandsBtn && currentHandsBtn.classList.contains('option-locked');

            // If current hands became locked, switch to nearest available
            if (handsAreLocked && state.single.hands !== null) {
                const newHands = findNearestHands(technique, d, state.single.hands);
                if (newHands !== null) {
                    state.single.hands = newHands;
                    if (['CodeBased', 'PackBased'].includes(state.single.pricingSystem)) {
                        state.single.mCode = findMCode(newHands, d);
                    }
                    // Update UI for hands buttons
                    document.querySelectorAll('.hands-btn').forEach(hBtn => {
                        const h = parseInt(hBtn.dataset.hands);
                        hBtn.classList.toggle('selected', h === newHands);
                    });
                }
            } else if (state.single.hands !== null && ['CodeBased', 'PackBased'].includes(state.single.pricingSystem)) {
                state.single.mCode = findMCode(state.single.hands, d);
            }

            updateStickyFooter();

            // Check if continue button should be enabled
            updateConfigContinueButton();
        });
    });

    document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('option-locked')) return;

            const scenario = btn.dataset.scenario;
            const scenarioData = SCENARIO_DATA[scenario];

            // Check technique exclusions from config
            const techniqueExclusions = DATA.SCENARIO_RULES?.technique_exclusions?.[state.single.technique] || [];
            if (techniqueExclusions.includes(scenario)) {
                alert(t('scenarios.notAvailable'));
                return;
            }

            // Get max scenarios from config based on duration (couple override)
            const maxScenarios = getMaxScenarios(state.single.technique, state.single.duration);

            // For multi-scenario techniques (circuit, cocktail)
            if (maxScenarios > 1) {
                // Toggle selection
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

                // Always set scenario to first selected for compatibility
                if (state.single.selectedScenarios.length > 0) {
                    state.single.scenario = state.single.selectedScenarios[0];
                    state.single.scenarioName = td('SCENARIO_DATA', state.single.scenario, 'name') || '';
                }

                updateScenarioHint();
                updateStickyFooter();
                updateScenarioContinueButton();
            } else {
                // Single scenario selection for other techniques
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

    // Step 4: Additional Options (checkboxes, multiple selection)
    document.getElementById('extrasContainer')?.addEventListener('change', (e) => {
        if (e.target.matches('input[name="extra-option"]')) {
            state.single.extras = [];
            document.querySelectorAll('input[name="extra-option"]:checked').forEach(cb => {
                state.single.extras.push({
                    key: cb.dataset.extra,
                    name: cb.closest('label').querySelector('h3').textContent,
                    addon: parseInt(cb.dataset.addon) || 0
                });
            });
            updateStickyFooter();
        }
    });

    // Add continue button to Step 4
    const extrasContinueBtn = document.createElement('button');
    extrasContinueBtn.className = 'btn-primary w-full py-4 rounded-xl font-semibold text-white uppercase tracking-wider mt-4';
    extrasContinueBtn.textContent = t('single.continue');
    extrasContinueBtn.addEventListener('click', () => goToStep(5));
    document.getElementById('singleStep4').querySelector('#extrasContainer').appendChild(extrasContinueBtn);

    // Step 5: Logistics (masseuse preference and mobility)
    // Masseuse preference radio buttons
    document.querySelectorAll('input[name="masseuse-pref"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const nameInput = document.getElementById('masseuseName');
            const travelFeeNotice = document.getElementById('travelFeeNotice');

            if (radio.value === 'specific') {
                nameInput.disabled = false;
                nameInput.focus();
                state.single.mobilityFee = 35; // $35 travel fee
                if (travelFeeNotice) travelFeeNotice.classList.remove('hidden');
            } else {
                nameInput.disabled = true;
                nameInput.value = '';
                state.single.masseuseName = '';
                state.single.mobilityFee = 0;
                if (travelFeeNotice) travelFeeNotice.classList.add('hidden');
            }
            updateStickyFooter();
        });
    });

    // Masseuse name input
    document.getElementById('masseuseName').addEventListener('input', (e) => {
        state.single.masseuseName = e.target.value;
    });

    // Add continue button to Step 5
    const logisticsContinueBtn = document.createElement('button');
    logisticsContinueBtn.className = 'btn-primary w-full py-4 rounded-xl font-semibold text-white uppercase tracking-wider mt-4';
    logisticsContinueBtn.textContent = t('single.continue');
    logisticsContinueBtn.addEventListener('click', () => goToStep(6));
    document.getElementById('singleStep5').querySelector('.space-y-4').appendChild(logisticsContinueBtn);

    const bookingDateInput = document.getElementById('bookingDate');
    const bookingTimeInput = document.getElementById('bookingTime');
    const bookBtn = document.getElementById('singleBookBtn');

    bookingDateInput.addEventListener('change', checkDateTimeComplete);
    bookingTimeInput.addEventListener('change', checkDateTimeComplete);

    // Step 2 Continue button
    const singleConfigContinueBtn = document.getElementById('singleConfigContinueBtn');
    if (singleConfigContinueBtn) {
        singleConfigContinueBtn.addEventListener('click', () => {
            goToStep(3); // Go to scenarios
        });
    }

    // Book single massage
    document.getElementById('singleBookBtn').addEventListener('click', ()   => {
        const message = generateWhatsAppMessage();
        window.open(`https://wa.me/${DATA.WHATSAPP_NUMBER}?text=${message}`, '_blank');
    });

    // ============================================
    // HOTEL SERVICES FLOW
    // ============================================

    // Step 1: Technique (using event delegation for dynamically loaded buttons)
    document.getElementById('hotelTechniquesContainer').addEventListener('click', (e) => {
        const btn = e.target.closest('.hotel-technique-btn');
        if (!btn) return;

        const technique = btn.dataset.technique;

        // If clicking the already-selected technique → advance
        if (btn.classList.contains('selected')) {
            setTimeout(() => goToStep(2), 200);
            return;
        }

        // First tap: select and show description
        document.querySelectorAll('.hotel-technique-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        const techniqueData = TECHNIQUE_DATA[technique];

        state.hotel.technique = technique;
        state.hotel.techniqueName = td('TECHNIQUE_DATA', technique, 'name');
        state.hotel.pricingSystem = techniqueData.pricingSystem;

        // Update hotel scenario constraints
        updateHotelConstraints();
    });

    // Step 2: Hands (event delegation for dynamically generated buttons)
    document.getElementById('hotelHandsContainer').addEventListener('click', (e) => {
        const btn = e.target.closest('.hotel-hands-btn');
        if (!btn || btn.classList.contains('opacity-30')) return;

        document.querySelectorAll('.hotel-hands-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        state.hotel.hands = parseInt(btn.dataset.hands) || 2;

        // Update valid duration combos based on selected hands
        updateHotelValidCombos();

        // Check if continue button should be enabled
        updateHotelConfigContinueButton();

        // If on step 4 and duration is selected, update price
        const durationBtn = document.querySelector(`.hotel-duration-btn[data-duration="${state.hotel.duration}"]`);
        if (state.currentStep === 4 && durationBtn && durationBtn.classList.contains('selected')) {
            updateHotelFinalSummary();
        }
    });

    // Step 3: Duration (event delegation for dynamically generated buttons)
    document.getElementById('hotelDurationContainer').addEventListener('click', (e) => {
        const btn = e.target.closest('.hotel-duration-btn');
        if (!btn || btn.classList.contains('opacity-30')) return;

        document.querySelectorAll('.hotel-duration-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        state.hotel.duration = parseInt(btn.dataset.duration) || 60;

        // Check if continue button should be enabled
        updateHotelConfigContinueButton();

        // If on step 4 and hands is selected, update price
        const handsBtn = document.querySelector(`.hotel-hands-btn[data-hands="${state.hotel.hands}"]`);
        if (state.currentStep === 4 && handsBtn && handsBtn.classList.contains('selected')) {
            updateHotelFinalSummary();
        }
    });

    // Step 2 Continue button
    const hotelConfigContinueBtn = document.getElementById('hotelConfigContinueBtn');
    if (hotelConfigContinueBtn) {
        hotelConfigContinueBtn.addEventListener('click', () => {
            goToStep(3); // Go to extras
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

    // Step 3: Extras (mutual exclusion: Sensitive default)
    document.querySelectorAll('input[name="hotel-praecoquis"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const extraKey = radio.dataset.extra;
            const addon = parseInt(radio.dataset.addon) || 0;

            // Clear extras and add the selected one
            state.hotel.extras = [{
                name: radio.parentElement.querySelector('h3').textContent,
                addon: addon
            }];

            updateHotelFinalSummary();
        });
    });

    // Step 3 Continue button (go to step 4)
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
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    });

    // Tourist back button
    document.getElementById('touristBackBtn').addEventListener('click', () => {
        elements.touristFlow.classList.add('hidden');
        document.getElementById('serviceTypeSelection').classList.remove('hidden');
        elements.backBtn.classList.add('hidden');
    });

    // Membership purchase button
    document.getElementById('membershipPurchaseBtn').addEventListener('click', () => {
        const message = generateMembershipWhatsAppMessage();
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    });

    // Membership back button
    document.getElementById('membershipBackBtn').addEventListener('click', () => {
        elements.membershipFlow.classList.add('hidden');
        document.getElementById('serviceTypeSelection').classList.remove('hidden');
        elements.backBtn.classList.remove('hidden');
    });

    // ============================================
    // PACKS FLOW
    // ============================================

    // Pack selection is handled dynamically by loadPacks() in ui.js

    // Step 3: Upgrade
    document.querySelectorAll('.upgrade-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.upgrade-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            state.pack.hands = parseInt(btn.dataset.upgrade) || 2;

            updateSummary();
        });
    });

    // Book pack
    document.getElementById('packBookBtn').addEventListener('click', () => {
        const message = generateWhatsAppMessage();
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    });

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

    // Set initial state
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Ego Spa Booking Widget initialized');
    });
}
