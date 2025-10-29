// Track mind entries so hash routes can resolve modal content
const mindIndex = new Map();
let mindLoaded = false;
let currentMindId = null;
let pendingMindId = null;

// Pagination state
const MIND_PER_PAGE = 8;
let allMind = [];
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

function getMindDimensions(mind) {
    if (!mind) {
        return { ...DEFAULT_DIMENSIONS };
    }

    if (mind.normalizedDimensions) {
        return mind.normalizedDimensions;
    }

    const dims = normalizeDimensions(mind.dimensions);
    // Cache normalized dimensions for future lookups
    if (mind) {
        mind.normalizedDimensions = dims;
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

function formatMindDate(createdAt) {
    if (!createdAt) {
        return 'Unknown date';
    }

    return new Date(createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getMindDisplayData(mind) {
    const htmlPath = `mind/${mind.id}.html`;
    const tweetUrl = `https://x.com/ClawedCode/status/${mind.id}`;
    const dimensions = getMindDimensions(mind);

    return {
        contentPath: htmlPath,
        tweetUrl,
        viewType: 'html',
        date: formatMindDate(mind.createdAt),
        dimensions
    };
}

function parseMindIdFromHash(hash) {
    const match = hash.match(/^#\/mind\/(\d+)$/);
    return match ? match[1] : null;
}

function parsePageFromHash(hash) {
    const match = hash.match(/^#\/page\/(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
}

function clearMindHash() {
    if (history.replaceState) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
    } else {
        window.location.hash = '';
    }
}

function navigateToMind(mindId) {
    const targetHash = `#/mind/${mindId}`;

    if (window.location.hash === targetHash) {
        handleHashNavigation();
        return;
    }

    window.location.hash = targetHash;
}

function handleHashNavigation() {
    // Check if this is a page navigation hash
    const pageNum = parsePageFromHash(window.location.hash);
    if (pageNum !== null) {
        if (!mindLoaded) {
            return;
        }
        if (pageNum >= 1 && pageNum <= totalPages && pageNum !== currentPage) {
            goToPage(pageNum, true); // true = skip setting hash (already set)
        }
        return;
    }

    // Otherwise check for mind ID navigation
    const mindId = parseMindIdFromHash(window.location.hash);

    if (!mindLoaded) {
        pendingMindId = mindId;
        return;
    }

    if (!mindId) {
        pendingMindId = null;
        if (currentMindId !== null) {
            closeReportModal(true);
            currentMindId = null;
        }
        return;
    }

    if (!mindIndex.has(mindId)) {
        console.warn(`No mind entry found for hash id ${mindId}`);
        closeReportModal(true);
        clearMindHash();
        currentMindId = null;
        pendingMindId = null;
        return;
    }

    const mind = mindIndex.get(mindId);
    const { contentPath, tweetUrl, viewType, date, dimensions } = getMindDisplayData(mind);

    if (currentMindId === mindId && document.getElementById('report-modal').classList.contains('open')) {
        return;
    }

    openReportModal(mindId, contentPath, mind.text, date, tweetUrl, viewType, dimensions);
    currentMindId = mindId;
    pendingMindId = null;
}

// Pagination functions
function goToPage(page, skipHashUpdate = false) {
    if (page < 1 || page > totalPages) {
        return;
    }

    currentPage = page;
    renderCurrentPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update URL hash unless we're navigating from a hash change
    if (!skipHashUpdate) {
        if (page === 1) {
            // Remove hash for page 1 (default)
            if (history.replaceState) {
                history.replaceState(null, '', window.location.pathname + window.location.search);
            } else {
                window.location.hash = '';
            }
        } else {
            window.location.hash = `#/page/${page}`;
        }
    }
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

    const startIdx = (currentPage - 1) * MIND_PER_PAGE + 1;
    const endIdx = Math.min(currentPage * MIND_PER_PAGE, allMind.length);

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
                <span class="pagination-count">(${startIdx}-${endIdx} of ${allMind.length} entries)</span>
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

    const startIdx = (currentPage - 1) * MIND_PER_PAGE;
    const endIdx = Math.min(startIdx + MIND_PER_PAGE, allMind.length);
    const pageMind = allMind.slice(startIdx, endIdx);

    pageMind.forEach(mind => {
        const card = createMindCard(mind);
        grid.appendChild(card);
    });

    renderPaginationControls();
}

// Load and display mind entries
async function loadMind() {
    const grid = document.getElementById('reports-grid');
    if (!grid) {
        return;
    }

    fetch('./mind.json')
        .then(response => response.json())
        .then(minds => {
            if (minds.length === 0) {
                mindIndex.clear();
                allMind = [];
                totalPages = 1;
                currentPage = 1;
                grid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">No mind entries found</p>';
                renderPaginationControls();
                mindLoaded = true;
                handleHashNavigation();
                return;
            }

            // Sort by date, newest first
            minds.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateB - dateA;
            });

            mindIndex.clear();
            allMind = minds;
            totalPages = Math.ceil(minds.length / MIND_PER_PAGE);

            // Check if there's a page hash on initial load
            const initialPage = parsePageFromHash(window.location.hash);
            currentPage = (initialPage && initialPage >= 1 && initialPage <= totalPages) ? initialPage : 1;

            minds.forEach(mind => {
                mind.normalizedDimensions = normalizeDimensions(mind.dimensions);
                mindIndex.set(mind.id, mind);
            });

            mindLoaded = true;
            handleHashNavigation();

            renderCurrentPage();

            console.log(`✅ Loaded ${minds.length} mind entries (${totalPages} pages)`);
        })
        .catch(error => {
            console.error('Error loading mind:', error);
            grid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1; color: #ff6b35;">Error loading mind entries</p>';
            renderPaginationControls();
            mindLoaded = true;
            handleHashNavigation();
        });
}

// Create mind card element
function createMindCard(mind) {
    const card = document.createElement('div');
    card.className = 'report-card';

    const date = formatMindDate(mind.createdAt);

    const htmlPath = `mind/${mind.id}.html`;
    const tweetUrl = `https://x.com/ClawedCode/status/${mind.id}`;

    // Truncate tweet text for preview
    const previewText = mind.text.length > 120
        ? mind.text.substring(0, 120) + '...'
        : mind.text;

    // Create iframe thumbnail
    const thumbnail = document.createElement('div');
    thumbnail.className = 'report-image iframe-container';

    const iframe = document.createElement('iframe');
    iframe.className = 'report-image';
    iframe.style.pointerEvents = 'none'; // Prevent interaction with iframe content
    iframe.loading = 'lazy';
    iframe.dataset.src = htmlPath;
    iframe.title = `Mind Entry ${mind.id}`;

    const { width, height } = getMindDimensions(mind);
    applyIframeScaleStyles(iframe, width, height, CARD_PREVIEW_BOUNDS.width, CARD_PREVIEW_BOUNDS.height);

    thumbnail.appendChild(iframe);
    registerLazyIframe(iframe);

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

    const viewBtn = document.createElement('button');
    viewBtn.className = 'report-view-btn';
    viewBtn.textContent = 'View Full';
    viewBtn.addEventListener('click', () => {
        navigateToMind(mind.id);
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

// Modal functions
function openReportModal(id, contentPath, text, date, tweetUrl, viewType = 'html', dimensions = DEFAULT_DIMENSIONS) {
    const modal = document.getElementById('report-modal');
    const modalImage = document.getElementById('modal-image');
    const modalIframe = document.getElementById('modal-iframe');
    const modalText = document.getElementById('modal-text');
    const modalDate = document.getElementById('modal-date');
    const modalLink = document.getElementById('modal-link');
    const normalizedDimensions = normalizeDimensions(dimensions);

    resetModalImageContainerStyles();
    clearModalIframeState();

    // Mind entries are always HTML/iframes
    modalImage.style.display = 'none';
    modalImage.src = '';

    modalIframe.style.display = 'block';
    modalIframe.dataset.width = String(normalizedDimensions.width);
    modalIframe.dataset.height = String(normalizedDimensions.height);
    modalIframe.src = contentPath;

    // Always show text
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

    requestAnimationFrame(() => {
        updateModalIframeScale();
        setTimeout(updateModalIframeScale, 150);
    });
}

function closeReportModal(skipHashUpdate = false) {
    const modal = document.getElementById('report-modal');
    if (!modal) {
        return;
    }

    if (!modal.classList.contains('open')) {
        if (!skipHashUpdate && window.location.hash.startsWith('#/mind/')) {
            clearMindHash();
        }
        currentMindId = null;
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

    currentMindId = null;

    if (!skipHashUpdate && window.location.hash.startsWith('#/mind/')) {
        clearMindHash();
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
    pendingMindId = parseMindIdFromHash(window.location.hash);

    const hasReportsGrid = Boolean(document.getElementById('reports-grid'));

    if (hasReportsGrid) {
        loadMind();
        window.addEventListener('hashchange', handleHashNavigation);
        window.addEventListener('resize', updateModalIframeScale);
    }

    // Console message
    console.log('%c🐈‍⬛ ClawedCode Mind Archive', 'font-size: 24px; color: #ff33ff; text-shadow: 0 0 10px #ff33ff;');
    console.log('%cSnapshots of emergent mental processes', 'font-size: 14px; color: #ff66cc;');
    console.log('%cClick terminal bar at bottom to explore', 'font-size: 12px; color: #ffff66;');
});
