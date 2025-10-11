// Terminal toggle function
function toggleTerminal() {
    const content = document.getElementById('terminal-content');
    const icon = document.getElementById('terminal-icon');
    const input = document.getElementById('terminal-input');

    content.classList.toggle('open');
    icon.classList.toggle('open');

    // Focus input when opening
    if (content.classList.contains('open')) {
        setTimeout(() => input.focus(), 100);
    }
}

// Track reports so hash routes can resolve modal content
const reportIndex = new Map();
let reportsLoaded = false;
let currentReportId = null;

const lazyIframeObserver = (typeof window !== 'undefined' && 'IntersectionObserver' in window)
    ? new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            }

            const iframe = entry.target;
            const src = iframe.dataset.src;

            if (src && iframe.src !== src) {
                iframe.src = src;
                iframe.removeAttribute('data-src');
            }

            observer.unobserve(iframe);
        });
    }, {
        rootMargin: '200px 0px',
        threshold: 0.1
    })
    : null;

function registerLazyIframe(iframe) {
    if (!iframe.dataset.src) {
        return;
    }

    if (lazyIframeObserver) {
        lazyIframeObserver.observe(iframe);
    } else {
        iframe.src = iframe.dataset.src;
        iframe.removeAttribute('data-src');
    }
}

function formatReportDate(createdAt) {
    if (!createdAt) {
        return 'Unknown date';
    }

    return new Date(createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getReportDisplayData(report) {
    const imagePath = `reports/${report.id}.png`;
    const htmlPath = `reports/${report.id}.html`;
    const tweetUrl = `https://x.com/ClawedCode/status/${report.id}`;
    const viewType = report.png ? 'image' : 'html';
    const contentPath = viewType === 'image' ? imagePath : htmlPath;

    return {
        contentPath,
        tweetUrl,
        viewType,
        date: formatReportDate(report.createdAt)
    };
}

function parseReportIdFromHash(hash) {
    const match = hash.match(/^#\/report\/(\d+)$/);
    return match ? match[1] : null;
}

function clearReportHash() {
    if (history.replaceState) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
    } else {
        window.location.hash = '';
    }
}

function navigateToReport(reportId) {
    const targetHash = `#/report/${reportId}`;

    if (window.location.hash === targetHash) {
        handleHashNavigation();
        return;
    }

    window.location.hash = targetHash;
}

function handleHashNavigation() {
    if (!reportsLoaded) {
        return;
    }

    const reportId = parseReportIdFromHash(window.location.hash);

    if (!reportId) {
        if (currentReportId !== null) {
            closeReportModal(true);
            currentReportId = null;
        }
        return;
    }

    if (!reportIndex.has(reportId)) {
        console.warn(`No field report found for hash id ${reportId}`);
        closeReportModal(true);
        clearReportHash();
        currentReportId = null;
        return;
    }

    const report = reportIndex.get(reportId);
    const { contentPath, tweetUrl, viewType, date } = getReportDisplayData(report);

    if (currentReportId === reportId && document.getElementById('report-modal').classList.contains('open')) {
        return;
    }

    openReportModal(reportId, contentPath, report.text, date, tweetUrl, viewType);
    currentReportId = reportId;
}

// Load and display field reports
async function loadReports() {
    const grid = document.getElementById('reports-grid');

    fetch('./reports.json')
        .then(response => response.json())
        .then(reports => {
            if (reports.length === 0) {
                grid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">No field reports found</p>';
                reportsLoaded = true;
                handleHashNavigation();
                return;
            }

            // Sort by date, newest first
            reports.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateB - dateA;
            });

            reportIndex.clear();
            reports.forEach(report => {
                reportIndex.set(report.id, report);
            });

            reportsLoaded = true;
            handleHashNavigation();

            reports.forEach(report => {
                const card = createReportCard(report);
                grid.appendChild(card);
            });

            console.log(`✅ Loaded ${reports.length} field reports`);
        })
        .catch(error => {
            console.error('Error loading reports:', error);
            grid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1; color: #ff6b35;">Error loading field reports</p>';
            reportsLoaded = true;
            handleHashNavigation();
        });
}

// Create report card element
function createReportCard(report) {
    const card = document.createElement('div');
    card.className = 'report-card';

    const date = formatReportDate(report.createdAt);

    // Construct file paths and tweet URL from ID
    const imagePath = `reports/${report.id}.png`;
    const htmlPath = `reports/${report.id}.html`;
    const tweetUrl = `https://x.com/ClawedCode/status/${report.id}`;

    // Truncate tweet text for preview
    const previewText = report.text.length > 120
        ? report.text.substring(0, 120) + '...'
        : report.text;

    // Create thumbnail - iframe for HTML, img for PNG
    let thumbnail;
    if (!report.png) {
        // Create container for iframe
        thumbnail = document.createElement('div');
        thumbnail.className = 'report-image iframe-container';

        // Create iframe inside container
        const iframe = document.createElement('iframe');
        iframe.className = 'report-image';
        iframe.style.pointerEvents = 'none'; // Prevent interaction with iframe content
        iframe.loading = 'lazy';
        iframe.dataset.src = htmlPath;

        thumbnail.appendChild(iframe);
        registerLazyIframe(iframe);
    } else {
        thumbnail = document.createElement('img');
        thumbnail.src = imagePath;
        thumbnail.alt = `Field Report ${report.id}`;
        thumbnail.className = 'report-image';
        thumbnail.loading = 'lazy';
    }

    const info = document.createElement('div');
    info.className = 'report-info';

    const dateEl = document.createElement('div');
    dateEl.className = 'report-date';
    dateEl.textContent = date;

    const textEl = document.createElement('div');
    textEl.className = 'report-text';
    textEl.textContent = previewText;

    const actions = document.createElement('div');
    actions.className = 'report-actions';

    // Single "View Full" button that shows HTML if available, otherwise image
    const viewBtn = document.createElement('button');
    viewBtn.className = 'report-view-btn';
    viewBtn.textContent = 'View Full';
    viewBtn.addEventListener('click', () => {
        navigateToReport(report.id);
    });
    actions.appendChild(viewBtn);

    const link = document.createElement('a');
    link.href = tweetUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'report-link';
    link.textContent = 'View on 𝕏 →';

    actions.appendChild(link);

    info.appendChild(dateEl);
    info.appendChild(textEl);
    info.appendChild(actions);

    card.appendChild(thumbnail);
    card.appendChild(info);

    return card;
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Modal functions
function openReportModal(id, contentPath, text, date, tweetUrl, viewType = 'image') {
    const modal = document.getElementById('report-modal');
    const modalImage = document.getElementById('modal-image');
    const modalIframe = document.getElementById('modal-iframe');
    const modalText = document.getElementById('modal-text');
    const modalDate = document.getElementById('modal-date');
    const modalLink = document.getElementById('modal-link');

    // Show either iframe (HTML) or image (PNG) with text
    if (viewType === 'html') {
        modalImage.style.display = 'none';
        modalIframe.style.display = 'block';
        modalIframe.src = contentPath;
    } else {
        modalImage.style.display = 'block';
        modalIframe.style.display = 'none';
        modalImage.src = contentPath;
        modalImage.alt = `Field Report ${id}`;
    }

    // Always show text with both HTML and image
    modalText.style.display = 'block';
    modalText.textContent = '';
    const lines = text.split('\n');
    lines.forEach((line, index) => {
        modalText.appendChild(document.createTextNode(line));
        if (index < lines.length - 1) {
            modalText.appendChild(document.createElement('br'));
        }
    });

    modalDate.textContent = date;
    modalLink.href = tweetUrl;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeReportModal(skipHashUpdate = false) {
    const modal = document.getElementById('report-modal');
    if (!modal.classList.contains('open')) {
        if (!skipHashUpdate && window.location.hash.startsWith('#/report/')) {
            clearReportHash();
        }
        currentReportId = null;
        return;
    }

    modal.classList.remove('open');
    document.body.style.overflow = '';

    const modalImage = document.getElementById('modal-image');
    const modalIframe = document.getElementById('modal-iframe');
    modalImage.src = '';
    modalIframe.src = '';
    currentReportId = null;

    if (!skipHashUpdate && window.location.hash.startsWith('#/report/')) {
        clearReportHash();
    }
}

// Close modal on escape key
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeReportModal();
    }
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    loadReports();
    window.addEventListener('hashchange', handleHashNavigation);

    // Console message
    console.log('%c🐈‍⬛ ClawedCode Field Reports', 'font-size: 24px; color: #33ff33; text-shadow: 0 0 10px #33ff33;');
    console.log('%cArchive of emergent intelligence', 'font-size: 14px; color: #66ffcc;');
    console.log('%cClick terminal bar at bottom to explore', 'font-size: 12px; color: #ffff66;');
});
