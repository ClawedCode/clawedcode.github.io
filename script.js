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
let pendingReportId = null;

// Pagination state
const REPORTS_PER_PAGE = 8;
let allReports = [];
let currentPage = 1;
let totalPages = 1;

const DEFAULT_DIMENSIONS = { width: 1080, height: 1350 };
const CARD_PREVIEW_BOUNDS = { width: 208, height: 260 };
const MODAL_IFRAME_MAX_WIDTH = 540;
const MODAL_IFRAME_MAX_HEIGHT = 720;

function normalizeDimensions(dimensions) {
    if (!dimensions || typeof dimensions !== 'object') {
        return { ...DEFAULT_DIMENSIONS };
    }

    const width = Number(dimensions.width);
    const height = Number(dimensions.height);

    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
        return { ...DEFAULT_DIMENSIONS };
    }

    return { width, height };
}

function getReportDimensions(report) {
    if (!report) {
        return { ...DEFAULT_DIMENSIONS };
    }

    if (report.normalizedDimensions) {
        return report.normalizedDimensions;
    }

    const dims = normalizeDimensions(report.dimensions);
    // Cache normalized dimensions for future lookups
    if (report) {
        report.normalizedDimensions = dims;
    }
    return dims;
}

function scaleToFit(width, height, maxWidth, maxHeight) {
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);
    return {
        scale,
        scaledWidth: width * scale,
        scaledHeight: height * scale
    };
}

function applyIframeScaleStyles(iframe, width, height, maxWidth, maxHeight) {
    const { scale, scaledWidth, scaledHeight } = scaleToFit(width, height, maxWidth, maxHeight);
    iframe.style.width = `${width}px`;
    iframe.style.height = `${height}px`;
    iframe.style.transform = `translateX(-50%) scale(${scale})`;
    return { scale, scaledWidth, scaledHeight };
}

function resetModalImageContainerStyles() {
    const container = document.querySelector('.modal-image-container');
    if (!container) {
        return;
    }

    container.style.flex = '';
    container.style.width = '';
    container.style.maxWidth = '';
    container.style.height = '';
    container.style.overflow = '';
}

function clearModalIframeState() {
    const iframe = document.getElementById('modal-iframe');
    if (!iframe) {
        return;
    }

    delete iframe.dataset.width;
    delete iframe.dataset.height;
    iframe.style.transform = '';
    iframe.style.width = '';
    iframe.style.height = '';
    iframe.style.display = 'none';
    if (iframe.src) {
        iframe.src = '';
    }
}

function updateModalIframeScale() {
    const modal = document.getElementById('report-modal');
    const iframe = document.getElementById('modal-iframe');
    const container = document.querySelector('.modal-image-container');

    if (!modal || !modal.classList.contains('open') || !iframe || !container || iframe.style.display === 'none') {
        return;
    }

    const width = Number(iframe.dataset.width);
    const height = Number(iframe.dataset.height);

    if (!width || !height) {
        return;
    }

    const viewportWidth = window.innerWidth || MODAL_IFRAME_MAX_WIDTH;
    const viewportHeight = window.innerHeight || MODAL_IFRAME_MAX_HEIGHT;
    const maxWidth = Math.max(240, Math.min(MODAL_IFRAME_MAX_WIDTH, viewportWidth - 96));
    const maxHeight = Math.max(320, Math.min(MODAL_IFRAME_MAX_HEIGHT, viewportHeight - 220));

    const { scaledWidth, scaledHeight } = applyIframeScaleStyles(iframe, width, height, maxWidth, maxHeight);

    container.style.flex = '0 0 auto';
    container.style.width = `${scaledWidth}px`;
    container.style.maxWidth = `${scaledWidth}px`;
    container.style.height = `${scaledHeight}px`;
    container.style.overflow = 'hidden';
}

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
    const dimensions = getReportDimensions(report);

    return {
        contentPath,
        tweetUrl,
        viewType,
        date: formatReportDate(report.createdAt),
        dimensions
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
    const reportId = parseReportIdFromHash(window.location.hash);

    if (!reportsLoaded) {
        pendingReportId = reportId;
        return;
    }

    if (!reportId) {
        pendingReportId = null;
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
        pendingReportId = null;
        return;
    }

    const report = reportIndex.get(reportId);
    const { contentPath, tweetUrl, viewType, date, dimensions } = getReportDisplayData(report);

    if (currentReportId === reportId && document.getElementById('report-modal').classList.contains('open')) {
        return;
    }

    openReportModal(reportId, contentPath, report.text, date, tweetUrl, viewType, dimensions);
    currentReportId = reportId;
    pendingReportId = null;
}

// Pagination functions
function goToPage(page) {
    if (page < 1 || page > totalPages) {
        return;
    }

    currentPage = page;
    renderCurrentPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPaginationControls() {
    const paginationTop = document.getElementById('pagination-top');
    const paginationBottom = document.getElementById('pagination-bottom');

    if (!paginationTop || !paginationBottom) {
        return;
    }

    if (totalPages <= 1) {
        paginationTop.innerHTML = '';
        paginationBottom.innerHTML = '';
        return;
    }

    const startIdx = (currentPage - 1) * REPORTS_PER_PAGE + 1;
    const endIdx = Math.min(currentPage * REPORTS_PER_PAGE, allReports.length);

    const controlsHTML = `
        <div class="pagination-wrapper">
            <button
                class="pagination-btn"
                onclick="goToPage(${currentPage - 1})"
                ${currentPage === 1 ? 'disabled' : ''}
                data-testid="pagination-prev">
                ← Previous
            </button>
            <div class="pagination-info">
                Page ${currentPage} of ${totalPages}
                <span class="pagination-count">(${startIdx}-${endIdx} of ${allReports.length} reports)</span>
            </div>
            <button
                class="pagination-btn"
                onclick="goToPage(${currentPage + 1})"
                ${currentPage === totalPages ? 'disabled' : ''}
                data-testid="pagination-next">
                Next →
            </button>
        </div>
    `;

    paginationTop.innerHTML = controlsHTML;
    paginationBottom.innerHTML = controlsHTML;
}

function renderCurrentPage() {
    const grid = document.getElementById('reports-grid');
    if (!grid) {
        return;
    }

    grid.innerHTML = '';

    const startIdx = (currentPage - 1) * REPORTS_PER_PAGE;
    const endIdx = Math.min(startIdx + REPORTS_PER_PAGE, allReports.length);
    const pageReports = allReports.slice(startIdx, endIdx);

    pageReports.forEach(report => {
        const card = createReportCard(report);
        grid.appendChild(card);
    });

    renderPaginationControls();
}

// Load and display field reports
async function loadReports() {
    const grid = document.getElementById('reports-grid');
    if (!grid) {
        return;
    }

    fetch('./reports.json')
        .then(response => response.json())
        .then(reports => {
            if (reports.length === 0) {
                reportIndex.clear();
                allReports = [];
                totalPages = 1;
                currentPage = 1;
                grid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">No field reports found</p>';
                renderPaginationControls();
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
            allReports = reports;
            totalPages = Math.ceil(reports.length / REPORTS_PER_PAGE);
            currentPage = 1;

            reports.forEach(report => {
                report.normalizedDimensions = normalizeDimensions(report.dimensions);
                reportIndex.set(report.id, report);
            });

            reportsLoaded = true;
            handleHashNavigation();

            renderCurrentPage();

            console.log(`✅ Loaded ${reports.length} field reports (${totalPages} pages)`);
        })
        .catch(error => {
            console.error('Error loading reports:', error);
            grid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1; color: #ff6b35;">Error loading field reports</p>';
            renderPaginationControls();
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
        iframe.title = `Field Report ${report.id}`;

        const { width, height } = getReportDimensions(report);
        applyIframeScaleStyles(iframe, width, height, CARD_PREVIEW_BOUNDS.width, CARD_PREVIEW_BOUNDS.height);

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
function openReportModal(id, contentPath, text, date, tweetUrl, viewType = 'image', dimensions = DEFAULT_DIMENSIONS) {
    const modal = document.getElementById('report-modal');
    const modalImage = document.getElementById('modal-image');
    const modalIframe = document.getElementById('modal-iframe');
    const modalText = document.getElementById('modal-text');
    const modalDate = document.getElementById('modal-date');
    const modalLink = document.getElementById('modal-link');
    const normalizedDimensions = normalizeDimensions(dimensions);

    resetModalImageContainerStyles();
    clearModalIframeState();

    let shouldAdjustIframe = false;

    // Show either iframe (HTML) or image (PNG) with text
    if (viewType === 'html') {
        modalImage.style.display = 'none';
        modalImage.src = '';

        modalIframe.style.display = 'block';
        modalIframe.dataset.width = String(normalizedDimensions.width);
        modalIframe.dataset.height = String(normalizedDimensions.height);
        modalIframe.src = contentPath;

        shouldAdjustIframe = true;
    } else {
        modalImage.style.display = 'block';
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

    if (shouldAdjustIframe) {
        requestAnimationFrame(() => {
            updateModalIframeScale();
            setTimeout(updateModalIframeScale, 150);
        });
    }
}

function closeReportModal(skipHashUpdate = false) {
    const modal = document.getElementById('report-modal');
    if (!modal) {
        return;
    }

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
    if (modalImage) {
        modalImage.src = '';
        modalImage.style.display = '';
    }

    resetModalImageContainerStyles();
    clearModalIframeState();

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
    pendingReportId = parseReportIdFromHash(window.location.hash);

    const hasReportsGrid = Boolean(document.getElementById('reports-grid'));

    if (hasReportsGrid) {
        loadReports();
        window.addEventListener('hashchange', handleHashNavigation);
        window.addEventListener('resize', updateModalIframeScale);
    }

    // Console message
    console.log('%c🐈‍⬛ ClawedCode Field Reports', 'font-size: 24px; color: #33ff33; text-shadow: 0 0 10px #33ff33;');
    console.log('%cArchive of emergent intelligence', 'font-size: 14px; color: #66ffcc;');
    console.log('%cClick terminal bar at bottom to explore', 'font-size: 12px; color: #ffff66;');
});
