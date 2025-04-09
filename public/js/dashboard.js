document.addEventListener('DOMContentLoaded', () => {
    // Initialize dashboard on page load
    updateDashboard();

    // Refresh dashboard every 30 seconds
    setInterval(updateDashboard, 30000);
});

async function updateDashboard() {
    try {
        // Safely get elements with null checks
        const totalEl = document.getElementById('totalEmployees');
        const activeEl = document.getElementById('activeEmployees');
        const offboardedEl = document.getElementById('offboardedEmployees');
        const recentOnboardingsEl = document.getElementById('recentOnboardings');

        // Show loading states only if elements exist
        if (totalEl) totalEl.textContent = '...';
        if (activeEl) activeEl.textContent = '...';
        if (offboardedEl) offboardedEl.textContent = '...';
        if (recentOnboardingsEl) {
            recentOnboardingsEl.innerHTML = '<div class="text-center">Loading data...</div>';
        }

        // Clear existing charts if they exist
        const onboardingChartCtx = document.getElementById('onboardingChart')?.getContext('2d');
        const offboardingChartCtx = document.getElementById('offboardingChart')?.getContext('2d');
        
        if (onboardingChartCtx?.chart) {
            onboardingChartCtx.chart.destroy();
        }
        if (offboardingChartCtx?.chart) {
            offboardingChartCtx.chart.destroy();
        }

        // Fetch all data in parallel
        const [statsResponse, trendResponse, reasonsResponse, onboardingsResponse] = await Promise.all([
            fetch('/employee-stats'),
            fetch('/onboarding-trend'),
            fetch('/offboarding-reasons'),
            fetch('/recent-onboardings')
        ]);

        // Check all responses
        if (!statsResponse.ok) throw new Error('Failed to fetch employee stats');
        if (!trendResponse.ok) throw new Error('Failed to fetch onboarding trend');
        if (!reasonsResponse.ok) throw new Error('Failed to fetch offboarding reasons');
        if (!onboardingsResponse.ok) throw new Error('Failed to fetch recent onboardings');

        // Parse JSON responses
        const statsData = await statsResponse.json();
        const trendData = await trendResponse.json();
        const reasonsData = await reasonsResponse.json();
        const onboardingsData = await onboardingsResponse.json();

        // Update counters if elements exist
        if (totalEl) totalEl.textContent = statsData.totalEmployees || 0;
        if (activeEl) activeEl.textContent = statsData.activeEmployees || 0;
        if (offboardedEl) offboardedEl.textContent = statsData.offboardedEmployees || 0;

        // Create Onboarding Trend Chart if canvas exists
        if (onboardingChartCtx) {
            createLineChart(onboardingChartCtx, {
                labels: trendData.map(item => item.month),
                data: trendData.map(item => item.count),
                label: 'Onboardings',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: 'rgba(59, 130, 246, 1)'
            });
        }

        // Create Offboarding Reasons Chart if canvas exists
        if (offboardingChartCtx) {
            createDoughnutChart(offboardingChartCtx, {
                labels: reasonsData.map(item => item.reason === 'other' ? 'Other' : item.reason),
                data: reasonsData.map(item => item.count),
                backgroundColor: [
                    'rgba(255, 159, 64, 0.6)', // voluntary
                    'rgba(239, 68, 68, 0.6)',   // involuntary
                    'rgba(139, 92, 246, 0.6)'    // other
                ]
            });
        }

        // Update Recent Onboardings if container exists
        if (recentOnboardingsEl) {
            updateRecentOnboardings(recentOnboardingsEl, onboardingsData);
        }

    } catch (error) {
        console.error('Dashboard update failed:', error);
        showErrorToUser('Failed to load dashboard data. Please try again later.');
    }
}

function createLineChart(ctx, { labels, data, label, backgroundColor, borderColor }) {
    if (!ctx) return;

    ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

function createDoughnutChart(ctx, { labels, data, backgroundColor }) {
    if (!ctx) return;

    ctx.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColor
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function updateRecentOnboardings(container, onboardings) {
    if (!container) return;

    if (!onboardings || onboardings.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500">No recent onboardings found</div>';
        return;
    }

    container.innerHTML = onboardings.map(emp => `
        <div class="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition duration-200 border-l-4 border-blue-500">
            <div class="flex items-start">
                <div class="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <i class="fas fa-user text-blue-600"></i>
                </div>
                <div>
                    <h3 class="text-lg font-semibold text-blue-600">${emp.name}</h3>
                    <p class="text-gray-600">${emp.e_id} | ${emp.project_id}</p>
                    <p class="text-gray-500">Manager: ${emp.manager_name}</p>
                    <small class="text-gray-400">
                        ${new Date(emp.onboard_date).toLocaleDateString()}
                    </small>
                </div>
            </div>
        </div>
    `).join('');
}

function showErrorToUser(message) {
    const errorContainer = document.getElementById('errorContainer') || createErrorContainer();
    if (errorContainer) {
        errorContainer.innerHTML = `
            <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                <p class="font-bold">Error</p>
                <p>${message}</p>
            </div>
        `;
        setTimeout(() => {
            if (errorContainer) errorContainer.innerHTML = '';
        }, 5000);
    }
}

function createErrorContainer() {
    const container = document.createElement('div');
    container.id = 'errorContainer';
    container.className = 'fixed top-4 right-4 w-80 z-50';
    document.body.appendChild(container);
    return container;
}