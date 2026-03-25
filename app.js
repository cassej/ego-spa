// Ego Spa & Barba — Booking Widget
// Data is loaded from data.json

let DATA;

async function init() {
    const res = await fetch('./data.json');
    DATA = await res.json();

    const EGO_DISCOUNT = DATA.EGO_DISCOUNT;
    const PACK_DATA = DATA.PACK_DATA;
    const M_CODE_PRICING = DATA.M_CODE_PRICING;
    const HOTEL_SERVICE_PRICING = DATA.HOTEL_SERVICE_PRICING;
    const TECHNIQUE_DATA = DATA.TECHNIQUE_DATA;
    const SCENARIO_DATA = DATA.SCENARIO_DATA;
    const ADDON_PRICING = DATA.ADDON_PRICING;
    const TIERED_MODIFIERS = DATA.TIERED_MODIFIERS;
    
    // ============================================
        // STATE
        // ============================================
    
        const state = {
            isAuth: false,
            email: '',
            currentFlow: null, // 'single', 'packs', 'hotel', or 'jetlag'
            currentStep: 0,
            // Single massage state (Spa)
            single: {
                technique: null,
                techniqueName: '',
                pricingSystem: null, // 'M11-M18' or 'Tiered'
                mCode: null, // Selected M-code for M11-M18 techniques
                scenario: null, // Selected scenario (massage-table, tatami, etc.)
                scenarioName: '',
                basePrice: 0,
                hands: 2,
                handsAddon: 0,
                duration: 60,
                durationAddon: 0,
                extras: [], // Add-ons like Double Sensitive, Night Rate
                masseuseName: '',
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
                hands: 2,
                duration: 60,
                extras: [],
                nightRate: 0
            },
            // Pack state
            pack: {
                code: null,
                name: '',
                size: null,
                sizeLabel: '',
                sessions: 0,
                basePrice: 0,
                upgradeFee: 0,
                hands: 2
            }
        };
    
        // ============================================
        // HELPER FUNCTIONS
        // ============================================
    
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
         * Resets single service state to technique defaults
         * Called when technique changes to ensure valid configuration
         */
        function resetToTechniqueDefaults(technique) {
            const techniqueData = TECHNIQUE_DATA[technique];
    
            if (techniqueData.pricingSystem === 'M11-M18') {
                const firstCode = techniqueData.allowedCodes[0];
                const mCodeData = M_CODE_PRICING[firstCode];
                state.single.hands = mCodeData.hands;
                state.single.duration = mCodeData.duration;
                state.single.mCode = firstCode;
            } else {
                state.single.hands = 2;
                state.single.duration = 60;
                state.single.mCode = null;
            }
    
            state.single.scenario = null;
            state.single.scenarioName = '';
            state.single.selectedScenarios = [];
        }
    
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
                btn.classList.toggle('option-locked', !isAllowed);
                btn.disabled = !isAllowed;
                btn.dataset.lockReason = isAllowed ? '' : 'Not available for this technique';
            });
    
            // 2. Update hands availability
            document.querySelectorAll('.hands-btn').forEach(btn => {
                const h = parseInt(btn.dataset.hands);
                let isLocked = false;
                let lockReason = '';
    
                if (duration === 20 && h > 2) {
                    isLocked = true;
                    lockReason = '20 min max 2 hands';
                }
                if (duration === 40 && h > 4) {
                    isLocked = true;
                    lockReason = '40 min max 4 hands';
                }
    
                if (techniqueData.pricingSystem === 'M11-M18') {
                    const mCode = findMCode(h, duration);
                    if (!techniqueData.allowedCodes.includes(mCode)) {
                        isLocked = true;
                        lockReason = 'Not available for this technique';
                    }
                }
    
                btn.classList.toggle('option-locked', isLocked);
                btn.disabled = isLocked;
                btn.dataset.lockReason = lockReason;
            });
    
            // 3. Update duration availability
            document.querySelectorAll('.duration-btn').forEach(btn => {
                const d = parseInt(btn.dataset.duration);
                let isLocked = false;
                let lockReason = '';
    
                if (hands > 2 && d === 20) {
                    isLocked = true;
                    lockReason = '20 min max 2 hands';
                }
                if (hands > 4 && d === 40) {
                    isLocked = true;
                    lockReason = '40 min max 4 hands';
                }
    
                if (techniqueData.pricingSystem === 'M11-M18') {
                    const mCode = findMCode(hands, d);
                    if (!mCode || !techniqueData.allowedCodes.includes(mCode)) {
                        isLocked = true;
                        lockReason = 'Not available for this technique';
                    }
                }
    
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
                allowedScenarios = ['tatami'];
            } else {
                // All other techniques = Table or Couch ONLY (NOT Tatami)
                allowedScenarios = ['massage-table', 'tantric-couch'];
            }
    
            console.log('🏨 Hotel Constraints:', { technique, allowedScenarios });
    
            // Update scenario availability
            document.querySelectorAll('.hotel-scenario-btn').forEach(btn => {
                const scenario = btn.dataset.scenario;
                const isAllowed = allowedScenarios.includes(scenario);
    
                btn.classList.toggle('option-locked', !isAllowed);
                btn.disabled = !isAllowed;
                btn.dataset.lockReason = isAllowed ? '' : 'Not available for hotel services';
            });
        }
    
        /**
         * Updates the sticky footer with current selection and price
                const scenario = btn.dataset.scenario;
                const isAllowed = allowedScenarios.includes(scenario);
    
                btn.classList.toggle('option-locked', !isAllowed);
                btn.disabled = !isAllowed;
                btn.dataset.lockReason = isAllowed ? '' : 'Not available for hotel services';
            });
        }
    
        /**
         * Calculates night rate surcharge based on booking end time
         * Night rate applies when service ends between midnight and 6 AM
         * NOTE: Uses browser's local timezone (assumes Panama UTC-5)
         */
        function calculateNightRate() {
            if (!state.single.bookingDate || !state.single.bookingTime) {
                state.single.nightRate = 0;
                return;
            }
    
            // NOTE: This uses browser's local timezone. Assumes user is in Panama (UTC-5).
            // For production, consider proper timezone handling if users book from other timezones.
            const bookingDateTime = new Date(`${state.single.bookingDate}T${state.single.bookingTime}`);
            const endTime = new Date(bookingDateTime.getTime() + state.single.duration * 60000);
    
            const endHour = endTime.getHours();
            const isAfterMidnight = endHour >= 0 && endHour < 6;
    
            console.log('🌙 Night Rate Calculation:', { bookingTime: state.single.bookingTime, duration: state.single.duration, endTime: endTime.toLocaleTimeString(), endHour, isAfterMidnight });
    
            state.single.nightRate = isAfterMidnight ? 25 : 0;
        }
    
        /**
         * Updates the sticky footer with current selection and price
         * Shows technique, hands, duration, and calculated price
         */
        function updateStickyFooter() {
            const footer = document.getElementById('stickyFooter');
            if (!footer) return;
    
            const techniqueName = state.single.techniqueName || 'Select technique';
            const hands = state.single.hands;
            const duration = state.single.duration;
    
            let content = '';
            let price = 0;
    
            if (state.single.technique) {
                content = `${techniqueName} | ${hands} Hands | ${duration}m`;
                price = calculateTotalPrice();
            } else {
                content = 'Select a technique to begin';
            }
    
            footer.querySelector('.footer-content').textContent = content;
            const priceEl = footer.querySelector('.footer-price');
            if (priceEl) priceEl.textContent = price > 0 ? `$${price}` : '';
    
            const nightBadge = footer.querySelector('.night-rate-badge');
            if (nightBadge) {
                nightBadge.classList.toggle('hidden', state.single.nightRate === 0);
            }
        }
    
        // ============================================
        // DOM ELEMENTS
        // ============================================
    
        const elements = {
            authBtn: document.getElementById('authBtn'),
            authLabel: document.getElementById('authLabel'),
            authModal: document.getElementById('authModal'),
            authForm: document.getElementById('authForm'),
            emailInput: document.getElementById('emailInput'),
            closeAuthModal: document.getElementById('closeAuthModal'),
            flowSelection: document.getElementById('flowSelection'),
            singleFlow: document.getElementById('singleFlow'),
            packsFlow: document.getElementById('packsFlow'),
            hotelFlow: document.getElementById('hotelFlow'),
            jetlagFlow: document.getElementById('jetlagFlow'),
            backBtn: document.getElementById('backBtn'),
            stickySummary: document.getElementById('stickySummary'),
            summaryLabel: document.getElementById('summaryLabel'),
            summaryDetails: document.getElementById('summaryDetails'),
            summaryPrice: document.getElementById('summaryPrice'),
            summarySavings: document.getElementById('summarySavings'),
            sizeOptions: document.getElementById('sizeOptions')
        };
    
        // ============================================
        // UTILITY FUNCTIONS
        // ============================================
    
        function formatPrice(price) {
            return `$${price}`;
        }
    
        // Update available options based on technique constraints
        function updateTechniqueConstraints() {
            const technique = state.single.technique;
            if (!technique) return;
    
            const techniqueData = TECHNIQUE_DATA[technique];
    
            // Update scenario availability
            const allowedScenarios = techniqueData.allowedScenarios || [];
            document.querySelectorAll('.scenario-btn').forEach(btn => {
                const scenario = btn.dataset.scenario;
                if (allowedScenarios.includes(scenario)) {
                    btn.classList.remove('disabled', 'hidden');
                    btn.disabled = false;
                    btn.style.opacity = '1';
                } else {
                    btn.classList.add('disabled', 'hidden');
                    btn.disabled = true;
                    btn.style.opacity = '0.3';
                }
            });
    
            if (techniqueData.pricingSystem === 'M11-M18') {
                const allowedCodes = techniqueData.allowedCodes;
    
                // Get unique durations and hands from allowed codes
                const allowedDurations = [...new Set(allowedCodes.map(code => M_CODE_PRICING[code].duration))];
                const allowedHands = [...new Set(allowedCodes.map(code => M_CODE_PRICING[code].hands))];
    
                // Enable/disable duration buttons
                document.querySelectorAll('.duration-btn').forEach(btn => {
                    const duration = parseInt(btn.dataset.duration);
                    if (allowedDurations.includes(duration)) {
                        btn.classList.remove('disabled');
                        btn.disabled = false;
                        btn.style.opacity = '1';
                    } else {
                        btn.classList.add('disabled');
                        btn.disabled = true;
                        btn.style.opacity = '0.3';
                    }
                });
    
                // Enable/disable hands buttons
                document.querySelectorAll('.hands-btn').forEach(btn => {
                    const hands = parseInt(btn.dataset.hands);
                    if (allowedHands.includes(hands)) {
                        btn.classList.remove('disabled');
                        btn.disabled = false;
                        btn.style.opacity = '1';
                    } else {
                        btn.classList.add('disabled');
                        btn.disabled = true;
                        btn.style.opacity = '0.3';
                    }
                });
    
                // Show 75min option for M16
                const duration75 = document.getElementById('duration-75');
                if (duration75) {
                    if (allowedCodes.includes('M16')) {
                        duration75.classList.remove('hidden');
                    } else {
                        duration75.classList.add('hidden');
                    }
                }
            } else {
                // Tiered pricing: all options available
                document.querySelectorAll('.duration-btn, .hands-btn').forEach(btn => {
                    btn.classList.remove('disabled');
                    btn.disabled = false;
                    btn.style.opacity = '1';
                });
    
                // Hide 75min for tiered pricing
                const duration75 = document.getElementById('duration-75');
                if (duration75) {
                    duration75.classList.add('hidden');
                }
            }
        }
    
        function calculateSinglePrice() {
            let total = 0;
    
            // Base price
            if (state.single.pricingSystem === 'M11-M18' && state.single.mCode) {
                const mCodeData = M_CODE_PRICING[state.single.mCode];
                total = state.isAuth ? mCodeData.egoPrice : mCodeData.regularPrice;
            } else if (state.single.pricingSystem === 'Tiered' && state.single.technique) {
                const techniqueData = TECHNIQUE_DATA[state.single.technique];
                total = techniqueData.basePrice;
                total += TIERED_MODIFIERS.hands[state.single.hands];
                total += TIERED_MODIFIERS.duration[state.single.duration];
            }
    
            // Add extras
            state.single.extras.forEach(extra => {
                total += extra.addon;
            });
    
            // Add mobility fee
            total += state.single.mobilityFee;
    
            // Add night rate
            total += state.single.nightRate;
    
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
            let total = state.pack.basePrice;
    
            if (state.pack.hands === 4) {
                const upgradeTotal = packData.upgradeFee *
    state.pack.sessions;
                total += upgradeTotal;
            }
    
            return total;
        }
    
        function calculateHotelPrice() {
            const key = `${state.hotel.duration}-${state.hotel.hands}`;
            const pricing = HOTEL_SERVICE_PRICING[key];
    
            console.log('Hotel Price Calculation:', { key, pricing, hotel: state.hotel });
    
            if (!pricing) return 0;
    
            let total = state.isAuth ? pricing.egoPrice : pricing.regularPrice;
    
            // Add extras
            state.hotel.extras.forEach(e => {
                total += e.addon;
            });
    
            // Add night rate (for late bookings)
            total += state.hotel.nightRate;
    
            console.log('Hotel Final Price:', total);
            return total;
        }
    
        /**
         * Calculates night rate for hotel services
         * Night rate applies when service ends between midnight and 6 AM
         */
        function calculateHotelNightRate() {
            if (!state.hotel.bookingDate || !state.hotel.bookingTime) {
                state.hotel.nightRate = 0;
                return;
            }
    
            const bookingDateTime = new Date(`${state.hotel.bookingDate}T${state.hotel.bookingTime}`);
            const endTime = new Date(bookingDateTime.getTime() + state.hotel.duration * 60000);
    
            const endHour = endTime.getHours();
            const isAfterMidnight = endHour >= 0 && endHour < 6;
    
            console.log('🏨 Hotel Night Rate:', { bookingTime: state.hotel.bookingTime, duration: state.hotel.duration, endTime: endTime.toLocaleTimeString(), endHour, isAfterMidnight });
    
            state.hotel.nightRate = isAfterMidnight ? 25 : 0;
        }
    
        function updateSummary() {
            let details = '';
            let price = 0;
            let regularPrice = 0;
    
            if (state.currentFlow === 'single' && state.single.technique) {
                const parts = [];
                parts.push(state.single.techniqueName);
                if (state.single.scenarioName) {
                    parts.push(state.single.scenarioName);
                }
                parts.push(`${state.single.hands} manos`);
                parts.push(`${state.single.duration}m`);
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
    
            // Show/hide summary
            if (price > 0 && state.currentStep > 0) {
                elements.stickySummary.classList.remove('translate-y-full');
            } else {
                elements.stickySummary.classList.add('translate-y-full');
            }
        }
    
        function goToStep(step) {
            console.log(`➡️ Going to Step ${step} from ${state.currentStep}`);
            state.currentStep = step;
    
            // Update step indicators
            document.querySelectorAll('.step-dot').forEach((dot, i) => {
                dot.classList.remove('active', 'completed');
                if (i + 1 < step) dot.classList.add('completed');
                if (i + 1 === step) dot.classList.add('active');
            });
    
            // Hide all step content
            document.querySelectorAll('.step-content').forEach(el => {
                el.classList.add('hidden');
            });
    
            // Show current step content
            if (state.currentFlow === 'single') {
                document.getElementById(`singleStep${step}`).classList.remove('hidden');
    
                // Update final summary on step 7
                if (step === 7) {
                    updateFinalSummary();
                }
            } else if (state.currentFlow === 'packs') {
                document.getElementById(`packStep${step}`).classList.remove('hidden');
            } else if (state.currentFlow === 'hotel') {
                document.getElementById(`hotelStep${step}`).classList.remove('hidden');
    
                // Populate final summary on step 4
                if (step === 4) {
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
    
        function updateFinalSummary() {
            document.getElementById('finalTechnique').textContent = state.single.techniqueName;
            document.getElementById('finalScenario').textContent = state.single.scenarioName;
            document.getElementById('finalHands').textContent = state.single.hands + ' Manos';
            document.getElementById('finalDuration').textContent = state.single.duration + ' min';
    
            const extrasText = state.single.extras.map(e => e.name).join(', ') || 'Sensitive';
            document.getElementById('finalExtras').textContent = extrasText;
    
            document.getElementById('finalMasseuse').textContent = state.single.masseuseName || 'Sin preferencia';
    
            const mobilityRow = document.getElementById('finalMobilityRow');
            mobilityRow.classList.toggle('hidden', state.single.mobilityFee === 0);
    
            const nightRateRow = document.getElementById('finalNightRateRow');
            nightRateRow.classList.toggle('hidden', state.single.nightRate === 0);
    
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
                const regularPrice = HOTEL_SERVICE_PRICING[key].regularPrice;
                state.hotel.extras.forEach(e => { regularPrice += e.addon; });
    
                const savings = regularPrice - price;
                finalSavings.textContent = `Ahorras $${savings} con Ego Card`;
                finalSavings.classList.remove('hidden');
            } else {
                finalSavings.classList.add('hidden');
            }
        }
    
        function goBack() {
            if (state.currentStep > 1) {
                goToStep(state.currentStep - 1);
            } else {
                // Go back to flow selection
                state.currentFlow = null;
                state.currentStep = 0;
                elements.singleFlow.classList.add('hidden');
                elements.packsFlow.classList.add('hidden');
                elements.hotelFlow.classList.add('hidden');
                elements.jetlagFlow.classList.add('hidden');
                elements.flowSelection.classList.remove('hidden');
                elements.backBtn.classList.add('hidden');
                elements.stickySummary.classList.add('translate-y-full');
    
                // Reset selections
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
                hands: 2,
                handsAddon: 0,
                duration: 60,
                durationAddon: 0,
                extras: []
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
    
        function generateWhatsAppMessage() {
            let message = '';
    
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
    
                message = `[Flow: Pack] | ${state.pack.code} - ${state.pack.name} | ${state.pack.sizeLabel} (${state.pack.sessions} sesiones) | ${state.pack.hands} Manos | Total: $${price}`;
    
                if (state.isAuth) {
                    message += ` (Ego Card: ${state.email})`;
                }
            }
    
            return encodeURIComponent(message);
        }
    
        function generateHotelWhatsAppMessage() {
            const price = calculateHotelPrice();
            const extrasList = state.hotel.extras.length > 0 ? state.hotel.extras.map(e => e.name).join(', ') : 'Ninguno';
    
            let message = `[Flow: Hotel] | ${state.hotel.techniqueName || 'Masaje'} | ${state.hotel.scenarioName || 'N/A'} | ${state.hotel.hands} Manos | ${state.hotel.duration}min | Extras: ${extrasList} | Total: $${price}`;
    
            if (state.isAuth) {
                message += ` (Ego Card: ${state.email})`;
            }
    
            return encodeURIComponent(message);
        }
    
        // ============================================
        // EVENT HANDLERS
        // ============================================
    
        // Auth modal
        elements.authBtn.addEventListener('click', () => {
            if (state.isAuth) {
                // Show auth status
                alert(`Sesion activa: ${state.email}\nDescuento Ego Card: 
    ${EGO_DISCOUNT * 100}%`);
            } else {
                elements.authModal.classList.remove('hidden');
                elements.authModal.classList.add('flex');
            }
        });
    
        elements.closeAuthModal.addEventListener('click', () => {
            elements.authModal.classList.add('hidden');
            elements.authModal.classList.remove('flex');
        });
    
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
    
        elements.authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = elements.emailInput.value.trim();
    
            if (email) {
                state.isAuth = true;
                state.email = email;
    
                elements.authLabel.textContent = 'Activo';
                elements.authBtn.classList.add('auth-badge');
                elements.authModal.classList.add('hidden');
                elements.authModal.classList.remove('flex');
    
                updateSummary();
            }
        });
    
        // Flow selection
        document.querySelectorAll('.flow-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const flow = btn.dataset.flow;
                state.currentFlow = flow;
                state.currentStep = 1;
    
                elements.flowSelection.classList.add('hidden');
    
                if (flow === 'single') {
                    elements.singleFlow.classList.remove('hidden');
                    goToStep(1);
                } else if (flow === 'packs') {
                    elements.packsFlow.classList.remove('hidden');
                    goToStep(1);
                } else if (flow === 'hotel') {
                    elements.hotelFlow.classList.remove('hidden');
                    goToStep(1);
                } else if (flow === 'jetlag') {
                    elements.jetlagFlow.classList.remove('hidden');
                    elements.backBtn.classList.remove('hidden');
                }
            });
        });
    
        // Back button
        elements.backBtn.addEventListener('click', goBack);
    
        // ============================================
        // SINGLE MASSAGE FLOW
        // ============================================
    
        // Step 1: Technique
        document.querySelectorAll('.technique-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.technique-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
    
                const techniqueKey = btn.dataset.technique;
                state.single.technique = techniqueKey;
                state.single.techniqueName = TECHNIQUE_DATA[techniqueKey].name;
                state.single.pricingSystem = TECHNIQUE_DATA[techniqueKey].pricingSystem;
    
                // Reset to technique defaults
                resetToTechniqueDefaults(techniqueKey);
    
                // Update constraints
                updateConstraints();
                updateStickyFooter();
    
                setTimeout(() => goToStep(2), 200);
            });
        });
    
        // Step 2: Hands selection
        document.querySelectorAll('.hands-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const h = parseInt(btn.dataset.hands);
    
                if (btn.classList.contains('option-locked')) return;
    
                document.querySelectorAll('.hands-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
    
                state.single.hands = h;
    
                // Update M-code if applicable
                if (state.single.pricingSystem === 'M11-M18') {
                    state.single.mCode = findMCode(h, state.single.duration);
                }
    
                updateConstraints();
                updateStickyFooter();
    
                // Auto-advance to Step 3 (Duration) or Step 4 (Scenarios)
                const durationBtn = document.querySelector(`.duration-btn[data-duration="${state.single.duration}"]`);
                if (durationBtn && durationBtn.classList.contains('selected')) {
                    // Duration already selected, go to scenarios
                    setTimeout(() => goToStep(4), 200);
                } else {
                    // Duration not selected, go to duration selection
                    setTimeout(() => goToStep(3), 200);
                }
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
    
                // Update M-code if applicable
                if (state.single.pricingSystem === 'M11-M18') {
                    state.single.mCode = findMCode(state.single.hands, d);
                }
    
                updateConstraints();
                updateStickyFooter();
    
                // Auto-advance to scenarios
                setTimeout(() => goToStep(4), 200);
            });
        });
    
        // Step 4: Scenarios (with Circuit multi-scenario logic)
        function updateScenarioHint() {
            const hintEl = document.getElementById('scenarioHint');
            if (!hintEl) return;
    
            if (state.single.technique === 'circuit' || state.single.technique === 'circuit-deluxe') {
                const minRequired = state.single.duration >= 60 ? 3 : 2;
                const selected = state.single.selectedScenarios.length;
                const remaining = Math.max(0, minRequired - selected);
    
                hintEl.classList.remove('hidden');
                if (remaining > 0) {
                    hintEl.textContent = `Select ${remaining} more scenario${remaining > 1 ? 's' : ''} (minimum ${minRequired})`;
                    hintEl.className = 'text-ego-red text-xs mt-2';
                } else {
                    hintEl.textContent = `${selected} scenario${selected > 1 ? 's' : ''} selected`;
                    hintEl.className = 'text-ego-gold text-xs mt-2';
                }
            } else {
                hintEl.classList.add('hidden');
            }
        }
    
        document.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('option-locked')) return;
    
                const scenario = btn.dataset.scenario;
                const scenarioData = SCENARIO_DATA[scenario];
    
                // For Circuit techniques, handle multi-scenario selection
                if (state.single.technique === 'circuit' || state.single.technique === 'circuit-deluxe') {
                    const minRequired = state.single.duration >= 60 ? 3 : 2;
                    // Toggle selection
                    btn.classList.toggle('selected');
    
                    if (btn.classList.contains('selected')) {
                        state.single.selectedScenarios.push(scenario);
                    } else {
                        state.single.selectedScenarios = state.single.selectedScenarios.filter(s => s !== scenario);
                    }
    
                    updateScenarioHint();
                    updateStickyFooter();
    
                    // Only proceed if minimum scenarios selected
                    if (state.single.selectedScenarios.length >= minRequired) {
                        state.single.scenario = state.single.selectedScenarios[0];
                        state.single.scenarioName = scenarioData.name;
                        setTimeout(() => goToStep(5), 200);
                    }
                } else {
                    // Single scenario selection for other techniques
                    document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
    
                    state.single.scenario = scenario;
                    state.single.scenarioName = scenarioData.name;
                    state.single.selectedScenarios = [scenario];
    
                    updateScenarioHint();
                    updateStickyFooter();
    
                    setTimeout(() => goToStep(5), 200);
                }
            });
        });
    
        // Step 5: PRAECOQUIS extras
        document.querySelectorAll('.extra-check').forEach(check => {
            check.addEventListener('change', () => {
                const extra = {
                    name: check.parentElement.querySelector('h3').textContent,
                    addon: parseInt(check.dataset.addon)
                };
    
                if (check.checked) {
                    state.single.extras.push(extra);
                } else {
                    state.single.extras = state.single.extras.filter(e => e.name !== extra.name);
                }
    
                updateStickyFooter();
                // No auto-advance - continue button added below
            });
        });
    
        // Add continue button to Step 5
        const praecoquisContinueBtn = document.createElement('button');
        praecoquisContinueBtn.className = 'btn-primary w-full py-4 rounded-xl font-semibold text-white uppercase tracking-wider mt-4';
        praecoquisContinueBtn.textContent = 'Continuar';
        praecoquisContinueBtn.addEventListener('click', () => goToStep(6));
        document.getElementById('singleStep5').querySelector('.space-y-3').appendChild(praecoquisContinueBtn);
    
        // Step 6: Logistics (masseuse preference and mobility)
        // Masseuse preference radio buttons
        document.querySelectorAll('input[name="masseuse-pref"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const nameInput = document.getElementById('masseuseName');
                const mobilityToggle = document.getElementById('mobilityToggle');
    
                if (radio.value === 'specific') {
                    nameInput.disabled = false;
                    nameInput.focus();
                } else {
                    nameInput.disabled = true;
                    nameInput.value = '';
                    state.single.masseuseName = '';
                    mobilityToggle.disabled = true;
                    mobilityToggle.checked = false;
                    state.single.mobilityFee = 0;
                }
            });
        });
    
        // Masseuse name input
        document.getElementById('masseuseName').addEventListener('input', (e) => {
            state.single.masseuseName = e.target.value;
            const mobilityToggle = document.getElementById('mobilityToggle');
    
            if (e.target.value.trim()) {
                mobilityToggle.disabled = false;
            } else {
                mobilityToggle.disabled = true;
                mobilityToggle.checked = false;
                state.single.mobilityFee = 0;
            }
        });
    
        // Mobility toggle
        document.getElementById('mobilityToggle').addEventListener('change', (e) => {
            state.single.mobilityFee = e.target.checked ? 25 : 0;
            updateStickyFooter();
        });
    
        // Add continue button to Step 6
        const logisticsContinueBtn = document.createElement('button');
        logisticsContinueBtn.className = 'btn-primary w-full py-4 rounded-xl font-semibold text-white uppercase tracking-wider mt-4';
        logisticsContinueBtn.textContent = 'Continuar';
        logisticsContinueBtn.addEventListener('click', () => goToStep(7));
        document.getElementById('singleStep6').querySelector('.space-y-4').appendChild(logisticsContinueBtn);
    
        // Step 7: Date & Time selection with night rate calculation
        const bookingDateInput = document.getElementById('bookingDate');
        const bookingTimeInput = document.getElementById('bookingTime');
        const bookBtn = document.getElementById('singleBookBtn');
    
        function checkDateTimeComplete() {
            const dateFilled = bookingDateInput.value !== '';
            const timeFilled = bookingTimeInput.value !== '';
            bookBtn.disabled = !(dateFilled && timeFilled);
    
            if (dateFilled && timeFilled) {
                state.single.bookingDate = bookingDateInput.value;
                state.single.bookingTime = bookingTimeInput.value;
    
                calculateNightRate();
                updateFinalSummary();
                updateStickyFooter();
            }
        }
    
        bookingDateInput.addEventListener('change', checkDateTimeComplete);
        bookingTimeInput.addEventListener('change', checkDateTimeComplete);
    
        // Book single massage
        document.getElementById('singleBookBtn').addEventListener('click', ()   => {
            const message = generateWhatsAppMessage();
            window.open(`https://wa.me/50760000000?text=${message}`,
    '_blank');
        });
    
        // ============================================
        // HOTEL SERVICES FLOW
        // ============================================
    
        // Step 1: Technique
        document.querySelectorAll('.hotel-technique-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.hotel-technique-btn').forEach(b =>
    b.classList.remove('selected'));
                btn.classList.add('selected');
    
                const technique = btn.dataset.technique;
                const techniqueData = TECHNIQUE_DATA[technique];
    
                state.hotel.technique = technique;
                state.hotel.techniqueName = techniqueData.name;
                state.hotel.pricingSystem = techniqueData.pricingSystem;
    
                // Update hotel scenario constraints
                updateHotelConstraints();
    
                setTimeout(() => goToStep(2), 200);
            });
        });
    
        // Step 2: Scenario
        document.querySelectorAll('.hotel-scenario-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Prevent clicking on locked scenarios
                if (btn.classList.contains('option-locked') || btn.disabled) {
                    console.log('🏨 Hotel scenario locked:', btn.dataset.scenario);
                    return;
                }
    
                document.querySelectorAll('.hotel-scenario-btn').forEach(b =>
    b.classList.remove('selected'));
                btn.classList.add('selected');
    
                const scenario = btn.dataset.scenario;
                state.hotel.scenario = scenario;
                state.hotel.scenarioName = SCENARIO_DATA[scenario].name;
    
                console.log('🏨 Hotel scenario selected:', scenario);
    
                setTimeout(() => goToStep(3), 200);
            });
        });
    
        // Step 3: Hands
        document.querySelectorAll('.hotel-hands-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.hotel-hands-btn').forEach(b =>
    b.classList.remove('selected'));
                btn.classList.add('selected');
    
                state.hotel.hands = parseInt(btn.dataset.hands);
    
                // Check if duration is selected, if yes, go to step 4
                const durationBtn = document.querySelector(`.hotel-duration-btn[data-duration="${state.hotel.duration}"]`);
                if (durationBtn && durationBtn.classList.contains('selected')) {
                    setTimeout(() => goToStep(4), 200);
                }
    
                // If on step 4 and duration is selected, update price
                if (state.currentStep === 4 && durationBtn && durationBtn.classList.contains('selected')) {
                    updateHotelFinalSummary();
                }
            });
        });
    
        // Step 3: Duration
        document.querySelectorAll('.hotel-duration-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.hotel-duration-btn').forEach(b =>
    b.classList.remove('selected'));
                btn.classList.add('selected');
    
                state.hotel.duration = parseInt(btn.dataset.duration);
    
                // Check if hands is selected, if yes, go to step 4
                const handsBtn = document.querySelector(`.hotel-hands-btn[data-hands="${state.hotel.hands}"]`);
                if (handsBtn && handsBtn.classList.contains('selected')) {
                    setTimeout(() => goToStep(4), 200);
                }
    
                // If on step 4 and hands is selected, update price
                if (state.currentStep === 4 && handsBtn && handsBtn.classList.contains('selected')) {
                    updateHotelFinalSummary();
                }
            });
        });
    
        // Step 4: Extras
        document.querySelectorAll('.hotel-extra-check').forEach(check => {
            check.addEventListener('change', () => {
                const extra = {
                    name: check.parentElement.querySelector('h3').textContent,
                    addon: parseInt(check.dataset.addon)
                };
    
                if (check.checked) {
                    state.hotel.extras.push(extra);
                } else {
                    state.hotel.extras = state.hotel.extras.filter(e => e.name !== extra.name);
                }
    
                updateHotelFinalSummary();
            });
        });
    
        // Book hotel service
        document.getElementById('hotelBookBtn').addEventListener('click', () => {
            const message = generateHotelWhatsAppMessage();
            window.open(`https://wa.me/50760000000?text=${message}`, '_blank');
        });
    
        // ============================================
        // PACKS FLOW
        // ============================================
    
        // Step 1: Pack selection
        document.querySelectorAll('.pack-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.pack-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
    
                state.pack.code = btn.dataset.pack;
                state.pack.name = PACK_DATA[btn.dataset.pack].name;
    
                // Populate size options
                populateSizeOptions();
    
                setTimeout(() => goToStep(2), 200);
            });
        });
    
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
                    state.pack.sessions = parseInt(btn.dataset.sessions);
                    state.pack.basePrice = parseInt(btn.dataset.price);
    
                    setTimeout(() => goToStep(3), 200);
                });
            });
        }
    
        // Step 3: Upgrade
        document.querySelectorAll('.upgrade-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.upgrade-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
    
                state.pack.hands = parseInt(btn.dataset.upgrade);
    
                updateSummary();
            });
        });
    
        // Book pack
        document.getElementById('packBookBtn').addEventListener('click', () => {
            const message = generateWhatsAppMessage();
            window.open(`https://wa.me/50760000000?text=${message}`, '_blank');
        });
    
        // ============================================
        // INITIALIZATION
        // ============================================
    
        // Set initial state
        document.addEventListener('DOMContentLoaded', () => {
            // Ensure everything is properly initialized
            console.log('Ego Spa Booking Widget initialized');
        });
}

init();
