// Walkthrough Playout Listener
// Receives postMessage commands from parent window for automated walkthroughs

// Smooth scroll implementation
function smoothScroll(direction, speed, target, selector) {
  const pixelsPerSecond = speed * (direction === 'down' ? 1 : -1);

  // Determine target position
  let targetY;
  if (target === 'element' && selector) {
    const el = document.querySelector(selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      targetY = window.scrollY + rect.top;
    } else {
      console.warn('[Walkthrough] Scroll target element not found:', selector);
      return;
    }
  } else {
    // Default to end of page
    targetY = direction === 'down'
      ? document.documentElement.scrollHeight - window.innerHeight
      : 0;
  }

  const startY = window.scrollY;
  console.log('[Walkthrough] Scroll starting:', {
    direction,
    speed,
    pixelsPerSecond,
    startY,
    targetY,
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight
  });

  // If already at target, nothing to do
  if (Math.abs(targetY - startY) < 1) {
    console.log('[Walkthrough] Already at scroll target');
    return;
  }

  let lastTime = performance.now();
  let accumulatedPixels = 0;

  function step(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;

    // Accumulate fractional pixels
    accumulatedPixels += pixelsPerSecond * deltaTime;

    // Only scroll when we have at least 1 pixel accumulated
    if (Math.abs(accumulatedPixels) >= 1) {
      const pixelsToScroll = Math.trunc(accumulatedPixels);
      accumulatedPixels -= pixelsToScroll;
      window.scrollBy(0, pixelsToScroll);
    }

    const currentY = window.scrollY;
    const remaining = targetY - currentY;

    // Check if we've reached the target (with small tolerance)
    if (Math.abs(remaining) < 2) {
      window.scrollTo(0, targetY);
      console.log('[Walkthrough] Scroll complete at:', targetY);
      return;
    }

    // Check if we're scrolling past the target
    if ((direction === 'down' && currentY >= targetY) ||
        (direction === 'up' && currentY <= targetY)) {
      console.log('[Walkthrough] Scroll stopped - past target');
      return;
    }

    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// Type text character by character
function typeText(input, text, delay) {
  let i = 0;

  function type() {
    if (i >= text.length) return;
    input.value += text[i];
    input.dispatchEvent(new Event('input', { bubbles: true }));
    i++;
    setTimeout(type, delay);
  }

  type();
}

// Simulate a realistic click with visual feedback
function simulateClick(element) {
  // Focus the element first
  element.focus?.();

  // Create and dispatch mousedown
  const mousedown = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  element.dispatchEvent(mousedown);

  // Small delay then mouseup and click
  setTimeout(() => {
    const mouseup = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(mouseup);

    const click = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(click);
  }, 50);
}

// Listen for walkthrough control messages from parent
window.addEventListener('message', (event) => {
  // Handle page info queries
  if (event.data?.type === 'walkthrough-query') {
    const { query } = event.data;

    if (query === 'pageInfo') {
      const response = {
        type: 'walkthrough-response',
        query: 'pageInfo',
        data: {
          scrollHeight: document.documentElement.scrollHeight,
          clientHeight: document.documentElement.clientHeight,
          scrollableDistance: document.documentElement.scrollHeight - window.innerHeight,
          currentScrollY: window.scrollY,
          url: window.location.href
        }
      };
      window.parent.postMessage(response, '*');
      console.log('[Walkthrough] Sent page info:', response.data);
    }
    return;
  }

  // Accept messages from any origin (for development flexibility)
  if (event.data?.type !== 'walkthrough-action') return;

  const { action } = event.data;

  console.log('[Walkthrough] Received action:', action.type, action.description || '');

  switch (action.type) {
    case 'click': {
      const el = document.querySelector(action.selector);
      if (el) {
        // Scroll element into view first
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Then click after scroll settles
        setTimeout(() => simulateClick(el), 300);
      } else {
        console.warn('[Walkthrough] Element not found:', action.selector);
      }
      break;
    }

    case 'scroll': {
      smoothScroll(action.direction, action.speed, action.target || 'end', action.selector);
      break;
    }

    case 'navigate': {
      // For hash-based routing (React Router with HashRouter)
      if (action.path.startsWith('#')) {
        window.location.hash = action.path;
      } else {
        // For browser router, update hash to match path
        window.location.hash = '#' + action.path;
      }
      break;
    }

    case 'type': {
      const input = document.querySelector(action.selector);
      if (input) {
        // Clear existing value first
        input.value = '';
        typeText(input, action.text, action.delay || 50);
      } else {
        console.warn('[Walkthrough] Input not found:', action.selector);
      }
      break;
    }

    case 'hover': {
      const target = document.querySelector(action.selector);
      if (target) {
        // Remove any previous walkthrough hover
        document.querySelectorAll('.walkthrough-hover').forEach(el => el.classList.remove('walkthrough-hover'));

        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          // Add class to trigger hover styles (CSS :hover won't work with JS events)
          target.classList.add('walkthrough-hover');
          target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        }, 300);
      } else {
        console.warn('[Walkthrough] Element not found:', action.selector);
      }
      break;
    }

    case 'wait': {
      // Wait action is handled by the server timing
      // Nothing to do here
      break;
    }

    default:
      console.warn('[Walkthrough] Unknown action type:', action.type);
  }
});

// Notify parent that listener is ready
if (window.parent !== window) {
  window.parent.postMessage({ type: 'walkthrough-ready' }, '*');
}

console.log('[Walkthrough] Listener initialized');
