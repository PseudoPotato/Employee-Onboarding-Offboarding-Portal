document.addEventListener('DOMContentLoaded', function() {
    // DOM elements with null checks
    const activeTableBody = document.getElementById('activeTableBody');
    const offboardedTableBody = document.getElementById('offboardedTableBody');
    const showActiveBtn = document.getElementById('showActive');
    const showOffboardedBtn = document.getElementById('showOffboarded');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const noResults = document.getElementById('noResults');
    const paginationContainer = document.getElementById('pagination');
    const recordsInfo = document.getElementById('recordsInfo');
    const activeTable = document.getElementById('activeTable');
    const offboardedTable = document.getElementById('offboardedTable');

    // Verify all required elements exist
    if (!activeTableBody || !offboardedTableBody || !showActiveBtn || !showOffboardedBtn || 
        !loadingIndicator || !noResults || !paginationContainer || !recordsInfo) {
        console.error('Critical DOM elements missing');
        showErrorToUser('Application initialization failed. Please refresh the page.');
        return;
    }

    // State variables
    let currentPage = 1;
    let currentSearch = '';
    let currentView = 'active';
    const itemsPerPage = 10;
    let totalRecords = 0;
    let debounceTimer;

    // Initialize
    showActiveEmployees();

    // Event listeners
    showActiveBtn.addEventListener('click', showActiveEmployees);
    showOffboardedBtn.addEventListener('click', showOffboardedEmployees);

    // Add search input event listener if search input exists
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }

    function handleSearchInput(e) {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (currentView === 'active') {
                fetchActiveEmployees(currentPage, currentSearch);
            } else {
                fetchOffboardedEmployees(currentPage, currentSearch);
            }
        }, 500);
    }

    function showActiveEmployees() {
        currentView = 'active';
        updateActiveTabUI();
        fetchActiveEmployees(currentPage, currentSearch);
    }

    function showOffboardedEmployees() {
        currentView = 'offboarded';
        updateActiveTabUI();
        fetchOffboardedEmployees(currentPage, currentSearch);
    }

    function updateActiveTabUI() {
        if (currentView === 'active') {
            activeTable.classList.remove('hidden');
            offboardedTable.classList.add('hidden');
            showActiveBtn.classList.remove('bg-gray-200', 'text-gray-700');
            showActiveBtn.classList.add('bg-blue-500', 'text-white');
            showOffboardedBtn.classList.remove('bg-blue-500', 'text-white');
            showOffboardedBtn.classList.add('bg-gray-200', 'text-gray-700');
        } else {
            activeTable.classList.add('hidden');
            offboardedTable.classList.remove('hidden');
            showOffboardedBtn.classList.remove('bg-gray-200', 'text-gray-700');
            showOffboardedBtn.classList.add('bg-blue-500', 'text-white');
            showActiveBtn.classList.remove('bg-blue-500', 'text-white');
            showActiveBtn.classList.add('bg-gray-200', 'text-gray-700');
        }
    }

    async function fetchActiveEmployees(page = 1, search = '') {
        try {
            showLoading();
            
            const response = await fetch(`/active-employees?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(search)}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.employees || !Array.isArray(data.employees)) {
                throw new Error('Invalid response format');
            }
            
            renderActiveEmployees(data.employees);
            setupPagination(data.total, page, data.pages);
            updateRecordsInfo(data.employees.length, data.total, page);
            
            if (data.employees.length === 0) {
                noResults.classList.remove('hidden');
                activeTableBody.innerHTML = '';
            } else {
                noResults.classList.add('hidden');
            }
        } catch (error) {
            console.error('Fetch error:', {
                error: error,
                message: error.message,
                stack: error.stack
            });
            
            showErrorToUser('Failed to load employee data. Please try again later.');
        } finally {
            hideLoading();
        }
    }

    async function fetchOffboardedEmployees(page = 1, search = '') {
        try {
            showLoading();
            
            const response = await fetch(`/offboarded-employees?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(search)}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.employees || !Array.isArray(data.employees)) {
                throw new Error('Invalid response format');
            }
            
            renderOffboardedEmployees(data.employees);
            setupPagination(data.total, page, data.pages);
            updateRecordsInfo(data.employees.length, data.total, page);
            
            if (data.employees.length === 0) {
                noResults.classList.remove('hidden');
                offboardedTableBody.innerHTML = '';
            } else {
                noResults.classList.add('hidden');
            }
        } catch (error) {
            console.error('Fetch error:', {
                error: error,
                message: error.message,
                stack: error.stack
            });
            
            showErrorToUser('Failed to load offboarded employees. Please try again later.');
        } finally {
            hideLoading();
        }
    }

    function renderActiveEmployees(employees) {
        activeTableBody.innerHTML = employees.map(emp => `
            <tr class="hover:bg-gray-50 transition duration-150">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${emp.e_id}</div>
                    <div class="text-xs text-gray-500">${emp.department || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <i class="fas fa-user text-blue-600"></i>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${emp.name}</div>
                            <div class="text-sm text-gray-500">${emp.position || 'N/A'}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${emp.email}</div>
                    <div class="text-xs text-gray-500 capitalize">${emp.employment_type || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        ${emp.project_id}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${emp.start_date ? new Date(emp.start_date).toLocaleDateString() : 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="initiateOffboarding('${emp.e_id}')" 
                        class="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-150" title="Offboard">
                        <i class="fas fa-user-minus mr-1"></i> Offboard
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function renderOffboardedEmployees(employees) {
        offboardedTableBody.innerHTML = employees.map(emp => `
            <tr class="hover:bg-gray-50 transition duration-150">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${emp.e_id}</div>
                    <div class="text-xs text-gray-500">${emp.department || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                            <i class="fas fa-user-slash text-gray-600"></i>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${emp.name}</div>
                            <div class="text-sm text-gray-500">${emp.position || 'N/A'}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${emp.email}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${emp.reason === 'voluntary' ? 'bg-yellow-100 text-yellow-800' : 
                          emp.reason === 'involuntary' ? 'bg-red-100 text-red-800' : 
                          'bg-purple-100 text-purple-800'}">
                        ${emp.reason === 'other' ? (emp.other_reason || 'Other') : emp.reason}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${emp.offboard_date ? new Date(emp.offboard_date).toLocaleDateString() : 'N/A'}
                    <div class="text-xs text-gray-400">${emp.last_working_day ? new Date(emp.last_working_day).toLocaleDateString() : 'N/A'}</div>
                </td>
            </tr>
        `).join('');
    }

    function setupPagination(total, currentPage, totalPages) {
        const buttonsContainer = paginationContainer.querySelector('div:last-child');
        if (!buttonsContainer) return;
        
        buttonsContainer.innerHTML = '';
        
        if (totalPages <= 1) return;

        // Previous button
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.className = `px-3 py-1 rounded-md ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                if (currentView === 'active') {
                    fetchActiveEmployees(currentPage, currentSearch);
                } else {
                    fetchOffboardedEmployees(currentPage, currentSearch);
                }
            }
        });
        buttonsContainer.appendChild(prevButton);

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            const firstButton = document.createElement('button');
            firstButton.textContent = '1';
            firstButton.className = `px-3 py-1 mx-1 rounded-md ${1 === currentPage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
            firstButton.addEventListener('click', () => {
                currentPage = 1;
                if (currentView === 'active') {
                    fetchActiveEmployees(currentPage, currentSearch);
                } else {
                    fetchOffboardedEmployees(currentPage, currentSearch);
                }
            });
            buttonsContainer.appendChild(firstButton);

            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'px-3 py-1';
                buttonsContainer.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = `px-3 py-1 mx-1 rounded-md ${i === currentPage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
            pageButton.addEventListener('click', () => {
                currentPage = i;
                if (currentView === 'active') {
                    fetchActiveEmployees(currentPage, currentSearch);
                } else {
                    fetchOffboardedEmployees(currentPage, currentSearch);
                }
            });
            buttonsContainer.appendChild(pageButton);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'px-3 py-1';
                buttonsContainer.appendChild(ellipsis);
            }

            const lastButton = document.createElement('button');
            lastButton.textContent = totalPages;
            lastButton.className = `px-3 py-1 mx-1 rounded-md ${totalPages === currentPage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
            lastButton.addEventListener('click', () => {
                currentPage = totalPages;
                if (currentView === 'active') {
                    fetchActiveEmployees(currentPage, currentSearch);
                } else {
                    fetchOffboardedEmployees(currentPage, currentSearch);
                }
            });
            buttonsContainer.appendChild(lastButton);
        }

        // Next button
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.className = `px-3 py-1 rounded-md ${currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                if (currentView === 'active') {
                    fetchActiveEmployees(currentPage, currentSearch);
                } else {
                    fetchOffboardedEmployees(currentPage, currentSearch);
                }
            }
        });
        buttonsContainer.appendChild(nextButton);
    }

    function updateRecordsInfo(currentCount, total, page) {
        const start = ((page - 1) * itemsPerPage) + 1;
        const end = Math.min(page * itemsPerPage, total);
        recordsInfo.textContent = `Showing ${start}-${end} of ${total} records`;
    }

    function showLoading() {
        loadingIndicator.classList.remove('hidden');
        activeTableBody.innerHTML = '';
        offboardedTableBody.innerHTML = '';
    }

    function hideLoading() {
        loadingIndicator.classList.add('hidden');
    }

    function showErrorToUser(message) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'p-4 bg-red-100 text-red-800 rounded-lg mb-4';
        errorContainer.textContent = message;
        document.querySelector('.container').prepend(errorContainer);
        setTimeout(() => errorContainer.remove(), 5000);
    }
});

// Global functions
async function initiateOffboarding(employeeId) {
    const { isConfirmed } = await Swal.fire({
        title: 'Confirm Offboarding',
        text: "Are you sure you want to offboard this employee?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3B82F6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, offboard',
        cancelButtonText: 'Cancel',
        reverseButtons: true
    });
    
    if (isConfirmed) {
        try {
            const response = await fetch(`/initiate-offboard/${employeeId}`);
            
            if (response.ok) {
                const employee = await response.json();
                // Pre-fill the offboarding form with employee details
                window.location.href = `/offboarding?eid=${employee.e_id}&name=${encodeURIComponent(employee.name)}&email=${encodeURIComponent(employee.email)}`;
            } else {
                throw new Error('Failed to initiate offboarding');
            }
        } catch (error) {
            console.error('Offboarding error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Offboarding Failed',
                text: 'Failed to initiate offboarding process',
                confirmButtonColor: '#3B82F6'
            });
        }
    }
}