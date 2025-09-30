/**
 * KPI Management Module
 * Handles KPI registration, rendering, updates, and formatting
 */

// KPI card HTML template
function createKPICardHTML(kpiId, config, isLoading = false) {
  const kpi_name = (config.name || "").charAt(0).toUpperCase() + (config.name || "").slice(1).replace(/_/g, ' ');
  const fa_icon = config.fa_icon;
  const unit = config.unit || "";

  return `
        <div class="bg-white rounded-lg shadow-sm border p-6 kpi-component h-full flex flex-col justify-center">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-12 h-12 ${isLoading ? 'bg-gray-200 rounded-lg flex items-center justify-center' : 'bg-blue-100 rounded-lg flex items-center justify-center'}">
                        <i class="fas ${fa_icon} ${isLoading ? 'text-gray-400' : 'text-blue-600'} text-xl kpi-icon" data-kpi-id="${kpiId}"></i>
                    </div>
                </div>
                <div class="ml-4 flex-1">
                    <h3 class="text-sm font-medium text-gray-900 mb-1 kpi-name" data-kpi-id="${kpiId}">${kpi_name}</h3>
                    <div class="flex items-center justify-between">
                        <div class="flex items-baseline">
                            ${isLoading 
                              ? `<div class="h-8 bg-gray-200 rounded animate-pulse w-24"></div>`
                              : `<span id="${kpiId}_value" class="text-2xl font-bold text-gray-900 kpi-value">Loading...</span>`
                            }
                            ${isLoading 
                              ? (unit ? '<div class="ml-1 h-4 bg-gray-200 rounded animate-pulse w-8"></div>' : '')
                              : (unit ? `<span class="ml-1 text-sm text-gray-500 kpi-unit" data-kpi-id="${kpiId}">${unit}</span>` : '')
                            }
                        </div>
                    </div>
                    ${isLoading 
                      ? '<div class="h-3 bg-gray-200 rounded animate-pulse mt-1 w-1/2"></div>'
                      : `<div id="${kpiId}_change" class="text-xs text-gray-500 mt-1"><!-- Change indicator will be added here --></div>`
                    }
                </div>
            </div>
        </div>`;
}

// KPI Management Functions
function renderKPICard(kpiId, config, isLoading = false) {
  const container = document.getElementById(kpiId + "_container");
  if (!container) {
    console.error("KPI container not found:", kpiId + "_container");
    return;
  }

  // Render the KPI card HTML (with or without skeleton loading)
  container.innerHTML = createKPICardHTML(kpiId, config, isLoading);

  // Register the KPI with data params for reuse
  registerKPI(
    kpiId,
    config.value_formula,
    config.format_type,
    config.unit,
    config.data_params
  );
}

/**
 * Render KPI from individual data attributes - this makes each component self-contained
 */
function renderKPIFromDataAttributes(containerId, isLoading = false) {
  const container = document.getElementById(containerId);
  if (!container) return false;

  const config = buildConfigFromDataAttributes(container, containerId);
  if (!config) return false;

  try {
    renderKPICard(config.id, config, isLoading);
    if (!isLoading) {
      updateKPI(config.id);
    }
    return true;
  } catch (error) {
    console.error(`Error rendering KPI ${containerId}:`, error);
    return false;
  }
}

/**
 * Build KPI config object from individual data attributes
 * Now completely self-contained with just the essential properties
 */
function buildConfigFromDataAttributes(container, containerId = null) {
  // Helper function to decode HTML entities from attributes
  function decodeHtmlEntities(str) {
    if (!str) return str;
    return str
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  }

  const config = {
    id: decodeHtmlEntities(container.getAttribute("data-id")) || "",
    name: decodeHtmlEntities(container.getAttribute("data-name")) || "",
    fa_icon:
      decodeHtmlEntities(container.getAttribute("data-fa-icon")) ||
      "fa-chart-line",
    value_formula:
      decodeHtmlEntities(container.getAttribute("data-value-formula")) || "",
    format_type:
      decodeHtmlEntities(container.getAttribute("data-format-type")) ||
      "number",
    unit: decodeHtmlEntities(container.getAttribute("data-unit")) || null,
  };

  // Validate that we have the minimum required data
  if (!config.id) {
    console.error("Missing required KPI data attributes (id)");
    return null;
  }

  // Validate formula and fix broken ones
  if (!config.value_formula || config.value_formula.trim() === "") {
    config.value_formula = "0";
  } else {
    // Check for incomplete formulas and fix them once
    const formula = config.value_formula.trim();
    if (
      (formula.endsWith("(") ||
        formula.endsWith('("') ||
        formula.endsWith("('") ||
        (formula.includes("getColumnData") && !formula.includes("))"))) &&
      !container.hasAttribute("data-broken-formula")
    ) {
      // Store broken formula and fix it
      container.setAttribute("data-broken-formula", formula);
      window.kpiFixingInProgress = true;
      container.setAttribute("data-value-formula", "0");
      setTimeout(() => {
        window.kpiFixingInProgress = false;
      }, 50);
      config.value_formula = "0";
    }
  }

  return config;
}

/**
 * Re-render all KPI components from their data attributes
 * This automatically re-renders any KPI that has changed
 */
function reRenderAllKPIComponents() {
  const kpiContainers = document.querySelectorAll(
    '[data-component-type="kpi"]'
  );
  kpiContainers.forEach((container) => {
    renderKPIFromDataAttributes(container.id);
  });
}

/**
 * Initialize KPI MutationObserver to watch for data attribute changes
 * This automatically recreates components when data-* attributes change
 */
function initializeKPIMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    if (window.kpiFixingInProgress) return;

    const containersToUpdate = new Set();

    mutations.forEach((mutation) => {
      if (mutation.type === "attributes") {
        const target = mutation.target;
        const attributeName = mutation.attributeName;

        if (
          target.getAttribute("data-component-type") === "kpi" &&
          isKPIDataAttribute(attributeName)
        ) {
          const oldValue = mutation.oldValue || '';
          const newValue = target.getAttribute(attributeName) || '';
          
          // Always trigger update if the value actually changed
          if (oldValue !== newValue) {
            containersToUpdate.add(target.id);
          }
        }
      }
    });

    if (containersToUpdate.size > 0) {
      console.log('🔄 Updating KPI containers:', Array.from(containersToUpdate));
      setTimeout(() => {
        containersToUpdate.forEach((containerId) => {
          renderKPIFromDataAttributes(containerId);
        });
      }, 10);
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeOldValue: true, // Enable oldValue tracking
    attributeFilter: [
      "data-id",
      "data-name",
      "data-fa-icon",
      "data-value-formula",
      "data-format-type",
      "data-unit",
    ],
    subtree: true,
  });

  window.kpiMutationObserver = observer;
  return observer;
}

/**
 * Check if an attribute name is a KPI data attribute we care about
 */
function isKPIDataAttribute(attributeName) {
  const kpiDataAttributes = [
    "data-id",
    "data-name",
    "data-fa-icon",
    "data-value-formula",
    "data-format-type",
    "data-unit",
  ];
  return kpiDataAttributes.includes(attributeName);
}

// Initialize registeredKPIs if it doesn't exist
if (!window.registeredKPIs) {
  window.registeredKPIs = {};
}

function registerKPI(kpiId, formula, formatType, unit, dataParams = null) {
  window.registeredKPIs[kpiId] = {
    formula: formula,
    formatType: formatType,
    unit: unit,
    dataParams: dataParams, // Store all the data params for reuse
  };
}

function displayKPIError(valueElement, changeElement, error, kpi) {
  // Create a more informative error message
  let errorMessage = "Formula Error";
  let errorDetails = error.message || "Unknown error";
  
  // Categorize error types for better user experience
  if (error.message.includes("Formula is empty")) {
    errorMessage = "Missing Formula";
    errorDetails = "No formula has been defined for this KPI";
  } else if (error.message.includes("returned no valid results")) {
    errorMessage = "No Data";
    errorDetails = "Formula returned no valid results";
  } else if (error.message.includes("returned null/undefined")) {
    errorMessage = "Invalid Data";
    errorDetails = "Formula returned null or undefined value";
  } else if (error.message.includes("not available")) {
    errorMessage = "System Error";
    errorDetails = "Required system components not available";
  } else if (error.message.includes("invalid result")) {
    errorMessage = "Invalid Result";
    errorDetails = "Formula produced an invalid result";
  }
  
  // Display error in value element
  valueElement.innerHTML = `
    <div class="text-center">
      <div class="text-gray-400 text-sm">—</div>
    </div>
  `;
  
  // Display error icon in change element
  if (changeElement) {
    changeElement.innerHTML = `
      <div class="flex items-center justify-center text-gray-400">
        <i class="fas fa-exclamation-circle text-xs"></i>
      </div>
    `;
  }
}

function updateKPI(kpiId) {
  const kpi = window.registeredKPIs[kpiId];
  if (!kpi) return;

  const valueElement = document.getElementById(kpiId + "_value");
  const changeElement = document.getElementById(kpiId + "_change");
  const containerElement = document.getElementById(kpiId + "_container");

  if (!valueElement) return;

  if (containerElement) {
    containerElement.classList.add("kpi-updating");
  }

  try {
    if (!kpi.formula || kpi.formula.trim() === "") {
      throw new Error("Formula is empty");
    }

    let rawValue;
    
    // Check if this is a raw Excel formula that needs to be compiled
    if (kpi.formula.startsWith('=')) {
      // Use dynamic filters system to compile and evaluate the formula
      if (window.dynamicFilters && window.dynamicFilters.initialized) {
        const computedValues = window.dynamicFilters.computeFilterValues(kpi.formula);
        
        // Check if the computation returned valid results
        if (!computedValues || computedValues.length === 0) {
          throw new Error("Formula returned no valid results");
        }
        
        // For KPI, we typically want a single value, so take the first one
        rawValue = computedValues[0];
        
        // If the first value is null/undefined, it's invalid
        if (rawValue === null || rawValue === undefined) {
          throw new Error("Formula returned null/undefined value");
        }
      } else {
        throw new Error("Dynamic filters not available for formula compilation");
      }
    } else {
      // Use direct evaluation for already compiled formulas
      rawValue = eval(kpi.formula);
      
      // Check if eval returned a valid result
      if (rawValue === null || rawValue === undefined || isNaN(rawValue)) {
        throw new Error("Formula evaluation returned invalid result");
      }
    }
    
    const formattedValue = formatKPIValue(rawValue, kpi.formatType);
    
    // Check if formatting produced a valid result
    if (!formattedValue || formattedValue === "NaN" || formattedValue === "Invalid") {
      throw new Error("Formula produced invalid formatted result");
    }

    valueElement.textContent = formattedValue;

    if (changeElement) {
      changeElement.innerHTML = "";
    }
  } catch (error) {
    console.warn(`KPI ${kpiId} formula evaluation failed:`, error);
    displayKPIError(valueElement, changeElement, error, kpi);
  }

  setTimeout(() => {
    if (containerElement) {
      containerElement.classList.remove("kpi-updating");
    }
  }, 300);
}

function updateAllKPIs() {
  Object.keys(window.registeredKPIs).forEach((kpiId) => {
    updateKPI(kpiId);
  });
}

/**
 * Transition KPI from skeleton loading to actual data
 */
function transitionKPIToData(kpiId) {
  const container = document.getElementById(kpiId + "_container");
  if (!container) return;

  const config = buildConfigFromDataAttributes(container, kpiId);
  if (!config) return;

  // Re-render with actual data (no skeleton)
  renderKPICard(kpiId, config, false);
  updateKPI(kpiId);
}

/**
 * Transition all KPIs from skeleton loading to actual data
 */
function transitionAllKPIsToData() {
  Object.keys(window.registeredKPIs).forEach((kpiId) => {
    transitionKPIToData(kpiId);
  });
}

function formatCurrency(value, currencyCode) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatKPIValue(value, formatType) {
  if (value === null || value === undefined) {
    return "--";
  }
  
  // For text format type, don't check isNaN as strings are expected
  if (formatType !== "text" && isNaN(value)) {
    return "--";
  }

  // Handle currency formats generically
  if (formatType.startsWith("currency")) {
    const currencyCode = formatType === "currency" ? "USD" : formatType.split(":")[1]?.toUpperCase();
    return formatCurrency(value, currencyCode || "USD");
  }

  switch (formatType) {
    case "text":
      return value.toString();
    case "number":
      return new Intl.NumberFormat("en-US").format(Math.round(value));
    case "percentage":
      return new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value / 100);
    case "decimal":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "CAD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:aud":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "AUD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:cad":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "CAD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:chf":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "CHF",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:cny":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "CNY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:inr":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:brl":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:mxn":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:krw":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "KRW",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:sgd":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "SGD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:hkd":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "HKD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:nok":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "NOK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:sek":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "SEK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:dkk":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "DKK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:pln":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "PLN",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:czk":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "CZK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:huf":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "HUF",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:try":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "TRY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:rub":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "RUB",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:zar":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "ZAR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:ils":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "ILS",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:thb":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "THB",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:php":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:idr":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:myr":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "MYR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:vnd":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "VND",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "currency:nzd":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "NZD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "percentage":
      return new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value / 100);
    case "decimal":
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value);
    default:
      return value.toString();
  }
}

// KPI editing functions (hooks for future implementation)
function editKPI(kpiId) {
  const kpi = window.registeredKPIs[kpiId];
  if (!kpi) return;

  // TODO: Implement KPI editing modal/interface
  // This is where you'll add the dynamic editing functionality
  alert(`KPI editing will be implemented here for: ${kpiId}`);
}

function updateKPIProperty(kpiId, property, value) {
  const kpi = window.registeredKPIs[kpiId];
  if (!kpi) return;

  // Update KPI config
  kpi[property] = value;

  // Update UI element if needed
  if (property === "name") {
    const nameElement = document.querySelector(
      `.kpi-name[data-kpi-id="${kpiId}"]`
    );
    if (nameElement) {
      nameElement.textContent = value;
    }
  } else if (property === "fa_icon") {
    const iconElement = document.querySelector(
      `.kpi-icon[data-kpi-id="${kpiId}"]`
    );
    if (iconElement) {
      iconElement.className = `fas ${value} text-blue-600 text-xl kpi-icon`;
      iconElement.setAttribute("data-kpi-id", kpiId);
    }
  } else if (property === "unit") {
    const unitElement = document.querySelector(
      `.kpi-unit[data-kpi-id="${kpiId}"]`
    );
    if (unitElement) {
      unitElement.textContent = value;
    } else if (value) {
      // Add unit if it didn't exist before
      const valueElement = document.getElementById(kpiId + "_value");
      if (valueElement && valueElement.parentNode) {
        const unitSpan = document.createElement("span");
        unitSpan.className = "ml-1 text-sm text-gray-500 kpi-unit";
        unitSpan.setAttribute("data-kpi-id", kpiId);
        unitSpan.textContent = value;
        valueElement.parentNode.appendChild(unitSpan);
      }
    }
  }

  // Re-calculate KPI with new settings
  if (property === "formula") {
    updateKPI(kpiId);
  }
}

/**
 * Update KPI individual data attributes
 * MutationObserver will automatically handle the re-render
 */
function updateKPIDataAndRender(containerId, newConfig) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error("KPI container not found:", containerId);
    return false;
  }

  // Update individual data attributes - clean and simple
  container.setAttribute("data-id", newConfig.id || "");
  container.setAttribute("data-name", newConfig.name || "");
  container.setAttribute("data-fa-icon", newConfig.fa_icon || "fa-chart-line");
  container.setAttribute("data-value-formula", newConfig.value_formula || "");
  container.setAttribute("data-format-type", newConfig.format_type || "number");
  container.setAttribute("data-unit", newConfig.unit || "");

  // MutationObserver will automatically handle the re-render
  return true;
}

/**
 * Get KPI config from individual data attributes
 */
function getKPIConfigFromDataAttributes(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  return buildConfigFromDataAttributes(container, containerId);
}

/**
 * Available KPI properties that can be updated
 * Clean and simple - just the essential properties
 */
const KPI_PROPERTIES = {
  name: {
    dataAttribute: "data-name",
    validate: (value) => typeof value === "string",
  },
  fa_icon: {
    dataAttribute: "data-fa-icon",
    validate: (value) => typeof value === "string" && value.startsWith("fa-"),
  },
  format_type: {
    dataAttribute: "data-format-type",
    validate: (value) =>
      ["number", "currency", "currency:usd", "percentage", "decimal"].includes(
        value
      ),
  },
  unit: {
    dataAttribute: "data-unit",
    validate: (value) =>
      value === null || value === undefined || typeof value === "string",
  },
  value_formula: {
    dataAttribute: "data-value-formula",
    validate: (value) => typeof value === "string",
  },
};

/**
 * Update a specific KPI property with validation and automatic rebuilding
 * This now works directly with data attributes - MutationObserver handles the rebuilding
 */
function updateKPIProperty(containerId, property, value) {
  const container = document.getElementById(containerId);
  if (!container) return false;

  const propertyDef = KPI_PROPERTIES[property];
  if (!propertyDef) return false;

  // Validate the new value
  if (propertyDef.validate && !propertyDef.validate(value)) {
    return false;
  }

  // Check if value actually changed
  const currentValue = container.getAttribute(propertyDef.dataAttribute);
  if (currentValue === value) {
    return true; // No change needed
  }

  // Update the data attribute - MutationObserver will handle the rebuild automatically
  container.setAttribute(propertyDef.dataAttribute, value || "");

  // Trigger change event for external listeners
  triggerKPIPropertyChange(containerId, property, currentValue, value);

  return true;
}

/**
 * Update multiple KPI properties at once
 */
function updateKPIProperties(containerId, properties) {
  const config = getKPIConfigFromDataAttributes(containerId);
  if (!config) {
    console.error("Cannot find KPI config for container:", containerId);
    return false;
  }

  let updatedConfig = { ...config };

  // Update each property
  for (const [property, value] of Object.entries(properties)) {
    const propertyDef = KPI_PROPERTIES[property];
    if (!propertyDef) {
      console.error("Unknown KPI property:", property);
      continue;
    }

    updatedConfig = updateNestedProperty(
      updatedConfig,
      propertyDef.path,
      value
    );
  }

  // Rebuild the component
  const success = updateKPIDataAndRender(containerId, updatedConfig);

  if (success) {
    console.log(
      `Successfully updated multiple properties and rebuilt KPI ${containerId}`
    );
  } else {
    console.error(`Failed to update KPI ${containerId}`);
  }

  return success;
}

/**
 * Helper function to update nested object properties
 */
function updateNestedProperty(obj, paths, value) {
  const updatedObj = JSON.parse(JSON.stringify(obj)); // Deep clone

  paths.forEach((path) => {
    const keys = path.split(".");
    let current = updatedObj;

    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    // Set the value
    current[keys[keys.length - 1]] = value;
  });

  return updatedObj;
}

/**
 * Get the current value of a KPI property from data attributes
 */
function getKPIProperty(containerId, property) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const propertyDef = KPI_PROPERTIES[property];
  if (!propertyDef) return null;

  return container.getAttribute(propertyDef.dataAttribute);
}

/**
 * Trigger a property change event for external listeners
 */
function triggerKPIPropertyChange(containerId, property, oldValue, newValue) {
  const event = new CustomEvent("kpiPropertyChanged", {
    detail: {
      containerId,
      property,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
    },
  });

  document.dispatchEvent(event);
}

/**
 * Get all available KPI properties
 */
function getAvailableKPIProperties() {
  return Object.keys(KPI_PROPERTIES);
}

/**
 * Get detailed information about a specific KPI property
 */
function getKPIPropertyInfo(property) {
  return KPI_PROPERTIES[property] || null;
}

/**
 * Validate a KPI property value without updating
 */
function validateKPIProperty(property, value) {
  const propertyDef = KPI_PROPERTIES[property];
  if (!propertyDef) {
    return { valid: false, error: "Unknown property" };
  }

  if (propertyDef.validate) {
    const isValid = propertyDef.validate(value);
    return {
      valid: isValid,
      error: isValid ? null : "Value does not meet validation requirements",
    };
  }

  return { valid: true, error: null };
}

/**
 * Get all current property values for a KPI from data attributes
 */
function getAllKPIProperties(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const properties = {};
  for (const property of Object.keys(KPI_PROPERTIES)) {
    properties[property] = getKPIProperty(containerId, property);
  }

  return properties;
}

/**
 * Create a new KPI component from data params
 * This allows creating a completely new KPI using existing data params as template
 */
function createKPIFromDataParams(
  newKpiId,
  containerId,
  dataParams,
  overrides = {}
) {
  if (!dataParams || !dataParams.kpi_spec) {
    console.error("Invalid data params provided");
    return false;
  }

  // Create the container if it doesn't exist
  let container = document.getElementById(containerId);
  if (!container) {
    console.error("Container not found:", containerId);
    return false;
  }

  // Merge overrides with data params
  const kpiSpec = { ...dataParams.kpi_spec, ...overrides };
  const columnMapping = dataParams.column_mapping;

  const config = {
    id: newKpiId,
    name: kpiSpec.name,
    fa_icon: kpiSpec.fa_icon,
    format_type: kpiSpec.format_type,
    unit: kpiSpec.unit,
    value_formula: convertExcelFormulaToJS(
      kpiSpec.value_formula,
      columnMapping
    ),
    data_params: {
      original_formula: kpiSpec.value_formula,
      column_mapping: columnMapping,
      kpi_spec: kpiSpec,
    },
  };

  // Set the container innerHTML to create the KPI structure
  container.innerHTML = `<div id="${newKpiId}_container" class="kpi-container h-full flex flex-col"></div>`;

  // Render the KPI
  renderKPICard(newKpiId, config);

  // Update the KPI value
  updateKPI(newKpiId);

  return true;
}

/**
 * Get all stored data params for a KPI
 */
function getKPIDataParams(kpiId) {
  const kpi = window.registeredKPIs[kpiId];
  return kpi ? kpi.dataParams : null;
}

/**
 * Simple Excel to JS formula converter
 * This is a basic implementation - in production you'd want more comprehensive conversion
 */
function convertExcelFormulaToJS(excelFormula, columnMapping) {
  if (!excelFormula || !columnMapping) return "null";

  let jsFormula = excelFormula;

  // Convert column references (A2:A, B:B, etc.) to JavaScript array access
  for (const [colLetter, colName] of Object.entries(columnMapping)) {
    const patterns = [
      new RegExp(`\\b${colLetter}\\d*:${colLetter}\\b`, "g"), // A2:A, B:B
      new RegExp(`\\b${colLetter}\\b`, "g"), // Single column reference
    ];

    patterns.forEach((pattern) => {
      jsFormula = jsFormula.replace(
        pattern,
        `window.filteredData.map(row => row['${colName}'])`
      );
    });
  }

  // Convert Excel functions to JS equivalents
  jsFormula = jsFormula.replace(/SUM\(/g, "(");
  jsFormula = jsFormula.replace(/AVERAGE\(/g, "getAverage(");
  jsFormula = jsFormula.replace(/COUNT\(/g, "getCount(");
  jsFormula = jsFormula.replace(/MAX\(/g, "Math.max.apply(null,");
  jsFormula = jsFormula.replace(/MIN\(/g, "Math.min.apply(null,");

  return jsFormula;
}

// Make functions globally available
window.renderKPICard = renderKPICard;
window.renderKPIFromDataAttributes = renderKPIFromDataAttributes;
window.reRenderAllKPIComponents = reRenderAllKPIComponents;
window.updateKPIDataAndRender = updateKPIDataAndRender;
window.getKPIConfigFromDataAttributes = getKPIConfigFromDataAttributes;
window.updateKPI = updateKPI;
window.updateAllKPIs = updateAllKPIs;
window.formatKPIValue = formatKPIValue;
window.editKPI = editKPI;

// Property management functions
window.updateKPIProperty = updateKPIProperty;
window.updateKPIProperties = updateKPIProperties;
window.getKPIProperty = getKPIProperty;
window.getAllKPIProperties = getAllKPIProperties;
window.getAvailableKPIProperties = getAvailableKPIProperties;
window.getKPIPropertyInfo = getKPIPropertyInfo;
window.validateKPIProperty = validateKPIProperty;

/**
 * Fix incomplete formulas by replacing them with a default value
 */
function fixIncompleteFormula(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return false;
  
  const currentFormula = container.getAttribute("data-value-formula");
  if (!currentFormula || currentFormula.trim() === "") {
    container.setAttribute("data-value-formula", "0");
    return true;
  }
  
  const formula = currentFormula.trim();
  if (
    formula.endsWith("(") ||
    formula.endsWith('("') ||
    formula.endsWith("('") ||
    (formula.includes("getColumnData") && !formula.includes("))"))
  ) {
    container.setAttribute("data-broken-formula", formula);
    container.setAttribute("data-value-formula", "0");
    return true;
  }
  
  return false;
}

/**
 * Restore a previously broken formula
 */
function restoreKPIFormula(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return false;
  
  const brokenFormula = container.getAttribute("data-broken-formula");
  if (brokenFormula) {
    container.setAttribute("data-value-formula", brokenFormula);
    container.removeAttribute("data-broken-formula");
    return true;
  }
  
  return false;
}

/**
 * Check for broken formulas across all KPI components
 */
function checkBrokenFormulas() {
  const kpiContainers = document.querySelectorAll('[data-component-type="kpi"]');
  const brokenFormulas = [];
  
  kpiContainers.forEach((container) => {
    const formula = container.getAttribute("data-value-formula");
    if (formula && (
      formula.endsWith("(") ||
      formula.endsWith('("') ||
      formula.endsWith("('") ||
      (formula.includes("getColumnData") && !formula.includes("))"))
    )) {
      brokenFormulas.push({
        containerId: container.id,
        formula: formula
      });
    }
  });
  
  return brokenFormulas;
}

// MutationObserver functions
window.initializeKPIMutationObserver = initializeKPIMutationObserver;
window.fixIncompleteFormula = fixIncompleteFormula;
window.restoreKPIFormula = restoreKPIFormula;
window.checkBrokenFormulas = checkBrokenFormulas;

// Legacy functions
window.createKPIFromDataParams = createKPIFromDataParams;
window.getKPIDataParams = getKPIDataParams;

// Auto-initialize MutationObserver when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initializeKPIMutationObserver();
  });
} else {
  // DOM is already ready
  initializeKPIMutationObserver();
}
