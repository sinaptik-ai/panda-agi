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
    console.log('Updating dashboard metadata:', metadata);
    
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
        console.log('Updated dashboard name to:', metadata.name || '(empty)');
      } else {
        console.warn('Dashboard name element not found');
      }
    }
    
    // Update dashboard description using explicit data attribute (always update, even if empty)
    if (metadata.hasOwnProperty('description')) {
      const descElement = document.querySelector('[data-dashboard-description]');
      if (descElement) {
        descElement.textContent = metadata.description || '';
        console.log('Updated dashboard description to:', metadata.description || '(empty)');
      } else {
        console.warn('Dashboard description element not found');
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
        console.log('Updated dashboard icon to:', metadata.icon);
      } else {
        console.warn('Dashboard icon element not found');
      }
    }
    
    // Update theme if applicable
    if (metadata.hasOwnProperty('theme') && metadata.theme) {
      document.body.className = document.body.className.replace(/theme-\w+/g, '');
      document.body.classList.add(`theme-${metadata.theme}`);
      console.log('Updated dashboard theme to:', metadata.theme);
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
      } else {
        // Data not ready yet, check again in 100ms
        setTimeout(checkData, 100);
      }
    };

    // Start checking
    checkData();
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
        
        // Reinitialize filters with new configuration
        dashboardMetadata.filters.forEach(filter => {
          try {
            window.dashboard.initializeFilter(filter, false);
          } catch (error) {
            console.warn('Error reinitializing filter:', filter.id, error);
            // Fallback to individual filter initialization functions
            try {
              if (filter.type === 'list') {
                window.initializeListFilter && window.initializeListFilter(filter.id, [], filter.name);
              } else if (filter.type === 'number_range') {
                window.initializeRangeFilter && window.initializeRangeFilter(filter.id, [], filter.name);
              } else if (filter.type === 'date_range') {
                window.initializeDateRangeFilter && window.initializeDateRangeFilter(filter.id, [], filter.name);
              }
            } catch (fallbackError) {
              console.warn('Error with fallback filter initialization:', filter.id, fallbackError);
            }
          }
        });
        
        // Also try to update any existing filter containers in the DOM
        dashboardMetadata.filters.forEach(filter => {
          const filterContainer = document.getElementById(filter.id);
          if (filterContainer) {
            // Update the filter label/name if it exists
            const label = filterContainer.querySelector('label, .filter-label, .filter-name');
            if (label) {
              label.textContent = filter.name;
            }
            
            // Update data attributes that might be used by the filter system
            filterContainer.setAttribute('data-filter-name', filter.name);
            filterContainer.setAttribute('data-filter-type', filter.type);
            filterContainer.setAttribute('data-values-formula', filter.values_formula);
          }
        });
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
    
    console.log('Dashboard metadata updated:', dashboardMetadata);
  } else if (event.data.type === "dashboard-saved") {
    const { dashboardMetadata } = event.data;
    console.log('Dashboard saved:', dashboardMetadata);
    
    // Show save success notification or update UI as needed
    // This could trigger any post-save updates to the dashboard
  }
});

// Create global dashboard instance
window.dashboard = new DashboardCore();
