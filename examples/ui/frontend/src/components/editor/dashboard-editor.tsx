import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  X,
  BarChart3,
  LineChart,
  PieChart,
  Plus,
  Trash2,
  Circle,
  MoreHorizontal,
  Target,
  Loader2,
  Layout,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ArtifactData } from "@/types/artifact";

interface ChartConfig {
  id: string;
  type: string;
  name: string;
  originalId?: string;
  x_axis: {
    name: string;
    column: string;
    group_by: string;
  };
  series_list: Array<{
    name: string;
    column: string;
    aggregation: string;
    size_column?: string;
  }>;
  area?: "none" | "area";
  stacked?: "none" | "stacked" | "100_stacked";
}

interface KPIConfig {
  id: string;
  name: string;
  fa_icon: string;
  originalId?: string;
  value_formula: string;
  format_type: string;
  unit: string;
}

interface DashboardMetadata {
  name: string;
  description: string;
  icon: string;
  theme: string;
  filters: Array<{
    id: string;
    name: string;
    type: string;
    values_formula: string;
  }>;
}

interface DashboardEditorProps {
  content: string;
  artifact?: ArtifactData | null;
  onSave?: (content?: string) => Promise<void>;
  availableColumns?: Array<{ letter: string; name: string }>;
}

const CHART_TYPES = [
  { value: "bar", label: "Bar Chart", icon: BarChart3 },
  { value: "line", label: "Line Chart", icon: LineChart },
  { value: "pie", label: "Pie Chart", icon: PieChart },
  { value: "combo_chart", label: "Combo Chart", icon: BarChart3 },
  { value: "horizontal_bar", label: "Horizontal Bar", icon: BarChart3 },
  { value: "donut", label: "Donut Chart", icon: PieChart },
  { value: "bubble", label: "Bubble Chart", icon: Circle },
  { value: "scatter", label: "Scatter Plot", icon: MoreHorizontal },
  { value: "radar", label: "Radar Chart", icon: Target },
];

const AGGREGATION_TYPES = [
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "count", label: "Count" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
];

const KPI_ICONS = [
  { value: "fa-dollar-sign", label: "Dollar Sign" },
  { value: "fa-chart-line", label: "Chart Line" },
  { value: "fa-trophy", label: "Trophy" },
  { value: "fa-chart-bar", label: "Chart Bar" },
  { value: "fa-user", label: "User" },
  { value: "fa-users", label: "Users" },
  { value: "fa-star", label: "Star" },
  { value: "fa-heart", label: "Heart" },
  { value: "fa-thumbs-up", label: "Thumbs Up" },
  { value: "fa-shopping-cart", label: "Shopping Cart" },
  { value: "fa-calendar", label: "Calendar" },
  { value: "fa-clock", label: "Clock" },
];

const KPI_FORMATS = [
  { value: "number", label: "Number" },
  { value: "currency:usd", label: "Currency (USD)" },
  { value: "currency:eur", label: "Currency (EUR)" },
  { value: "currency:gbp", label: "Currency (GBP)" },
  { value: "currency:jpy", label: "Currency (JPY)" },
  { value: "currency:custom", label: "Custom Currency..." },
  { value: "percentage", label: "Percentage" },
  { value: "decimal", label: "Decimal" },
];



const DASHBOARD_ICONS = [
  { value: "fa-chart-area", label: "Area Chart" },
  { value: "fa-arrow-down", label: "Arrow Down" },
  { value: "fa-arrow-left", label: "Arrow Left" },
  { value: "fa-arrow-right", label: "Arrow Right" },
  { value: "fa-arrow-up", label: "Arrow Up" },
  { value: "fa-chart-bar", label: "Bar Chart" },
  { value: "fa-bluetooth", label: "Bluetooth" },
  { value: "fa-briefcase", label: "Briefcase" },
  { value: "fa-building", label: "Building" },
  { value: "fa-calendar", label: "Calendar" },
  { value: "fa-check-circle", label: "Check Circle" },
  { value: "fa-clock", label: "Clock" },
  { value: "fa-cloud", label: "Cloud" },
  { value: "fa-coins", label: "Coins" },
  { value: "fa-comments", label: "Comments" },
  { value: "fa-compress", label: "Compress" },
  { value: "fa-cpu", label: "CPU" },
  { value: "fa-credit-card", label: "Credit Card" },
  { value: "fa-tachometer-alt", label: "Dashboard" },
  { value: "fa-database", label: "Database" },
  { value: "fa-desktop", label: "Desktop" },
  { value: "fa-dollar-sign", label: "Dollar Sign" },
  { value: "fa-download", label: "Download" },
  { value: "fa-envelope", label: "Envelope" },
  { value: "fa-euro-sign", label: "Euro Sign" },
  { value: "fa-exclamation-circle", label: "Exclamation" },
  { value: "fa-expand", label: "Expand" },
  { value: "fa-file", label: "File" },
  { value: "fa-file-alt", label: "File Alt" },
  { value: "fa-file-excel", label: "File Excel" },
  { value: "fa-file-pdf", label: "File PDF" },
  { value: "fa-file-word", label: "File Word" },
  { value: "fa-flag", label: "Flag" },
  { value: "fa-folder", label: "Folder" },
  { value: "fa-folder-open", label: "Folder Open" },
  { value: "fa-user-graduate", label: "Graduate" },
  { value: "fa-hard-drive", label: "Hard Drive" },
  { value: "fa-heart", label: "Heart" },
  { value: "fa-home", label: "Home" },
  { value: "fa-hourglass-half", label: "Hourglass" },
  { value: "fa-info-circle", label: "Info Circle" },
  { value: "fa-key", label: "Key" },
  { value: "fa-laptop", label: "Laptop" },
  { value: "fa-chart-line", label: "Line Chart" },
  { value: "fa-lock", label: "Lock" },
  { value: "fa-medal", label: "Medal" },
  { value: "fa-memory", label: "Memory" },
  { value: "fa-microchip", label: "Microchip" },
  { value: "fa-microphone", label: "Microphone" },
  { value: "fa-mobile-alt", label: "Mobile" },
  { value: "fa-network-wired", label: "Network" },
  { value: "fa-phone", label: "Phone" },
  { value: "fa-chart-pie", label: "Pie Chart" },
  { value: "fa-pound-sign", label: "Pound Sign" },
  { value: "fa-question-circle", label: "Question Circle" },
  { value: "fa-save", label: "Save" },
  { value: "fa-server", label: "Server" },
  { value: "fa-cog", label: "Settings" },
  { value: "fa-shield-alt", label: "Shield" },
  { value: "fa-star", label: "Star" },
  { value: "fa-stopwatch", label: "Stopwatch" },
  { value: "fa-tablet-alt", label: "Tablet" },
  { value: "fa-thumbs-down", label: "Thumbs Down" },
  { value: "fa-thumbs-up", label: "Thumbs Up" },
  { value: "fa-times-circle", label: "Times Circle" },
  { value: "fa-tools", label: "Tools" },
  { value: "fa-trophy", label: "Trophy" },
  { value: "fa-upload", label: "Upload" },
  { value: "fa-user", label: "User" },
  { value: "fa-user-friends", label: "User Friends" },
  { value: "fa-user-tie", label: "User Tie" },
  { value: "fa-users", label: "Users" },
  { value: "fa-video", label: "Video" },
  { value: "fa-wallet", label: "Wallet" },
  { value: "fa-wifi", label: "WiFi" },
  { value: "fa-yen-sign", label: "Yen Sign" }
];

const DASHBOARD_THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "auto", label: "Auto" },
];

const FILTER_TYPES = [
  { value: "list", label: "List Filter" },
  { value: "number_range", label: "Number Range" },
  { value: "date_range", label: "Date Range" },
];

const PXML_FILE_START_TAG = "<?pxml"
const PXML_COMPILED_START_TAG = "<!DOCTYPE html>"

function decodeXmlEntities(str: string) {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

const DashboardEditor: React.FC<DashboardEditorProps> = ({
  content,
  artifact,
  onSave,
  availableColumns = [],
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDashboardSettingsOpen, setIsDashboardSettingsOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Unified Save Changes Button Component
  const SaveChangesButton = ({ onSave, className = "" }: { onSave?: () => void; className?: string }) => (
    <Button 
      onClick={onSave} 
      size="sm" 
      disabled={!hasUnsavedChanges || isSaving}
      className={className}
    >
      {isSaving ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        "Save Changes"
      )}
    </Button>
  );

  const [editedChart, setEditedChart] = useState<ChartConfig | null>(null);
  const [editedKPI, setEditedKPI] = useState<KPIConfig | null>(null);
  const [dynamicColumns, setDynamicColumns] = useState<
    Array<{ letter: string; name: string }>
  >([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<"close" | "switch" | null>(
    null
  );
  const [pendingChartData, setPendingChartData] = useState<ChartConfig | null>(
    null
  );
  const [pendingKPIData, setPendingKPIData] = useState<KPIConfig | null>(null);
  const [pendingSwitchAction, setPendingSwitchAction] = useState<"dashboard-settings" | "filters" | null>(null);
  const [originalChartState, setOriginalChartState] =
    useState<ChartConfig | null>(null);
  const [originalKPIState, setOriginalKPIState] = useState<KPIConfig | null>(
    null
  );
  const [editedDashboard, setEditedDashboard] = useState<DashboardMetadata | null>(null);
  const [originalDashboardState, setOriginalDashboardState] = useState<DashboardMetadata | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveInProgressRef = useRef(false);
  const lastSavedContentRef = useRef<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // State for compiled dashboard content (moved up for proper initialization order)
  const [compiledContent, setCompiledContent] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationError, setCompilationError] = useState<string | null>(null);
  const [rawPXMLContent, setRawPXMLContent] = useState<string | null>(null);
  const [sanitizedRawPXMLContent, setSanitizedRawPXMLContent] = useState<string | null>(null);

  // Centralized XML sanitization utility
  const sanitizeXMLContent = (content: string): string => {
    return content
      .replace(/<formula>([\s\S]*?)<\/formula>/g, (match, formulaContent) => {
        return `<formula>${formulaContent
          .replace(/<>/g, '&lt;&gt;')
          .replace(/<=/g, '&lt;=')
          .replace(/>=/g, '&gt;=')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
        }</formula>`;
      })
      .replace(/\{\{([\s\S]*?)\}\}/g, (match, formulaContent) => {
        return `{{${formulaContent
          .replace(/<>/g, '&lt;&gt;')
          .replace(/<=/g, '&lt;=')
          .replace(/>=/g, '&gt;=')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
        }}}`;
      });
  };

  // Unescape formulas for display in text inputs
  const unescapeFormula = (formula: string): string => {
    return decodeXmlEntities(formula);
  };

  // Parse PXML content to extract chart configurations
  const parseChartsFromPXML = useCallback((pxmlContent: string): ChartConfig[] => {
    // Check if content is HTML instead of PXML
    if (
      pxmlContent.trim().startsWith(PXML_COMPILED_START_TAG) ||
      pxmlContent.trim().startsWith("<html")
    ) {
      return [];
    }

    // Sanitize XML content to escape formula operators
    const sanitizedContent = sanitizeXMLContent(pxmlContent);

    const charts: ChartConfig[] = [];
    const parser = new DOMParser();

    try {
      const doc = parser.parseFromString(sanitizedContent, "text/xml");

      // Check for parsing errors
      const parseError = doc.querySelector("parsererror");
      if (parseError) {
        return charts;
      }

      const chartElements = doc.querySelectorAll("chart");

      chartElements.forEach((chartEl, index) => {
        // Generate ID from the chart name, similar to how the backend does it
        const name =
          chartEl.querySelector("name")?.textContent || `Chart ${index + 1}`;
        const id =
          chartEl.getAttribute("id") ||
          `chart_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

        const chart: ChartConfig = {
          id: id,
          type: chartEl.getAttribute("type") || "bar",
          name: name,
          x_axis: {
            name: chartEl.querySelector("x_axis name")?.textContent || "",
            column: chartEl.querySelector("x_axis column")?.textContent || "",
            group_by:
              chartEl.querySelector("x_axis group_by")?.textContent || "",
          },
          series_list: [],
          area: chartEl.getAttribute("area") === "true" ? "area" : "none",
          stacked:
            chartEl.getAttribute("style") === "stacked"
              ? "stacked"
              : chartEl.getAttribute("style") === "100% stacked"
              ? "100_stacked"
              : "none",
        };

        const seriesElements = chartEl.querySelectorAll("series");
        seriesElements.forEach((seriesEl) => {
          chart.series_list.push({
            name: seriesEl.querySelector("name")?.textContent || "",
            column: seriesEl.querySelector("column")?.textContent || "",
            aggregation:
              seriesEl.querySelector("aggregation")?.textContent || "sum",
          });
        });

        charts.push(chart);
      });
    } catch {}

    return charts;
  }, []);

  // Parse PXML content to extract KPI configurations
  const parseKPIsFromPXML = useCallback((pxmlContent: string): KPIConfig[] => {
    // Check if content is HTML instead of PXML
    if (
      pxmlContent.trim().startsWith(PXML_COMPILED_START_TAG) ||
      pxmlContent.trim().startsWith("<html")
    ) {
      return [];
    }

    // Sanitize XML content to escape formula operators
    const sanitizedContent = sanitizeXMLContent(pxmlContent);

    const kpis: KPIConfig[] = [];
    const parser = new DOMParser();

    try {
      const doc = parser.parseFromString(sanitizedContent, "text/xml");

      // Check for parsing errors
      const parseError = doc.querySelector("parsererror");
      if (parseError) {
        return kpis;
      }

      const kpiElements = doc.querySelectorAll("kpi");

      kpiElements.forEach((kpiEl, index) => {
        const name =
          kpiEl.querySelector("name")?.textContent || `KPI ${index + 1}`;
        const id = `kpi_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

        const kpi: KPIConfig = {
          id: id,
          name: name,
          fa_icon:
            kpiEl.querySelector("fa_icon")?.textContent || "fa-chart-line",
          value_formula:
            kpiEl.querySelector("value formula")?.textContent || "=0",
          format_type:
            kpiEl.querySelector("value format")?.textContent || "number",
          unit: kpiEl.querySelector("value unit")?.textContent || "",
        };

        kpis.push(kpi);
      });
    } catch {}

    return kpis;
  }, []);

  // Parse dashboard metadata from HTML content
  const parseDashboardFromHTML = useCallback((htmlContent: string): DashboardMetadata => {
    const parser = new DOMParser();
    const defaultMetadata: DashboardMetadata = {
      name: "Dashboard",
      description: "Dashboard description",
      icon: "fa-chart-line",
      theme: "light",
      filters: []
    };
    
    try {
      const doc = parser.parseFromString(htmlContent, "text/html");
      
      // Extract name from title or h1/h2 elements
      const titleEl = doc.querySelector('title');
      const h1El = doc.querySelector('h1');
      const h2El = doc.querySelector('h2');
      
      let name = "Dashboard";
      if (titleEl?.textContent?.trim()) {
        name = titleEl.textContent.trim();
      } else if (h1El?.textContent?.trim()) {
        name = h1El.textContent.trim();
      } else if (h2El?.textContent?.trim()) {
        name = h2El.textContent.trim();
      }
      
      // Extract description from meta description or paragraph elements
      const metaDesc = doc.querySelector('meta[name="description"]');
      const paragraphs = doc.querySelectorAll('p');
      
      let description = "Dashboard description";
      if (metaDesc?.getAttribute('content')?.trim()) {
        description = metaDesc.getAttribute('content')!.trim();
      } else {
        // Find a paragraph that looks like a description
        for (const p of paragraphs) {
          const text = p.textContent?.trim() || '';
          if (text.length > 20 && text.length < 200 && !text.includes('chart') && !text.includes('kpi')) {
            description = text;
            break;
          }
        }
      }
      
      // Extract icon from data attribute
      const iconElement = doc.querySelector('[data-dashboard-icon]');
      let icon = "fa-chart-line";
      if (iconElement) {
        // Extract the fa- class from the element's classList
        const classes = Array.from(iconElement.classList);
        const faClass = classes.find(cls => cls.startsWith('fa-'));
        if (faClass) {
          icon = faClass;
        }
      }
      
      // Extract filters from HTML (if any exist)
      const filterElements = doc.querySelectorAll('.filter-component');
      const filters: Array<{
        id: string;
        name: string;
        type: string;
        values_formula: string;
      }> = [];
      
      
      // Also try to find filters by looking for the filters section
      
      // Try to extract filters from embedded JavaScript configuration
      const scriptTags = doc.querySelectorAll('script');
      for (const script of scriptTags) {
        const scriptContent = script.textContent || '';
        if (scriptContent.includes('filters') && scriptContent.includes('[')) {
          try {
            // Try to extract the filters array from the script
            const filtersMatch = scriptContent.match(/filters\s*:\s*\[([\s\S]*?)\]/);
            if (filtersMatch) {
              // Found filters in script
            }
          } catch {
            // Error parsing script for filters
          }
        }
      }
      
      filterElements.forEach((filterEl, index) => {
        const labelEl = filterEl.querySelector('label');
        const filterName = labelEl?.textContent?.trim() || `Filter ${index + 1}`;
        
        // Determine filter type based on HTML structure
        let filterType = 'list'; // default
        if (filterEl.querySelector('input[type="number"]')) {
          filterType = 'number_range';
        } else if (filterEl.querySelector('input[type="date"]')) {
          filterType = 'date_range';
        }
        
        // Try to extract the filter ID - look for the actual filter ID in the iframe
        const buttonEl = filterEl.querySelector('[id*="_button"]');
        const dropdownEl = filterEl.querySelector('[id*="_dropdown"]');
        let filterId = buttonEl?.id || dropdownEl?.id || `filter_${index + 1}`;
        
        // Convert button ID to dropdown ID if needed (e.g., filter_branch_button -> filter_branch_dropdown)
        if (filterId.includes('_button')) {
          filterId = filterId.replace('_button', '_dropdown');
        }
        
        // For now, use a default formula - this will be editable in the UI
        const valuesFormula = '';
        
        if (filterName && filterName !== 'Filter' && filterName !== 'Filters') {
          filters.push({
            id: filterId,
            name: filterName,
            type: filterType,
            values_formula: valuesFormula
          });
        }
      });
      
      
      return {
        name,
        description,
        icon,
        theme: "light", 
        filters
      };
    } catch (error) {
      console.error("Error parsing dashboard from HTML:", error);
      return defaultMetadata;
    }
  }, []);

  // Parse dashboard metadata from PXML content
  const parseDashboardFromPXML = useCallback((pxmlContent: string): DashboardMetadata => {
    // Check if content is HTML instead of PXML
    if (
      pxmlContent.trim().startsWith(PXML_COMPILED_START_TAG) ||
      pxmlContent.trim().startsWith("<html")
    ) {
      return parseDashboardFromHTML(pxmlContent);
    }

    // Sanitize XML content to escape formula operators
    const sanitizedContent = sanitizeXMLContent(pxmlContent);

    const parser = new DOMParser();
    const defaultMetadata: DashboardMetadata = {
      name: "Dashboard",
      description: "Dashboard description", 
      icon: "fa-chart-line",
      theme: "light",
      filters: []
    };
    const dashboardMetadata = { ...defaultMetadata };

    try {
      const doc = parser.parseFromString(sanitizedContent, "text/xml");

      // Check for parsing errors
      const parseError = doc.querySelector("parsererror");
      if (parseError) {
        return defaultMetadata;
      }

      // Extract dashboard name from various possible locations
      const titleEl = doc.querySelector("title");
      const dashboardEl = doc.querySelector("dashboard");
      const nameEl = doc.querySelector("name");
      const rootEl = doc.documentElement;
      
      if (titleEl?.textContent?.trim()) {
        dashboardMetadata.name = titleEl.textContent.trim();
      } else if (nameEl?.textContent?.trim()) {
        dashboardMetadata.name = nameEl.textContent.trim();
      } else if (dashboardEl?.getAttribute("name")?.trim()) {
        dashboardMetadata.name = dashboardEl.getAttribute("name")!.trim();
      } else if (rootEl?.getAttribute("name")?.trim()) {
        dashboardMetadata.name = rootEl.getAttribute("name")!.trim();
      }

      // Extract dashboard description
      const descEl = doc.querySelector("description");
      
      if (descEl?.textContent?.trim()) {
        dashboardMetadata.description = descEl.textContent.trim();
      } else if (dashboardEl?.getAttribute("description")?.trim()) {
        dashboardMetadata.description = dashboardEl.getAttribute("description")!.trim();
      }

      // Extract dashboard icon (look for fa_icon in PXML)
      const iconEl = doc.querySelector("fa_icon");
      if (iconEl?.textContent) {
        dashboardMetadata.icon = iconEl.textContent;
      } else if (dashboardEl?.getAttribute("fa_icon")) {
        dashboardMetadata.icon = dashboardEl.getAttribute("fa_icon") || "fa-chart-line";
      }

      // Extract dashboard theme
      const themeEl = doc.querySelector("theme");
      if (themeEl?.textContent) {
        dashboardMetadata.theme = themeEl.textContent;
      } else if (dashboardEl?.getAttribute("theme")) {
        dashboardMetadata.theme = dashboardEl.getAttribute("theme") || "light";
      }

      // Extract filters
      const filterElements = doc.querySelectorAll("filter");
      dashboardMetadata.filters = [];

      filterElements.forEach((filterEl, index) => {
        let filterId = filterEl.getAttribute("id") || `filter_${index + 1}`;
        
        // Ensure the filter ID follows the iframe naming convention
        if (!filterId.includes('_dropdown') && !filterId.includes('_button')) {
          // If it's a generic ID, try to create a proper one based on the name
        const filterName = filterEl.querySelector("name")?.textContent || `Filter ${index + 1}`;
          const nameSlug = filterName.toLowerCase().replace(/\s+/g, '_');
          filterId = `filter_${nameSlug}_dropdown`;
        }
        
        const filterName = filterEl.querySelector("name")?.textContent || `Filter ${index + 1}`;
        const filterType = filterEl.getAttribute("type") || filterEl.querySelector("type")?.textContent || "list";
        
        // Look for values formula in different possible locations
        let valuesFormula = "";
        const valuesFormulaEl = filterEl.querySelector("values_formula");
        const valuesEl = filterEl.querySelector("values");
        const formulaEl = valuesEl?.querySelector("formula");
        
        if (valuesFormulaEl) {
          valuesFormula = valuesFormulaEl.textContent || "";
        } else if (formulaEl) {
          valuesFormula = formulaEl.textContent || "";
        } else {
          valuesFormula = "";
        }

        dashboardMetadata.filters.push({
          id: filterId,
          name: filterName,
          type: filterType,
          values_formula: valuesFormula
        });
      });

    } catch (error) {
      console.error("Error parsing dashboard metadata:", error);
    }

    return dashboardMetadata;
  }, [parseDashboardFromHTML]);

  // Ensure dashboard data is loaded when filters sidebar opens
  useEffect(() => {
    if (isFiltersOpen && !editedDashboard) {
      const contentToParse = rawPXMLContent || content;
      const dashboardData = parseDashboardFromPXML(contentToParse);
      setEditedDashboard(dashboardData);
    }
  }, [isFiltersOpen, editedDashboard, content, rawPXMLContent, parseDashboardFromPXML]);

  // Update PXML content with edited chart
  const updatePXMLWithDashboard = (
    originalContent: string,
    dashboardMetadata: DashboardMetadata
  ): string => {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();

    try {
      const doc = parser.parseFromString(originalContent, "text/xml");
      const dashboardElement = doc.querySelector("dashboard");
      
      if (!dashboardElement) {
        console.error("Dashboard element not found in PXML");
        return originalContent;
      }

      // Update dashboard name
      const nameElement = dashboardElement.querySelector("name");
      if (nameElement) {
        nameElement.textContent = dashboardMetadata.name;
      } else {
        const newNameElement = doc.createElement("name");
        newNameElement.textContent = dashboardMetadata.name;
        dashboardElement.insertBefore(newNameElement, dashboardElement.firstChild);
      }

      // Update dashboard description
      const descElement = dashboardElement.querySelector("description");
      if (descElement) {
        descElement.textContent = dashboardMetadata.description;
      } else {
        const newDescElement = doc.createElement("description");
        newDescElement.textContent = dashboardMetadata.description;
        dashboardElement.insertBefore(newDescElement, nameElement?.nextSibling || dashboardElement.firstChild);
      }

      // Update dashboard icon
      const iconElement = dashboardElement.querySelector("fa_icon");
      if (iconElement) {
        iconElement.textContent = dashboardMetadata.icon;
      } else {
        const newIconElement = doc.createElement("fa_icon");
        newIconElement.textContent = dashboardMetadata.icon;
        dashboardElement.insertBefore(newIconElement, dashboardElement.firstChild);
      }

      // Update filters
      if (dashboardMetadata.filters && dashboardMetadata.filters.length > 0) {
        
        // Find or create the filters section
        let filtersSection = dashboardElement.querySelector("filters");
        if (!filtersSection) {
          filtersSection = doc.createElement("filters");
          // Insert after fa_icon element
          const faIconElement = dashboardElement.querySelector("fa_icon");
          if (faIconElement) {
            dashboardElement.insertBefore(filtersSection, faIconElement.nextSibling);
          } else {
            dashboardElement.appendChild(filtersSection);
          }
        }
        
        // Clear existing filters from the filters section
        const existingFilters = filtersSection.querySelectorAll("filter");
        existingFilters.forEach(filter => filter.remove());
        
        // Also remove any filters that might be outside the filters section
        const allFilters = dashboardElement.querySelectorAll("filter");
        allFilters.forEach(filter => {
          if (!filtersSection.contains(filter)) {
            filter.remove();
          }
        });

        // Add new filters to the filters section
        dashboardMetadata.filters.forEach(filter => {
          const filterElement = doc.createElement("filter");
          filterElement.setAttribute("type", filter.type);

          // Add name element
          const nameElement = doc.createElement("name");
          nameElement.textContent = filter.name;
          filterElement.appendChild(nameElement);

          // Add values element with formula inside
          const valuesElement = doc.createElement("values");
          const formulaElement = doc.createElement("formula");
          formulaElement.textContent = filter.values_formula || "";
          valuesElement.appendChild(formulaElement);
          filterElement.appendChild(valuesElement);

          filtersSection.appendChild(filterElement);
        });
        
      } else {
        
        // Remove the entire filters section if it exists
        const filtersSection = dashboardElement.querySelector("filters");
        if (filtersSection) {
          filtersSection.remove();
        }
        
        // Remove any orphaned filter elements that might be outside the filters section
        const allFilters = dashboardElement.querySelectorAll("filter");
        allFilters.forEach(filter => {
          filter.remove();
        });
      }

      return serializer.serializeToString(doc);
    } catch (error) {
      console.error("Error updating PXML with dashboard metadata:", error);
      return originalContent;
    }
  };

  const updatePXMLWithChart = (
    originalContent: string,
    chartConfig: ChartConfig
  ): string => {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();

    try {
      const doc = parser.parseFromString(originalContent, "text/xml");
      const chartElements = doc.querySelectorAll("chart");

      // Find the chart to update by matching the original ID or generated ID from name
      let chartEl = null;
      
      // First try to match by originalId if it exists (for name changes during save)
      if (chartConfig.originalId) {
        chartEl = Array.from(chartElements).find(el => el.getAttribute("id") === chartConfig.originalId);
        
        if (!chartEl) {
          // Try matching by generated ID from name with originalId
          chartEl = Array.from(chartElements).find(el => {
            const name = el.querySelector("name")?.textContent || "";
            const generatedId = `chart_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
            return generatedId === chartConfig.originalId;
          });
        }
      }
      
      // If still no match, try to match by the new ID
      if (!chartEl) {
        chartEl = Array.from(chartElements).find(el => el.getAttribute("id") === chartConfig.id);
      }
      
      // If no ID match, try to match by generated ID from name
      if (!chartEl) {
        chartEl = Array.from(chartElements).find(el => {
          const name = el.querySelector("name")?.textContent || "";
          const generatedId = `chart_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
          return generatedId === chartConfig.id;
        });
      }

      if (chartEl) {
        // Update chart ID if it has changed
        if (chartConfig.originalId && chartConfig.id !== chartConfig.originalId) {
          chartEl.setAttribute("id", chartConfig.id);
        }
        
        // Update chart type
        chartEl.setAttribute("type", chartConfig.type);

        // Update area attribute
        if (chartConfig.area === "area") {
          chartEl.setAttribute("area", "true");
        } else {
          chartEl.removeAttribute("area");
        }

        // Update stacked style
        if (chartConfig.stacked === "stacked") {
          chartEl.setAttribute("style", "stacked");
        } else if (chartConfig.stacked === "100_stacked") {
          chartEl.setAttribute("style", "100% stacked");
        } else {
          chartEl.removeAttribute("style");
        }

        // Update chart name
        const nameEl = chartEl.querySelector("name");
        if (nameEl) nameEl.textContent = chartConfig.name;

        // Update x_axis
        const xAxisNameEl = chartEl.querySelector("x_axis name");
        const xAxisColumnEl = chartEl.querySelector("x_axis column");
        const xAxisGroupByEl = chartEl.querySelector("x_axis group_by");

        if (xAxisNameEl) xAxisNameEl.textContent = chartConfig.x_axis.name;
        if (xAxisColumnEl)
          xAxisColumnEl.textContent = chartConfig.x_axis.column;
        if (xAxisGroupByEl)
          xAxisGroupByEl.textContent = chartConfig.x_axis.group_by;

        // Update series - remove existing series first, then add new ones
        const seriesListEl = chartEl.querySelector("series_list");
        if (seriesListEl) {
          // Remove all existing series
          while (seriesListEl.firstChild) {
            seriesListEl.removeChild(seriesListEl.firstChild);
          }
          
          // Add updated series
          chartConfig.series_list.forEach((series) => {
            const seriesEl = doc.createElement("series");
            
            const seriesNameEl = doc.createElement("name");
            seriesNameEl.textContent = series.name;
            seriesEl.appendChild(seriesNameEl);
            
            const seriesColumnEl = doc.createElement("column");
            seriesColumnEl.textContent = series.column;
            seriesEl.appendChild(seriesColumnEl);
            
            const seriesAggregationEl = doc.createElement("aggregation");
            seriesAggregationEl.textContent = series.aggregation;
            seriesEl.appendChild(seriesAggregationEl);
            
            seriesListEl.appendChild(seriesEl);
          });
        }
      }

      return serializer.serializeToString(doc);
    } catch (error) {
      console.error("Error updating PXML:", error);
      return originalContent;
    }
  };

  // Update PXML content with edited KPI
  const updatePXMLWithKPI = (
    originalContent: string,
    kpiConfig: KPIConfig
  ): string => {
    // Preprocess the original content
    const parser = new DOMParser();
    const serializer = new XMLSerializer();

    try {
      const doc = parser.parseFromString(originalContent, "text/xml");
      const kpiElements = doc.querySelectorAll("kpi");

      // Find the KPI to update by matching the original ID or generated ID from name
      let kpiEl = null;
      
      // First try to match by originalId if it exists (for name changes during save)
      if (kpiConfig.originalId) {
        kpiEl = Array.from(kpiElements).find(el => el.getAttribute("id") === kpiConfig.originalId);
        
        if (!kpiEl) {
          // Try matching by generated ID from name with originalId
          kpiEl = Array.from(kpiElements).find(el => {
            const name = el.querySelector("name")?.textContent || "";
            const generatedId = `kpi_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
            return generatedId === kpiConfig.originalId;
          });
        }
      }
      
      // If still no match, try to match by the new ID
      if (!kpiEl) {
        kpiEl = Array.from(kpiElements).find(el => el.getAttribute("id") === kpiConfig.id);
      }
      
      // If no ID match, try to match by generated ID from name
      if (!kpiEl) {
        kpiEl = Array.from(kpiElements).find((el) => {
          const name = el.querySelector("name")?.textContent || "";
          const generatedId = `kpi_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
          return generatedId === kpiConfig.id;
        });
      }

      if (kpiEl) {
        // Update KPI ID if it has changed
        if (kpiConfig.originalId && kpiConfig.id !== kpiConfig.originalId) {
          kpiEl.setAttribute("id", kpiConfig.id);
        }
        
        // Update KPI name
        const nameEl = kpiEl.querySelector("name");
        if (nameEl) nameEl.textContent = kpiConfig.name;

        // Update icon
        const iconEl = kpiEl.querySelector("fa_icon");
        if (iconEl) iconEl.textContent = kpiConfig.fa_icon;

        // Update value elements
        const formulaEl = kpiEl.querySelector("value formula");
        const formatEl = kpiEl.querySelector("value format");
        const unitEl = kpiEl.querySelector("value unit");

        if (formulaEl) formulaEl.textContent = kpiConfig.value_formula;
        if (formatEl) formatEl.textContent = kpiConfig.format_type;
        if (unitEl) unitEl.textContent = kpiConfig.unit;
      }
      return serializer.serializeToString(doc);
    } catch (error) {
      console.error("Error updating PXML with KPI:", error);
      return originalContent;
    }
  };

  // Extract columns dynamically from iframe
  const extractColumnsFromIframe = (): Array<{
    letter: string;
    name: string;
  }> => {
    try {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return [];

      const iframeWindow = iframe.contentWindow as Window & {
        columnMapping?: Record<string, string>;
        dashboardConfig?: {
          column_mapping?: Record<string, string>;
        };
      };
      
      // Try window.columnMapping first (set immediately)
      let columnMapping = iframeWindow.columnMapping;
      
      // Fallback to dashboardConfig.column_mapping if available
      // Check for empty object as well as undefined/null
      if ((!columnMapping || Object.keys(columnMapping).length === 0) && iframeWindow.dashboardConfig?.column_mapping) {
        columnMapping = iframeWindow.dashboardConfig.column_mapping;
      }


      if (columnMapping) {
        const columns = Object.entries(columnMapping).map(([letter, name]) => ({
          letter,
          name: (name as string).charAt(0).toUpperCase() + (name as string).slice(1).replace(/_/g, ' '),
        }));
        return columns;
      }
    } catch (error) {
      console.error('Error extracting columns from iframe:', error);
    }
    return [];
  };

  // Extract columns from PXML content as fallback
  const extractColumnsFromPXML = (content: string): Array<{ letter: string; name: string }> => {
    const columns: Array<{ letter: string; name: string }> = [];
    const columnSet = new Set<string>();
    
    // Look for column references in formulas like =unique(E2:E), =unique(F2:F), etc.
    const formulaMatches = content.match(/=unique\(([A-Z]+)\d+:[A-Z]+\)/g);
    
    if (formulaMatches) {
      formulaMatches.forEach(match => {
        const columnMatch = match.match(/=unique\(([A-Z]+)\d+:[A-Z]+\)/);
        if (columnMatch) {
          const letter = columnMatch[1];
          if (!columnSet.has(letter)) {
            columnSet.add(letter);
            columns.push({
              letter: letter,
              name: `Column ${letter}`
            });
          }
        }
      });
    }
    
    return columns;
  };

  // Get columns for dropdowns
  const getAvailableColumns = () => {
    if (dynamicColumns.length > 0) {
      return dynamicColumns;
    }
    
    // Fallback to columns extracted from PXML content
    const pxmlColumns = extractColumnsFromPXML(content);
    if (pxmlColumns.length > 0) {
      return pxmlColumns;
    }
    
    return availableColumns;
  };


  // Mark as having unsaved changes
  const markAsChanged = () => {
    setHasUnsavedChanges(true);
  };

  // Get contextual labels based on chart type
  const getAxisLabel = (chartType: string) => {
    switch (chartType) {
      case "horizontal_bar":
        return "Values";
      case "pie":
      case "donut":
        return "Labels";
      case "line":
        return "Categories";
      case "bubble":
      case "scatter":
        return "X-Axis";
      case "radar":
        return "Dimensions";
      case "combo_chart":
        return "Categories";
      case "bar":
      default:
        return "Categories";
    }
  };

  const getSeriesLabel = (chartType: string) => {
    switch (chartType) {
      case "line":
        return "Lines";
      case "pie":
      case "donut":
        return "Values";
      case "bubble":
        return "Bubbles";
      case "scatter":
        return "Data Points";
      case "radar":
        return "Metrics";
      case "combo_chart":
        return "Series";
      case "bar":
      case "horizontal_bar":
      default:
        return "Data Series";
    }
  };

  // Handle chart and KPI click from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "chart-edit" && event.data.chartId) {
        // Use raw PXML content for parsing if available, otherwise fall back to current content
        const contentToParse = rawPXMLContent || content;

        const charts = parseChartsFromPXML(contentToParse);

        // Find chart by matching the ID (not by index)
        const chart = charts.find((c) => c.id === event.data.chartId);

        if (chart) {
          // Check if we're switching with unsaved changes
          if (hasUnsavedChanges && (editedChart || editedKPI || (isDashboardSettingsOpen && editedDashboard) || (isFiltersOpen && editedDashboard))) {
            setPendingAction("switch");
            setPendingChartData(chart);
            setShowConfirmDialog(true);
            return;
          }

          // Clear KPI and dashboard editing state
          setEditedKPI(null);
          setOriginalKPIState(null);
          setEditedDashboard(null);
          setOriginalDashboardState(null);
          setIsDashboardSettingsOpen(false);
          setIsFiltersOpen(false);

          // Ensure chart has default values for new properties
          const chartWithDefaults = {
            ...chart,
            area: chart.area || "none",
            stacked: chart.stacked || "none",
          };

          setEditedChart({ ...chartWithDefaults });
          setOriginalChartState({ ...chartWithDefaults }); // Store original state for reverting
          setIsEditorOpen(true);
          setHasUnsavedChanges(false);

          // Send message to iframe to highlight the new chart
          // This will automatically remove highlighting from other charts
          const iframe = iframeRef.current;
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(
              {
                type: "chart-edit",
                chartId: chart.id,
              },
              "*"
            );
          }
        }
      }

      if (event.data.type === "kpi-edit" && event.data.kpiId) {
        
        // Use raw PXML content for parsing if available, otherwise fall back to current content
        const contentToParse = rawPXMLContent || content;

        const kpis = parseKPIsFromPXML(contentToParse);

        // Find KPI by matching the ID
        const kpi = kpis.find((k) => k.id === event.data.kpiId);

        if (kpi) {
          // Check if we're switching with unsaved changes
          if (hasUnsavedChanges && (editedChart || editedKPI || (isDashboardSettingsOpen && editedDashboard) || (isFiltersOpen && editedDashboard))) {
            setPendingAction("switch");
            setPendingKPIData(kpi);
            setShowConfirmDialog(true);
            return;
          }

          // Clear chart and dashboard editing state
          setEditedChart(null);
          setOriginalChartState(null);
          setEditedDashboard(null);
          setOriginalDashboardState(null);
          setIsDashboardSettingsOpen(false);
          setIsFiltersOpen(false);

          setEditedKPI({ ...kpi });
          setOriginalKPIState({ ...kpi }); // Store original state for reverting
          setIsEditorOpen(true);
          setHasUnsavedChanges(false);

          // Send message to iframe to highlight the new KPI
          const iframe = iframeRef.current;
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(
              {
                type: "kpi-edit",
                kpiId: kpi.id,
              },
              "*"
            );
          }
        }
      }
      if (event.data.type === "dashboard-edit") {
        // Check if we're switching to dashboard editing with unsaved changes
        if (hasUnsavedChanges && (editedChart || editedKPI)) {
          setPendingAction("switch");
          setShowConfirmDialog(true);
          return;
        }
        // Clear chart and KPI editing state
        setEditedChart(null);
        setOriginalChartState(null);
        setEditedKPI(null);
        setOriginalKPIState(null);
        setIsFiltersOpen(false);
        
        // Parse dashboard metadata from existing content
        const contentToParse = rawPXMLContent || content;
        
        const initialDashboard = parseDashboardFromPXML(contentToParse);
        
        setEditedDashboard({ ...initialDashboard });
        setOriginalDashboardState({ ...initialDashboard });
        setIsDashboardSettingsOpen(true);
        setIsFiltersOpen(false);
        
        // Clear selection in iframe
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: "clear-selection" }, "*");
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [content, rawPXMLContent, hasUnsavedChanges, editedChart, editedKPI, editedDashboard, isDashboardSettingsOpen, isFiltersOpen, parseDashboardFromPXML, parseChartsFromPXML, parseKPIsFromPXML]);

  // Extract columns and inject click handlers into iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        // Wait a bit for dashboard to fully initialize
        setTimeout(() => {
          // Extract columns from iframe
          const columns = extractColumnsFromIframe();
          if (columns.length > 0) {
            setDynamicColumns(columns);
          }

          // Set up click handlers
          const iframeDoc = iframe.contentDocument;
          if (!iframeDoc) return;

          // First, try to inject a script to add click handlers from within the iframe
          const script = iframeDoc.createElement("script");
          script.textContent = `
            // Constants for consistent styling
            const CHART_BORDER_RADIUS = {
              DEFAULT: '8px',
              HOVER: '12px',
              SELECTED: '12px'
            };
            const HIGHLIGHT_TIMEOUT = 100;
            
            // Add click handlers to dashboard header, chart and KPI containers and edit buttons
            function setupChartEditors() {
              
              // Handle dashboard header clicks (title, description, icon)
              const dashboardHeader = document.querySelector('header');
              if (dashboardHeader) {
                const headerElements = dashboardHeader.querySelectorAll('h1, p, i[data-dashboard-icon]');
                headerElements.forEach((element) => {
                  element.style.cursor = "pointer";
                  element.addEventListener("click", (e) => {
                    e.stopPropagation();
                    parent.postMessage({ type: "dashboard-edit" }, "*");
                  });
                  
                  // Add hover effect
                  element.addEventListener("mouseenter", () => {
                    element.style.opacity = "0.8";
                  });
                  element.addEventListener("mouseleave", () => {
                    element.style.opacity = "1";
                  });
                });
              }
              
              // Handle chart container clicks
              const chartContainers = document.querySelectorAll('[id*="chart_"][id$="_container"]');
              chartContainers.forEach((container) => {
                const chartId = container.id.replace("_container", "");
                container.style.cursor = "pointer";
                container.addEventListener("click", (e) => {
                  e.stopPropagation();
                  parent.postMessage({ type: "chart-edit", chartId }, "*");
                });

                // Add hover effect
                container.addEventListener("mouseenter", () => {
                  container.style.boxShadow = "0 0 0 2px rgba(59, 130, 246, 0.3)";
                  container.style.borderRadius = CHART_BORDER_RADIUS.HOVER;
                });
                container.addEventListener("mouseleave", () => {
                  container.style.boxShadow = "";
                  container.style.borderRadius = CHART_BORDER_RADIUS.DEFAULT;
                });
              });

              // Handle KPI container clicks
              const kpiContainers = document.querySelectorAll('[id*="kpi_"][id$="_container"]');
              kpiContainers.forEach((container) => {
                const kpiId = container.id.replace("_container", "");
                container.style.cursor = "pointer";
                container.addEventListener("click", (e) => {
                  e.stopPropagation();
                  parent.postMessage({ type: "kpi-edit", kpiId }, "*");
                });

                // Add hover effect
                container.addEventListener("mouseenter", () => {
                  container.style.boxShadow = "0 0 0 2px rgba(59, 130, 246, 0.3)";
                  container.style.borderRadius = CHART_BORDER_RADIUS.HOVER;
                });
                container.addEventListener("mouseleave", () => {
                  container.style.boxShadow = "";
                  container.style.borderRadius = CHART_BORDER_RADIUS.DEFAULT;
                });
              });

              // Handle existing edit buttons
              const editButtons = document.querySelectorAll('[onclick*="editChart"]');
              editButtons.forEach((button) => {
                const onclickAttr = button.getAttribute("onclick");
                if (onclickAttr) {
                  const match = onclickAttr.match(/editChart\\(['"]([^'"]+)['"]/);
                  if (match) {
                    const chartId = match[1];
                    button.addEventListener("click", (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      parent.postMessage({ type: "chart-edit", chartId }, "*");
                    });
                  }
                }
              });
              
            }

            // Add CSS for hover effects and rounded corners
            const style = document.createElement('style');
            style.textContent = 
              '.chart-component {' +
                'transition: all 0.2s ease-out !important;' +
                'border-radius: ' + CHART_BORDER_RADIUS.DEFAULT + ' !important;' +
                'overflow: hidden;' +
              '}' +
              '.chart-component:hover {' +
                'transform: scale(1.01) !important;' +
                'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;' +
                'border-radius: ' + CHART_BORDER_RADIUS.HOVER + ' !important;' +
              '}' +
              '.chart-component.selected-chart {' +
                'border-radius: ' + CHART_BORDER_RADIUS.SELECTED + ' !important;' +
              '}' +
              'div[class*="chart-component"] {' +
                'border-radius: ' + CHART_BORDER_RADIUS.DEFAULT + ' !important;' +
                'transition: all 0.2s ease-out !important;' +
              '}' +
              'div[class*="chart-component"]:hover {' +
                'border-radius: ' + CHART_BORDER_RADIUS.HOVER + ' !important;' +
                'transform: scale(1.01) !important;' +
              '}';
            document.head.appendChild(style);

            // Function to highlight the currently edited chart
            function highlightEditedChart(chartId) {              
              // Remove highlighting from all charts and KPIs first using the shared function
              removeAllHighlighting();
              
              // Add highlighting to the current chart
              const currentChart = document.getElementById(chartId + '_container');
              if (currentChart) {
                currentChart.classList.add('ring-2', 'ring-blue-400', 'ring-opacity-60', 'shadow-lg', 'scale-[1.02]', 'bg-blue-50/40', 'selected-chart');
                currentChart.style.transition = 'all 0.2s ease-out';
                currentChart.style.borderRadius = CHART_BORDER_RADIUS.SELECTED;
              } else {
                console.warn('❌ Chart container not found:', chartId + '_container');
              }
            }

            // Function to highlight the currently edited KPI
            function highlightEditedKPI(kpiId) {
              // Remove highlighting from all charts and KPIs first using the shared function
              removeAllHighlighting();
              
              // Add highlighting to the current KPI
              const currentKPI = document.getElementById(kpiId + '_container');
              if (currentKPI) {
                currentKPI.classList.add('ring-2', 'ring-blue-400', 'ring-opacity-60', 'shadow-lg', 'scale-[1.02]', 'bg-green-50/40', 'selected-kpi');
                currentKPI.style.transition = 'all 0.2s ease-out';
                currentKPI.style.borderRadius = CHART_BORDER_RADIUS.SELECTED;
              } else {
                console.warn('❌ KPI container not found:', kpiId + '_container');
              }
            }
            
            // Function to remove all highlighting
            function removeAllHighlighting() {
              // Combined selector to target all chart and KPI related elements efficiently
              const combinedSelector = '.chart-component, div[class*="chart-component"], div[id*="chart_"][id$="_container"], .kpi-component, div[class*="kpi-component"], div[id*="kpi_"][id$="_container"]';
              const highlightClasses = ['ring-2', 'ring-blue-400', 'ring-blue-400', 'ring-opacity-60', 'shadow-lg', 'scale-[1.02]', 'bg-blue-50/40', 'bg-green-50/40', 'selected-chart', 'selected-kpi', 'ring-1', 'ring-blue-300', 'ring-opacity-40', 'shadow-sm', 'scale-[1.01]', 'bg-blue-50/20', 'bg-green-50/20'];
              
              document.querySelectorAll(combinedSelector).forEach(element => {
                // Remove all possible highlighting classes in one call
                element.classList.remove(...highlightClasses);
                
                // Reset inline styles
                element.style.transition = 'all 0.2s ease-out';
                element.style.borderRadius = CHART_BORDER_RADIUS.DEFAULT; // Reset to default rounded
                element.style.transform = '';
                element.style.boxShadow = '';
                element.style.backgroundColor = '';
                element.style.border = '';
              });
            }

            // Listen for chart and KPI edit start messages from parent
            window.addEventListener('message', (event) => {
              if (event.data.type === 'chart-edit') {
                const { chartId } = event.data;
                
                // First remove all highlighting, then add to new chart
                removeAllHighlighting();
                setTimeout(() => {
                  highlightEditedChart(chartId);
                }, HIGHLIGHT_TIMEOUT); // Timeout to ensure proper cleanup
              } else if (event.data.type === 'kpi-edit') {
                const { kpiId } = event.data;
                  
                // First remove all highlighting, then add to new KPI
                removeAllHighlighting();
                setTimeout(() => {
                  highlightEditedKPI(kpiId);
                }, HIGHLIGHT_TIMEOUT); // Timeout to ensure proper cleanup
              } else if (event.data.type === 'kpi-saved') {
                const { kpiId } = event.data;
                
                // Clear pending status and reset value styling
                const valueElement = document.getElementById(kpiId + '_value');
                if (valueElement && valueElement.textContent === 'Save to update') {
                  valueElement.style.fontStyle = 'normal';
                  valueElement.style.opacity = '1';
                  valueElement.textContent = 'Loading...';
                  
                  // Trigger a refresh of the KPI value
                  setTimeout(() => {
                    if (window.updateKPI) {
                      try {
                        window.updateKPI(kpiId);
                      } catch (error) {
                        console.error('Error refreshing KPI after save:', error);
                        valueElement.textContent = 'Error';
                      }
                    }
                  }, 100);
                }
              } else if (event.data.type === 'remove-highlighting') {
                // Remove highlighting from all charts and KPIs
                removeAllHighlighting();
              }
            });

              // Listen for chart and KPI update messages from parent
              window.addEventListener('message', (event) => {
               if (event.data.type === 'update-kpi-data-attributes') {
                const { kpiId, config } = event.data;
                
                // Add highlighting to the currently edited KPI
                highlightEditedKPI(kpiId);
                
                // Update KPI using the new data-attribute system
                try {
                      const container = document.getElementById(kpiId + '_container');
                  if (!container) {
                        console.warn('❌ KPI container not found:', kpiId + '_container');
                    return;
                  }
                  
                  // Update individual data attributes - the MutationObserver will handle re-rendering
                    if (config.name !== undefined) {
                    container.setAttribute('data-name', config.name);
                    }
                    
                    if (config.fa_icon !== undefined) {
                    container.setAttribute('data-fa-icon', config.fa_icon);
                  }
                  
                  if (config.value_formula !== undefined) {
                    container.setAttribute('data-value-formula', config.value_formula);
                  }
                  
                    if (config.format_type !== undefined) {
                    container.setAttribute('data-format-type', config.format_type);
                    }
                    
                    if (config.unit !== undefined) {
                    container.setAttribute('data-unit', config.unit || '');
                  }
                                            
                        } catch (error) {
                  console.error('Error updating KPI data attributes:', error);
                }
              } else if (event.data.type === 'update-chart-data-attributes') {
                const { chartId, config } = event.data;
                
                // Add highlighting to the currently edited chart
                highlightEditedChart(chartId);
                
                // Update chart using the new data-attribute system
                try {
                  const container = document.getElementById(chartId + '_container');
                  if (!container) {
                    console.warn('❌ Chart container not found:', chartId + '_container');
                    return;
                  }
                  
                  // Update individual data attributes - the MutationObserver will handle re-rendering
                  if (config.name !== undefined) {
                    container.setAttribute('data-name', config.name);
                  }
                  
                  if (config.chart_type !== undefined || config.type !== undefined) {
                    container.setAttribute('data-chart-type', config.chart_type || config.type);
                  }
                  
                  if (config.x_axis !== undefined) {
                    container.setAttribute('data-x-axis', JSON.stringify(config.x_axis));
                  }
                  
                  if (config.series_list !== undefined) {
                    container.setAttribute('data-series-list', JSON.stringify(config.series_list));
                  }
                  
                  if (config.style !== undefined) {
                    container.setAttribute('data-style', config.style);
                  }
                  
                  if (config.area !== undefined) {
                    container.setAttribute('data-area', config.area.toString());
                  }
                  
                  if (config.cumulative !== undefined) {
                    container.setAttribute('data-cumulative', config.cumulative.toString());
                  }
                  
                  if (config.top_n !== undefined) {
                    container.setAttribute('data-top-n', config.top_n.toString());
                  }
                  
                  if (config.default_filter_conditions !== undefined) {
                    container.setAttribute('data-default-filter-conditions', JSON.stringify(config.default_filter_conditions));
                  }
                  
                  if (config.original_name !== undefined) {
                    container.setAttribute('data-original-name', config.original_name);
                  }                          
                        } catch (error) {
                  console.error('Error updating chart data attributes:', error);
                }
              } else if (event.data.type === 'kpi-pending-changes') {
                const { kpiId, config } = event.data;
                
                // Add highlighting to show KPI is being edited
                highlightEditedKPI(kpiId);
                
                // Show visual feedback without triggering calculations
                try {
                  const container = document.getElementById(kpiId + '_container');
                  if (!container) {
                    console.warn('❌ KPI container not found:', kpiId + '_container');
                    return;
                  }
                  
                  // Update visual elements only (name, icon, and unit) without triggering value calculation
                  const nameElement = container.querySelector('[data-name]') || container.querySelector('.kpi-name') || container.querySelector('h3');
                  const iconElement = container.querySelector('[class*="fa-"]') || container.querySelector('i');
                  const unitElement = container.querySelector('[data-unit]') || container.querySelector('.kpi-unit');
                  
                  if (nameElement && config.name !== undefined) {
                    nameElement.textContent = config.name;
                  }
                  
                  if (iconElement && config.fa_icon !== undefined) {
                    // Update icon class safely
                    const currentClasses = String(iconElement.className || '');
                    iconElement.className = currentClasses.replace(/fa-[a-z-]+/g, '').trim();
                    iconElement.classList.add(config.fa_icon);
                  }
                  
                  if (unitElement && config.unit !== undefined) {
                    unitElement.textContent = config.unit;
                  }
                  
                  // Show "Save to update" message for value to indicate pending changes
                  const valueElement = container.querySelector('[id$="_value"]') || container.querySelector('.kpi-value');
                  if (valueElement) {
                    valueElement.textContent = 'Save to update';
                    valueElement.style.fontStyle = 'italic';
                    valueElement.style.opacity = '0.7';
                  }
                  
                } catch (error) {
                  console.error('Error showing KPI pending changes:', error);
                }
              }
            });

            // Run setup when DOM is ready
            if (document.readyState === "loading") {
              document.addEventListener("DOMContentLoaded", setupChartEditors);
            } else {
              setupChartEditors();
            }
          `;
          iframeDoc.head.appendChild(script);
        }, 500);
      } catch (error) {
        console.error("Error setting up chart editors:", error);
      }
    };

    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
  }, [content]);

  // Send live KPI updates to iframe for dynamic rendering using data attributes
  const updateKPIInIframe = (kpiConfig: KPIConfig) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;

    try {
      // Use the new data-attribute based system
      iframe.contentWindow.postMessage(
        {
          type: "update-kpi-data-attributes",
          kpiId: kpiConfig.id,
          config: kpiConfig,
        },
        "*"
      );
    } catch {
      // Silently handle iframe communication errors
    }
  };

  // Send live dashboard metadata updates to iframe
  const updateDashboardInIframe = (dashboardConfig: DashboardMetadata) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;


    try {
      // Send dashboard metadata updates to iframe (including filters)
      iframe.contentWindow.postMessage(
        {
          type: "update-dashboard-metadata",
          dashboardMetadata: {
            name: dashboardConfig.name,
            description: dashboardConfig.description,
            icon: dashboardConfig.icon,
            theme: dashboardConfig.theme,
            filters: dashboardConfig.filters || []
          },
          forceUpdate: true,
        },
        "*"
      );
      
      // Send specific filter updates (similar to KPI/chart updates)
      if (dashboardConfig.filters && iframe.contentWindow) {
        dashboardConfig.filters.forEach(filter => {
          iframe.contentWindow!.postMessage(
            {
              type: "update-filter-config",
              filterId: filter.id,
              config: filter,
            },
            "*"
          );
        });
      }
      
    } catch (error) {
      console.error('Error sending message to iframe:', error);
    }
  };

  // Send live chart updates to iframe for dynamic rendering using data attributes
  const updateChartInIframe = (chartConfig: ChartConfig) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;

    try {
      // Normalize chart config to ensure compatibility with data attributes
      const normalizedConfig = {
        ...chartConfig,
        chart_type: chartConfig.type,
        type: chartConfig.type,
        // Ensure area and stacked properties are included
        area: chartConfig.area === "area",
        stacked:
          chartConfig.stacked === "stacked"
            ? "stacked"
            : chartConfig.stacked === "100_stacked"
            ? "100% stacked"
            : "none",
        style:
          chartConfig.stacked === "stacked"
            ? "stacked"
            : chartConfig.stacked === "100_stacked"
            ? "100% stacked"
            : "default",
      };

      // Use the new data-attribute based system
      iframe.contentWindow.postMessage(
        {
          type: "update-chart-data-attributes",
          chartId: chartConfig.id,
          config: normalizedConfig,
        },
        "*"
      );
    } catch {
      // Silently handle iframe communication errors
    }
  };

  // Throttle updates to prevent too frequent re-renders
  const throttledUpdateRef = useRef<NodeJS.Timeout | null>(null);

  // Update chart property and trigger live re-render
  const updateChartProperty = (property: keyof ChartConfig, value: string) => {
    if (!editedChart) return;

    const updatedChart = { ...editedChart, [property]: value };
    
    // For name changes, just update the data attributes - keep ID stable for real-time updates
    if (property === "name") {
      setEditedChart(updatedChart);
      markAsChanged();
      updateChartInIframe(updatedChart);
      return;
    }
    
    setEditedChart(updatedChart);
    markAsChanged();

    // For chart type changes, update immediately without throttling
    if (property === "type") {
      // If changing to scatter or radar plot, set aggregation to "none" for all series
      if (value === "scatter" || value === "radar") {
        updatedChart.series_list = updatedChart.series_list.map(series => ({
          ...series,
          aggregation: "none"
        }));
        setEditedChart(updatedChart);
      }
      updateChartInIframe(updatedChart);
    } else {
      // Throttle other updates to prevent too many rapid calls
      if (throttledUpdateRef.current) {
        clearTimeout(throttledUpdateRef.current);
      }

      throttledUpdateRef.current = setTimeout(() => {
        updateChartInIframe(updatedChart);
      }, 150); // 150ms delay to allow for rapid typing
    }
  };

  // Update chart option property and trigger live re-render
  const updateChartOption = (property: keyof ChartConfig, value: string) => {
    if (!editedChart) return;

    const updatedChart = { ...editedChart, [property]: value };
    setEditedChart(updatedChart);
    markAsChanged();
    updateChartInIframe(updatedChart);
  };

  // Update nested property (like x_axis.column) and trigger live re-render
  const updateNestedProperty = (
    parentProperty: keyof ChartConfig,
    nestedProperty: string,
    value: string
  ) => {
    if (!editedChart) return;

    const updatedChart = {
      ...editedChart,
      [parentProperty]: {
        ...(editedChart[parentProperty] as Record<string, unknown>),
        [nestedProperty]: value,
      },
    };
    setEditedChart(updatedChart);
    markAsChanged();

    // Throttle the iframe updates
    if (throttledUpdateRef.current) {
      clearTimeout(throttledUpdateRef.current);
    }

    throttledUpdateRef.current = setTimeout(() => {
      updateChartInIframe(updatedChart);
    }, 150);
  };

  // Update series item and trigger live re-render
  const updateSeriesProperty = (
    seriesIndex: number,
    property: keyof ChartConfig["series_list"][0],
    value: string
  ) => {
    if (!editedChart) return;

    const updatedSeries = [...editedChart.series_list];
    updatedSeries[seriesIndex] = {
      ...updatedSeries[seriesIndex],
      [property]: value,
    };

    const updatedChart = { ...editedChart, series_list: updatedSeries };
    setEditedChart(updatedChart);
    markAsChanged();

    // Throttle the iframe updates
    if (throttledUpdateRef.current) {
      clearTimeout(throttledUpdateRef.current);
    }

    throttledUpdateRef.current = setTimeout(() => {
      updateChartInIframe(updatedChart);
    }, 150);
  };

  // Add a new series
  const addSeries = () => {
    if (!editedChart) return;

    const newSeries = {
      name: `Series ${editedChart.series_list.length + 1}`,
      column: "",
      aggregation: editedChart.type === "scatter" || editedChart.type === "radar" ? "none" : "sum",
    };

    const updatedChart = {
      ...editedChart,
      series_list: [...editedChart.series_list, newSeries],
      // Ensure default values exist
      area: editedChart.area || "none",
      stacked: editedChart.stacked || "none",
    };

    setEditedChart(updatedChart);
    markAsChanged();
    updateChartInIframe(updatedChart);
  };

  // Delete a series
  const deleteSeries = (seriesIndex: number) => {
    if (!editedChart || editedChart.series_list.length <= 1) return; // Keep at least one series

    const updatedSeries = editedChart.series_list.filter(
      (_, index) => index !== seriesIndex
    );
    const updatedChart = { ...editedChart, series_list: updatedSeries };

    setEditedChart(updatedChart);
    markAsChanged();
    updateChartInIframe(updatedChart);
  };

  // Update KPI property with real-time updates for all properties
  const updateKPIProperty = (property: keyof KPIConfig, value: string) => {
    if (!editedKPI) return;

    const updatedKPI = { ...editedKPI, [property]: value };
    
    // For name changes, just update the data attributes - keep ID stable for real-time updates
    if (property === "name") {
      setEditedKPI(updatedKPI);
      markAsChanged();
      updateKPIInIframe(updatedKPI);
      return;
    }
    
    setEditedKPI(updatedKPI);
    markAsChanged();

    // Update all properties in real-time
    updateKPIInIframe(updatedKPI);
  };

  // Update dashboard property with real-time updates
  const updateDashboardProperty = (property: keyof DashboardMetadata, value: string | Array<{id: string; name: string; type: string; values_formula: string}>) => {
    if (!editedDashboard) return;
    const updatedDashboard = { ...editedDashboard, [property]: value };
    
    setEditedDashboard(updatedDashboard);
    markAsChanged();

    // Update dashboard in real-time
    updateDashboardInIframe(updatedDashboard);
  };

  const handleSaveChart = async () => {
    if (!editedChart || isSaving) return;

    setIsSaving(true);
    
    // Close sidebar immediately for better responsiveness
    setIsEditorOpen(false);
    setEditedChart(null);
    setEditedKPI(null);
    setOriginalChartState(null);
    setOriginalKPIState(null);
    setHasUnsavedChanges(false);

    // Start tracking save operation
    saveInProgressRef.current = true;

    try {
      // Create chart config with updated ID for saving, but keep original ID for finding
      const newId = `chart_${editedChart.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const chartToSave = {
        ...editedChart,
        id: newId,
        originalId: editedChart.id // Keep track of original ID for finding the element
      };

      // Use raw PXML content for updating if available
      const contentToUpdate = sanitizedRawPXMLContent || rawPXMLContent || content;

      const updatedContent = updatePXMLWithChart(contentToUpdate, chartToSave);

      const decodedUpdatedContent = decodeXmlEntities(updatedContent);
      
      // Don't call onChange during save - the onSave callback will handle the content update
      // onChange(updatedContent);

      // Update the stored raw PXML content
      if (rawPXMLContent) {
        setSanitizedRawPXMLContent(updatedContent);
        setRawPXMLContent(decodedUpdatedContent);
      }

      // Store the saved content for comparison
      lastSavedContentRef.current = updatedContent;

      // Trigger save to server if onSave callback is provided
      if (onSave) {
        await onSave(decodedUpdatedContent);
      }

      // Send message to iframe to refresh the chart after save
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: "chart-saved",
            chartId: newId,
          },
          "*"
        );

        // If the ID changed, also update the container ID in the iframe
        if (editedChart.id !== newId) {
          iframe.contentWindow.postMessage(
            {
              type: "update-container-id-after-save",
              oldId: editedChart.id,
              newId: newId,
              componentType: "chart"
            },
            "*"
          );
        }
      }

      // State already cleared at the beginning of save for responsiveness
    } catch (error) {
      console.error("Failed to save chart changes:", error);
      // Don't close the editor if save failed
    } finally {
      setIsSaving(false);
      
      // End save operation tracking
      saveInProgressRef.current = false;
    }
  };

  const handleSaveKPI = async () => {
    if (!editedKPI || isSaving) return;

    setIsSaving(true);
    
    // Close sidebar immediately for better responsiveness
    setIsEditorOpen(false);
    setEditedChart(null);
    setEditedKPI(null);
    setOriginalChartState(null);
    setOriginalKPIState(null);
    setHasUnsavedChanges(false);

    // Start tracking save operation
    saveInProgressRef.current = true;

    try {
      // Create KPI config with updated ID for saving, but keep original ID for finding
      const newId = `kpi_${editedKPI.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const kpiToSave = {
        ...editedKPI,
        id: newId,
        originalId: editedKPI.id // Keep track of original ID for finding the element
      };

      // Use raw PXML content for updating if available
      const contentToUpdate = sanitizedRawPXMLContent || rawPXMLContent || content;

      const updatedContent = updatePXMLWithKPI(contentToUpdate, kpiToSave);
      

      const decodedUpdatedContent = decodeXmlEntities(updatedContent);
      // Don't call onChange during save - the onSave callback will handle the content update
      // onChange(updatedContent);

      // Update the stored raw PXML content
      if (rawPXMLContent) {
        setSanitizedRawPXMLContent(updatedContent);
        setRawPXMLContent(decodedUpdatedContent);
      }

      // Store the saved content for comparison
      lastSavedContentRef.current = updatedContent;

      // Trigger save to server if onSave callback is provided
      if (onSave) {
        await onSave(decodedUpdatedContent);
      }

      // Send message to iframe to refresh the KPI after save
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: "kpi-saved",
            kpiId: newId,
          },
          "*"
        );

        // If the ID changed, also update the container ID in the iframe
        if (editedKPI.id !== newId) {
          iframe.contentWindow.postMessage(
            {
              type: "update-container-id-after-save",
              oldId: editedKPI.id,
              newId: newId,
              componentType: "kpi"
            },
            "*"
          );
        }
      }

      // State already cleared at the beginning of save for responsiveness
    } catch (error) {
      console.error("Failed to save KPI changes:", error);
      // Don't close the editor if save failed
    } finally {
      setIsSaving(false);
      
      // End save operation tracking
      saveInProgressRef.current = false;
    }
  };

  const handleSaveDashboard = async () => {
    if (!editedDashboard || isSaving) return;
    setIsSaving(true);
    
    // Close sidebar immediately for better responsiveness
    setIsDashboardSettingsOpen(false);
    setIsFiltersOpen(false);
    setEditedChart(null);
    setEditedKPI(null);
    setEditedDashboard(null);
    setOriginalChartState(null);
    setOriginalKPIState(null);
    setOriginalDashboardState(null);
    setHasUnsavedChanges(false);

    // Start tracking save operation
    saveInProgressRef.current = true;

    try {
      // Use raw PXML content for updating if available
      const contentToUpdate = rawPXMLContent || content;

      const updatedContent = updatePXMLWithDashboard(contentToUpdate, editedDashboard);

      const decodedUpdatedContent = decodeXmlEntities(updatedContent);
      
      // Update the stored raw PXML content
      if (rawPXMLContent) {
        setSanitizedRawPXMLContent(updatedContent);
        setRawPXMLContent(decodedUpdatedContent);
      }

      // Store the saved content for comparison
      lastSavedContentRef.current = updatedContent;
      
      // Don't call onChange during save - the onSave callback will handle the content update
      // onChange(updatedContent);
      
      // Trigger save to server if onSave callback is provided
      if (onSave) {
        await onSave(decodedUpdatedContent);
      }

      // Send message to iframe that dashboard was saved
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: "dashboard-saved",
            dashboardMetadata: editedDashboard,
          },
          "*"
        );
        
        // Also send updated filter configuration to iframe
        if (editedDashboard.filters && editedDashboard.filters.length > 0) {
          iframe.contentWindow.postMessage(
            {
              type: "update-dashboard-metadata",
            dashboardMetadata: editedDashboard,
          },
          "*"
        );
        }
      }
    } catch (error) {
      console.error("Error saving dashboard:", error);
    } finally {
      setIsSaving(false);
      // End save operation tracking
      saveInProgressRef.current = false;
    }
  };

  const handleCloseEditor = () => {
    if (hasUnsavedChanges) {
      setPendingAction("close");
      setShowConfirmDialog(true);
      return;
    }

    closeEditorImmediate();
  };

  const closeEditorImmediate = () => {
    setIsEditorOpen(false);
    setEditedChart(null);
    setEditedKPI(null);
    setEditedDashboard(null);
    setOriginalChartState(null);
    setOriginalKPIState(null);
    setOriginalDashboardState(null);
    setHasUnsavedChanges(false);

    // Send message to iframe to remove highlighting
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: "remove-highlighting",
        },
        "*"
      );
    }
  };

  // Handle closing dashboard settings sidebar
  const handleCloseDashboardSettings = () => {
    if (hasUnsavedChanges && editedDashboard) {
      setPendingAction("close");
      setShowConfirmDialog(true);
    } else {
      setIsDashboardSettingsOpen(false);
    }
  };

  // Handle closing filters sidebar
  const handleCloseFilters = () => {
    if (hasUnsavedChanges && editedDashboard) {
      setPendingAction("close");
      setShowConfirmDialog(true);
    } else {
      setIsFiltersOpen(false);
    }
  };

  // Handle confirmation dialog
  const handleConfirmDiscard = () => {
    setShowConfirmDialog(false);
    setHasUnsavedChanges(false);

    if (pendingAction === "close") {
      // Revert to original state before closing
      if (originalChartState) {
        setEditedChart({ ...originalChartState });
        updateChartInIframe(originalChartState);
      }
      if (originalKPIState) {
        setEditedKPI({ ...originalKPIState });
        updateKPIInIframe(originalKPIState);
      }
      if (originalDashboardState) {
        setEditedDashboard({ ...originalDashboardState });
        updateDashboardInIframe(originalDashboardState);
      }
      
      // Close the appropriate sidebar
      if (isDashboardSettingsOpen) {
        setIsDashboardSettingsOpen(false);
      } else if (isFiltersOpen) {
        setIsFiltersOpen(false);
      } else {
      closeEditorImmediate();
      }
    } else if (pendingAction === "switch" && pendingChartData) {
      // Revert current chart to original state first
      if (originalChartState) {
        updateChartInIframe(originalChartState);
      }
      if (originalKPIState) {
        updateKPIInIframe(originalKPIState);
      }

      // Then switch to new chart
      setEditedChart({ ...pendingChartData });
      setEditedKPI(null);
      setOriginalChartState({ ...pendingChartData }); // Store new original state
      setOriginalKPIState(null);
      setIsEditorOpen(true);

      // Send message to iframe to highlight the new chart
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: "chart-edit",
            chartId: pendingChartData.id,
          },
          "*"
        );
      }
    } else if (pendingAction === "switch" && pendingKPIData) {
      // Revert current KPI to original state first
      if (originalKPIState) {
        updateKPIInIframe(originalKPIState);
      }
      if (originalChartState) {
        updateChartInIframe(originalChartState);
      }

      // Then switch to new KPI
      setEditedKPI({ ...pendingKPIData });
      setEditedChart(null);
      setOriginalKPIState({ ...pendingKPIData }); // Store new original state
      setOriginalChartState(null);
      setIsEditorOpen(true);

      // Send message to iframe to highlight the new KPI
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: "kpi-edit",
            kpiId: pendingKPIData.id,
          },
          "*"
        );
      }
    } else if (pendingAction === "switch") {
      // Handle switching between different editing modes
      // Revert current state to original
      if (originalChartState) {
        updateChartInIframe(originalChartState);
      }
      if (originalKPIState) {
        updateKPIInIframe(originalKPIState);
      }
      if (originalDashboardState) {
        updateDashboardInIframe(originalDashboardState);
      }
      
      // Clear all editing states
      setEditedChart(null);
      setEditedKPI(null);
      setEditedDashboard(null);
      setOriginalChartState(null);
      setOriginalKPIState(null);
      setOriginalDashboardState(null);
      setIsEditorOpen(false);
      setIsDashboardSettingsOpen(false);
      setIsFiltersOpen(false);
      
      // Clear selection in iframe
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "clear-selection" }, "*");
      }
      
      // Execute the pending switch action
      if (pendingSwitchAction === "dashboard-settings") {
        const contentToParse = rawPXMLContent || content;
        setEditedDashboard(parseDashboardFromPXML(contentToParse));
        setIsDashboardSettingsOpen(true);
      } else if (pendingSwitchAction === "filters") {
        const contentToParse = rawPXMLContent || content;
        setEditedDashboard(parseDashboardFromPXML(contentToParse));
        setIsFiltersOpen(true);
      }
    }

    // Handle chart switching after confirmation
    if (pendingChartData) {
      // Revert current state to original first
      if (originalChartState) {
        updateChartInIframe(originalChartState);
      }
      if (originalKPIState) {
        updateKPIInIframe(originalKPIState);
      }
      if (originalDashboardState) {
        updateDashboardInIframe(originalDashboardState);
      }
      
      // Then switch to new chart
      const chartWithDefaults = {
        ...pendingChartData,
        area: pendingChartData.area || "none",
        stacked: pendingChartData.stacked || "none",
      };
      setEditedChart({ ...chartWithDefaults });
      setEditedKPI(null);
      setEditedDashboard(null);
      setOriginalChartState({ ...chartWithDefaults });
      setOriginalKPIState(null);
      setOriginalDashboardState(null);
      setIsEditorOpen(true);
      setIsDashboardSettingsOpen(false);
      setIsFiltersOpen(false);
      
      // Send message to iframe to highlight the chart
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: "chart-edit",
            chartId: pendingChartData.id,
          },
          "*"
        );
      }
    }

    // Handle KPI switching after confirmation
    if (pendingKPIData) {
      // Revert current state to original first
      if (originalChartState) {
        updateChartInIframe(originalChartState);
      }
      if (originalKPIState) {
        updateKPIInIframe(originalKPIState);
      }
      if (originalDashboardState) {
        updateDashboardInIframe(originalDashboardState);
      }
      
      // Then switch to new KPI
      setEditedKPI({ ...pendingKPIData });
      setEditedChart(null);
      setEditedDashboard(null);
      setOriginalKPIState({ ...pendingKPIData });
      setOriginalChartState(null);
      setOriginalDashboardState(null);
      setIsEditorOpen(true);
      setIsDashboardSettingsOpen(false);
      setIsFiltersOpen(false);
      
      // Send message to iframe to highlight the KPI
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: "kpi-edit",
            kpiId: pendingKPIData.id,
          },
          "*"
        );
      }
    }

    setPendingAction(null);
    setPendingChartData(null);
    setPendingKPIData(null);
    setPendingSwitchAction(null);
  };

  const handleCancelDiscard = () => {
    setShowConfirmDialog(false);
    setPendingAction(null);
    setPendingChartData(null);
    setPendingKPIData(null);
    setPendingSwitchAction(null);
  };

  // Fetch compiled HTML version when we have raw PXML
  const fetchCompiledVersion = useCallback(async () => {
    setIsCompiling(true);
    setCompilationError(null);

    try {
      if (!artifact) {
        throw new Error("No artifact available for compilation");
      }

      const artifactId = artifact.id;
      const filename = artifact.filepath;

      // Get compiled version (without ?raw=true)
      const compiledUrl = `/creations/${artifactId}/${filename}`;

      const response = await fetch(compiledUrl, {
        headers: { Accept: "text/html" },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch compiled version: ${response.status} ${response.statusText}`
        );
      }

      const compiledHtml = await response.text();

      setCompiledContent(compiledHtml);
    } catch (error) {
      console.error("❌ Error fetching compiled version:", error);
      setCompilationError(
        error instanceof Error ? error.message : "Compilation failed"
      );
      setCompiledContent(content); // Fallback to raw content
    } finally {
      setIsCompiling(false);
    }
  }, [artifact, content]);

  // Fetch raw PXML for editing when we have compiled HTML
  const fetchRawPXMLForEditing = useCallback(async () => {
    try {
      if (!artifact) {
        return;
      }

      const artifactId = artifact.id;
      const filename = artifact.filepath;

      // Get raw version (with ?raw=true)
      const rawUrl = `/creations/${artifactId}/${filename}?raw=true`;

      // Use same headers as artifact viewer
      const { getApiHeaders } = await import("../../lib/api/common");
      const apiHeaders = await getApiHeaders();


      const response = await fetch(rawUrl, {
        headers: {
          ...apiHeaders,
          Accept: "application/xml,text/xml,text/plain",
        },
      });

      if (!response.ok) {
        return;
      }

      const rawPXML = await response.text();

      // Verify it's actually PXML before storing
      if (!rawPXML.trim().startsWith(PXML_FILE_START_TAG)) {
        return;
      }

      // Store the raw PXML for chart editing
      setSanitizedRawPXMLContent(rawPXML);
      setRawPXMLContent(decodeXmlEntities(rawPXML));
    } catch {}
  }, [artifact]);

  // Compile PXML to HTML when content changes
  useEffect(() => {
    const hasArtifact = !!artifact;

    // Skip recompilation if this is an internal update from saving
    const isSameAsLastSaved = lastSavedContentRef.current && content === lastSavedContentRef.current;
    const shouldSkip = saveInProgressRef.current || isSameAsLastSaved;
    
    if (shouldSkip) {
      return;
    }

    if ((content.trim().startsWith(PXML_FILE_START_TAG) || content.trim().startsWith("<dashboard>")) && hasArtifact) {
      // We have raw PXML - store it and get the compiled version for display
      setSanitizedRawPXMLContent(content);
      setRawPXMLContent(decodeXmlEntities(content));
      fetchCompiledVersion();
    } else if (content.trim().startsWith(PXML_COMPILED_START_TAG) && hasArtifact) {
      // We have compiled HTML - use it directly but also fetch raw PXML for editing
      setCompiledContent(content);
      fetchRawPXMLForEditing();
    } else {
      setCompiledContent(content);
      setSanitizedRawPXMLContent(null);
      setRawPXMLContent(null); // Clear raw PXML for non-PXML content
    }
  }, [content, artifact, fetchCompiledVersion, fetchRawPXMLForEditing]);

  // Get content to display in iframe
  const getDisplayContent = () => {
    if (isCompiling) {
      return `
        <html>
          <body style="font-family: system-ui; padding: 20px; text-align: center;">
            <h2>📊 Compiling Dashboard...</h2>
            <p>Please wait while we prepare your dashboard for editing.</p>
          </body>
        </html>
      `;
    }

    if (compilationError) {
      return `
        <html>
          <body style="font-family: system-ui; padding: 20px; color: #dc2626;">
            <h2>❌ Compilation Error</h2>
            <p>${compilationError}</p>
          </body>
        </html>
      `;
    }

    return compiledContent || content;
  };

  // Filter management functions
  const addFilter = () => {
    if (editedDashboard) {
      const filterIndex = (editedDashboard.filters?.length || 0) + 1;
      const filterName = `Filter ${filterIndex}`;
      const filterId = `filter_${filterName.toLowerCase().replace(/\s+/g, '_')}_dropdown`;
      
      const newFilter = {
        id: filterId,
        name: filterName,
        type: "list",
        values_formula: "",
      };
      
      const updatedDashboard = {
        ...editedDashboard,
        filters: [...(editedDashboard.filters || []), newFilter],
      };
      
      
      setEditedDashboard(updatedDashboard);
      markAsChanged();
      
      // Update dashboard in real-time
      updateDashboardInIframe(updatedDashboard);
    }
  };

  const removeFilter = (index: number) => {
    if (editedDashboard && editedDashboard.filters) {
      const updatedFilters = editedDashboard.filters.filter((_, i) => i !== index);
      const updatedDashboard = {
        ...editedDashboard,
        filters: updatedFilters,
      };
      
      
      setEditedDashboard(updatedDashboard);
      markAsChanged();
      
      // Update dashboard in real-time
      updateDashboardInIframe(updatedDashboard);
    }
  };

  const updateFilter = (index: number, field: string, value: string) => {
    if (editedDashboard && editedDashboard.filters) {
      
      const updatedFilters = [...editedDashboard.filters];
      updatedFilters[index] = {
        ...updatedFilters[index],
        [field]: value,
      };
      
      // Only update the ID for new filters or if the current ID is generic
      if (field === 'name' && updatedFilters[index].id.startsWith('filter_') && !updatedFilters[index].id.includes('_dropdown') && !updatedFilters[index].id.includes('_button')) {
        const newId = `filter_${value.toLowerCase().replace(/\s+/g, '_')}_dropdown`;
        updatedFilters[index].id = newId;
      }
      
      const updatedDashboard = {
        ...editedDashboard,
        filters: updatedFilters,
      };
      
      
      setEditedDashboard(updatedDashboard);
      markAsChanged();
      
      // Update dashboard in real-time
      updateDashboardInIframe(updatedDashboard);
    }
  };

  // Toolbar component
  const Toolbar = () => (
    <TooltipProvider>
      <div className="sticky top-0 z-10 flex items-center justify-between p-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-1">
          {/* Dashboard Settings Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  // Check if we're switching with unsaved changes
                  if (hasUnsavedChanges && (editedChart || editedKPI || (isFiltersOpen && editedDashboard))) {
                    setPendingAction("switch");
                    setPendingSwitchAction("dashboard-settings");
                    setShowConfirmDialog(true);
                    return;
                  }
                  
                  setIsDashboardSettingsOpen(!isDashboardSettingsOpen);
                  setIsFiltersOpen(false);
                  setEditedChart(null);
                  setEditedKPI(null);
                  setOriginalChartState(null);
                  setOriginalKPIState(null);
                  
                  // Clear selection in iframe
                  const iframe = iframeRef.current;
                  if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({ type: "clear-selection" }, "*");
                  }
                  
                  if (!isDashboardSettingsOpen) {
                    const contentToParse = rawPXMLContent || content;
                    setEditedDashboard(parseDashboardFromPXML(contentToParse));
                  }
                }}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isDashboardSettingsOpen
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Layout className="w-4 h-4" />
                <span>Dashboard Settings</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Configure dashboard name, description, and icon</p>
            </TooltipContent>
          </Tooltip>

          {/* Filters Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  // Check if we're switching with unsaved changes
                  if (hasUnsavedChanges && (editedChart || editedKPI || (isDashboardSettingsOpen && editedDashboard))) {
                    setPendingAction("switch");
                    setPendingSwitchAction("filters");
                    setShowConfirmDialog(true);
                    return;
                  }
                  
                  setIsFiltersOpen(!isFiltersOpen);
                  setIsDashboardSettingsOpen(false);
                  setEditedChart(null);
                  setEditedKPI(null);
                  setOriginalChartState(null);
                  setOriginalKPIState(null);
                  
                  // Clear selection in iframe
                  const iframe = iframeRef.current;
                  if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({ type: "clear-selection" }, "*");
                  }
                  
                  if (!isFiltersOpen) {
                    const contentToParse = rawPXMLContent || content;
                    setEditedDashboard(parseDashboardFromPXML(contentToParse));
                  }
                }}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isFiltersOpen
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Edit Filters</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add and configure interactive filters</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Status */}
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          {hasUnsavedChanges && (
            <span className="flex items-center space-x-1 text-yellow-600">
              <div className="w-2 h-2 bg-yellow-400 rounded-full" />
              <span>Unsaved changes</span>
            </span>
          )}
          {isSaving && (
            <span className="flex items-center space-x-1">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </span>
          )}
        </div>
      </div>
    </TooltipProvider>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <Toolbar />
      
      <div className="flex-1 flex min-h-0">
      {/* Main Dashboard View */}
      <div
        className={`transition-all duration-500 ease-out ${
            isEditorOpen || isDashboardSettingsOpen || isFiltersOpen ? "w-2/3" : "w-full"
          } flex-1 bg-gray-50 min-h-0`}
        style={{
          transitionProperty: "width, flex-basis",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
          {/* Clean Canvas Area */}
          <div className="h-full overflow-auto bg-gray-100">
            <div className="h-full flex justify-center py-8 px-4">
              <div className="relative w-full max-w-7xl h-full group">
              {/* Canvas container */}
              <div className="w-full h-full rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
        <iframe
          ref={iframeRef}
          srcDoc={getDisplayContent()}
                  className="w-full h-full border-0"
          title="Dashboard Preview"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>

              {/* Subtle corner indicators */}
              <div className="absolute top-2 right-2 w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-200 pointer-events-none"></div>
              <div className="absolute bottom-2 right-2 w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-200 pointer-events-none"></div>
              <div className="absolute bottom-2 left-2 w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-200 pointer-events-none"></div>
              <div className="absolute top-2 left-2 w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-200 pointer-events-none"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Sidebar */}
      <div
        className={`bg-white border-l border-gray-200 overflow-hidden transition-all duration-300 ease-out h-full ${
          isEditorOpen && (editedChart || editedKPI) || isDashboardSettingsOpen || isFiltersOpen
            ? "w-80 opacity-100"
            : "w-0 opacity-0"
        }`}
        style={{
          transitionProperty: "width, opacity, transform",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Chart/KPI Editor Content */}
        {isEditorOpen && (editedChart || editedKPI) && (
          <div className="h-full flex flex-col">
            {/* Clean Header */}
            <div className="flex h-10 items-center justify-between border-b border-gray-200 px-4 bg-gray-50 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-700">
                  {editedChart ? "Chart Settings" : "KPI Settings"}
                  </h3>
              </div>
              <div className="flex items-center space-x-2">
                {hasUnsavedChanges && (
                  <div className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                    <div className="mr-1 h-1.5 w-1.5 rounded-full bg-yellow-400" />
                    Unsaved
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseEditor}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Clean Content */}
            <div className="flex-1 overflow-y-auto bg-white min-h-0">
              <div className="p-4 space-y-6">
                {editedDashboard && (
                  <>
                    {/* Clean Dashboard Metadata */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Dashboard Properties</h4>
                        <div className="space-y-4">
                          {/* Dashboard Name */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Name</label>
                            <input
                              type="text"
                              value={editedDashboard.name}
                              onChange={(e) => updateDashboardProperty('name', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                          {/* Dashboard Description */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Description</label>
                            <textarea
                              value={editedDashboard.description}
                              onChange={(e) => updateDashboardProperty('description', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none min-h-[80px] resize-none"
                            />
                          </div>
                          {/* Dashboard Icon */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Icon</label>
                            <select
                              value={editedDashboard.icon}
                              onChange={(e) => updateDashboardProperty('icon', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            >
                              {DASHBOARD_ICONS.map((icon) => (
                                <option key={icon.value} value={icon.value}>
                                  {icon.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          {/* Dashboard Theme */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Theme</label>
                            <select
                              value={editedDashboard.theme}
                              onChange={(e) => updateDashboardProperty('theme', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            >
                              {DASHBOARD_THEMES.map((theme) => (
                                <option key={theme.value} value={theme.value}>
                                  {theme.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Notion-style Filters Section */}
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                          Filters
                              </div>
                        <div className="flex items-center justify-between mb-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newFilter = {
                                id: `filter_${Date.now()}`,
                                name: 'New Filter',
                                type: 'list',
                                values_formula: ''
                              };
                              updateDashboardProperty('filters', [...editedDashboard.filters, newFilter]);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Filter
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {editedDashboard.filters.map((filter, index) => (
                            <div key={filter.id} className="p-3 border rounded-md space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">Filter {index + 1}</div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const newFilters = editedDashboard.filters.filter((_, i) => i !== index);
                                    updateDashboardProperty('filters', newFilters);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <label className="text-xs font-medium">Name</label>
                                  <input
                                    type="text"
                                    value={filter.name}
                                    onChange={(e) => {
                                      const newFilters = [...editedDashboard.filters];
                                      newFilters[index].name = e.target.value;
                                      updateDashboardProperty('filters', newFilters);
                                    }}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-medium">Type</label>
                                  <select
                                    value={filter.type}
                                    onChange={(e) => {
                                      const newFilters = [...editedDashboard.filters];
                                      newFilters[index].type = e.target.value;
                                      updateDashboardProperty('filters', newFilters);
                                    }}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  >
                                    {FILTER_TYPES.map((type) => (
                                      <option key={type.value} value={type.value}>
                                        {type.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-medium">Values Formula</label>
                                <textarea
                                  value={unescapeFormula(filter.values_formula)}
                                  onChange={(e) => {
                                    const newFilters = [...editedDashboard.filters];
                                    newFilters[index].values_formula = e.target.value;
                                    updateDashboardProperty('filters', newFilters);
                                  }}
                                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-none font-mono"
                                  placeholder="e.g., =unique(B2:B) or =unique(E2:E)"
                                />
                                <p className="text-xs text-gray-500">
                                  Use Excel-style formulas like =unique(B2:B) to get unique values from column B
                                </p>
                              </div>
                            </div>
                          ))}
                          {editedDashboard.filters.length === 0 && (
                            <div className="text-center py-6 text-muted-foreground text-sm">
                              No filters configured. Click &quot;Add Filter&quot; to create one.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {editedChart && (
                  <>
                    {/* Clean Chart Editor */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Chart Properties</h4>
                        <div className="space-y-4">
                          {/* Chart Title */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              Chart Title
                            </label>
                            <input
                              type="text"
                              value={editedChart.name}
                              onChange={(e) =>
                                updateChartProperty("name", e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              placeholder="Enter chart title"
                            />
                          </div>

                          {/* Chart Type */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              Chart Type
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {CHART_TYPES.map((type) => {
                                const IconComponent = type.icon;
                                const isSelected =
                                  editedChart.type === type.value;
                                return (
                                  <button
                                    key={type.value}
                                    onClick={() =>
                                      updateChartProperty("type", type.value)
                                    }
                                    className={cn(
                                      "group relative flex h-auto flex-col space-y-2 p-3 text-sm border rounded-lg transition-all duration-200 hover:scale-105",
                                      isSelected 
                                        ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 shadow-md ring-2 ring-blue-200" 
                                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm"
                                    )}
                                  >
                                    <div className={cn(
                                      "transition-all duration-200",
                                      isSelected ? "scale-110" : "group-hover:scale-105"
                                    )}>
                                      <IconComponent className="h-4 w-4 mx-auto" />
                                    </div>
                                    <span className="text-xs font-medium">
                                      {type.label}
                                    </span>
                                    {isSelected && (
                                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Chart Options */}
                          <div className="space-y-3">
                            {/* Area Option - Only for line charts */}
                            {editedChart.type === "line" && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                  Area
                                </label>
                                <div className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-600 w-full">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateChartOption("area", "none")
                                    }
                                    className={cn(
                                      "group relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 flex-1",
                                      (editedChart.area || "none") === "none"
                                        ? "bg-white text-gray-900 shadow-md ring-2 ring-blue-200 border border-blue-300"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                                    )}
                                  >
                                    <span className="relative z-10">None</span>
                                    {(editedChart.area || "none") === "none" && (
                                      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 rounded-md"></div>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateChartOption("area", "area")
                                    }
                                    className={cn(
                                      "group relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 flex-1",
                                      (editedChart.area || "none") === "area"
                                        ? "bg-white text-gray-900 shadow-md ring-2 ring-blue-200 border border-blue-300"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                                    )}
                                  >
                                    <span className="relative z-10">Area</span>
                                    {(editedChart.area || "none") === "area" && (
                                      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 rounded-md"></div>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Stacked Option - For bar, line, and radar charts with multiple series */}
                            {(editedChart.type === "bar" ||
                              editedChart.type === "line" ||
                              editedChart.type === "horizontal_bar" ||
                              editedChart.type === "radar" ||
                              editedChart.type === "combo_chart") &&
                              editedChart.series_list.length > 1 && (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    Stacked
                                  </label>
                                  <div className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-600 w-full">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateChartOption("stacked", "none")
                                      }
                                      className={cn(
                                        "group relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 flex-1",
                                        (editedChart.stacked || "none") === "none"
                                          ? "bg-white text-gray-900 shadow-md ring-2 ring-blue-200 border border-blue-300"
                                          : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                                      )}
                                    >
                                      <span className="relative z-10">None</span>
                                      {(editedChart.stacked || "none") === "none" && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 rounded-md"></div>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateChartOption("stacked", "stacked")
                                      }
                                      className={cn(
                                        "group relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 flex-1",
                                        (editedChart.stacked || "none") === "stacked"
                                          ? "bg-white text-gray-900 shadow-md ring-2 ring-blue-200 border border-blue-300"
                                          : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                                      )}
                                    >
                                      <span className="relative z-10">Stacked</span>
                                      {(editedChart.stacked || "none") === "stacked" && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 rounded-md"></div>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateChartOption("stacked", "100_stacked")
                                      }
                                      className={cn(
                                        "group relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 flex-1",
                                        (editedChart.stacked || "none") === "100_stacked"
                                          ? "bg-white text-gray-900 shadow-md ring-2 ring-blue-200 border border-blue-300"
                                          : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                                      )}
                                    >
                                      <span className="relative z-10">100%</span>
                                      {(editedChart.stacked || "none") === "100_stacked" && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 rounded-md"></div>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                    </div>

                      {/* X-Axis Configuration */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                              {getAxisLabel(editedChart.type)}
                          </h4>
                          <div className="space-y-4">
                          <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">
                              {getAxisLabel(editedChart.type)} Name
                            </label>
                            <input
                              type="text"
                              value={editedChart.x_axis.name}
                              onChange={(e) =>
                                updateNestedProperty(
                                  "x_axis",
                                  "name",
                                  e.target.value
                                )
                              }
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              placeholder="Enter axis name"
                            />
                          </div>
                          <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">
                              Column
                            </label>
                            <select
                              value={editedChart.x_axis.column}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (!editedChart) return;

                                // Find the selected column name
                                const selectedColumn =
                                  getAvailableColumns().find(
                                    (col) => col.letter === value
                                  );
                                const columnName = selectedColumn
                                  ? selectedColumn.name
                                  : "";

                                const updatedChart = {
                                  ...editedChart,
                                  x_axis: {
                                    ...editedChart.x_axis,
                                    column: value,
                                    group_by: value,
                                    name: columnName, // Update the name to match the selected column
                                  },
                                };
                                setEditedChart(updatedChart);
                                markAsChanged();
                                updateChartInIframe(updatedChart);
                              }}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            >
                              {getAvailableColumns().map((col) => (
                                <option key={col.letter} value={col.letter}>
                                  {col.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                    </div>
                            </div>
                      
                      {/* Series Configuration */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                            {getSeriesLabel(editedChart.type)} ({editedChart.series_list.length} configured)
                          </h4>
                          <div className="space-y-4">
                          {editedChart.series_list.map((series, index) => (
                            <div
                              key={index}
                                className="rounded border border-gray-200 bg-gray-50/50 p-3 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                  <div className="text-xs font-medium text-gray-600">
                                  {editedChart.type === "line"
                                    ? `Line ${index + 1}`
                                    : editedChart.type === "pie" ||
                                      editedChart.type === "donut"
                                    ? `Value ${index + 1}`
                                    : editedChart.type === "bubble"
                                    ? `Bubble ${index + 1}`
                                    : editedChart.type === "scatter"
                                    ? `Point ${index + 1}`
                                    : editedChart.type === "radar"
                                    ? `Metric ${index + 1}`
                                    : editedChart.type === "combo_chart"
                                    ? index === 0 ? `Bar ${index + 1}` : `Line ${index + 1}`
                                    : `Series ${index + 1}`}
                                </div>
                                <div className="flex items-center space-x-1">
                                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                                  {editedChart.series_list.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteSeries(index)}
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                    {editedChart.type === "line"
                                      ? "Line Name"
                                      : editedChart.type === "pie" ||
                                        editedChart.type === "donut"
                                      ? "Value Name"
                                      : editedChart.type === "bubble"
                                      ? "Bubble Name"
                                      : editedChart.type === "scatter"
                                      ? "Point Name"
                                      : editedChart.type === "radar"
                                      ? "Metric Name"
                                      : editedChart.type === "combo_chart"
                                      ? index === 0 ? "Bar Name" : "Line Name"
                                      : "Series Name"}
                                  </label>
                                  <input
                                    type="text"
                                    value={series.name}
                                    onChange={(e) =>
                                      updateSeriesProperty(
                                        index,
                                        "name",
                                        e.target.value
                                      )
                                    }
                                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    placeholder="Enter series name"
                                  />
                                </div>
                                  <div className={`grid gap-3 ${editedChart.type === "scatter" || editedChart.type === "radar" ? "grid-cols-1" : "grid-cols-2"}`}>
                                  <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">
                                      {editedChart.type === "bubble" ? "Y-Axis Column" : "Column"}
                                    </label>
                                    <select
                                      value={series.column}
                                      onChange={(e) =>
                                        updateSeriesProperty(
                                          index,
                                          "column",
                                          e.target.value
                                        )
                                      }
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    >
                                      <option value="">Select column</option>
                                      {getAvailableColumns().map((col) => (
                                        <option
                                          key={col.letter}
                                          value={col.letter}
                                        >
                                          {col.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  {editedChart.type === "bubble" && (
                                    <div className="space-y-2">
                                      <label className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Size Column (Optional)
                                      </label>
                                      <select
                                        value={series.size_column || ""}
                                        onChange={(e) =>
                                          updateSeriesProperty(
                                            index,
                                            "size_column",
                                            e.target.value
                                          )
                                        }
                                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        <option value="">Use Y-axis values for size</option>
                                        {getAvailableColumns().map((col) => (
                                          <option
                                            key={col.letter}
                                            value={col.letter}
                                          >
                                            {col.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                  {editedChart.type !== "scatter" && editedChart.type !== "radar" && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">
                                        Aggregation
                                      </label>
                                      <select
                                        value={series.aggregation}
                                        onChange={(e) =>
                                          updateSeriesProperty(
                                            index,
                                            "aggregation",
                                            e.target.value
                                          )
                                        }
                                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                      >
                                        {AGGREGATION_TYPES.map((agg) => (
                                          <option
                                            key={agg.value}
                                            value={agg.value}
                                          >
                                            {agg.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Add Series Button */}
                            <button
                            onClick={addSeries}
                              className="w-full border border-dashed border-gray-300 rounded px-3 py-2 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1"
                          >
                              <Plus className="h-3 w-3" />
                              <span>
                            Add{" "}
                            {editedChart.type === "line"
                              ? "Line"
                              : editedChart.type === "pie" ||
                                editedChart.type === "donut"
                              ? "Value"
                              : editedChart.type === "bubble"
                              ? "Bubble"
                              : editedChart.type === "scatter"
                              ? "Point"
                              : editedChart.type === "radar"
                              ? "Metric"
                              : editedChart.type === "combo_chart"
                              ? "Series"
                              : "Series"}
                              </span>
                            </button>
                        </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {editedKPI && (
                  <>
                    {/* Clean KPI Editor */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">KPI Properties</h4>
                        <div className="space-y-4">
                          {/* KPI Name */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              KPI Name
                            </label>
                            <input
                              type="text"
                              value={editedKPI.name}
                              onChange={(e) =>
                                updateKPIProperty("name", e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              placeholder="Enter KPI name"
                            />
                          </div>

                          {/* KPI Icon */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              Icon
                            </label>
                            <select
                              value={editedKPI.fa_icon}
                              onChange={(e) =>
                                updateKPIProperty("fa_icon", e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            >
                              {KPI_ICONS.map((icon) => (
                                <option key={icon.value} value={icon.value}>
                                  {icon.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                    </div>

                      {/* KPI Value Configuration */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                              Value Configuration
                          </h4>
                          <div className="space-y-4">
                          {/* Formula */}
                          <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">
                              Formula
                            </label>
                            <input
                              type="text"
                              value={unescapeFormula(editedKPI.value_formula)}
                              onChange={(e) =>
                                updateKPIProperty(
                                  "value_formula",
                                  e.target.value
                                )
                              }
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              placeholder="e.g., =SUM(G2:G)"
                            />
                          </div>

                          {/* Format */}
                          <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">
                              Format
                            </label>
                            <select
                              value={editedKPI.format_type}
                                onChange={(e) => updateKPIProperty("format_type", e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            >
                              {/* Show custom currency if selected */}
                              {editedKPI.format_type.startsWith("currency:") && !KPI_FORMATS.some(f => f.value === editedKPI.format_type) && (
                                <option value={editedKPI.format_type}>
                                  Currency ({editedKPI.format_type.split(':')[1]?.toUpperCase() || 'CUSTOM'})
                                </option>
                              )}
                              {KPI_FORMATS.map((format) => (
                                <option key={format.value} value={format.value}>
                                  {format.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Unit */}
                          <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">
                              Unit (optional)
                            </label>
                            <input
                              type="text"
                              value={editedKPI.unit}
                              onChange={(e) =>
                                updateKPIProperty("unit", e.target.value)
                              }
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              placeholder="e.g., %, units, etc."
                            />
                          </div>
                        </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Clean Actions */}
            <div className="border-t border-gray-200 bg-gray-50 p-4">
              <div className="flex space-x-3">
                <SaveChangesButton
                  onSave={editedChart ? handleSaveChart : editedKPI ? handleSaveKPI : handleSaveDashboard}
                  className="flex-1"
                />
                <Button onClick={handleCloseEditor} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Settings Content */}
        {isDashboardSettingsOpen && editedDashboard && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex h-10 items-center justify-between border-b border-gray-200 px-4 bg-gray-50 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Dashboard Settings
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                {hasUnsavedChanges && (
                  <div className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                    <div className="mr-1 h-1.5 w-1.5 rounded-full bg-yellow-400" />
                    Unsaved
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseDashboardSettings}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-white min-h-0">
              <div className="space-y-6 p-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Dashboard Properties</h4>
                  <div className="space-y-4">
                    {/* Dashboard Name */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editedDashboard.name}
                        onChange={(e) =>
                          updateDashboardProperty("name", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="Enter dashboard name"
                      />
                    </div>

                    {/* Dashboard Description */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        value={editedDashboard.description}
                        onChange={(e) =>
                          updateDashboardProperty("description", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none min-h-[80px] resize-none"
                        placeholder="Enter dashboard description"
                      />
                    </div>

                    {/* Dashboard Icon */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Icon
                      </label>
                      <select
                        value={editedDashboard.icon}
                        onChange={(e) =>
                          updateDashboardProperty("icon", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        {DASHBOARD_ICONS.map((icon) => (
                          <option key={icon.value} value={icon.value}>
                            {icon.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Sticky */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 p-4 flex-shrink-0">
              <div className="flex space-x-3">
                <SaveChangesButton onSave={handleSaveDashboard} className="flex-1" />
                <Button onClick={handleCloseDashboardSettings} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Filters Content */}
        {isFiltersOpen && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex h-10 items-center justify-between border-b border-gray-200 px-4 bg-gray-50 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Filters
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseFilters}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-white min-h-0">
              <div className="space-y-6 p-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Dashboard Filters</h4>
                  <div className="space-y-4">
                    {(editedDashboard?.filters || []).map((filter, index) => (
                      <div
                        key={index}
                        className="rounded border border-gray-200 bg-gray-50/50 p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium text-gray-700">
                            Filter {index + 1}
                          </h5>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFilter(index)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              Name
                            </label>
                            <input
                              type="text"
                              value={filter.name}
                              onChange={(e) =>
                                updateFilter(index, "name", e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              placeholder="Filter name"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              Type
                            </label>
                            <select
                              value={filter.type}
                              onChange={(e) =>
                                updateFilter(index, "type", e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            >
                              {FILTER_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              Formula
                            </label>
                            <textarea
                              value={unescapeFormula(filter.values_formula)}
                              onChange={(e) =>
                                updateFilter(index, "values_formula", e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none min-h-[80px] resize-none font-mono"
                              placeholder="e.g., =unique(B2:B) or =unique(E2:E)"
                            />
                            <p className="text-xs text-gray-500">
                              Use Excel-style formulas like =unique(B2:B) to get unique values from column B
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <button
                      onClick={addFilter}
                      className="w-full border border-dashed border-gray-300 rounded px-3 py-2 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Filter</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Sticky */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 p-4 flex-shrink-0">
              <div className="flex space-x-3">
                <SaveChangesButton onSave={handleSaveDashboard} className="flex-1" />
                <Button onClick={handleCloseFilters} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg border shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Unsaved Changes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You have unsaved changes to this {editedChart ? "chart" : "KPI"}
                . Are you sure you want to{" "}
                {pendingAction === "close"
                  ? "close the editor"
                  : `switch to another ${pendingChartData ? "chart" : "KPI"}`}
                ? Your changes will be lost.
              </p>
              <div className="flex space-x-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancelDiscard}
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDiscard}
                  size="sm"
                >
                  Discard Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
            </div>
    </div>
  );
};

export default DashboardEditor;
