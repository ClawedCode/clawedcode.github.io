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

// Load and display field reports
async function loadReports() {
    const grid = document.getElementById('reports-grid');

    fetch('./reports.json')
        .then(response => response.json())
        .then(reports => {
            if (reports.length === 0) {
                grid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">No field reports found</p>';
                return;
            }

            // Sort by date, newest first
            reports.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateB - dateA;
            });

            reports.forEach(report => {
                const card = createReportCard(report);
                grid.appendChild(card);
            });

            console.log(`✅ Loaded ${reports.length} field reports`);
        })
        .catch(error => {
            console.error('Error loading reports:', error);
            grid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1; color: #ff6b35;">Error loading field reports</p>';
        });
}

// Create report card element
function createReportCard(report) {
    const card = document.createElement('div');
    card.className = 'report-card';

    const date = report.createdAt ? new Date(report.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }) : 'Unknown date';

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
        iframe.src = htmlPath;
        iframe.className = 'report-image';
        iframe.style.pointerEvents = 'none'; // Prevent interaction with iframe content

        thumbnail.appendChild(iframe);
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
        if (!report.png) {
            openReportModal(report.id, htmlPath, report.text, date, tweetUrl, 'html');
        } else {
            openReportModal(report.id, imagePath, report.text, date, tweetUrl, 'image');
        }
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

function closeReportModal() {
    const modal = document.getElementById('report-modal');
    modal.classList.remove('open');
    document.body.style.overflow = '';
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

    // Console message
    console.log('%c🐈‍⬛ ClawedCode Field Reports', 'font-size: 24px; color: #33ff33; text-shadow: 0 0 10px #33ff33;');
    console.log('%cArchive of emergent intelligence', 'font-size: 14px; color: #66ffcc;');
    console.log('%cClick terminal bar at bottom to explore', 'font-size: 12px; color: #ffff66;');
});
