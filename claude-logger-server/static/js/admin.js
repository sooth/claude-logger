// Claude Logger Admin Dashboard

// State management
let currentView = 'dashboard';
let currentPage = 0;
let charts = {};

// Utility functions
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function showError(message) {
    console.error(message);
    // You could add a toast notification here
}

// API calls
async function fetchStats() {
    try {
        const response = await fetch('/api/admin/stats', {
            credentials: 'same-origin'
        });
        if (!response.ok) throw new Error('Failed to fetch stats');
        return await response.json();
    } catch (err) {
        showError('Failed to load statistics');
        return null;
    }
}

async function fetchUsers(page = 0, search = '') {
    try {
        const params = new URLSearchParams({
            limit: 20,
            offset: page * 20
        });
        if (search) params.append('search', search);
        
        const response = await fetch(`/api/admin/users?${params}`, {
            credentials: 'same-origin'
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        return await response.json();
    } catch (err) {
        showError('Failed to load users');
        return null;
    }
}

async function fetchUserDetail(userKey) {
    try {
        const response = await fetch(`/api/admin/user/${userKey}`, {
            credentials: 'same-origin'
        });
        if (!response.ok) throw new Error('Failed to fetch user details');
        return await response.json();
    } catch (err) {
        showError('Failed to load user details');
        return null;
    }
}

// View management
function switchView(viewName) {
    currentView = viewName;
    
    // Update nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.view === viewName);
    });
    
    // Show/hide views
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
    });
    document.getElementById(`${viewName}-view`).style.display = 'block';
    
    // Load view data
    switch (viewName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'users':
            loadUsers();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    const stats = await fetchStats();
    if (!stats) return;
    
    // Update stat cards
    const cards = document.querySelectorAll('.stat-card .value');
    cards[0].textContent = formatNumber(stats.totalUsers);
    cards[1].textContent = formatNumber(stats.totalDevices);
    cards[2].textContent = formatNumber(stats.activeDevices);
    cards[3].textContent = formatNumber(stats.totalTokens);
    
    // Load recent activity (latest users)
    const users = await fetchUsers(0);
    if (users) {
        const activityHtml = users.users.slice(0, 5).map(user => `
            <div class="device-item">
                <h4>User: <span class="user-key">${user.userKey.substring(0, 16)}...</span></h4>
                <div class="device-stats">
                    <div>Devices: ${user.deviceCount}</div>
                    <div>Tokens: ${formatNumber(user.totalTokens)}</div>
                    <div>Last seen: ${formatDate(user.lastSeen)}</div>
                </div>
            </div>
        `).join('');
        
        document.getElementById('recentActivity').innerHTML = activityHtml || '<p>No recent activity</p>';
    }
}

// Users
async function loadUsers(page = 0) {
    currentPage = page;
    const search = document.getElementById('userSearch').value;
    const data = await fetchUsers(page, search);
    if (!data) return;
    
    const tableHtml = `
        <table>
            <thead>
                <tr>
                    <th>User Key</th>
                    <th>Created</th>
                    <th>Last Seen</th>
                    <th>Devices</th>
                    <th>Total Tokens</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${data.users.map(user => `
                    <tr>
                        <td><span class="user-key">${user.userKey.substring(0, 16)}...</span></td>
                        <td>${formatDate(user.createdAt)}</td>
                        <td>${formatDate(user.lastSeen)}</td>
                        <td>${user.deviceCount}</td>
                        <td>${formatNumber(user.totalTokens)}</td>
                        <td>
                            <button onclick="showUserDetail('${user.userKey}')" class="btn-sm">Details</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('usersTable').innerHTML = tableHtml;
    
    // Update pagination
    const paginationHtml = `
        <button onclick="loadUsers(${page - 1})" ${page === 0 ? 'disabled' : ''}>Previous</button>
        <span>Page ${page + 1}</span>
        <button onclick="loadUsers(${page + 1})" ${data.users.length < 20 ? 'disabled' : ''}>Next</button>
    `;
    document.getElementById('usersPagination').innerHTML = paginationHtml;
}

// User detail modal
async function showUserDetail(userKey) {
    document.getElementById('userDetailModal').style.display = 'flex';
    
    const detail = await fetchUserDetail(userKey);
    if (!detail) return;
    
    const devicesHtml = detail.stats.devices.map(device => `
        <div class="device-item">
            <h4>${device.hostname}</h4>
            <div class="device-stats">
                <div>Tokens: ${formatNumber(device.totalTokens)}</div>
                <div>Last seen: ${formatDate(device.lastSeen)}</div>
            </div>
        </div>
    `).join('');
    
    const contentHtml = `
        <div class="user-detail">
            <h3>User Key</h3>
            <p class="user-key">${detail.userKey}</p>
            
            <h3>Statistics</h3>
            <div class="device-stats">
                <div>Created: ${formatDate(detail.createdAt)}</div>
                <div>Last seen: ${formatDate(detail.lastSeen)}</div>
                <div>Total tokens: ${formatNumber(detail.stats.totalTokens)}</div>
                <div>Total cost: $${detail.stats.totalCost.toFixed(2)}</div>
            </div>
            
            <h3>Devices</h3>
            <div class="device-list">
                ${devicesHtml}
            </div>
        </div>
    `;
    
    document.getElementById('userDetailContent').innerHTML = contentHtml;
}

function closeUserModal() {
    document.getElementById('userDetailModal').style.display = 'none';
}

// Analytics
async function loadAnalytics() {
    // Load top users
    const users = await fetchUsers(0);
    if (users) {
        const topUsers = users.users.sort((a, b) => b.totalTokens - a.totalTokens).slice(0, 10);
        const topUsersHtml = `
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>User Key</th>
                        <th>Devices</th>
                        <th>Total Tokens</th>
                    </tr>
                </thead>
                <tbody>
                    ${topUsers.map((user, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td><span class="user-key">${user.userKey.substring(0, 16)}...</span></td>
                            <td>${user.deviceCount}</td>
                            <td>${formatNumber(user.totalTokens)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.getElementById('topUsersTable').innerHTML = topUsersHtml;
    }
    
    // Initialize charts
    initCharts();
}

function initCharts() {
    // Token usage over time chart
    const tokenCtx = document.getElementById('tokenChart').getContext('2d');
    if (charts.tokenChart) charts.tokenChart.destroy();
    
    charts.tokenChart = new Chart(tokenCtx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
            datasets: [{
                label: 'Total Tokens',
                data: [100000, 150000, 200000, 180000, 250000, 300000, 280000],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
    
    // Hourly usage chart
    const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');
    if (charts.hourlyChart) charts.hourlyChart.destroy();
    
    const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
    const hourlyData = Array.from({length: 24}, () => Math.floor(Math.random() * 100000));
    
    charts.hourlyChart = new Chart(hourlyCtx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [{
                label: 'Tokens by Hour',
                data: hourlyData,
                backgroundColor: '#22c55e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.dataset.view;
            if (view) switchView(view);
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = '/admin';
    });
    
    // User search
    let searchTimeout;
    document.getElementById('userSearch').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadUsers(0);
        }, 300);
    });
    
    // Modal close on outside click
    document.getElementById('userDetailModal').addEventListener('click', (e) => {
        if (e.target.id === 'userDetailModal') {
            closeUserModal();
        }
    });
    
    // Load initial view
    loadDashboard();
});