/**
 * Dashboard Core Module
 * Handles initialization, data management, and coordination between components
 */

class DashboardCore {
  constructor() {
    this.config = null;
    this.currentFilters = {};
    this.registeredKPIs = {};
    this.registeredCharts = {};
    this.filterToColumnMap = {};
  }

  /**
   * Update dashboard metadata using data attributes for reliable targeting
   * @param {Object} metadata - Dashboard metadata object
   */
  updateMetadata(metadata) {    
    // Update document title (always update, even if empty)
    if (metadata.hasOwnProperty('name')) {
      const titleElement = document.querySelector('title');
      if (titleElement) {
        titleElement.textContent = metadata.name || '';
      }
    }
    
    // Update dashboard name using explicit data attribute (always update, even if empty)
    if (metadata.hasOwnProperty('name')) {
      const nameElement = document.querySelector('[data-dashboard-name]');
      if (nameElement) {
        nameElement.textContent = metadata.name || '';
      }
    }
    
    // Update dashboard description using explicit data attribute (always update, even if empty)
    if (metadata.hasOwnProperty('description')) {
      const descElement = document.querySelector('[data-dashboard-description]');
      if (descElement) {
        descElement.textContent = metadata.description || '';
      }
    }
    
    // Update dashboard icon using explicit data attribute
    if (metadata.hasOwnProperty('icon') && metadata.icon) {
      const iconElement = document.querySelector('[data-dashboard-icon]');
      if (iconElement) {
        // Remove all existing fa- classes
        const classesToRemove = Array.from(iconElement.classList).filter(cls => cls.startsWith('fa-'));
        classesToRemove.forEach(cls => iconElement.classList.remove(cls));
        // Add the new icon class
        iconElement.classList.add(metadata.icon);
      } else {
        console.warn('Dashboard icon element not found');
      }
    }
    
    // Update theme if applicable
    if (metadata.hasOwnProperty('theme') && metadata.theme) {
      document.body.className = document.body.className.replace(/theme-\w+/g, '');
      document.body.classList.add(`theme-${metadata.theme}`);
    }
    
    // Update filters if they exist in metadata
    if (metadata.hasOwnProperty('filters')) {
      if (this.config) {
        this.config.filters = metadata.filters || [];
        this.initializeFilters();
      }
    }
  }

  /**
   * Initialize the dashboard with configuration
   */
  initialize(config) {
    this.config = config;
    this.setupGlobalData();

    // Always show skeleton loading initially
    this.initializeComponentsWithSkeleton();
      
      // Initialize filter components with JavaScript rendering
      this.initializeFilters();

    // Set up a listener for when CSV data becomes available
    this.setupDataListener();
  }

  /**
   * Set up a listener for CSV data availability
   */
  setupDataListener() {
    // Check periodically if CSV data is loaded
    const checkData = () => {
      if (window.csvLoader && window.csvLoader.isLoaded()) {
        // Data is loaded, transition to actual data
        this.transitionToData();
        this.updateDashboardData();
        this.initializeFilters();
      } else {
        // Data not ready yet, check again in 100ms
        setTimeout(checkData, 100);
      }
    };

    // Start checking
    checkData();
  }

  initializeFilters() {
    // Initialize filters using JavaScript rendering (similar to KPIs and charts)
    const hasFilters = this.config && this.config.filters && this.config.filters.length > 0;
    
    // Find the existing filters container (rendered server-side)
    const filtersContainer = document.querySelector('section.bg-white.shadow-sm.border-b');
    
    if (hasFilters) {
      // Initialize dynamic filters system if not already done
      if (window.dynamicFilters && !window.dynamicFilters.initialized) {
        window.dynamicFilters.initialize(this.config);
      }
      
      if (!filtersContainer) {
        console.warn('No filters container found - filters may not be rendered');
        return;
      }
      
      // Show the filters container
      filtersContainer.style.display = 'block';
      
      // Get the grid container for filters
      const gridContainer = filtersContainer.querySelector('.grid');
      if (!gridContainer) {
        console.error('Could not find grid container for filters');
        return;
      }
      
      // Clear existing server-side rendered filters
      const existingFilters = gridContainer.querySelectorAll('.filter-component');
      existingFilters.forEach(filter => filter.remove());
      
      // Render all filters using JavaScript
      this.config.filters.forEach(filter => {
        const filterHTML = window.FilterRenderer.renderFilter(filter);
        gridContainer.insertAdjacentHTML('beforeend', filterHTML);
      });
    } else {
      // Hide the filters container if it exists
      if (filtersContainer) {
        filtersContainer.style.display = 'none';
      }
    }
  }

  /**
   * Setup global data and mappings
   */
  setupGlobalData() {
    // Set up global variables for backward compatibility
    // Use CSV loader data if available, otherwise use empty arrays
    window.dashboardData =
      window.csvLoader && window.csvLoader.isLoaded()
        ? window.csvLoader.getData()
        : [];
    window.currentFilters = this.currentFilters;

    // Make enableDataPreviewButton globally accessible
    window.enableDataPreviewButton = () => this.enableDataPreviewButton();

    // Don't enable immediately - wait for data to be loaded
    // The CSV loader will call this when data is ready

    // Add a periodic check as fallback (every 2 seconds for 10 seconds)
    let checkCount = 0;
    const maxChecks = 5;
    const checkInterval = setInterval(() => {
      checkCount++;
      this.enableDataPreviewButton();

      // Stop checking after max attempts or if button is enabled
      const dataButton = document.getElementById("dataPreviewButton");
      if (
        checkCount >= maxChecks ||
        (dataButton && !dataButton.style.pointerEvents.includes("none"))
      ) {
        clearInterval(checkInterval);
      }
    }, 2000);
    window.columnMapping =
      window.csvLoader && window.csvLoader.isLoaded()
        ? window.csvLoader.getColumnMapping()
        : {};
    window.registeredKPIs = this.registeredKPIs;
    window.registeredCharts = this.registeredCharts;
    window.filterToColumnMap = this.config.filter_to_column_mapping || {};
  }

  /**
   * Enable data preview button once CSV is loaded
   */
  enableDataPreviewButton() {
    const dataButton = document.getElementById("dataPreviewButton");
    if (!dataButton) {
      return;
    }

    // Check multiple ways to determine if data is loaded
    const hasCsvLoader = window.csvLoader && window.csvLoader.isLoaded();
    const hasCsvData = hasCsvLoader && window.csvLoader.getData().length > 0;
    const hasDashboardData =
      window.dashboardData && window.dashboardData.length > 0;
    const isDataLoaded = hasCsvData || hasDashboardData;

    if (isDataLoaded) {
      dataButton.className =
        "cursor-pointer hover:text-blue-600 hover:underline transition-colors";
      dataButton.style.pointerEvents = "auto";
      dataButton.title = "Click to preview data";
      dataButton.onclick = openDataModal;
    } else {
      dataButton.className =
        "text-gray-400 cursor-not-allowed transition-colors";
      dataButton.style.pointerEvents = "none";
      dataButton.title = "Loading data...";
      dataButton.onclick = null;
    }
  }

  /**
   * Initialize all dashboard components
   */
  initializeComponents() {
    // Initialize filters
    this.config.filters.forEach((filter) => {
      this.initializeFilter(filter);
    });

    // Initialize KPIs and Charts from components using data attributes
    this.config.components.forEach((component) => {
      this.initializeComponent(component);
    });

    // Re-render all components from their data attributes
    // This ensures components are self-contained and can be updated independently
    if (window.reRenderAllKPIComponents) {
      window.reRenderAllKPIComponents();
    }
    if (window.reRenderAllChartComponents) {
      window.reRenderAllChartComponents();
    }
  }

  /**
   * Initialize components with skeleton loading
   */
  initializeComponentsWithSkeleton() {
    // Initialize filters with skeleton loading
    this.config.filters.forEach((filter) => {
      this.initializeFilter(filter, true);
    });

    // Initialize KPIs and Charts from components using data attributes with skeleton loading
    this.config.components.forEach((component) => {
      this.initializeComponent(component, true);
    });
  }

  /**
   * Transition all components from skeleton to actual data
   */
  transitionToData() {
    // Transition filters
    this.config.filters.forEach((filter) => {
      this.initializeFilter(filter, false);
    });

    // Transition KPIs and Charts
    this.config.components.forEach((component) => {
      this.initializeComponent(component, false);
    });

    // Re-render all components from their data attributes
    if (window.reRenderAllKPIComponents) {
      window.reRenderAllKPIComponents();
    }
    if (window.reRenderAllChartComponents) {
      window.reRenderAllChartComponents();
    }
  }

  /**
   * Initialize a single component recursively
   */
  initializeComponent(component, isLoading = false) {
    if (component.type === "row") {
      // Initialize all columns in the row
      component.columns.forEach((column) => {
        column.content.forEach((content) => {
          this.initializeComponent(content, isLoading);
        });
      });
    } else if (component.type === "kpi") {
      // Initialize KPI component
      const containerId = component.id + "_container";
      if (window.renderKPIFromDataAttributes) {
        window.renderKPIFromDataAttributes(containerId, isLoading);
      }
    } else if (component.type === "chart") {
      // Initialize Chart component
      const containerId = component.id + "_container";
      if (window.renderChartFromDataAttributes) {
        window.renderChartFromDataAttributes(containerId, isLoading);
      }
    }
  }

  /**
   * Initialize a filter component
   */
  initializeFilter(filter, isLoading = false) {
    try {
      if (isLoading) {
        // Show skeleton loading
        if (filter.type === "list") {
          window.initializeListFilter(filter.id, [], filter.name, true);
        } else if (filter.type === "number_range") {
          window.initializeRangeFilter(filter.id, [], filter.name, true);
        } else if (filter.type === "date_range") {
          window.initializeDateRangeFilter(filter.id, [], filter.name, true);
        }
        return;
      }

      // Use dynamic filters system if available, otherwise fall back to eval
      let values = [];

      if (window.dynamicFilters && window.dynamicFilters.initialized) {
        // Use the dynamic filters system to compute values
        values = window.dynamicFilters.computeFilterValues(
          filter.values_formula
        );
      } else {
        // Fallback: try to eval the formula (for backward compatibility)
        try {
          values = eval(filter.values_formula);
        } catch (evalError) {
          console.warn(
            `Could not eval formula ${filter.values_formula}, using empty array`
          );
          values = [];
        }
      }

      if (filter.type === "list") {
        window.initializeListFilter(filter.id, values || [], filter.name);
      } else if (filter.type === "number_range") {
        window.initializeRangeFilter(filter.id, values || [], filter.name);
      } else if (filter.type === "date_range") {
        window.initializeDateRangeFilter(filter.id, values || [], filter.name);
      }
    } catch (error) {
      console.error(`Error initializing filter ${filter.id}:`, error);
      if (filter.type === "list") {
        window.initializeListFilter(filter.id, [], filter.name);
      } else if (filter.type === "number_range") {
        window.initializeRangeFilter(filter.id, [], filter.name);
      } else if (filter.type === "date_range") {
        window.initializeDateRangeFilter(filter.id, [], filter.name);
      }
    }
  }

  /**
   * Register and render a KPI (legacy method for backward compatibility)
   */
  registerKPI(kpiId, config) {
    // Render the KPI card HTML first, then register
    window.renderKPICard(kpiId, config);

    // Store in local registry
    this.registeredKPIs[kpiId] = {
      formula: config.value_formula,
      formatType: config.format_type,
      unit: config.unit,
    };
  }

  /**
   * Register and render a chart (legacy method for backward compatibility)
   */
  registerChart(chartId, config) {
    // Render the chart card HTML first, then register
    window.renderChartCard(chartId, config);
  }

  /**
   * Update all dashboard data when filters change
   */
  updateDashboardData() {
    this.updateAllKPIs();
    this.updateAllCharts();
  }

  /**
   * Update all KPIs
   */
  updateAllKPIs() {
    // Use window.registeredKPIs to ensure we're using the same object
    Object.keys(window.registeredKPIs || {}).forEach((kpiId) => {
      window.updateKPI(kpiId);
    });
  }

  /**
   * Update all charts
   */
  updateAllCharts() {
    Object.keys(window.registeredCharts || {}).forEach((chartId) => {
      window.updateChart(chartId);
    });
  }

  /**
   * Get filtered data based on current filters
   */
  getFilteredData() {
    return window.getFilteredData();
  }

  /**
   * Clear all filters
   */
  clearAllFilters() {
    window.clearAllFilters();
  }
}

// Handle messages from parent window for real-time updates
window.addEventListener("message", (event) => {
  if (event.data.type === "update-kpi-data-attributes") {
    const { kpiId, config } = event.data;

    // Update the KPI container with new data attributes
    const container = document.getElementById(kpiId);
    if (container) {
      // Update data attributes
      if (config.name !== undefined) {
        container.setAttribute("data-name", config.name);
      }
      if (config.fa_icon !== undefined) {
        container.setAttribute("data-fa-icon", config.fa_icon);
      }
      if (config.value_formula !== undefined) {
        container.setAttribute("data-value-formula", config.value_formula);
      }
      if (config.format_type !== undefined) {
        container.setAttribute("data-format-type", config.format_type);
      }
      if (config.unit !== undefined) {
        container.setAttribute("data-unit", config.unit);
      }

      // Trigger KPI update to recalculate with new formula
      if (window.updateKPI) {
        window.updateKPI(kpiId);
      }
    }
  } else if (event.data.type === "update-chart-data-attributes") {
    const { chartId, config } = event.data;

    // Update the chart container with new data attributes
    const container = document.getElementById(chartId);
    if (container) {
      // Update data attributes
      if (config.name !== undefined) {
        container.setAttribute("data-name", config.name);
      }
      if (config.type !== undefined) {
        container.setAttribute("data-type", config.type);
      }
      if (config.x_axis !== undefined) {
        container.setAttribute("data-x-axis", JSON.stringify(config.x_axis));
      }
      if (config.series_list !== undefined) {
        container.setAttribute("data-series-list", JSON.stringify(config.series_list));
      }

      // Trigger chart update to recalculate with new config
      if (window.updateChart) {
        window.updateChart(chartId);
      }
    }
  } else if (event.data.type === "chart-saved") {
    const { chartId } = event.data;
    
    // Refresh the chart data attributes from the current DOM state
    const container = document.getElementById(chartId + '_container');
    if (container) {
      // Trigger chart update to refresh the display
      if (window.updateChart) {
        window.updateChart(chartId);
      }
    }
  } else if (event.data.type === "kpi-saved") {
    const { kpiId } = event.data;
    
    // Refresh the KPI data attributes from the current DOM state
    const container = document.getElementById(kpiId + '_container');
    if (container) {
      // Trigger KPI update to refresh the display
      if (window.updateKPI) {
        window.updateKPI(kpiId);
      }
    }
  } else if (event.data.type === "update-container-id-after-save") {
    const { oldId, newId, componentType } = event.data;
    
    // Find and update the container ID and its click handler
    const oldContainer = document.getElementById(oldId + '_container');
    if (oldContainer) {
      // Simply update the container ID without cloning to preserve all state
      oldContainer.id = newId + '_container';
      
      // Remove existing click listeners by resetting onclick and event listeners
      const newContainer = oldContainer;
      newContainer.onclick = null;
      
      // Add the new click handler with the correct ID
      newContainer.style.cursor = "pointer";
      newContainer.addEventListener("click", (e) => {
        e.stopPropagation();
        if (componentType === "chart") {
          parent.postMessage({ type: "chart-edit", chartId: newId }, "*");
        } else if (componentType === "kpi") {
          parent.postMessage({ type: "kpi-edit", kpiId: newId }, "*");
        }
      });
      
      // Update registered components mapping if the ID changed
      if (oldId !== newId) {
        if (componentType === "chart" && window.registeredCharts) {
          // Move the chart registration from old ID to new ID
          if (window.registeredCharts[oldId]) {
            window.registeredCharts[newId] = window.registeredCharts[oldId];
            delete window.registeredCharts[oldId];
          }
        } else if (componentType === "kpi" && window.registeredKPIs) {
          // Move the KPI registration from old ID to new ID
          if (window.registeredKPIs[oldId]) {
            window.registeredKPIs[newId] = window.registeredKPIs[oldId];
            delete window.registeredKPIs[oldId];
          }
        }
      }
      
      // Trigger a re-render to ensure the component displays correctly with the new ID
      if (componentType === "chart" && window.updateChart) {
        window.updateChart(newId);
      } else if (componentType === "kpi" && window.updateKPI) {
        window.updateKPI(newId);
      }
    }
  } else if (event.data.type === "update-filter-data-attributes") {
    const { filterId, config } = event.data;
    
    // Update filter using the specific filter update system (similar to KPI/chart updates)
    try {
      // First, try to find the filter container
      let filterContainer = document.getElementById(filterId);
      
      // If not found, try variations
      if (!filterContainer) {
        // Try different ID patterns
        const variations = [
          filterId + '_container',
          filterId + '_button', 
          filterId + '_dropdown',
          filterId.replace('_dropdown', '_button'),
          filterId.replace('_dropdown', ''),
          filterId.replace('_button', '_dropdown'),
          filterId.replace('_button', '')
        ];
        
        for (const variation of variations) {
          filterContainer = document.getElementById(variation);
          if (filterContainer) {
            break;
          }
        }
      }

      if (filterContainer) {
        // Update the filter display text in the button (for name changes)
        const baseId = filterId.replace('_dropdown', '');
        
        // Update the display text in the button (e.g., "Select Branch" -> "Select Branchi")
        const displayElement = document.getElementById(baseId + '_display');
        if (displayElement) {
          displayElement.textContent = 'Select ' + config.name;
        }
        
        // Update the main filter label (the one with class "block text-sm font-medium text-gray-700 mb-2")
        // First, try to find the label within the filter component
        const filterComponent = document.querySelector(`#${baseId}`) || document.querySelector(`[id*="${baseId}"]`);
        let mainLabel = null;
        
        if (filterComponent) {
          mainLabel = filterComponent.querySelector('label.block.text-sm.font-medium.text-gray-700.mb-2');
          if (mainLabel) {
            mainLabel.textContent = config.name;
          }
        }
        
        // If not found in component, try to find by looking for labels with the old name
        if (!mainLabel) {
          const allLabels = document.querySelectorAll('label.block.text-sm.font-medium.text-gray-700.mb-2');
          for (const label of allLabels) {
            // Check if this label is associated with our filter by looking at nearby elements
            const parent = label.parentElement;
            if (parent && (parent.querySelector(`#${baseId}`) || parent.querySelector(`[id*="${baseId}"]`))) {
              label.textContent = config.name;
              mainLabel = label;
              break;
            }
          }
        }
        
        // Final fallback: find any label that looks like a filter name
        if (!mainLabel) {
          const allLabels = document.querySelectorAll('label');
          for (const label of allLabels) {
            if (label.textContent && (label.textContent.includes('Branch') || label.textContent.includes('Payment') || label.textContent.includes('Customer'))) {
              label.textContent = config.name;
              break;
            }
          }
        }
        
        // Update dropdown values if formula changed (for formula changes)
        if (config.values_formula) {
          try {
            // Try to compute new values from the formula
            let newValues = [];
            if (window.dynamicFilters && window.dynamicFilters.computeFilterValues) {
              newValues = window.dynamicFilters.computeFilterValues(config.values_formula);
            } else {
              // Fallback: try to evaluate the formula directly
              const formula = config.values_formula.replace(/^=/, '');
              if (formula.startsWith('unique(')) {
                // Extract column from formula like =unique(B2:B)
                const columnMatch = formula.match(/unique\(([A-Z]+)2:[A-Z]+\)/);
                if (columnMatch) {
                  const column = columnMatch[1];
                  if (window.dashboardData) {
                    newValues = [...new Set(window.dashboardData.map(row => row[column]))].filter(v => v !== null && v !== undefined);
                  }
                }
              }
            }
            
            
            // Update the dropdown options
            const optionsContainer = document.getElementById(baseId + '_options');
            if (optionsContainer && newValues.length > 0) {
              optionsContainer.innerHTML = '';
              
              newValues.forEach((value, index) => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'filter-item px-2 py-1 text-sm rounded';
                optionDiv.onclick = `if (event.target === this) toggleFilterOption('${baseId}', '${value}', '${config.name}')`;
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `${baseId}_${value}`;
                checkbox.className = 'mr-2';
                checkbox.onchange = `updateListFilter('${baseId}', '${config.name}')`;
                
                const label = document.createElement('label');
                label.htmlFor = `${baseId}_${value}`;
                label.className = 'cursor-pointer';
                label.textContent = value;
                
                optionDiv.appendChild(checkbox);
                optionDiv.appendChild(label);
                optionsContainer.appendChild(optionDiv);
              });
            }
          } catch (error) {
            console.warn('Error computing filter values:', error);
          }
        }
        
        // Update data attributes that might be used by the filter system
        filterContainer.setAttribute('data-filter-name', config.name);
        filterContainer.setAttribute('data-filter-type', config.type);
        filterContainer.setAttribute('data-values-formula', config.values_formula);
        
        // Try to reinitialize the filter with new values
        if (window.dashboard && window.dashboard.initializeFilter) {
          window.dashboard.initializeFilter(config, false);
        } else {
          // Fallback to direct filter initialization functions
          let values = [];
          
          if (window.dynamicFilters && window.dynamicFilters.initialized) {
            try {
              values = window.dynamicFilters.computeFilterValues(config.values_formula);
            } catch (error) {
              console.warn('Error computing filter values:', error);
              values = [];
            }
          }
          
          if (config.type === 'list') {
            window.initializeListFilter && window.initializeListFilter(filterId, values || [], config.name);
          } else if (config.type === 'number_range') {
            window.initializeRangeFilter && window.initializeRangeFilter(filterId, values || [], config.name);
          } else if (config.type === 'date_range') {
            window.initializeDateRangeFilter && window.initializeDateRangeFilter(filterId, values || [], config.name);
          }
        }
      } else {
        console.warn('❌ Filter container not found for:', filterId);
        const allElements = document.querySelectorAll('[id*="' + filterId + '"]');
        allElements.forEach(el => console.log('  -', el.id, el));

        // Also check for all filter-related elements
        const allFilterElements = document.querySelectorAll('[id*="filter"], [class*="filter"]');
        allFilterElements.forEach(el => console.log('  -', el.id, el.className, el));
      }
     } catch (error) {
       console.error('Error updating filter data attributes:', error);
     }
   } else if (event.data.type === "update-filter-config") {
     // New JavaScript-based filter update system
     const { filterId, config } = event.data;
     
     try {
       // Update the filter configuration using the new system
       if (window.updateFilterConfig) {
         window.updateFilterConfig(filterId, config);
       } else {
         console.warn('❌ updateFilterConfig function not available, falling back to old method');
         // Fallback to old method if new system not available
         this.updateFilterLegacy(filterId, config);
       }
     } catch (error) {
       console.error('Error updating filter:', error);
     }
   } else if (event.data.type === "update-dashboard-metadata") {
    const { dashboardMetadata } = event.data;
    
    // Use the robust updateMetadata method
    if (window.dashboard && window.dashboard.updateMetadata) {
      window.dashboard.updateMetadata(dashboardMetadata);
    } else {
      console.error('Dashboard instance not found or updateMetadata method not available');
    }
    
    // Update dashboard configuration if it exists
    if (window.dashboard && window.dashboard.config) {
      // Update filters in the dashboard config
      if (dashboardMetadata.filters) {
        window.dashboard.config.filters = dashboardMetadata.filters.map(filter => ({
          id: filter.id,
          name: filter.name,
          type: filter.type,
          values_formula: filter.values_formula
        }));
        
        // Update dynamic filters system with new configuration
        if (window.dynamicFilters) {
          window.dynamicFilters.filterConfigs = dashboardMetadata.filters;
          // Re-initialize if not already done
          if (!window.dynamicFilters.initialized) {
            window.dynamicFilters.initialize({ metadata: window.dashboard.config.metadata, filters: dashboardMetadata.filters });
          }
        }
        
        // Reinitialize all filters to handle additions, removals, and changes
        window.dashboard.initializeFilters();
      }
    }
    
    // Force a refresh of the dashboard data if the update flag is set
    if (event.data.forceUpdate && window.dashboard) {
      try {
        window.dashboard.updateDashboardData && window.dashboard.updateDashboardData();
      } catch (error) {
        console.warn('Error forcing dashboard update:', error);
      }
    }
  } else if (event.data.type === "dashboard-saved") {
    const { dashboardMetadata } = event.data;
    
    // Update the dashboard configuration with the saved metadata
    if (window.dashboard && window.dashboard.config) {
      // Update filters in the dashboard config
      if (dashboardMetadata.filters) {
        window.dashboard.config.filters = dashboardMetadata.filters.map(filter => ({
          id: filter.id,
          name: filter.name,
          type: filter.type,
          values_formula: filter.values_formula
        }));
        
        // Update dynamic filters system with saved configuration
        if (window.dynamicFilters) {
          window.dynamicFilters.filterConfigs = dashboardMetadata.filters;
        }
      }
    }
  } else if (event.data.type === "clear-selection") {
    // Clear all selection borders from charts and KPIs
    // The selection styling is applied by the parent component, so we need to remove those classes
    const highlightClasses = ['ring-2', 'ring-blue-400', 'ring-opacity-60', 'shadow-lg', 'scale-[1.02]', 'bg-blue-50/40', 'bg-green-50/40', 'selected-chart', 'selected-kpi', 'ring-1', 'ring-blue-300', 'ring-opacity-40', 'shadow-sm', 'scale-[1.01]', 'bg-blue-50/20', 'bg-green-50/20'];
    
    // Target all chart and KPI containers
    const chartContainers = document.querySelectorAll('div[id*="chart_"][id$="_container"]');
    const kpiContainers = document.querySelectorAll('div[id*="kpi_"][id$="_container"]');
    
    [...chartContainers, ...kpiContainers].forEach(container => {
      // Remove all highlighting classes
      container.classList.remove(...highlightClasses);
      
      // Reset any inline styles that might have been applied
      container.style.transition = '';
      container.style.borderRadius = '';
    }); 
  }
});

// JavaScript-based Filter Rendering System
window.FilterRenderer = {
  // Render a single filter component
  renderFilter(filterConfig) {
    const { id, name, type, values_formula } = filterConfig;
    const baseId = id.replace('_dropdown', '');
    
    // Create the filter component HTML
    const filterHTML = `
      <div class="filter-component" id="${baseId}">
        <label class="block text-sm font-medium text-gray-700 mb-2">${name}</label>
        ${this.renderFilterInput(baseId, name, type, values_formula)}
      </div>
    `;
    
    return filterHTML;
  },
  
  // Render the appropriate input based on filter type
  renderFilterInput(baseId, name, type, values_formula) {
    // Clear any existing range info that might be left over
    const existingRangeInfo = document.getElementById(baseId + '_range_info');
    if (existingRangeInfo) {
      existingRangeInfo.remove();
    }
    
    switch (type) {
      case 'list':
        return this.renderListFilter(baseId, name, values_formula);
      case 'number_range':
        return this.renderRangeFilter(baseId, name, values_formula);
      case 'date_range':
        return this.renderDateRangeFilter(baseId, name, values_formula);
      default:
        return this.renderListFilter(baseId, name, values_formula);
    }
  },
  
  // Render list filter (dropdown)
  renderListFilter(baseId, name, values_formula) {
    const values = this.computeFilterValues(values_formula);
    
    return `
      <div class="relative">
        <button 
          id="${baseId}_button" 
          onclick="toggleFilterDropdown('${baseId}')"
          class="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
        >
          <span id="${baseId}_display" class="text-gray-700">Select ${name}</span>
          <i class="fas fa-chevron-down text-gray-400"></i>
        </button>
        
        <div id="${baseId}_dropdown" class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg hidden">
          <div class="p-2 border-b">
            <input 
              type="text" 
              id="${baseId}_search" 
              placeholder="Search..." 
              class="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" 
              onkeyup="filterDropdownOptions('${baseId}')"
            >
          </div>
          <div class="filter-container p-1" id="${baseId}_options">
            ${this.renderFilterOptions(baseId, name, values)}
          </div>
          <div class="p-2 border-t bg-gray-50 flex justify-end">
            <button 
              onclick="clearFilterSelection('${baseId}', '${name}')"
              class="text-xs text-red-600 hover:text-red-800">Clear</button>
          </div>
        </div>
      </div>
    `;
  },
  
  // Render range filter
  renderRangeFilter(baseId, name, values_formula) {
    // Calculate min/max values from the formula
    const values = this.computeFilterValues(values_formula);
    let minVal = '';
    let maxVal = '';
    
    if (values.length > 0) {
      const numericValues = values.filter(v => !isNaN(parseFloat(v))).map(v => parseFloat(v));
      if (numericValues.length > 0) {
        minVal = Math.min(...numericValues);
        maxVal = Math.max(...numericValues);
      }
    }
    
    return `
      <div class="grid grid-cols-2 gap-2">
        <div>
          <input 
            type="number" 
            id="${baseId}_min" 
            placeholder="Min" 
            value="${minVal}"
            min="${minVal}"
            max="${maxVal}"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onblur="validateAndUpdateRangeFilter('${baseId}', '${name}', 'min')"
            onchange="validateAndUpdateRangeFilter('${baseId}', '${name}', 'min')"
          >
        </div>
        <div>
          <input 
            type="number" 
            id="${baseId}_max" 
            placeholder="Max" 
            value="${maxVal}"
            min="${minVal}"
            max="${maxVal}"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onblur="validateAndUpdateRangeFilter('${baseId}', '${name}', 'max')"
            onchange="validateAndUpdateRangeFilter('${baseId}', '${name}', 'max')"
          >
        </div>
      </div>
      <div class="mt-1 text-xs text-gray-500" id="${baseId}_range_info">
        Range: <span id="${baseId}_min_val">${minVal || '-'}</span> to <span id="${baseId}_max_val">${maxVal || '-'}</span>
      </div>
    `;
  },
  
  // Render date range filter
  renderDateRangeFilter(baseId, name, values_formula) {
    return `
      <div class="grid grid-cols-2 gap-2">
        <div>
          <input 
            type="date" 
            id="${baseId}_start" 
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onblur="validateAndUpdateDateRangeFilter('${baseId}', '${name}', 'start')"
            onchange="validateAndUpdateDateRangeFilter('${baseId}', '${name}', 'start')"
          >
        </div>
        <div>
          <input 
            type="date" 
            id="${baseId}_end" 
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onblur="validateAndUpdateDateRangeFilter('${baseId}', '${name}', 'end')"
            onchange="validateAndUpdateDateRangeFilter('${baseId}', '${name}', 'end')"
          >
        </div>
      </div>
    `;
  },
  
  // Render filter options for list filters
  renderFilterOptions(baseId, name, values) {
    return values.map(value => `
      <div class="filter-item px-2 py-1 text-sm rounded" onclick="if (event.target === this) toggleFilterOption('${baseId}', '${value}', '${name}')">
        <input type="checkbox" id="${baseId}_${value}" class="mr-2" onchange="updateListFilter('${baseId}', '${name}')">
        <label for="${baseId}_${value}" class="cursor-pointer">${value}</label>
      </div>
    `).join('');
  },
  
  // Compute filter values from formula
  computeFilterValues(formula) {
    if (!formula) return [];
    
    try {
      if (window.dynamicFilters && window.dynamicFilters.initialized && window.dynamicFilters.computeFilterValues) {
        return window.dynamicFilters.computeFilterValues(formula);
      } else {
        // Fallback: try to evaluate the formula directly
        const cleanFormula = formula.replace(/^=/, '');
        if (cleanFormula.startsWith('unique(')) {
          // Extract column from formula like =unique(B2:B) or =unique(column_name)
          const columnMatch = cleanFormula.match(/unique\(([A-Z]+)2:[A-Z]+\)/) || 
                             cleanFormula.match(/unique\(([a-zA-Z_][a-zA-Z0-9_]*)\)/);
          if (columnMatch) {
            const column = columnMatch[1];
            if (window.dashboardData) {
              return [...new Set(window.dashboardData.map(row => row[column]))].filter(v => v !== null && v !== undefined);
            }
          }
        } else if (cleanFormula.startsWith('min(') || cleanFormula.startsWith('max(')) {
          // Handle min/max formulas for range filters
          const columnMatch = cleanFormula.match(/(min|max)\(([A-Z]+)2:[A-Z]+\)/) ||
                             cleanFormula.match(/(min|max)\(([a-zA-Z_][a-zA-Z0-9_]*)\)/);
          if (columnMatch) {
            const column = columnMatch[2];
            if (window.dashboardData) {
              const values = window.dashboardData.map(row => row[column]).filter(v => v !== null && v !== undefined && !isNaN(parseFloat(v)));
              if (values.length > 0) {
                const numericValues = values.map(v => parseFloat(v));
                return [columnMatch[1] === 'min' ? Math.min(...numericValues) : Math.max(...numericValues)];
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error computing filter values:', error);
    }
    
    return [];
  },
  
  // Update an existing filter
  updateFilter(filterId, config) {
    const baseId = filterId.replace('_dropdown', '');
    const filterElement = document.getElementById(baseId);
    
    if (filterElement) {
      // Update the label
      const label = filterElement.querySelector('label.block.text-sm.font-medium.text-gray-700.mb-2');
      if (label) {
        label.textContent = config.name;
      }
      
      // Update the display text (only for list filters)
      const display = document.getElementById(baseId + '_display');
      if (display) {
        display.textContent = `Select ${config.name}`;
      }
      
      // Update the input based on type - completely replace the input container
      const inputContainer = filterElement.querySelector('.relative, .grid');
      if (inputContainer) {
        inputContainer.outerHTML = this.renderFilterInput(baseId, config.name, config.type, config.values_formula);
      }
      
      // For range filters, calculate and update min/max values
      if (config.type === 'number_range' && config.values_formula) {
        this.updateRangeFilterValues(baseId, config.values_formula);
      }
    } else {
      console.warn('❌ Filter element not found for update:', baseId);
    }
  },
  
  // Update range filter min/max values
  updateRangeFilterValues(baseId, values_formula) {
    try {
      // Calculate min and max values from the formula
      const values = this.computeFilterValues(values_formula);
      if (values.length > 0) {
        const numericValues = values.filter(v => !isNaN(parseFloat(v))).map(v => parseFloat(v));
        if (numericValues.length > 0) {
          const minVal = Math.min(...numericValues);
          const maxVal = Math.max(...numericValues);
          
          // Update the input values
          const minInput = document.getElementById(baseId + '_min');
          const maxInput = document.getElementById(baseId + '_max');
          
          if (minInput) {
            minInput.value = minVal;
            minInput.min = minVal;
            minInput.max = maxVal;
          }
          if (maxInput) {
            maxInput.value = maxVal;
            maxInput.min = minVal;
            maxInput.max = maxVal;
          }
          
          // Update the range info display
          const minValSpan = document.getElementById(baseId + '_min_val');
          const maxValSpan = document.getElementById(baseId + '_max_val');
          
          if (minValSpan) minValSpan.textContent = minVal;
          if (maxValSpan) maxValSpan.textContent = maxVal;
        }
      }
    } catch (error) {
      console.warn('Error updating range filter values:', error);
    }
  }
};

// Global filter management functions
window.updateFilterConfig = function(filterId, config) {
  window.FilterRenderer.updateFilter(filterId, config);
};

window.reRenderAllFilterComponents = function() {
  if (window.dashboard) {
    window.dashboard.initializeFilters();
  }
};

// Create global dashboard instance
window.dashboard = new DashboardCore();
