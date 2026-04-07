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
        btn.dataset.lockReason = finalAllowed ? '' : 'Not available for this technique';
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
        btn.dataset.lockReason = isLocked ? 'Not available for this technique' : '';
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
        let lockReason = isLocked ? 'Not available for this technique' : '';

        btn.classList.toggle('option-locked', isLocked);
        btn.disabled = isLocked;
        btn.dataset.lockReason = lockReason;
    });
}

/**
 * Updates hotel scenario constraints based on selected technique
 * Hotel + Thai = Tatami ONLY
 * Hotel + All other techniques = Table or Couch ONLY (NOT Tatami)
 */
function updateHotelConstraints() {
    const technique = state.hotel.technique;

    if (!technique) return;

    // Hotel scenario constraints
    let allowedScenarios = [];

    if (technique === 'thai') {
        // Thai = Tatami ONLY
        allowedScenarios = ['tatami-dry'];
    } else {
        // All other techniques = Table or Couch ONLY (NOT Tatami)
        allowedScenarios = ['massage-table', 'tantric-couch'];
    }

    console.log('🏨 Hotel Constraints:', { technique, allowedScenarios });

    // Update scenario availability for radio button options
    document.querySelectorAll('.hotel-scenario-option').forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        const scenario = radio.dataset.scenario;

        // Empty scenario (Sin escenario) is always allowed
        const isAllowed = !scenario || allowedScenarios.includes(scenario);

        option.classList.toggle('option-locked', !isAllowed);
        option.classList.toggle('disabled', !isAllowed);
        radio.disabled = !isAllowed;

        if (!isAllowed && radio.checked) {
            // If currently selected scenario becomes locked, uncheck it
            radio.checked = false;
            // Check the "Sin escenario" option
            const defaultRadio = document.querySelector('.hotel-scenario-option input[data-scenario=""]');
            if (defaultRadio) defaultRadio.checked = true;
            state.hotel.scenario = null;
            state.hotel.scenarioName = '';
            state.hotel.scenarioPrice = 0;
        }
    });
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
        if (hands !== null) parts.push(`${hands} Hands`);
        if (duration !== null) parts.push(`${duration}m`);

        if (content) content += ' | ';
        content += parts.join(' | ');
        price = calculateTotalPrice();
    } else if (state.currentFlow === 'packs' && state.pack.code) {
        if (content) content += ' | ';
        content += `${state.pack.code} - ${state.pack.sizeLabel} (${state.pack.sessions} sesiones)`;
        price = calculatePackPrice();
    } else if (state.currentFlow === 'hotel' && state.hotel.technique) {
        if (content) content += ' | ';
        content += `${state.hotel.techniqueName} | ${state.hotel.hands} Hands | ${state.hotel.duration}m`;
        price = calculateHotelPrice();
    } else if (!state.currentFlow) {
        content = content || 'Select a branch to begin';
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

    if (state.currentFlow === 'single' && state.single.technique) {
        const parts = [];
        parts.push(state.single.techniqueName);
        // Show all selected scenarios
        if (state.single.selectedScenarios.length > 0) {
            const scenarioNames = state.single.selectedScenarios.map(s => SCENARIO_DATA[s]?.name || s);
            parts.push(scenarioNames.join(' + '));
        }
        if (state.single.hands !== null) {
            parts.push(`${state.single.hands} manos`);
        }
        if (state.single.duration !== null) {
            parts.push(`${state.single.duration}m`);
        }
        if (state.single.extras.length > 0) {
            parts.push(`+${state.single.extras.length} extras`);
        }
        details = parts.join(' · ');
        price = calculateSinglePrice();
        regularPrice = price;
    } else if (state.currentFlow === 'packs' && state.pack.code) {
        const parts = [];
        parts.push(state.pack.code);
        if (state.pack.size) {
            parts.push(state.pack.sizeLabel);
        }
        parts.push(`${state.pack.hands} manos`);
        details = parts.join(' · ');
        price = calculatePackPrice();
        regularPrice = price;
    }

    if (state.isAuth && price > 0) {
        regularPrice = price;
        price = Math.round(price * (1 - EGO_DISCOUNT));
        const savings = regularPrice - price;

        elements.summarySavings.textContent = `💥 AHORRAS ${formatPrice(savings)} CON EGO CARD`;
        elements.summarySavings.classList.remove('hidden');
        elements.summarySavings.classList.add('savings-prominent');
        elements.summaryPrice.textContent = formatPrice(price);
    } else {
        elements.summarySavings.classList.add('hidden');
        elements.summarySavings.classList.remove('savings-prominent');
        elements.summaryPrice.textContent = price > 0 ? formatPrice(price) : '';
    }

    elements.summaryDetails.textContent = details;

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
        if (step === 6) {
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

            if (state.hotel.hands) {
                const handsBtn = document.querySelector(`.hotel-hands-btn[data-hands="${state.hotel.hands}"]`);
                if (handsBtn) handsBtn.classList.add('selected');
            }

            if (state.hotel.duration) {
                const durationBtn = document.querySelector(`.hotel-duration-btn[data-duration="${state.hotel.duration}"]`);
                if (durationBtn) durationBtn.classList.add('selected');
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
    }

    // Update sticky footer visibility
    const stickyFooter = document.getElementById('stickyFooter');
    if (stickyFooter) {
        // Don't show on final step (step 6)
        if (state.currentFlow === 'single' && step >= 1 && step <= 5) {
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
        const scenarioNames = state.single.selectedScenarios.map(s => SCENARIO_DATA[s]?.name || s);
        document.getElementById('finalScenario').textContent = scenarioNames.join(' + ');
    } else {
        document.getElementById('finalScenario').textContent = '';
    }
    document.getElementById('finalHands').textContent = state.single.hands !== null ? state.single.hands + ' Manos' : '';
    document.getElementById('finalDuration').textContent = state.single.duration !== null ? state.single.duration + ' min' : '';

    const extrasText = state.single.extras.map(e => e.name).join(', ') || 'Sensitive';
    document.getElementById('finalExtras').textContent = extrasText;

    document.getElementById('finalMasseuse').textContent = state.single.masseuseName || 'Sin preferencia';

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
}

function updateHotelFinalSummary() {
    console.log('Updating hotel final summary, state:', state.hotel);

    const finalTechnique = document.getElementById('hotelFinalTechnique');
    const finalScenario = document.getElementById('hotelFinalScenario');
    const finalConfig = document.getElementById('hotelFinalConfig');
    const finalExtras = document.getElementById('hotelFinalExtras');
    const finalPrice = document.getElementById('hotelFinalPrice');
    const finalSavings = document.getElementById('hotelFinalSavings');

    finalTechnique.textContent = state.hotel.techniqueName || 'Masaje';

    if (state.hotel.scenarioName) {
        finalScenario.textContent = state.hotel.scenarioName;
    }

    finalConfig.textContent = `${state.hotel.hands} Manos · ${state.hotel.duration} min`;

    if (state.hotel.extras.length > 0) {
        finalExtras.textContent = state.hotel.extras.map(e => e.name).join(', ');
    } else {
        finalExtras.textContent = 'Sin extras';
    }

    const price = calculateHotelPrice();
    console.log('Hotel price calculated:', price);
    finalPrice.textContent = `$${price}`;

    if (state.isAuth) {
        // Calculate regular price for comparison
        const key = `${state.hotel.duration}-${state.hotel.hands}`;
        let regularPrice = HOTEL_SERVICE_PRICING[key].regularPrice;
        regularPrice += (state.hotel.scenarioPrice || 0);
        state.hotel.extras.forEach(e => { regularPrice += e.addon; });
        regularPrice += (state.hotel.nightRate || 0);

        const savings = regularPrice - price;
        finalSavings.textContent = `Ahorras $${savings} con Ego Card`;
        finalSavings.classList.remove('hidden');
    } else {
        finalSavings.classList.add('hidden');
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

    // Enable button only when both hands and duration are selected
    const bothSelected = state.hotel.hands !== null && state.hotel.duration !== null;
    continueBtn.disabled = !bothSelected;
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
            hintEl.textContent = `Selecciona al menos 1 escenario (máximo ${maxScenarios})`;
            hintEl.className = 'text-ego-red text-xs mt-2';
        } else if (remaining > 0) {
            hintEl.textContent = `Puedes seleccionar hasta ${remaining} más`;
            hintEl.className = 'text-ego-muted text-xs mt-2';
        } else {
            hintEl.textContent = `${selected} escenario${selected > 1 ? 's' : ''} seleccionado${selected > 1 ? 's' : ''}`;
            hintEl.className = 'text-ego-gold text-xs mt-2';
        }
    } else {
        hintEl.classList.add('hidden');
    }

    // Update scenario section header with dynamic limit
    const scenarioHeader = document.getElementById('scenarioHeaderLimit');
    if (scenarioHeader) {
        if (isCouple) {
            scenarioHeader.textContent = 'Escenarios disponibles para parejas';
            scenarioHeader.classList.remove('hidden');
        } else if (maxScenarios > 1) {
            scenarioHeader.textContent = `Selecciona hasta ${maxScenarios} escenarios`;
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

function loadBranches() {
    const container = document.getElementById('branchesContainer');
    if (!container) return;

    let html = '';
    let staggerIndex = 2;

    // Add spa branches from data.json
    Object.entries(BRANCHES).forEach(([branchKey, branchData]) => {
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
                        <p class="text-ego-muted text-sm">Experiencia premium en ${branchData.label}</p>
                    </div>
                    <svg class="w-6 h-6 text-ego-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                </div>
            </button>
        `;
        staggerIndex++;
    });

    // Add hotel service option (hardcoded as it's a special service type)
    html += `
        <button class="branch-btn option-card rounded-2xl p-6 text-left fade-up stagger-${staggerIndex}" data-branch="hotel-service" aria-label="Hotel/Home Service">
            <div class="flex items-start gap-4">
                <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-ego-gold/20 to-transparent flex items-center justify-center flex-shrink-0">
                    <svg class="w-7 h-7 text-ego-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                </div>
                <div class="flex-1">
                    <h3 class="font-display text-2xl tracking-wide mb-1">HOTEL / HOME SERVICE</h3>
                    <p class="text-ego-muted text-sm">Servicio a tu habitación o domicilio. 24/7.</p>
                </div>
                <svg class="w-6 h-6 text-ego-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
            </div>
        </button>
    `;

    container.innerHTML = html;

    // Attach event listeners to dynamically created branch buttons
    document.querySelectorAll('.branch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const branch = btn.dataset.branch;
            state.selectedBranch = branch;
            state.selectedBranchName = branch === 'hotel-service'
                ? 'Hotel / Home Service'
                : BRANCHES[branch]?.name || branch;

            document.getElementById('branchSelection').classList.add('hidden');

            if (branch === 'hotel-service') {
                // Direct to Hotel Flow
                state.currentFlow = 'hotel';
                state.currentStep = 1;
                elements.hotelFlow.classList.remove('hidden');
                elements.backBtn.classList.remove('hidden');
                goToStep(1);
            } else {
                // Show flow selection for Spa branches
                document.getElementById('flowSelection').classList.remove('hidden');
            }

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
                    <h3 class="text-ego-gold font-display text-lg tracking-wider">${catData.label || catData.name}</h3>
                    ${catData.description ? `<p class="text-ego-muted text-xs mt-1">${catData.description}</p>` : ''}
                </div>
            `;

            // Add techniques in this category
            techniquesByCategory[catKey].forEach(({ key, data }) => {
                html += `
                    <button class="technique-btn option-card rounded-xl p-4 text-center fade-up stagger-${staggerIndex++}" data-technique="${key}">
                        <h3 class="font-semibold text-lg">${data.name}</h3>
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
            html += `
                <button class="technique-btn option-card rounded-xl p-4 text-center fade-up stagger-${staggerIndex++}" data-technique="${key}">
                    <h3 class="font-semibold text-lg">${data.name}</h3>
                </button>
            `;
        });
    }

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

    // Hotel techniques - limited set (tantric, thai, nuru, lingam, circuit, cocktail)
    const hotelTechniques = ['tantric', 'thai', 'nuru', 'lingam', 'circuit', 'cocktail'];

    hotelTechniques.forEach(techKey => {
        const techData = TECHNIQUE_DATA[techKey];
        if (techData) {
            html += `
                <button class="hotel-technique-btn option-card rounded-xl p-4 text-center fade-up stagger-${staggerIndex++}" data-technique="${techKey}">
                    <h3 class="font-semibold text-lg">${techData.name}</h3>
                </button>
            `;
        }
    });

    container.innerHTML = html;
}

function loadTouristPacks() {
    const container = document.getElementById('touristPacksContainer');
    // Placeholder - tourist packs will be loaded from data.json in the future
    container.innerHTML = `
        <div class="bg-ego-blue/10 border border-ego-blue/30 rounded-xl p-6 text-center">
            <p class="text-ego-blue font-semibold mb-2">Próximamente</p>
            <p class="text-ego-muted text-sm">Los packs turísticos estarán disponibles pronto.</p>
        </div>
    `;
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
      <p class="text-sm mt-1">SESIONES</p>
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

            calculateNightRate();

            // Restore previous values if needed
            if (!prevDate) state.single.bookingDate = prevDate;
            if (!prevTime) state.single.bookingTime = prevTime;

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

        calculateNightRate();
        updateFinalSummary();
        updateStickyFooter();
    }
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

        if (state.selectedBranch === 'hotel-service') {
            // Hotel branch goes back to branch selection
            state.selectedBranch = null;
            state.selectedBranchName = '';
            document.getElementById('branchSelection').classList.remove('hidden');
        } else {
            // Spa branches go back to flow selection
            elements.flowSelection.classList.remove('hidden');
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
        scenario: null,
        scenarioName: '',
        hands: 2,
        duration: 60,
        extras: []
    };

    // Remove selected class from all buttons
    document.querySelectorAll('.option-card.selected').forEach(el => {
        el.classList.remove('selected');
    });
    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
        el.checked = false;
    });
}
