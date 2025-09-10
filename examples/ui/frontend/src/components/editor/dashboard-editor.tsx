import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Settings,
  BarChart3,
  LineChart,
  PieChart,
  ChevronDown,
  ChevronRight,
  Palette,
  Database,
  TrendingUp,
  Plus,
  Trash2,
  Circle,
  MoreHorizontal,
  Target,
  Loader2,
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
  onChange: (content: string) => void;
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

const CUSTOM_CURRENCIES = [
  { value: "currency:usd", label: "USD - US Dollar" },
  { value: "currency:eur", label: "EUR - Euro" },
  { value: "currency:gbp", label: "GBP - British Pound" },
  { value: "currency:jpy", label: "JPY - Japanese Yen" },
  { value: "currency:cad", label: "CAD - Canadian Dollar" },
  { value: "currency:aud", label: "AUD - Australian Dollar" },
  { value: "currency:chf", label: "CHF - Swiss Franc" },
  { value: "currency:cny", label: "CNY - Chinese Yuan" },
  { value: "currency:inr", label: "INR - Indian Rupee" },
  { value: "currency:brl", label: "BRL - Brazilian Real" },
  { value: "currency:mxn", label: "MXN - Mexican Peso" },
  { value: "currency:krw", label: "KRW - South Korean Won" },
  { value: "currency:sgd", label: "SGD - Singapore Dollar" },
  { value: "currency:hkd", label: "HKD - Hong Kong Dollar" },
  { value: "currency:nok", label: "NOK - Norwegian Krone" },
  { value: "currency:sek", label: "SEK - Swedish Krona" },
  { value: "currency:dkk", label: "DKK - Danish Krone" },
  { value: "currency:pln", label: "PLN - Polish Zloty" },
  { value: "currency:czk", label: "CZK - Czech Koruna" },
  { value: "currency:huf", label: "HUF - Hungarian Forint" },
  { value: "currency:try", label: "TRY - Turkish Lira" },
  { value: "currency:rub", label: "RUB - Russian Ruble" },
  { value: "currency:zar", label: "ZAR - South African Rand" },
  { value: "currency:ils", label: "ILS - Israeli Shekel" },
  { value: "currency:thb", label: "THB - Thai Baht" },
  { value: "currency:php", label: "PHP - Philippine Peso" },
  { value: "currency:idr", label: "IDR - Indonesian Rupiah" },
  { value: "currency:myr", label: "MYR - Malaysian Ringgit" },
  { value: "currency:vnd", label: "VND - Vietnamese Dong" },
  { value: "currency:nzd", label: "NZD - New Zealand Dollar" },
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

const DashboardEditor: React.FC<DashboardEditorProps> = ({
  content,
  artifact,
  onChange, // eslint-disable-line @typescript-eslint/no-unused-vars
  onSave,
  availableColumns = [],
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editedChart, setEditedChart] = useState<ChartConfig | null>(null);
  const [editedKPI, setEditedKPI] = useState<KPIConfig | null>(null);
  const [dynamicColumns, setDynamicColumns] = useState<
    Array<{ letter: string; name: string }>
  >([]);
  const [expandedSections, setExpandedSections] = useState({
    general: true,
    xaxis: true,
    series: true,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<"close" | "switch" | null>(
    null
  );
  const [pendingChartData, setPendingChartData] = useState<ChartConfig | null>(
    null
  );
  const [pendingKPIData, setPendingKPIData] = useState<KPIConfig | null>(null);
  const [originalChartState, setOriginalChartState] =
    useState<ChartConfig | null>(null);
  const [originalKPIState, setOriginalKPIState] = useState<KPIConfig | null>(
    null
  );
  const [editedDashboard, setEditedDashboard] = useState<DashboardMetadata | null>(null);
  const [originalDashboardState, setOriginalDashboardState] = useState<DashboardMetadata | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveInProgressRef = useRef(false);
  const lastSavedContentRef = useRef<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // State for compiled dashboard content (moved up for proper initialization order)
  const [compiledContent, setCompiledContent] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationError, setCompilationError] = useState<string | null>(null);
  const [rawPXMLContent, setRawPXMLContent] = useState<string | null>(null);

  // Parse PXML content to extract chart configurations
  const parseChartsFromPXML = (pxmlContent: string): ChartConfig[] => {
    // Check if content is HTML instead of PXML
    if (
      pxmlContent.trim().startsWith("<!DOCTYPE html>") ||
      pxmlContent.trim().startsWith("<html")
    ) {
      return [];
    }

    const charts: ChartConfig[] = [];
    const parser = new DOMParser();

    try {
      const doc = parser.parseFromString(pxmlContent, "text/xml");

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
  };

  // Parse PXML content to extract KPI configurations
  const parseKPIsFromPXML = (pxmlContent: string): KPIConfig[] => {
    // Check if content is HTML instead of PXML
    if (
      pxmlContent.trim().startsWith("<!DOCTYPE html>") ||
      pxmlContent.trim().startsWith("<html")
    ) {
      return [];
    }

    const kpis: KPIConfig[] = [];
    const parser = new DOMParser();

    try {
      const doc = parser.parseFromString(pxmlContent, "text/xml");

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
  };

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
      
      console.log('Parsed from HTML - name:', name, 'description:', description, 'icon:', icon);
      
      return {
        name,
        description,
        icon,
        theme: "light", 
        filters: []
      };
    } catch (error) {
      console.error("Error parsing dashboard from HTML:", error);
      return defaultMetadata;
    }
  }, []);

  // Parse dashboard metadata from PXML content
  const parseDashboardFromPXML = useCallback((pxmlContent: string): DashboardMetadata => {
    console.log('Parsing dashboard metadata from content:', pxmlContent.substring(0, 500) + '...');
    
    // Check if content is HTML instead of PXML
    if (
      pxmlContent.trim().startsWith("<!DOCTYPE html>") ||
      pxmlContent.trim().startsWith("<html")
    ) {
      console.log('Content is HTML, trying to parse from HTML');
      return parseDashboardFromHTML(pxmlContent);
    }

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
      const doc = parser.parseFromString(pxmlContent, "text/xml");

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
      
      console.log('Searching for dashboard name...');
      console.log('titleEl:', titleEl?.textContent);
      console.log('dashboardEl name attr:', dashboardEl?.getAttribute("name"));
      console.log('nameEl:', nameEl?.textContent);
      console.log('root element name:', rootEl?.getAttribute("name"));
      
      if (titleEl?.textContent?.trim()) {
        dashboardMetadata.name = titleEl.textContent.trim();
        console.log('Using title element:', dashboardMetadata.name);
      } else if (nameEl?.textContent?.trim()) {
        dashboardMetadata.name = nameEl.textContent.trim();
        console.log('Using name element:', dashboardMetadata.name);
      } else if (dashboardEl?.getAttribute("name")?.trim()) {
        dashboardMetadata.name = dashboardEl.getAttribute("name")!.trim();
        console.log('Using dashboard name attribute:', dashboardMetadata.name);
      } else if (rootEl?.getAttribute("name")?.trim()) {
        dashboardMetadata.name = rootEl.getAttribute("name")!.trim();
        console.log('Using root name attribute:', dashboardMetadata.name);
      } else {
        console.log('No dashboard name found, using default');
      }

      // Extract dashboard description
      const descEl = doc.querySelector("description");
      console.log('Searching for description...');
      console.log('descEl:', descEl?.textContent);
      console.log('dashboardEl description attr:', dashboardEl?.getAttribute("description"));
      
      if (descEl?.textContent?.trim()) {
        dashboardMetadata.description = descEl.textContent.trim();
        console.log('Using description element:', dashboardMetadata.description);
      } else if (dashboardEl?.getAttribute("description")?.trim()) {
        dashboardMetadata.description = dashboardEl.getAttribute("description")!.trim();
        console.log('Using dashboard description attribute:', dashboardMetadata.description);
      } else {
        console.log('No description found, using default');
      }

      // Extract dashboard icon (look for fa_icon in PXML)
      const iconEl = doc.querySelector("fa_icon");
      if (iconEl?.textContent) {
        dashboardMetadata.icon = iconEl.textContent;
        console.log('Using fa_icon element:', dashboardMetadata.icon);
      } else if (dashboardEl?.getAttribute("fa_icon")) {
        dashboardMetadata.icon = dashboardEl.getAttribute("fa_icon") || "fa-chart-line";
        console.log('Using dashboard fa_icon attribute:', dashboardMetadata.icon);
      } else {
        console.log('No fa_icon found, using default');
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
        const filterId = filterEl.getAttribute("id") || `filter_${index + 1}`;
        const filterName = filterEl.querySelector("name")?.textContent || `Filter ${index + 1}`;
        const filterType = filterEl.querySelector("type")?.textContent || "list";
        const valuesFormula = filterEl.querySelector("values_formula")?.textContent || "dashboardData.map(d => d.column).filter((v, i, a) => a.indexOf(v) === i)";

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

    console.log('Final parsed dashboard metadata:', dashboardMetadata);
    return dashboardMetadata;
  }, [parseDashboardFromHTML]);

  // Update PXML content with edited chart
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

  // Get columns for dropdowns
  const getAvailableColumns = () => {
    return dynamicColumns.length > 0 ? dynamicColumns : availableColumns;
  };

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
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
          // Check if we're switching to a different chart with unsaved changes
          if (hasUnsavedChanges && editedChart && editedChart.id !== chart.id) {
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
          // Check if we're switching to a different KPI with unsaved changes
          if (hasUnsavedChanges && editedKPI && editedKPI.id !== kpi.id) {
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
        
        // Parse dashboard metadata from existing content
        const contentToParse = rawPXMLContent || content;
        console.log('Content to parse for dashboard metadata:');
        console.log('rawPXMLContent exists:', !!rawPXMLContent);
        console.log('content exists:', !!content);
        console.log('contentToParse preview:', contentToParse?.substring(0, 200) + '...');
        
        const initialDashboard = parseDashboardFromPXML(contentToParse);
        
        setEditedDashboard({ ...initialDashboard });
        setOriginalDashboardState({ ...initialDashboard });
        setIsEditorOpen(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [content, rawPXMLContent, hasUnsavedChanges, editedChart, editedKPI, parseDashboardFromPXML]);

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
                  container.style.boxShadow = "0 0 0 2px rgba(34, 197, 94, 0.3)";
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
                currentKPI.classList.add('ring-2', 'ring-green-400', 'ring-opacity-60', 'shadow-lg', 'scale-[1.02]', 'bg-green-50/40', 'selected-kpi');
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
              const highlightClasses = ['ring-2', 'ring-blue-400', 'ring-green-400', 'ring-opacity-60', 'shadow-lg', 'scale-[1.02]', 'bg-blue-50/40', 'bg-green-50/40', 'selected-chart', 'selected-kpi', 'ring-1', 'ring-blue-300', 'ring-green-300', 'ring-opacity-40', 'shadow-sm', 'scale-[1.01]', 'bg-blue-50/20', 'bg-green-50/20'];
              
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
      // Send dashboard metadata updates to iframe
      iframe.contentWindow.postMessage(
        {
          type: "update-dashboard-metadata",
          dashboardMetadata: dashboardConfig,
          forceUpdate: true,
        },
        "*"
      );
    } catch {
      // Silently handle iframe communication errors
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
      const contentToUpdate = rawPXMLContent || content;

      const updatedContent = updatePXMLWithChart(contentToUpdate, chartToSave);
      
      // Don't call onChange during save - the onSave callback will handle the content update
      // onChange(updatedContent);

      // Update the stored raw PXML content
      if (rawPXMLContent) {
        setRawPXMLContent(updatedContent);
      }

      // Store the saved content for comparison
      lastSavedContentRef.current = updatedContent;

      // Trigger save to server if onSave callback is provided
      if (onSave) {
        await onSave(updatedContent);
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
      const contentToUpdate = rawPXMLContent || content;

      const updatedContent = updatePXMLWithKPI(contentToUpdate, kpiToSave);
      
      // Don't call onChange during save - the onSave callback will handle the content update
      // onChange(updatedContent);

      // Update the stored raw PXML content
      if (rawPXMLContent) {
        setRawPXMLContent(updatedContent);
      }

      // Store the saved content for comparison
      lastSavedContentRef.current = updatedContent;

      // Trigger save to server if onSave callback is provided
      if (onSave) {
        await onSave(updatedContent);
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
    setIsEditorOpen(false);
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
      // For now, we'll just save the metadata to localStorage or handle it via API
      // This would be replaced with actual dashboard metadata update logic
      console.log('Saving dashboard metadata:', editedDashboard);
      
      // Trigger save to server if onSave callback is provided
      if (onSave) {
        await onSave();
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
      closeEditorImmediate();
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
    }

    setPendingAction(null);
    setPendingChartData(null);
    setPendingKPIData(null);
  };

  const handleCancelDiscard = () => {
    setShowConfirmDialog(false);
    setPendingAction(null);
    setPendingChartData(null);
    setPendingKPIData(null);
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
      if (!rawPXML.trim().startsWith("<dashboard>")) {
        return;
      }

      // Store the raw PXML for chart editing
      setRawPXMLContent(rawPXML);
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

    if (content.trim().startsWith("<dashboard>") && hasArtifact) {
      // We have raw PXML - store it and get the compiled version for display
      setRawPXMLContent(content);
      fetchCompiledVersion();
    } else if (content.trim().startsWith("<!DOCTYPE html>") && hasArtifact) {
      // We have compiled HTML - use it directly but also fetch raw PXML for editing
      setCompiledContent(content);
      fetchRawPXMLForEditing();
    } else {
      setCompiledContent(content);
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

  return (
    <div className="h-full flex">
      {/* Main Dashboard View */}
      <div
        className={`transition-all duration-500 ease-out ${
          isEditorOpen ? "w-2/3" : "w-full"
        } flex-1 bg-gray-50`}
        style={{
          transitionProperty: "width, flex-basis",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Clean Canvas Area */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="h-full flex justify-center py-8 px-4">
            <div className="relative w-full max-w-7xl h-[calc(100vh-12rem)] group">
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
              
              {/* Top-Right Three-Dot Menu */}
              <div className="absolute top-4 right-4 z-10">
                <div className="relative group">
                  <button
                    onClick={() => {
                      window.postMessage({ type: "dashboard-edit" }, "*");
                    }}
                    className="w-8 h-8 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:bg-white transition-all duration-200 flex items-center justify-center text-gray-500 hover:text-gray-700 cursor-pointer group"
                  >
                    <Settings className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
                  </button>
                  
                  {/* Tooltip */}
                  <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap">
                      Dashboard Settings
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                    </div>
                  </div>
                </div>
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

      {/* Chart/KPI/Dashboard Editor Sidebar */}
      <div
        className={`bg-white border-l border-gray-200 overflow-hidden transition-all duration-500 ease-out ${
          isEditorOpen && (editedChart || editedKPI || editedDashboard)
            ? "w-1/3 opacity-100"
            : "w-0 opacity-0"
        }`}
        style={{
          transitionProperty: "width, opacity, transform",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {isEditorOpen && (editedChart || editedKPI || editedDashboard) && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex h-12 items-center justify-between border-b border-gray-200 px-4 bg-white">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {editedChart ? "Chart" : editedKPI ? "KPI" : "Dashboard"}
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-white">
              <div className="space-y-1 p-2">
                {editedDashboard && (
                  <>
                    {/* Dashboard Metadata Section */}
                    <div className="border-b border-gray-100 pb-4">
                      <div className="px-2 py-1">
                        <div className="flex items-center space-x-3 mb-4">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <div className="text-left">
                            <div className="text-sm font-medium">Dashboard Settings</div>
                            <div className="text-xs text-muted-foreground">
                              Name, description, icon, and theme
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {/* Dashboard Name */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <input
                              type="text"
                              value={editedDashboard.name}
                              onChange={(e) => updateDashboardProperty('name', e.target.value)}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                          {/* Dashboard Description */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <textarea
                              value={editedDashboard.description}
                              onChange={(e) => updateDashboardProperty('description', e.target.value)}
                              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] resize-none"
                            />
                          </div>
                          {/* Dashboard Icon */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Icon</label>
                            <select
                              value={editedDashboard.icon}
                              onChange={(e) => updateDashboardProperty('icon', e.target.value)}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                            <label className="text-sm font-medium">Theme</label>
                            <select
                              value={editedDashboard.theme}
                              onChange={(e) => updateDashboardProperty('theme', e.target.value)}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                    {/* Dashboard Filters Section */}
                    <div className="rounded-lg border bg-card">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <div className="text-left">
                              <div className="text-sm font-medium">Filters</div>
                              <div className="text-xs text-muted-foreground">
                                Dashboard filtering options
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newFilter = {
                                id: `filter_${Date.now()}`,
                                name: 'New Filter',
                                type: 'list',
                                values_formula: 'dashboardData.map(d => d.column).filter((v, i, a) => a.indexOf(v) === i)'
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
                                  value={filter.values_formula}
                                  onChange={(e) => {
                                    const newFilters = [...editedDashboard.filters];
                                    newFilters[index].values_formula = e.target.value;
                                    updateDashboardProperty('filters', newFilters);
                                  }}
                                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[60px] resize-none font-mono"
                                  placeholder="e.g., dashboardData.map(d =&gt; d.category).filter((v, i, a) =&gt; a.indexOf(v) === i)"
                                />
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
                    {/* General Section */}
                    <div className="rounded-lg border bg-card">
                      <Button
                        variant="ghost"
                        onClick={() => toggleSection("general")}
                        className="w-full justify-between p-4 h-auto font-normal"
                      >
                        <div className="flex items-center space-x-3">
                          <Palette className="h-4 w-4 text-muted-foreground" />
                          <div className="text-left">
                            <div className="text-sm font-medium">General</div>
                            <div className="text-xs text-muted-foreground">
                              Chart title and type
                            </div>
                          </div>
                        </div>
                        {expandedSections.general ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>

                      {expandedSections.general && (
                        <div className="border-t bg-muted/30 p-4 space-y-4">
                          {/* Chart Title */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Chart Title
                            </label>
                            <input
                              type="text"
                              value={editedChart.name}
                              onChange={(e) =>
                                updateChartProperty("name", e.target.value)
                              }
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Enter chart title"
                            />
                          </div>

                          {/* Chart Type */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Chart Type
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {CHART_TYPES.map((type) => {
                                const IconComponent = type.icon;
                                const isSelected =
                                  editedChart.type === type.value;
                                return (
                                  <Button
                                    key={type.value}
                                    variant={isSelected ? "default" : "outline"}
                                    size="sm"
                                    onClick={() =>
                                      updateChartProperty("type", type.value)
                                    }
                                    className={cn(
                                      "flex h-auto flex-col space-y-1 p-3",
                                      !isSelected && "text-muted-foreground"
                                    )}
                                  >
                                    <IconComponent className="h-4 w-4" />
                                    <span className="text-xs">
                                      {type.label}
                                    </span>
                                  </Button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Chart Options */}
                          <div className="space-y-4">
                            {/* Area Option - Only for line charts */}
                            {editedChart.type === "line" && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  Area
                                </label>
                                <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateChartOption("area", "none")
                                    }
                                    className={cn(
                                      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1",
                                      (editedChart.area || "none") === "none"
                                        ? "bg-background text-foreground shadow"
                                        : "hover:bg-muted-foreground/10"
                                    )}
                                  >
                                    None
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateChartOption("area", "area")
                                    }
                                    className={cn(
                                      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1",
                                      (editedChart.area || "none") === "area"
                                        ? "bg-background text-foreground shadow"
                                        : "hover:bg-muted-foreground/10"
                                    )}
                                  >
                                    Area
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
                                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Stacked
                                  </label>
                                  <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateChartOption("stacked", "none")
                                      }
                                      className={cn(
                                        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1",
                                        (editedChart.stacked || "none") ===
                                          "none"
                                          ? "bg-background text-foreground shadow"
                                          : "hover:bg-muted-foreground/10"
                                      )}
                                    >
                                      None
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateChartOption("stacked", "stacked")
                                      }
                                      className={cn(
                                        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1",
                                        (editedChart.stacked || "none") ===
                                          "stacked"
                                          ? "bg-background text-foreground shadow"
                                          : "hover:bg-muted-foreground/10"
                                      )}
                                    >
                                      Stacked
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateChartOption(
                                          "stacked",
                                          "100_stacked"
                                        )
                                      }
                                      className={cn(
                                        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1",
                                        (editedChart.stacked || "none") ===
                                          "100_stacked"
                                          ? "bg-background text-foreground shadow"
                                          : "hover:bg-muted-foreground/10"
                                      )}
                                    >
                                      100%
                                    </button>
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* X-Axis Section */}
                    <div className="rounded-lg border bg-card">
                      <Button
                        variant="ghost"
                        onClick={() => toggleSection("xaxis")}
                        className="w-full justify-between p-4 h-auto font-normal"
                      >
                        <div className="flex items-center space-x-3">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <div className="text-left">
                            <div className="text-sm font-medium">
                              {getAxisLabel(editedChart.type)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {editedChart.type === "horizontal_bar"
                                ? "Value axis configuration"
                                : editedChart.type === "pie" ||
                                  editedChart.type === "donut"
                                ? "Label configuration"
                                : editedChart.type === "bubble" ||
                                  editedChart.type === "scatter"
                                ? "X-axis configuration"
                                : editedChart.type === "radar"
                                ? "Dimension configuration"
                                : editedChart.type === "combo_chart"
                                ? "Category axis configuration"
                                : "Category axis configuration"}
                            </div>
                          </div>
                        </div>
                        {expandedSections.xaxis ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>

                      {expandedSections.xaxis && (
                        <div className="border-t bg-muted/30 p-4 space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Enter axis name"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {getAvailableColumns().map((col) => (
                                <option key={col.letter} value={col.letter}>
                                  {col.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Series Section */}
                    <div className="rounded-lg border bg-card">
                      <Button
                        variant="ghost"
                        onClick={() => toggleSection("series")}
                        className="w-full justify-between p-4 h-auto font-normal"
                      >
                        <div className="flex items-center space-x-3">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <div className="text-left">
                            <div className="text-sm font-medium">
                              {getSeriesLabel(editedChart.type)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {editedChart.series_list.length} configured
                            </div>
                          </div>
                        </div>
                        {expandedSections.series ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>

                      {expandedSections.series && (
                        <div className="border-t bg-muted/30 p-4 space-y-3">
                          {editedChart.series_list.map((series, index) => (
                            <div
                              key={index}
                              className="rounded-md border bg-background p-4 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">
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
                                  <label className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Enter series name"
                                  />
                                </div>
                                <div className={`grid gap-2 ${editedChart.type === "scatter" || editedChart.type === "radar" ? "grid-cols-1" : "grid-cols-2"}`}>
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                                      <label className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                          <Button
                            variant="outline"
                            onClick={addSeries}
                            className="w-full border-dashed"
                            size="sm"
                          >
                            <Plus className="h-4 w-4 mr-2" />
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
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {editedKPI && (
                  <>
                    {/* KPI General Section */}
                    <div className="rounded-lg border bg-card">
                      <Button
                        variant="ghost"
                        onClick={() => toggleSection("general")}
                        className="w-full justify-between p-4 h-auto font-normal"
                      >
                        <div className="flex items-center space-x-3">
                          <Palette className="h-4 w-4 text-muted-foreground" />
                          <div className="text-left">
                            <div className="text-sm font-medium">General</div>
                            <div className="text-xs text-muted-foreground">
                              KPI name and icon
                            </div>
                          </div>
                        </div>
                        {expandedSections.general ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>

                      {expandedSections.general && (
                        <div className="border-t bg-muted/30 p-4 space-y-4">
                          {/* KPI Name */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              KPI Name
                            </label>
                            <input
                              type="text"
                              value={editedKPI.name}
                              onChange={(e) =>
                                updateKPIProperty("name", e.target.value)
                              }
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Enter KPI name"
                            />
                          </div>

                          {/* KPI Icon */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Icon
                            </label>
                            <select
                              value={editedKPI.fa_icon}
                              onChange={(e) =>
                                updateKPIProperty("fa_icon", e.target.value)
                              }
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {KPI_ICONS.map((icon) => (
                                <option key={icon.value} value={icon.value}>
                                  {icon.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* KPI Value Section */}
                    <div className="rounded-lg border bg-card">
                      <Button
                        variant="ghost"
                        onClick={() => toggleSection("xaxis")}
                        className="w-full justify-between p-4 h-auto font-normal"
                      >
                        <div className="flex items-center space-x-3">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <div className="text-left">
                            <div className="text-sm font-medium">
                              Value Configuration
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Formula, format, and unit
                            </div>
                          </div>
                        </div>
                        {expandedSections.xaxis ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>

                      {expandedSections.xaxis && (
                        <div className="border-t bg-muted/30 p-4 space-y-4">
                          {/* Formula */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Formula
                            </label>
                            <input
                              type="text"
                              value={editedKPI.value_formula}
                              onChange={(e) =>
                                updateKPIProperty(
                                  "value_formula",
                                  e.target.value
                                )
                              }
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="e.g., =SUM(G2:G)"
                            />
                          </div>

                          {/* Format */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Format
                            </label>
                            <select
                              value={editedKPI.format_type}
                              onChange={(e) => {
                                if (e.target.value === "currency:custom") {
                                  setShowCurrencyModal(true);
                                } else {
                                  updateKPIProperty("format_type", e.target.value);
                                }
                              }}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Unit (optional)
                            </label>
                            <input
                              type="text"
                              value={editedKPI.unit}
                              onChange={(e) =>
                                updateKPIProperty("unit", e.target.value)
                              }
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="e.g., %, units, etc."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 bg-gray-50/50 p-6">
              <div className="flex space-x-3">
                <Button
                  onClick={editedChart ? handleSaveChart : editedKPI ? handleSaveKPI : handleSaveDashboard}
                  className="flex-1"
                  size="sm"
                  disabled={isSaving || !hasUnsavedChanges}
                >
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button onClick={handleCloseEditor} variant="outline" size="sm">
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

      {/* Custom Currency Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select Currency</h3>
              <button
                onClick={() => setShowCurrencyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-1">
                {CUSTOM_CURRENCIES.map((currency) => (
                  <button
                    key={currency.value}
                    onClick={() => {
                      updateKPIProperty("format_type", currency.value);
                      setShowCurrencyModal(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                  >
                    {currency.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => setShowCurrencyModal(false)}
                className="w-full px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardEditor;
