/**
 * Data Modal Module
 * Handles the data viewer modal functionality with enhanced UI/UX
 */

// Data Modal Functions
let filteredData = [];
let allData = [];
let sortColumn = null;
let sortDirection = 'asc';
let currentPage = 1;
let rowsPerPage = 100; // Increased default for better performance
let isRendering = false;
let renderTimeout = null;
let isLoadingMore = false;
let hasMoreData = true;

function openDataModal() {
    // Store all data for modal - use CSV loader data if available
    if (window.csvLoader && window.csvLoader.isLoaded()) {
        allData = [...window.csvLoader.getData()];
    } else if (window.dashboardData) {
    allData = [...window.dashboardData];
    } else {
        allData = [];
    }
    filteredData = [...allData];
    
    // Set modal title with filename
    const dataSpan = document.querySelector('span[onclick="openDataModal()"]');
    if (dataSpan) {
        const filename = dataSpan.textContent.replace('Data: ', '');
        const titleElement = document.getElementById('modalTitle');
        titleElement.textContent = filename;
        titleElement.title = filename; // Set tooltip to full filename
    }
    
    // Show modal with animation
    const modal = document.getElementById('dataModal');
    modal.classList.remove('hidden');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
    }, 10);
    
    // Initialize data table
    initializeDataTable();
    
    // Focus search input
    setTimeout(() => {
        const searchInput = document.getElementById('dataSearch');
        if (searchInput) searchInput.focus();
    }, 100);
}

function closeDataModal() {
    const modal = document.getElementById('dataModal');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('opacity-100', 'opacity-0');
    }, 200);
}

function initializeDataTable() {
    if (allData.length === 0) {
        showEmptyState();
        return;
    }
    
    // Get column names
    const columns = Object.keys(allData[0]);
    
    // Update counts with better formatting
    document.getElementById('dataRowCount').textContent = `(${allData.length.toLocaleString()} rows)`;
    
    // Helper function to convert column index to Excel-like letter
    function getExcelColumnName(index) {
        let name = '';
        while (index >= 0) {
            name = String.fromCharCode((index % 26) + 65) + name;
            index = Math.floor(index / 26) - 1;
        }
        return name;
    }
    
    // Create table header with improved sorting icons and Excel-like column names
    const headerRow = document.getElementById('dataTableHeader');
    headerRow.innerHTML = columns.map((col, index) => {
        const excelColumnName = getExcelColumnName(index);
        const formattedCol = col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' ');
        const isSorted = sortColumn === col;
        const isAsc = isSorted && sortDirection === 'asc';
        
        return `
            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors duration-150 min-w-0 border-r border-gray-200" 
                onclick="sortTable('${col}')" title="${excelColumnName}: ${formattedCol}" style="max-width: 200px;">
                <div class="flex items-center justify-between min-w-0 w-full">
                    <div class="flex items-center space-x-2 min-w-0 flex-1">
                        <span class="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">${excelColumnName}</span>
                        <span class="truncate min-w-0 flex-1 uppercase tracking-wider" style="max-width: 120px;">${formattedCol}</span>
                    </div>
                    <div class="flex items-center space-x-1 flex-shrink-0 ml-2">
                        ${isSorted ? `
                            <span class="text-xs text-blue-600 font-medium">
                                ${isAsc ? '↑' : '↓'}
                            </span>
                        ` : `
                            <svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                            </svg>
                        `}
                    </div>
                </div>
            </th>
        `;
    }).join('');
    
    // Initialize infinite scroll for large datasets
    if (allData.length > 1000) {
        initializeInfiniteScroll();
        renderInfiniteData();
    } else {
        renderAllData();
    }
}

function showEmptyState() {
    const tbody = document.getElementById('dataTableBody');
    const colCount = document.getElementById('dataTableHeader').children.length;
    tbody.innerHTML = `
        <tr>
            <td colspan="${colCount}" class="px-6 py-12 text-center">
                <div class="flex flex-col items-center space-y-4">
                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <div class="text-gray-500">
                        <p class="text-lg font-medium">No data available</p>
                        <p class="text-sm">The dataset appears to be empty or failed to load.</p>
                    </div>
                </div>
            </td>
        </tr>
    `;
}

function renderAllData() {
    if (isRendering) return;
    isRendering = true;
    
    const tbody = document.getElementById('dataTableBody');
    if (filteredData.length === 0) {
        showEmptyState();
        isRendering = false;
        return;
    }
    
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Process data in chunks to avoid blocking the UI
    const chunkSize = 50;
    let currentIndex = 0;
    
    const processChunk = () => {
        const endIndex = Math.min(currentIndex + chunkSize, filteredData.length);
        
        for (let i = currentIndex; i < endIndex; i++) {
            const row = filteredData[i];
            const tr = document.createElement('tr');
            tr.className = `hover:bg-blue-50 transition-colors duration-150 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`;
            
            Object.values(row).forEach(value => {
                const td = document.createElement('td');
                td.className = 'px-4 py-3 text-sm text-gray-900 border-b border-gray-100 truncate';
                td.style.maxWidth = '200px';
                td.innerHTML = formatCellValue(value);
                tr.appendChild(td);
            });
            
            fragment.appendChild(tr);
        }
        
        currentIndex = endIndex;
        
        if (currentIndex < filteredData.length) {
            // Continue processing in next frame
            requestAnimationFrame(processChunk);
        } else {
            // All data processed, update DOM
            tbody.innerHTML = '';
            tbody.appendChild(fragment);
            document.getElementById('dataRowCount').textContent = `(${filteredData.length.toLocaleString()} rows)`;
            isRendering = false;
        }
    };
    
    processChunk();
}

function initializeInfiniteScroll() {
    const tableContainer = document.querySelector('.overflow-auto.rounded-b-xl');
    if (!tableContainer) return;
    
    // Remove existing scroll listener
    tableContainer.removeEventListener('scroll', handleScroll);
    
    // Add scroll listener for infinite scroll
    tableContainer.addEventListener('scroll', handleScroll);
    
    // Reset pagination state
    currentPage = 1;
    hasMoreData = true;
    isLoadingMore = false;
}

function handleScroll(event) {
    const container = event.target;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    // Load more data when user scrolls to bottom (with 100px buffer)
    if (scrollTop + clientHeight >= scrollHeight - 100 && hasMoreData && !isLoadingMore) {
        loadMoreData();
    }
}

function loadMoreData() {
    if (isLoadingMore || !hasMoreData) return;
    
    isLoadingMore = true;
    
    // Show loading indicator
    showLoadingIndicator();
    
    // Simulate small delay for smooth UX
    setTimeout(() => {
        currentPage++;
        renderInfiniteData();
        isLoadingMore = false;
    }, 100);
}

function showLoadingIndicator() {
    const tbody = document.getElementById('dataTableBody');
    const loadingRow = document.createElement('tr');
    loadingRow.id = 'loadingRow';
    loadingRow.innerHTML = `
        <td colspan="100%" class="px-4 py-8 text-center text-gray-500">
            <div class="flex items-center justify-center space-x-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Loading more data...</span>
            </div>
        </td>
    `;
    tbody.appendChild(loadingRow);
}

function removeLoadingIndicator() {
    const loadingRow = document.getElementById('loadingRow');
    if (loadingRow) {
        loadingRow.remove();
    }
}

function renderInfiniteData() {
    const tbody = document.getElementById('dataTableBody');
    if (filteredData.length === 0) {
        showEmptyState();
        return;
    }
    
    const totalRowsToShow = Math.min(currentPage * rowsPerPage, filteredData.length);
    const startIndex = currentPage === 1 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = totalRowsToShow;
    
    // Check if we have more data
    hasMoreData = endIndex < filteredData.length;
    
    // Remove loading indicator
    removeLoadingIndicator();
    
    // If it's the first page, clear the table
    if (currentPage === 1) {
        tbody.innerHTML = '';
    }
    
    // Get new data to render
    const newData = filteredData.slice(startIndex, endIndex);
    
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    newData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.className = `hover:bg-blue-50 transition-colors duration-150 ${(startIndex + index) % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`;
        
        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.className = 'px-4 py-3 text-sm text-gray-900 border-b border-gray-100 truncate';
            td.style.maxWidth = '200px';
            td.innerHTML = formatCellValue(value);
            tr.appendChild(td);
        });
        
        fragment.appendChild(tr);
    });
    
    tbody.appendChild(fragment);
    
    // Update row count
    document.getElementById('dataRowCount').textContent = `(${filteredData.length.toLocaleString()} rows)`;
}

function formatCellValue(value) {
    if (value === null || value === undefined) return '<span class="text-gray-400 italic">—</span>';
    if (typeof value === 'number') {
        return new Intl.NumberFormat('en-US').format(value);
    }
    if (typeof value === 'string' && value.length > 50) {
        return `<span title="${value.replace(/"/g, '&quot;')}">${value.substring(0, 50)}...</span>`;
    }
    return String(value);
}

function filterDataTable() {
    // Debounce search to avoid excessive filtering
    if (renderTimeout) {
        clearTimeout(renderTimeout);
    }
    
    renderTimeout = setTimeout(() => {
    const searchTerm = document.getElementById('dataSearch').value.toLowerCase();
    
    if (searchTerm === '') {
        filteredData = [...allData];
        } else {
            // Use more efficient filtering for large datasets
            if (allData.length > 10000) {
                filteredData = allData.filter(row => {
                    // Only check first few columns for very large datasets
                    const columnsToCheck = Object.keys(row).slice(0, 5);
                    return columnsToCheck.some(col => 
                        String(row[col]).toLowerCase().includes(searchTerm)
                    );
                });
    } else {
        filteredData = allData.filter(row => {
            return Object.values(row).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            );
        });
    }
        }
        
        // Apply current sorting if any
        if (sortColumn) {
            sortData(sortColumn, sortDirection);
            updateSortHeaders();
        }
        
        // Reset to first page
        currentPage = 1;
        
        // Choose rendering method based on data size
        if (filteredData.length > 1000) {
            initializeInfiniteScroll();
            renderInfiniteData();
        } else {
            renderAllData();
        }
    }, 300); // 300ms debounce
}

function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    sortData(column, sortDirection);
    updateSortHeaders();
    
    // Choose rendering method based on data size
    if (filteredData.length > 1000) {
        initializeInfiniteScroll();
        renderInfiniteData();
    } else {
        renderAllData();
    }
}

function updateSortHeaders() {
    const headerRow = document.getElementById('dataTableHeader');
    if (!headerRow) return;
    
    const headers = headerRow.querySelectorAll('th');
    headers.forEach(header => {
        const columnName = header.getAttribute('onclick')?.match(/sortTable\('([^']+)'\)/)?.[1];
        if (!columnName) return;
        
        const iconContainer = header.querySelector('.flex.items-center.space-x-1');
        if (!iconContainer) return;
        
        const isSorted = sortColumn === columnName;
        const isAsc = isSorted && sortDirection === 'asc';
        
        iconContainer.innerHTML = isSorted ? `
            <span class="text-xs text-blue-600 font-medium">
                ${isAsc ? '↑' : '↓'}
            </span>
        ` : `
            <svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
            </svg>
        `;
    });
}

function sortData(column, direction) {
    filteredData.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        // Handle null/undefined values
        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';
        
        // Convert to strings for comparison
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        
        if (direction === 'asc') {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
    });
}

// Pagination functions removed - using infinite scroll instead

function exportData() {
    // Create CSV content
    if (filteredData.length === 0) {
        alert('No data to export');
        return;
    }
    
    const columns = Object.keys(filteredData[0]);
    const csvContent = [
        columns.join(','),
        ...filteredData.map(row => 
            columns.map(col => {
                const value = row[col];
                // Escape commas and quotes in CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    
    // Create and download file with better naming
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    a.download = `dashboard_data_${timestamp}.csv`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    // Show success message
    showNotification('Data exported successfully!', 'success');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-md shadow-lg transition-all duration-300 transform translate-x-full ${
        type === 'success' ? 'bg-green-500 text-white' : 
        type === 'error' ? 'bg-red-500 text-white' : 
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('dataModal');
    if (event.target === modal) {
        closeDataModal();
    }
});

// Enhanced keyboard shortcuts
document.addEventListener('keydown', function(event) {
    const modal = document.getElementById('dataModal');
    if (modal.classList.contains('hidden')) return;
    
    switch(event.key) {
        case 'Escape':
        closeDataModal();
            break;
        // Arrow key navigation removed (no pagination)
        case 'f':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                const searchInput = document.getElementById('dataSearch');
                if (searchInput) searchInput.focus();
            }
            break;
        case 'e':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                exportData();
            }
            break;
    }
});
