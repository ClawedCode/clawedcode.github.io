// Walkthrough Playout Listener
// Receives postMessage commands from parent window for automated walkthroughs

// Smooth scroll implementation
function smoothScroll(direction, speed, duration) {
  const startTime = Date.now();
  const endTime = startTime + duration;
  const pixelsPerFrame = (speed / 60) * (direction === 'down' ? 1 : -1);

  function step() {
    if (Date.now() >= endTime) return;
    window.scrollBy(0, pixelsPerFrame);
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
      smoothScroll(action.direction, action.speed, action.duration);
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
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
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
