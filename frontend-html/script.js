const API_BASE = "http://localhost:5000/api/predict";

let currentPage = "dashboard";
let predictionHistory = [];
let alertHistory = [];
let pieChartInstance = null;
let barChartInstance = null;
let dashboardRefreshTimer = null;

function $(id) {
    return document.getElementById(id);
}

async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.error ||
                `HTTP Error ${response.status}`
            );
        }

        return data;
    } catch (error) {
        console.error(`API Error: ${endpoint}`, error);
        throw error;
    }
}

function showPage(page) {
    currentPage = page;

    const pages = {
        dashboard: $("dashboardPage"),
        history: $("historyPage"),
        alerts: $("alertsPage")
    };

    Object.values(pages).forEach(pageElement => {
        if (pageElement) {
            pageElement.classList.remove("active-page");
        }
    });

    if (pages[page]) {
        pages[page].classList.add("active-page");
    }

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");

        if (item.dataset.page === page) {
            item.classList.add("active");
        }
    });

    const titles = {
        dashboard: "Dashboard",
        history: "Prediction History",
        alerts: "Security Alerts"
    };

    if ($("pageTitle")) {
        $("pageTitle").textContent =
            titles[page] || "Dashboard";
    }

    if (page === "dashboard") {
        loadDashboard();
    }

    if (page === "history") {
        loadHistory();
    }

    if (page === "alerts") {
        loadAlerts();
    }
}

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

document.querySelectorAll("[data-page-target]").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.pageTarget);
    });
});

function formatDate(dateValue) {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function formatConfidence(value) {
    const number = Number(value);

    if (Number.isNaN(number)) {
        return "—";
    }

    return `${(number * 100).toFixed(2)}%`;
}

function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function severityClass(severity) {
    const value = String(severity || "Low").toLowerCase();

    if (value === "critical") return "severity-critical";
    if (value === "high") return "severity-high";
    if (value === "medium") return "severity-medium";

    return "severity-low";
}

function attackBadge(attackName) {
    const isBenign =
        String(attackName).toUpperCase() === "BENIGN";

    if (isBenign) {
        return `
            <span class="benign-badge">
                BENIGN
            </span>
        `;
    }

    return `
        <span class="attack-badge">
            ${escapeHTML(attackName)}
        </span>
    `;
}

async function loadStats() {
    try {
        const response = await apiRequest("/stats");
        const data = response.data || response;

        if ($("totalPredictions")) {
            $("totalPredictions").textContent =
                Number(data.total_predictions || 0).toLocaleString();
        }

        if ($("benignPredictions")) {
            $("benignPredictions").textContent =
                Number(data.benign_predictions || 0).toLocaleString();
        }

        if ($("attackPredictions")) {
            $("attackPredictions").textContent =
                Number(data.attack_predictions || 0).toLocaleString();
        }

        if ($("attackTypes")) {
            $("attackTypes").textContent =
                Number(data.attack_types || 0).toLocaleString();
        }

        if ($("lastUpdated")) {
            $("lastUpdated").textContent =
                `Updated ${new Date().toLocaleTimeString()}`;
        }

    } catch (error) {
        console.error("Failed to load stats:", error);

        if ($("lastUpdated")) {
            $("lastUpdated").textContent =
                "Backend unavailable";
        }
    }
}

async function loadChartData() {
    try {
        const response = await apiRequest("/chart");
        const data = response.data || response;

        renderCharts(data);

    } catch (error) {
        console.error("Failed to load chart data:", error);
        showChartError();
    }
}

function normalizeChartData(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.results)) return data.results;

    return [];
}

function loadChartLibrary() {
    return new Promise((resolve, reject) => {
        if (window.Chart) {
            resolve();
            return;
        }

        const script = document.createElement("script");

        script.src =
            "https://cdn.jsdelivr.net/npm/chart.js";

        script.onload = resolve;

        script.onerror = () => {
            reject(
                new Error("Chart.js could not be loaded")
            );
        };

        document.head.appendChild(script);
    });
}

async function renderCharts(rawData) {
    const chartData = normalizeChartData(rawData);

    try {
        await loadChartLibrary();
    } catch (error) {
        console.error(error);
        showChartError();
        return;
    }

    const labels = chartData.map(
        item =>
            item.attack_name ||
            item.label ||
            "Unknown"
    );

    const values = chartData.map(
        item =>
            Number(
                item.count ||
                item.total ||
                item.value ||
                0
            )
    );

    renderPieChart(labels, values);
    renderBarChart(labels, values);
}

function renderPieChart(labels, values) {
    const container = $("pieChart");

    if (!container) return;

    container.innerHTML = `
        <canvas id="attackPieCanvas"></canvas>
    `;

    const canvas = $("attackPieCanvas");

    if (!canvas) return;

    if (pieChartInstance) {
        pieChartInstance.destroy();
    }

    pieChartInstance = new Chart(canvas, {
        type: "doughnut",

        data: {
            labels: labels,

            datasets: [
                {
                    data: values,
                    borderWidth: 2,
                    borderColor: "#ffffff"
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "bottom",

                    labels: {
                        boxWidth: 12,
                        padding: 12,

                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

function renderBarChart(labels, values) {
    const container = $("barChart");

    if (!container) return;

    container.innerHTML = `
        <canvas id="attackBarCanvas"></canvas>
    `;

    const canvas = $("attackBarCanvas");

    if (!canvas) return;

    if (barChartInstance) {
        barChartInstance.destroy();
    }

    barChartInstance = new Chart(canvas, {
        type: "bar",

        data: {
            labels: labels,

            datasets: [
                {
                    label: "Predictions",
                    data: values,
                    borderRadius: 7
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            scales: {
                x: {
                    ticks: {
                        font: {
                            size: 9
                        }
                    }
                },

                y: {
                    beginAtZero: true,

                    ticks: {
                        precision: 0,

                        font: {
                            size: 9
                        }
                    }
                }
            },

            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function showChartError() {
    if ($("pieChart")) {
        $("pieChart").innerHTML = `
            <div class="chart-placeholder">
                Unable to load chart
            </div>
        `;
    }

    if ($("barChart")) {
        $("barChart").innerHTML = `
            <div class="chart-placeholder">
                Unable to load chart
            </div>
        `;
    }
}

async function loadHistory() {
    const container = $("predictionTable");

    if (!container) return;

    container.innerHTML = `
        <div class="loading-message">
            Loading prediction history...
        </div>
    `;

    try {
        const response = await apiRequest("/history");
        const data = response.data || response;

        predictionHistory =
            Array.isArray(data) ? data : [];

        renderHistory();

    } catch (error) {
        console.error("Failed to load history:", error);

        container.innerHTML = `
            <div class="loading-message">
                Unable to load prediction history.
            </div>
        `;
    }
}

function renderHistory() {
    const container = $("predictionTable");

    if (!container) return;

    if (
        !predictionHistory ||
        predictionHistory.length === 0
    ) {
        container.innerHTML = `
            <div class="loading-message">
                No prediction records found.
            </div>
        `;

        return;
    }

    const rows = predictionHistory.map(prediction => {
        const attackName =
            prediction.attack_name || "Unknown";

        const severity =
            prediction.severity || "Low";

        return `
            <tr>

                <td>
                    #${escapeHTML(prediction.id)}
                </td>

                <td>
                    ${formatDate(prediction.created_at)}
                </td>

                <td>
                    ${attackBadge(attackName)}
                </td>

                <td>
                    ${formatConfidence(
                        prediction.confidence
                    )}
                </td>

                <td>
                    <span class="
                        severity-badge
                        ${severityClass(severity)}
                    ">
                        ${escapeHTML(severity)}
                    </span>
                </td>

                <td>
                    ${escapeHTML(
                        prediction.client_ip || "—"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        prediction.destination_port || "—"
                    )}
                </td>

                <td>
                    <button
                        class="table-action"
                        onclick="openPredictionDetails(${prediction.id})"
                    >
                        View
                    </button>
                </td>

            </tr>
        `;
    }).join("");

    container.innerHTML = `
        <table class="prediction-table">

            <thead>
                <tr>
                    <th>ID</th>
                    <th>Time</th>
                    <th>Prediction</th>
                    <th>Confidence</th>
                    <th>Severity</th>
                    <th>Client IP</th>
                    <th>Port</th>
                    <th>Action</th>
                </tr>
            </thead>

            <tbody>
                ${rows}
            </tbody>

        </table>
    `;
}

async function loadAlerts() {
    const container = $("alertsContainer");

    if (!container) return;

    container.innerHTML = `
        <div class="loading-message">
            Loading security alerts...
        </div>
    `;

    try {
        const response = await apiRequest("/alerts");
        const data = response.data || response;

        alertHistory =
            Array.isArray(data) ? data : [];

        renderAlerts();
        renderDashboardAlerts();

    } catch (error) {
        console.error("Failed to load alerts:", error);

        container.innerHTML = `
            <div class="loading-message">
                Unable to load security alerts.
            </div>
        `;
    }
}

function renderAlerts() {
    const container = $("alertsContainer");

    if (!container) return;

    if (
        !alertHistory ||
        alertHistory.length === 0
    ) {
        container.innerHTML = `
            <div class="content-card">
                <div class="loading-message">
                    No active security alerts.
                </div>
            </div>
        `;

        return;
    }

    container.innerHTML = alertHistory.map(alert => {
        const severity =
            alert.severity || "Low";

        return `
            <div class="
                alert-card
                ${String(severity).toLowerCase()}
            ">

                <div class="alert-top">

                    <h3>
                        ${escapeHTML(
                            alert.attack_name ||
                            "Unknown Attack"
                        )}
                    </h3>

                    <span class="
                        severity-badge
                        ${severityClass(severity)}
                    ">
                        ${escapeHTML(severity)}
                    </span>

                </div>

                <div class="alert-meta">

                    <div class="alert-meta-item">
                        <span>CONFIDENCE</span>

                        <strong>
                            ${formatConfidence(
                                alert.confidence
                            )}
                        </strong>
                    </div>

                    <div class="alert-meta-item">
                        <span>CLIENT IP</span>

                        <strong>
                            ${escapeHTML(
                                alert.client_ip || "—"
                            )}
                        </strong>
                    </div>

                    <div class="alert-meta-item">
                        <span>DESTINATION PORT</span>

                        <strong>
                            ${escapeHTML(
                                alert.destination_port || "—"
                            )}
                        </strong>
                    </div>

                    <div class="alert-meta-item">
                        <span>DETECTED AT</span>

                        <strong>
                            ${formatDate(
                                alert.created_at
                            )}
                        </strong>
                    </div>

                </div>

            </div>
        `;
    }).join("");
}

function renderDashboardAlerts() {
    const container = $("dashboardAlerts");

    if (!container) return;

    if (
        !alertHistory ||
        alertHistory.length === 0
    ) {
        container.innerHTML = `
            <div class="loading-message">
                No recent security alerts.
            </div>
        `;

        return;
    }

    const preview =
        alertHistory.slice(0, 5);

    container.innerHTML = preview.map(alert => {
        const severity =
            alert.severity || "Low";

        return `
            <div
                style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    gap:15px;
                    padding:14px 0;
                    border-bottom:1px solid #f1f5f9;
                "
            >
                            <div>

                    <strong style="
                        display:block;
                        font-size:12px;
                        color:#0f172a;
                    ">
                        ${escapeHTML(
                            alert.attack_name ||
                            "Unknown Attack"
                        )}
                    </strong>

                    <small style="
                        color:#94a3b8;
                        font-size:9px;
                    ">
                        ${formatDate(
                            alert.created_at
                        )}
                    </small>

                </div>

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                ">

                    <span class="
                        severity-badge
                        ${severityClass(severity)}
                    ">
                        ${escapeHTML(severity)}
                    </span>

                    <span style="
                        color:#64748b;
                        font-size:10px;
                    ">
                        ${formatConfidence(
                            alert.confidence
                        )}
                    </span>

                </div>

            </div>
        `;
    }).join("");
}

function openPredictionDetails(id) {
    const prediction =
        predictionHistory.find(
            item =>
                Number(item.id) === Number(id)
        );

    if (!prediction) return;

    const modal = $("predictionModal");
    const details = $("predictionDetails");

    if (!modal || !details) return;

    details.innerHTML = `
        <div class="details-grid">

            <div class="detail-item">
                <span>PREDICTION ID</span>
                <strong>
                    #${escapeHTML(prediction.id)}
                </strong>
            </div>

            <div class="detail-item">
                <span>ATTACK / CLASS</span>
                <strong>
                    ${escapeHTML(
                        prediction.attack_name ||
                        "Unknown"
                    )}
                </strong>
            </div>

            <div class="detail-item">
                <span>MODEL PREDICTION</span>
                <strong>
                    ${escapeHTML(
                        prediction.prediction ?? "—"
                    )}
                </strong>
            </div>

            <div class="detail-item">
                <span>CONFIDENCE</span>
                <strong>
                    ${formatConfidence(
                        prediction.confidence
                    )}
                </strong>
            </div>

            <div class="detail-item">
                <span>SEVERITY</span>
                <strong>
                    ${escapeHTML(
                        prediction.severity || "Low"
                    )}
                </strong>
            </div>

            <div class="detail-item">
                <span>CLIENT IP</span>
                <strong>
                    ${escapeHTML(
                        prediction.client_ip || "—"
                    )}
                </strong>
            </div>

            <div class="detail-item">
                <span>DESTINATION PORT</span>
                <strong>
                    ${escapeHTML(
                        prediction.destination_port || "—"
                    )}
                </strong>
            </div>

            <div class="detail-item">
                <span>CREATED AT</span>
                <strong>
                    ${formatDate(
                        prediction.created_at
                    )}
                </strong>
            </div>

        </div>
    `;

    modal.classList.remove("hidden");
}

function closePredictionModal() {
    const modal = $("predictionModal");

    if (modal) {
        modal.classList.add("hidden");
    }
}

if ($("closeModalBtn")) {
    $("closeModalBtn").addEventListener(
        "click",
        closePredictionModal
    );
}

if ($("predictionModal")) {
    $("predictionModal").addEventListener(
        "click",
        event => {
            if (
                event.target ===
                $("predictionModal")
            ) {
                closePredictionModal();
            }
        }
    );
}

/*
    IMPORTANT:
    Static/sample traffic has been removed.

    Real pipeline:
    Live Traffic
        ↓
    Scapy Collector
        ↓
    Flask ML API
        ↓
    Node/Express API
        ↓
    MySQL
        ↓
    Dashboard

    The button only refreshes the real dashboard data.
*/
async function runPrediction() {
    const button =
        $("runPredictionBtn");

    if (!button) return;

    if (
        button.classList.contains("loading")
    ) {
        return;
    }

    button.classList.add("loading");
    button.disabled = true;

    button.innerHTML = `
        <span>⏳</span>
        Checking Live Traffic...
    `;

    try {
        await loadDashboard();

        showLiveTrafficStatus();

    } catch (error) {
        console.error(
            "Live traffic refresh failed:",
            error
        );

        showErrorNotification(
            "Unable to refresh live traffic data."
        );

    } finally {
        button.classList.remove("loading");

        button.disabled = false;

        button.innerHTML = `
            <span>▶</span>
            Refresh Live Traffic
        `;
    }
}

function showLiveTrafficStatus() {
    const existing =
        document.getElementById("liveTrafficStatusToast");

    if (existing) {
        existing.remove();
    }

    const toast =
        document.createElement("div");

    toast.id = "liveTrafficStatusToast";

    toast.innerHTML = `
        <div style="
            position:fixed;
            bottom:25px;
            right:25px;
            width:310px;
            background:#ffffff;
            border:1px solid #e2e8f0;
            border-left:4px solid #22c55e;
            border-radius:12px;
            padding:13px 15px;
            box-shadow:0 10px 30px rgba(15,23,42,0.15);
            z-index:9999;
        ">

            <div style="
                display:flex;
                align-items:center;
                gap:10px;
            ">

                <div style="
                    width:30px;
                    height:30px;
                    min-width:30px;
                    border-radius:8px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background:#dcfce7;
                    color:#15803d;
                    font-size:15px;
                    font-weight:900;
                ">
                    ✓
                </div>

                <div>
                    <strong style="
                        display:block;
                        color:#0f172a;
                        font-size:12px;
                    ">
                        Live Traffic Refreshed
                    </strong>

                    <span style="
                        display:block;
                        margin-top:2px;
                        color:#94a3b8;
                        font-size:9px;
                    ">
                        Dashboard updated from MySQL
                    </span>
                </div>

            </div>

        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(10px)";
            toast.style.transition =
                "opacity 0.3s ease, transform 0.3s ease";

            setTimeout(() => {
                if (document.body.contains(toast)) {
                    toast.remove();
                }
            }, 300);
        }
    }, 3000);
}

function showPredictionResult(response) {

    const data =
        response.data || response;

    const attackName =
        data.attack_name || "Unknown";

    const confidence =
        formatConfidence(
            data.confidence
        );

    const severity =
        data.severity || "Low";

    const isBenign =
        String(attackName).toUpperCase() ===
        "BENIGN";

    const existing =
        document.getElementById(
            "predictionResultToast"
        );

    if (existing) {
        existing.remove();
    }

    const toast =
        document.createElement("div");

    toast.id =
        "predictionResultToast";

    toast.innerHTML = `

        <div style="
            position:fixed;
            top:95px;
            right:30px;
            width:350px;
            background:#ffffff;
            border:1px solid #e2e8f0;
            border-left:5px solid ${
                isBenign
                    ? "#22c55e"
                    : "#ef4444"
            };
            border-radius:16px;
            padding:19px;
            box-shadow:
                0 18px 45px
                rgba(15,23,42,0.20);
            z-index:1000;
        ">

            <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:15px;
                margin-bottom:15px;
            ">

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                ">

                    <div style="
                        width:34px;
                        height:34px;
                        border-radius:10px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        background:${
                            isBenign
                                ? "#dcfce7"
                                : "#fee2e2"
                        };
                        color:${
                            isBenign
                                ? "#15803d"
                                : "#dc2626"
                        };
                        font-weight:900;
                    ">
                        ${isBenign ? "✓" : "!"}
                    </div>

                    <div>

                        <strong style="
                            display:block;
                            font-size:14px;
                            color:#0f172a;
                        ">
                            AI Prediction Result
                        </strong>

                        <span style="
                            display:block;
                            margin-top:2px;
                            font-size:9px;
                            color:#94a3b8;
                        ">
                            Hybrid Classifier Analysis
                        </span>

                    </div>

                </div>

                <button
                    id="closePredictionToast"
                    style="
                        width:28px;
                        height:28px;
                        border:none;
                        background:#f1f5f9;
                        color:#475569;
                        border-radius:8px;
                        cursor:pointer;
                        font-size:17px;
                    "
                >
                    ×
                </button>

            </div>

            <div style="
                padding:12px;
                background:#f8fafc;
                border-radius:11px;
                margin-bottom:10px;
            ">

                <span style="
                    display:block;
                    color:#94a3b8;
                    font-size:8px;
                    font-weight:800;
                    letter-spacing:1px;
                    margin-bottom:5px;
                ">
                    DETECTED CLASS
                </span>

                <strong style="
                    display:block;
                    color:${
                        isBenign
                            ? "#15803d"
                            : "#dc2626"
                    };
                    font-size:15px;
                    font-weight:900;
                ">
                    ${escapeHTML(attackName)}
                </strong>

            </div>

            <div style="
                display:grid;
                grid-template-columns:
                    repeat(2,minmax(0,1fr));
                gap:9px;
            ">

                <div style="
                    padding:11px;
                    background:#f8fafc;
                    border-radius:10px;
                ">

                    <span style="
                        display:block;
                        color:#94a3b8;
                        font-size:8px;
                        font-weight:800;
                        margin-bottom:4px;
                    ">
                        CONFIDENCE
                    </span>

                    <strong style="
                        color:#0f172a;
                        font-size:12px;
                    ">
                        ${confidence}
                    </strong>

                </div>

                <div style="
                    padding:11px;
                    background:#f8fafc;
                    border-radius:10px;
                ">

                    <span style="
                        display:block;
                        color:#94a3b8;
                        font-size:8px;
                        font-weight:800;
                        margin-bottom:4px;
                    ">
                        SEVERITY
                    </span>

                    <strong style="
                        color:#0f172a;
                        font-size:12px;
                    ">
                        ${escapeHTML(severity)}
                    </strong>

                </div>

                <div style="
                    padding:11px;
                    background:#f8fafc;
                    border-radius:10px;
                    grid-column:span 2;
                ">

                    <span style="
                        display:block;
                        color:#94a3b8;
                        font-size:8px;
                        font-weight:800;
                        margin-bottom:4px;
                    ">
                        MODEL
                    </span>

                    <strong style="
                        color:#0f172a;
                        font-size:12px;
                    ">
                        Hybrid Classifier
                    </strong>

                </div>

            </div>

            <div style="
                margin-top:13px;
                padding-top:11px;
                border-top:1px solid #e2e8f0;
                color:#94a3b8;
                font-size:9px;
            ">
                Prediction saved successfully.
            </div>

        </div>
    `;

    document.body.appendChild(toast);

    const closeButton =
        document.getElementById(
            "closePredictionToast"
        );

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            () => toast.remove()
        );
    }

    setTimeout(() => {
        if (
            document.body.contains(toast)
        ) {
            toast.remove();
        }
    }, 6000);
}

function showErrorNotification(message) {

    const existing =
        document.getElementById(
            "predictionErrorToast"
        );

    if (existing) {
        existing.remove();
    }

    const toast =
        document.createElement("div");

    toast.id =
        "predictionErrorToast";

    toast.innerHTML = `

        <div style="
            position:fixed;
            top:95px;
            right:30px;
            width:350px;
            background:#ffffff;
            border-left:5px solid #ef4444;
            border-radius:15px;
            padding:18px;
            box-shadow:
                0 15px 40px
                rgba(15,23,42,0.18);
            z-index:1000;
        ">

            <strong style="
                display:block;
                color:#dc2626;
                font-size:14px;
                margin-bottom:6px;
            ">
                Prediction Failed
            </strong>

            <span style="
                color:#64748b;
                font-size:11px;
            ">
                ${escapeHTML(message)}
            </span>

        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        if (
            document.body.contains(toast)
        ) {
            toast.remove();
        }
    }, 5000);
}

async function loadDashboard() {
    await Promise.allSettled([
        loadStats(),
        loadChartData(),
        loadAlerts(),
        loadHistory()
    ]);
}

function startRealtimeRefresh() {

    if (dashboardRefreshTimer) {
        clearInterval(
            dashboardRefreshTimer
        );
    }

    dashboardRefreshTimer =
        setInterval(
            async () => {

                if (
                    currentPage ===
                    "dashboard"
                ) {
                    await loadDashboard();
                }

            },
            3000
        );
}

if ($("logoutBtn")) {
    $("logoutBtn").addEventListener(
        "click",
        () => {

            const confirmed =
                confirm(
                    "Do you want to logout?"
                );

            if (!confirmed) return;

            alert(
                "Logged out successfully."
            );
        }
    );
}

if ($("runPredictionBtn")) {
    $("runPredictionBtn").addEventListener(
        "click",
        runPrediction
    );
}

async function initializeApp() {

    console.log(
        "CyberShield SOC Dashboard"
    );

    console.log(
        "Backend:",
        API_BASE
    );

    showPage("dashboard");

    startRealtimeRefresh();
}

document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);