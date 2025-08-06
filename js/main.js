/**
 * Paws & Tails - Main Application Logic
 * Handles puppy listing, filtering, pagination, and order processing
 */

// Application Configuration
const APP_CONFIG = {
    pagination: {
        itemsPerPage: 10,
        maxVisiblePages: 5
    },
    shipping: {
        pickup: 0,
        standard: 150,
        handDelivery: 350
    },
    ageRanges: {
        '8-12 weeks': { min: 8, max: 12, unit: 'weeks' },
        '3-6 months': { min: 12, max: 24, unit: 'weeks' } // 3-6 months in weeks
    }
};

// Utility Functions Module
const Utils = {
    /**
     * Parse age string to weeks for consistent comparison
     * @param {string} ageString - Age in format "X weeks" or "X months"
     * @returns {number} Age in weeks
     */
    parseAgeToWeeks(ageString) {
        if (!ageString || typeof ageString !== 'string') return 0;
        
        const parts = ageString.trim().toLowerCase().split(' ');
        if (parts.length < 2) return 0;
        
        const value = parseInt(parts[0]);
        const unit = parts[1];
        
        if (isNaN(value)) return 0;
        
        if (unit.includes('week')) {
            return value;
        } else if (unit.includes('month')) {
            return value * 4; // Approximate: 1 month = 4 weeks
        }
        
        return 0;
    },

    /**
     * Debounce function to limit function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Get URL parameters
     * @param {string} param - Parameter name
     * @returns {string|null} Parameter value
     */
    getUrlParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    },

    /**
     * Format price with currency symbol
     * @param {number} price - Price to format
     * @returns {string} Formatted price
     */
    formatPrice(price) {
        return `$${price.toFixed(2)}`;
    }
};

// Filtering Module
const FilterManager = {
    /**
     * Apply all active filters to puppies array
     * @param {Array} puppies - Array of puppy objects
     * @returns {Array} Filtered puppies array
     */
    applyFilters(puppies) {
        const filters = this.getActiveFilters();
        
        return puppies.filter(puppy => {
            return this.matchesBreedFilter(puppy, filters.breed) &&
                   this.matchesAgeFilter(puppy, filters.age) &&
                   this.matchesGenderFilter(puppy, filters.gender);
        });
    },

    /**
     * Get current filter values from DOM
     * @returns {Object} Filter values
     */
    getActiveFilters() {
        return {
            breed: this.getFilterValue('breed-filter'),
            age: this.getFilterValue('age-filter'),
            gender: this.getFilterValue('gender-filter')
        };
    },

    /**
     * Get filter value from select element
     * @param {string} elementId - Element ID
     * @returns {string} Filter value
     */
    getFilterValue(elementId) {
        const element = document.getElementById(elementId);
        return element ? element.value : 'all';
    },

    /**
     * Check if puppy matches breed filter
     * @param {Object} puppy - Puppy object
     * @param {string} breedFilter - Selected breed filter
     * @returns {boolean} Match result
     */
    matchesBreedFilter(puppy, breedFilter) {
        return breedFilter === 'all' || puppy.breed === breedFilter;
    },

    /**
     * Check if puppy matches age filter
     * @param {Object} puppy - Puppy object
     * @param {string} ageFilter - Selected age filter
     * @returns {boolean} Match result
     */
    matchesAgeFilter(puppy, ageFilter) {
        if (ageFilter === 'all') return true;
        
        const puppyAgeInWeeks = Utils.parseAgeToWeeks(puppy.age);
        const ageRange = APP_CONFIG.ageRanges[ageFilter];
        
        if (!ageRange) return true;
        
        return puppyAgeInWeeks >= ageRange.min && puppyAgeInWeeks <= ageRange.max;
    },

    /**
     * Check if puppy matches gender filter
     * @param {Object} puppy - Puppy object
     * @param {string} genderFilter - Selected gender filter
     * @returns {boolean} Match result
     */
    matchesGenderFilter(puppy, genderFilter) {
        return genderFilter === 'all' || puppy.gender === genderFilter;
    }
};

// Pagination Module
const PaginationManager = {
    currentPage: 1,
    
    /**
     * Render pagination controls
     * @param {Array} items - Array of items to paginate
     * @param {HTMLElement} container - Pagination container element
     * @param {Function} onPageChange - Callback for page changes
     */
    render(items, container, onPageChange) {
        if (!container) return;
        
        container.innerHTML = '';
        const pageCount = Math.ceil(items.length / APP_CONFIG.pagination.itemsPerPage);
        
        if (pageCount <= 1) return;
        
        const pagination = document.createElement('nav');
        pagination.setAttribute('aria-label', 'Puppy pagination');
        
        const ul = document.createElement('ul');
        ul.className = 'pagination justify-content-center';
        
        // Previous button
        ul.appendChild(this.createPaginationItem(
            '&laquo;', 
            this.currentPage - 1, 
            this.currentPage === 1, 
            onPageChange,
            'Previous'
        ));
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(pageCount, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            ul.appendChild(this.createPaginationItem(
                i, 
                i, 
                false, 
                onPageChange,
                `Page ${i}`,
                i === this.currentPage
            ));
        }
        
        // Next button
        ul.appendChild(this.createPaginationItem(
            '&raquo;', 
            this.currentPage + 1, 
            this.currentPage === pageCount, 
            onPageChange,
            'Next'
        ));
        
        pagination.appendChild(ul);
        container.appendChild(pagination);
    },

    /**
     * Create pagination item element
     * @param {string} text - Display text
     * @param {number} page - Page number
     * @param {boolean} disabled - Whether item is disabled
     * @param {Function} onPageChange - Click handler
     * @param {string} ariaLabel - Accessibility label
     * @param {boolean} active - Whether item is active
     * @returns {HTMLElement} List item element
     */
    createPaginationItem(text, page, disabled, onPageChange, ariaLabel, active = false) {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.innerHTML = text;
        a.setAttribute('aria-label', ariaLabel);
        
        if (!disabled) {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                this.currentPage = page;
                onPageChange(page);
            });
        }
        
        li.appendChild(a);
        return li;
    },

    /**
     * Get items for current page
     * @param {Array} items - All items
     * @param {number} page - Page number
     * @returns {Array} Items for the page
     */
    getItemsForPage(items, page = this.currentPage) {
        const start = (page - 1) * APP_CONFIG.pagination.itemsPerPage;
        const end = start + APP_CONFIG.pagination.itemsPerPage;
        return items.slice(start, end);
    },

    /**
     * Reset to first page
     */
    reset() {
        this.currentPage = 1;
    }
};

// Available Puppies Page Module
const AvailablePage = {
    elements: {},
    filteredPuppies: [],
    
    /**
     * Initialize the available puppies page
     */
    init() {
        this.cacheElements();
        this.filteredPuppies = [...puppies];
        this.bindEvents();
        this.render();
        
        console.log('🐕 Available puppies page initialized');
    },

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            puppyGrid: document.getElementById('puppy-grid'),
            paginationContainer: document.getElementById('pagination-container'),
            filterButton: document.getElementById('btn-filter'),
            breedFilter: document.getElementById('breed-filter'),
            ageFilter: document.getElementById('age-filter'),
            genderFilter: document.getElementById('gender-filter')
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (this.elements.filterButton) {
            this.elements.filterButton.addEventListener('click', () => this.applyFilters());
        }
        
        // Auto-filter on select change with debouncing
        const autoFilter = Utils.debounce(() => this.applyFilters(), 300);
        
        [this.elements.breedFilter, this.elements.ageFilter, this.elements.genderFilter]
            .forEach(element => {
                if (element) {
                    element.addEventListener('change', autoFilter);
                }
            });
    },

    /**
     * Apply filters and re-render
     */
    applyFilters() {
        try {
            this.filteredPuppies = FilterManager.applyFilters(puppies);
            PaginationManager.reset();
            this.render();
            
            console.log(`🔍 Filters applied: ${this.filteredPuppies.length} puppies match criteria`);
        } catch (error) {
            console.error('❌ Error applying filters:', error);
        }
    },

    /**
     * Render the current page
     */
    render() {
        this.renderPuppyGrid();
        this.renderPagination();
    },

    /**
     * Render puppy cards grid
     */
    renderPuppyGrid() {
        if (!this.elements.puppyGrid) return;
        
        this.elements.puppyGrid.innerHTML = '';
        
        if (this.filteredPuppies.length === 0) {
            this.renderNoResults();
            return;
        }
        
        const paginatedPuppies = PaginationManager.getItemsForPage(this.filteredPuppies);
        
        paginatedPuppies.forEach(puppy => {
            const card = this.createPuppyCard(puppy);
            this.elements.puppyGrid.appendChild(card);
        });
    },

    /**
     * Render no results message
     */
    renderNoResults() {
        const noResults = document.createElement('div');
        noResults.className = 'col-12 text-center py-5';
        noResults.innerHTML = `
            <div class="card border-0 shadow-sm">
                <div class="card-body p-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h3>No Puppies Found</h3>
                    <p class="text-muted">Try adjusting your filters to see more results.</p>
                    <button class="btn btn-primary" onclick="location.reload()">Clear All Filters</button>
                </div>
            </div>
        `;
        this.elements.puppyGrid.appendChild(noResults);
    },

    /**
     * Create puppy card element
     * @param {Object} puppy - Puppy data
     * @returns {HTMLElement} Card element
     */
    createPuppyCard(puppy) {
        const card = document.createElement('div');
        card.className = 'col-lg-4 col-md-6 mb-4';
        card.innerHTML = `
            <div class="card puppy-card h-100 shadow-sm border-0">
                <div class="position-relative">
                    <img src="${puppy.image}" class="card-img-top" alt="${puppy.name}" 
                         style="height: 250px; object-fit: cover;" 
                         onerror="this.src='https://via.placeholder.com/300x250?text=Photo+Coming+Soon'">
                    <div class="position-absolute top-0 end-0 m-2">
                        <span class="badge bg-primary">${puppy.breed}</span>
                    </div>
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${puppy.name}</h5>
                    <p class="card-text text-muted">
                        <i class="fas fa-venus-mars me-1"></i>${puppy.gender} • 
                        <i class="fas fa-birthday-cake me-1"></i>${puppy.age}
                    </p>
                    <p class="card-text flex-grow-1">${puppy.description}</p>
                    <div class="mt-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <strong>Price:</strong>
                            <span class="h5 text-primary mb-0">${Utils.formatPrice(puppy.price)}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span><i class="fas fa-syringe me-1"></i>Vaccinations:</span>
                            <span class="text-success">${puppy.vaccinations}</span>
                        </div>
                    </div>
                    <a href="Orders.html?puppyId=${puppy.id}" class="btn btn-primary mt-auto">
                        <i class="fas fa-heart me-2"></i>Adopt Me
                    </a>
                </div>
            </div>
        `;
        return card;
    },

    /**
     * Render pagination controls
     */
    renderPagination() {
        PaginationManager.render(
            this.filteredPuppies, 
            this.elements.paginationContainer, 
            () => this.render()
        );
    }
};

// Order Page Module
const OrderPage = {
    selectedPuppy: null,
    elements: {},
    
    /**
     * Initialize the order page
     */
    init() {
        this.cacheElements();
        this.loadPuppyData();
        this.render();
        
        console.log('📋 Order page initialized');
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            orderContent: document.getElementById('order-content')
        };
    },

    /**
     * Load puppy data from URL parameter
     */
    loadPuppyData() {
        const puppyId = Utils.getUrlParam('puppyId');
        this.selectedPuppy = puppies.find(p => p.id === puppyId);
        
        if (!this.selectedPuppy) {
            console.warn('⚠️ No puppy found for ID:', puppyId);
        }
    },

    /**
     * Render order page content
     */
    render() {
        if (!this.elements.orderContent) return;
        
        if (this.selectedPuppy) {
            this.renderOrderForm();
        } else {
            this.renderNoPuppySelected();
        }
    },

    /**
     * Render "no puppy selected" state
     */
    renderNoPuppySelected() {
        this.elements.orderContent.innerHTML = `
            <div class="col-12 text-center">
                <div class="card p-5 shadow-sm border-0">
                    <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                    <h2>No Puppy Selected</h2>
                    <p class="text-muted">Please select a puppy from our available puppies page to begin the adoption process.</p>
                    <div class="mt-4">
                        <a href="Available.html" class="btn btn-primary btn-lg">
                            <i class="fas fa-search me-2"></i>View Available Puppies
                        </a>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render order form
     */
    renderOrderForm() {
        const puppy = this.selectedPuppy;
        
        this.elements.orderContent.innerHTML = `
            <div class="col-lg-7">
                <div class="card shadow-sm border-0 mb-4">
                    <div class="card-header bg-primary text-white">
                        <h3 class="mb-0"><i class="fas fa-user me-2"></i>Your Information</h3>
                    </div>
                    <div class="card-body p-4">
                        ${this.generateOrderForm(puppy)}
                    </div>
                </div>
            </div>
            <div class="col-lg-5">
                ${this.generateOrderSummary(puppy)}
            </div>
        `;
        
        this.setupFormInteractions();
    },

    /**
     * Generate order form HTML
     * @param {Object} puppy - Selected puppy
     * @returns {string} Form HTML
     */
    generateOrderForm(puppy) {
        return `
            <form id="adoptionForm" action="https://formspree.io/f/YOUR_FORM_ID" method="POST" novalidate>
                <input type="hidden" name="puppy_name" value="${puppy.name}">
                <input type="hidden" name="puppy_id" value="${puppy.id}">
                <input type="hidden" name="puppy_price" value="${puppy.price}">
                
                <div class="mb-4">
                    <h5 class="mb-3"><i class="fas fa-user me-2"></i>Personal Information</h5>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="firstName" class="form-label">First Name *</label>
                            <input type="text" class="form-control" name="firstName" id="firstName" required>
                            <div class="invalid-feedback">Please provide your first name.</div>
                        </div>
                        <div class="col-md-6">
                            <label for="lastName" class="form-label">Last Name *</label>
                            <input type="text" class="form-control" name="lastName" id="lastName" required>
                            <div class="invalid-feedback">Please provide your last name.</div>
                        </div>
                        <div class="col-md-6">
                            <label for="email" class="form-label">Email *</label>
                            <input type="email" class="form-control" name="email" id="email" required>
                            <div class="invalid-feedback">Please provide a valid email address.</div>
                        </div>
                        <div class="col-md-6">
                            <label for="phone" class="form-label">Phone Number *</label>
                            <input type="tel" class="form-control" name="phone" id="phone" required>
                            <div class="invalid-feedback">Please provide your phone number.</div>
                        </div>
                        <div class="col-12">
                            <label for="address" class="form-label">Street Address *</label>
                            <input type="text" class="form-control" name="address" id="address" required>
                            <div class="invalid-feedback">Please provide your address.</div>
                        </div>
                    </div>
                </div>

                <div class="mb-4">
                    <h5 class="mb-3"><i class="fas fa-shipping-fast me-2"></i>Adoption Details</h5>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="deliveryOption" class="form-label">Delivery Option *</label>
                            <select class="form-select" name="deliveryOption" id="deliveryOption" required>
                                <option value="">Select delivery option...</option>
                                <option value="pickup">Local Pickup (${Utils.formatPrice(0)})</option>
                                <option value="standard">Standard Shipping (${Utils.formatPrice(APP_CONFIG.shipping.standard)})</option>
                                <option value="handDelivery">Hand Delivery (${Utils.formatPrice(APP_CONFIG.shipping.handDelivery)})</option>
                            </select>
                            <div class="invalid-feedback">Please select a delivery option.</div>
                        </div>
                        <div class="col-12">
                            <label for="experience" class="form-label">Your Experience with Dogs *</label>
                            <textarea class="form-control" name="experience" id="experience" rows="3" 
                                      placeholder="Tell us about your experience with dogs..." required></textarea>
                            <div class="invalid-feedback">Please describe your experience with dogs.</div>
                        </div>
                    </div>
                </div>
                
                <div class="mb-4">
                    <h5 class="mb-3"><i class="fas fa-credit-card me-2"></i>Payment Method</h5>
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        You will receive payment instructions via email after submitting your application.
                    </div>
                </div>

                <div class="form-check mb-4">
                    <input class="form-check-input" type="checkbox" id="termsCheck" required>
                    <label class="form-check-label" for="termsCheck">
                        I agree to the <a href="#" data-bs-toggle="modal" data-bs-target="#termsModal">Terms and Conditions</a> *
                    </label>
                    <div class="invalid-feedback">You must agree to the terms and conditions.</div>
                </div>

                <div class="d-grid">
                    <button type="submit" class="btn btn-primary btn-lg">
                        <i class="fas fa-paper-plane me-2"></i>Submit Application
                    </button>
                </div>
            </form>
        `;
    },

    /**
     * Generate order summary HTML
     * @param {Object} puppy - Selected puppy
     * @returns {string} Summary HTML
     */
    generateOrderSummary(puppy) {
        return `
            <div class="card shadow-sm border-0 order-summary-card position-sticky" style="top: 20px;">
                <img src="${puppy.image}" class="card-img-top" alt="${puppy.name}" 
                     style="height: 250px; object-fit: cover;"
                     onerror="this.src='https://via.placeholder.com/400x250?text=Photo+Coming+Soon'">
                <div class="card-body p-4">
                    <h3 class="card-title">${puppy.name}</h3>
                    <p class="text-muted">
                        <i class="fas fa-dog me-1"></i>${puppy.breed} • 
                        <i class="fas fa-venus-mars me-1"></i>${puppy.gender} • 
                        <i class="fas fa-birthday-cake me-1"></i>${puppy.age}
                    </p>
                    <hr>
                    <div class="d-flex justify-content-between mb-2">
                        <span>Puppy Price:</span>
                        <span id="summaryPuppyPrice">${Utils.formatPrice(puppy.price)}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span>Shipping:</span>
                        <span id="summaryShipping">${Utils.formatPrice(0)}</span>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between fw-bold h5">
                        <span>Total:</span>
                        <span id="summaryTotal">${Utils.formatPrice(puppy.price)}</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Setup form interactions and calculations
     */
    setupFormInteractions() {
        const deliveryOption = document.getElementById('deliveryOption');
        const summaryShipping = document.getElementById('summaryShipping');
        const summaryTotal = document.getElementById('summaryTotal');
        const form = document.getElementById('adoptionForm');
        
        if (deliveryOption && summaryShipping && summaryTotal) {
            deliveryOption.addEventListener('change', () => {
                const shippingCost = this.getShippingCost(deliveryOption.value);
                const total = this.selectedPuppy.price + shippingCost;
                
                summaryShipping.textContent = Utils.formatPrice(shippingCost);
                summaryTotal.textContent = Utils.formatPrice(total);
            });
        }
        
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    },

    /**
     * Get shipping cost for delivery option
     * @param {string} option - Delivery option
     * @returns {number} Shipping cost
     */
    getShippingCost(option) {
        return APP_CONFIG.shipping[option] || 0;
    },

    /**
     * Handle form submission
     * @param {Event} e - Submit event
     */
    handleFormSubmit(e) {
        const form = e.target;
        
        if (!form.checkValidity()) {
            e.preventDefault();
            e.stopPropagation();
            form.classList.add('was-validated');
            
            // Focus on first invalid field
            const firstInvalid = form.querySelector(':invalid');
            if (firstInvalid) {
                firstInvalid.focus();
            }
            
            return;
        }
        
        // Form is valid, you can add additional processing here
        console.log('📨 Form submitted successfully');
    }
};

// Main Application Controller
const PawsTailsApp = {
    /**
     * Initialize the application based on current page
     */
    init() {
        const pagePath = window.location.pathname.split("/").pop();
        
        try {
            switch (pagePath) {
                case 'Available.html':
                    AvailablePage.init();
                    break;
                    
                case 'Orders.html':
                    OrderPage.init();
                    break;
                    
                default:
                    console.log('🏠 Landing page - no specific initialization needed');
            }
        } catch (error) {
            console.error('❌ Application initialization error:', error);
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    PawsTailsApp.init();
});

// Export for testing purposes (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PawsTailsApp, Utils, FilterManager, PaginationManager };
}