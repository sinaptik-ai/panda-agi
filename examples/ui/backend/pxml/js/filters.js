/**
 * Filter Management Module
 * Handles all filter-related functionality
 */

// Filter management functions
function toggleFilterDropdown(filterId) {
    const dropdown = document.getElementById(filterId + '_dropdown');
    const isHidden = dropdown.classList.contains('hidden');
    
    // Close all other dropdowns
    document.querySelectorAll('[id$="_dropdown"]').forEach(d => d.classList.add('hidden'));
    
    if (isHidden) {
        dropdown.classList.remove('hidden');
    }
}

function initializeListFilter(filterId, values, filterName, isLoading = false) {
    const optionsContainer = document.getElementById(filterId + '_options');
    const displayElement = document.getElementById(filterId + '_display');
    const buttonElement = document.getElementById(filterId + '_button');
    
    if (isLoading) {
        // Show skeleton loading in the existing structure
        if (displayElement) {
            displayElement.textContent = `Select ${filterName}`;
            displayElement.classList.add('animate-pulse');
        }
        if (buttonElement) {
            buttonElement.disabled = true;
            buttonElement.classList.add('opacity-50');
        }
        if (optionsContainer) {
            optionsContainer.innerHTML = `
                <div class="px-2 py-1 text-sm">
                    <div class="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div class="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div class="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div class="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                </div>
            `;
        }
        return;
    }
    
    // Reset loading state
    if (displayElement) {
        displayElement.classList.remove('animate-pulse');
    }
    if (buttonElement) {
        buttonElement.disabled = false;
        buttonElement.classList.remove('opacity-50');
    }
    
    const uniqueValues = [...new Set(values)].sort();
    
    if (optionsContainer) {
        optionsContainer.innerHTML = uniqueValues.map(value => {
            // Format value: capitalize first letter and replace underscores with spaces
            const formattedValue = value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
            return `
                <div class="filter-item px-2 py-1 text-sm rounded" 
                     onclick="if (event.target === this) toggleFilterOption('${filterId}', '${value}', '${filterName}')">
                    <input type="checkbox" id="${filterId}_${value}" class="mr-2" onchange="updateListFilter('${filterId}', '${filterName}')">
                    <label for="${filterId}_${value}" class="cursor-pointer">${formattedValue}</label>
                </div>
            `;
        }).join('');
    }
}

function initializeRangeFilter(filterId, values, filterName, isLoading = false) {
    const minInput = document.getElementById(filterId + '_min');
    const maxInput = document.getElementById(filterId + '_max');
    
    if (isLoading) {
        // Show skeleton loading in existing structure
        const formattedFilterName = filterName.charAt(0).toUpperCase() + filterName.slice(1).replace(/_/g, ' ');
        if (minInput) {
            minInput.placeholder = `Min ${formattedFilterName}`;
            minInput.disabled = true;
            minInput.classList.add('animate-pulse');
        }
        if (maxInput) {
            maxInput.placeholder = `Max ${formattedFilterName}`;
            maxInput.disabled = true;
            maxInput.classList.add('animate-pulse');
        }
        return;
    }
    
    // Reset loading state
    if (minInput) {
        minInput.classList.remove('animate-pulse');
    }
    if (maxInput) {
        maxInput.classList.remove('animate-pulse');
    }
    
    const numbers = values.filter(v => !isNaN(v) && v !== null && v !== '').map(Number);
    if (numbers.length === 0) return;
    
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    
    // Set placeholder text
    if (minInput) {
        minInput.placeholder = min.toString();
        minInput.min = min;
        minInput.max = max;
        minInput.disabled = false;
    }
    if (maxInput) {
        maxInput.placeholder = max.toString();
        maxInput.min = min;
        maxInput.max = max;
        maxInput.disabled = false;
    }
    
    // Update display info if elements exist
    const minValElement = document.getElementById(filterId + '_min_val');
    const maxValElement = document.getElementById(filterId + '_max_val');
    if (minValElement) minValElement.textContent = min;
    if (maxValElement) maxValElement.textContent = max;
}

function initializeDateRangeFilter(filterId, values, filterName, isLoading = false) {
    const startInput = document.getElementById(filterId + '_start');
    const endInput = document.getElementById(filterId + '_end');
    
    if (isLoading) {
        // Show skeleton loading in existing structure
        if (startInput) {
            startInput.placeholder = `Start ${filterName}`;
            startInput.disabled = true;
            startInput.classList.add('animate-pulse');
        }
        if (endInput) {
            endInput.placeholder = `End ${filterName}`;
            endInput.disabled = true;
            endInput.classList.add('animate-pulse');
        }
        return;
    }
    
    // Reset loading state
    if (startInput) {
        startInput.classList.remove('animate-pulse');
    }
    if (endInput) {
        endInput.classList.remove('animate-pulse');
    }
    
    const dates = values.filter(v => v && !isNaN(Date.parse(v))).map(v => new Date(v));
    if (dates.length === 0) return;
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const minDateStr = minDate.toISOString().split('T')[0];
    const maxDateStr = maxDate.toISOString().split('T')[0];
    
    // Set min/max constraints for both inputs
    if (startInput) {
        startInput.min = minDateStr;
        startInput.max = maxDateStr;
        startInput.disabled = false;
    }
    if (endInput) {
        endInput.min = minDateStr;
        endInput.max = maxDateStr;
        endInput.disabled = false;
    }
}

function toggleFilterOption(filterId, value, filterName) {
    const checkbox = document.getElementById(`${filterId}_${value}`);
    // Toggle the checkbox when clicking on the div (not the checkbox or label)
    checkbox.checked = !checkbox.checked;
    updateListFilter(filterId, filterName);
}

function updateListFilter(filterId, filterName) {
    const checkboxes = document.querySelectorAll(`[id^="${filterId}_"][type="checkbox"]`);
    const selectedValues = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.id.replace(filterId + '_', ''));
    
    if (selectedValues.length === 0) {
        delete window.currentFilters[filterName];
        document.getElementById(filterId + '_display').textContent = `Select ${filterName}`;
    } else {
        window.currentFilters[filterName] = selectedValues;
        const displayText = selectedValues.length === 1 
            ? selectedValues[0]
            : `${selectedValues.length} selected`;
        document.getElementById(filterId + '_display').textContent = displayText;
    }
    
    window.dashboard?.updateDashboardData() || updateDashboardData();
    // Close dropdown
    document.getElementById(filterId + '_dropdown').classList.add('hidden');
}

function validateAndUpdateRangeFilter(filterId, filterName, inputType) {
    const minInput = document.getElementById(filterId + '_min');
    const maxInput = document.getElementById(filterId + '_max');
    const currentInput = inputType === 'min' ? minInput : maxInput;
    
    // Validate the current input against data bounds
    if (currentInput.value) {
        const value = Number(currentInput.value);
        const dataMin = Number(currentInput.min);
        const dataMax = Number(currentInput.max);
        
        // Auto-correct values outside data bounds
        if (value < dataMin) {
            currentInput.value = dataMin;
        } else if (value > dataMax) {
            currentInput.value = dataMax;
        }
    }
    
    const minVal = minInput.value ? Number(minInput.value) : undefined;
    const maxVal = maxInput.value ? Number(maxInput.value) : undefined;
    
    // Ensure logical consistency (min <= max)
    if (minVal !== undefined && maxVal !== undefined) {
        if (minVal > maxVal) {
            if (inputType === 'min') {
                maxInput.value = minVal;
            } else {
                minInput.value = maxVal;
            }
        }
    }
    
    // Update the filter
    updateRangeFilter(filterId, filterName);
}

function updateRangeFilter(filterId, filterName) {
    const minInput = document.getElementById(filterId + '_min');
    const maxInput = document.getElementById(filterId + '_max');
    const minVal = minInput.value ? Number(minInput.value) : undefined;
    const maxVal = maxInput.value ? Number(maxInput.value) : undefined;
    
    if (minVal !== undefined || maxVal !== undefined) {
        window.currentFilters[filterName] = {
            min: minVal,
            max: maxVal
        };
    } else {
        delete window.currentFilters[filterName];
    }
    
    window.dashboard?.updateDashboardData() || updateDashboardData();
}

function validateAndUpdateDateRangeFilter(filterId, filterName, inputType) {
    const startInput = document.getElementById(filterId + '_start');
    const endInput = document.getElementById(filterId + '_end');
    const currentInput = inputType === 'start' ? startInput : endInput;
    
    if (!currentInput.value) {
        updateDateRangeFilter(filterId, filterName);
        return;
    }
    
    const value = currentInput.value;
    const dataMin = currentInput.min;
    const dataMax = currentInput.max;
    
    // Auto-correct values outside data bounds
    if (value < dataMin) {
        currentInput.value = dataMin;
    } else if (value > dataMax) {
        currentInput.value = dataMax;
    }
    
    // Ensure logical consistency (start <= end)
    const startDate = startInput.value;
    const endDate = endInput.value;
    
    if (startDate && endDate) {
        if (startDate > endDate) {
            if (inputType === 'start') {
                endInput.value = startDate;
            } else {
                startInput.value = endDate;
            }
        }
    }
    
    updateDateRangeFilter(filterId, filterName);
}

function updateDateRangeFilter(filterId, filterName) {
    const startInput = document.getElementById(filterId + '_start');
    const endInput = document.getElementById(filterId + '_end');
    const startDate = startInput.value;
    const endDate = endInput.value;
    
    if (startDate || endDate) {
        window.currentFilters[filterName] = {
            start: startDate,
            end: endDate
        };
    } else {
        delete window.currentFilters[filterName];
    }
    
    window.dashboard?.updateDashboardData() || updateDashboardData();
}

function clearFilterSelection(filterId, filterName) {
    const checkboxes = document.querySelectorAll(`[id^="${filterId}_"][type="checkbox"]`);
    checkboxes.forEach(cb => cb.checked = false);
    
    // Trigger the filter update to actually clear the data filter
    updateListFilter(filterId, filterName);
}

function filterDropdownOptions(filterId) {
    const searchInput = document.getElementById(filterId + '_search');
    const options = document.querySelectorAll(`#${filterId}_options .filter-item`);
    const searchTerm = searchInput.value.toLowerCase();
    
    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

function clearAllFilters() {
    window.currentFilters = {};
    
    // Clear all filter inputs
    document.querySelectorAll('[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('[type="number"]').forEach(input => input.value = '');
    document.querySelectorAll('[type="date"]').forEach(input => input.value = '');
    document.querySelectorAll('[id$="_display"]').forEach(display => {
        const filterName = display.id.replace('_display', '').replace('filter_', '').replace(/_/g, ' ');
        display.textContent = `Select ${filterName}`;
    });
    
    window.dashboard?.updateDashboardData() || updateDashboardData();
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.filter-component')) {
        document.querySelectorAll('[id$="_dropdown"]').forEach(d => d.classList.add('hidden'));
    }
});

// Backward compatibility function
function updateDashboardData() {
    if (typeof updateAllKPIs === 'function') updateAllKPIs();
    if (typeof updateAllCharts === 'function') updateAllCharts();
    console.log('Current filters:', window.currentFilters);
}
