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

// Execute a single action and return result
function executeAction(action) {
  return new Promise((resolve) => {
    switch (action.type) {
      case 'click': {
        const el = document.querySelector(action.selector);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            simulateClick(el);
            resolve({ success: true });
          }, 300);
        } else {
          console.warn('[Walkthrough] Element not found:', action.selector);
          resolve({ success: false, reason: 'element_not_found', selector: action.selector });
        }
        break;
      }

      case 'click-if-exists': {
        const el = document.querySelector(action.selector);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            simulateClick(el);
            resolve({ success: true, clicked: true });
          }, 300);
        } else {
          // Not an error - element just doesn't exist
          resolve({ success: true, clicked: false });
        }
        break;
      }

      case 'scroll': {
        smoothScroll(action.direction, action.speed, action.target || 'end', action.selector);
        resolve({ success: true });
        break;
      }

      case 'navigate': {
        if (action.path.startsWith('#')) {
          window.location.hash = action.path;
        } else {
          window.location.hash = '#' + action.path;
        }
        resolve({ success: true });
        break;
      }

      case 'type': {
        const input = document.querySelector(action.selector);
        if (input) {
          input.value = '';
          typeText(input, action.text, action.delay || 50);
          resolve({ success: true });
        } else {
          console.warn('[Walkthrough] Input not found:', action.selector);
          resolve({ success: false, reason: 'element_not_found' });
        }
        break;
      }

      case 'hover': {
        const target = document.querySelector(action.selector);
        if (target) {
          document.querySelectorAll('.walkthrough-hover').forEach(el => el.classList.remove('walkthrough-hover'));
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            target.classList.add('walkthrough-hover');
            target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            resolve({ success: true });
          }, 300);
        } else {
          console.warn('[Walkthrough] Element not found:', action.selector);
          resolve({ success: false, reason: 'element_not_found' });
        }
        break;
      }

      case 'wait': {
        // For repeat-until loops, wait is handled client-side
        // For regular actions, server timing handles it
        if (action.duration) {
          setTimeout(() => resolve({ success: true }), action.duration);
        } else {
          resolve({ success: true });
        }
        break;
      }

      default:
        console.warn('[Walkthrough] Unknown action type:', action.type);
        resolve({ success: false, reason: 'unknown_action' });
    }
  });
}

// Check if a condition is met
function checkCondition(condition) {
  switch (condition.type) {
    case 'element-not-exists':
      return !document.querySelector(condition.selector);
    case 'element-exists':
      return !!document.querySelector(condition.selector);
    default:
      console.warn('[Walkthrough] Unknown condition type:', condition.type);
      return false;
  }
}

// Execute repeat-until loop
async function executeRepeatUntil(action) {
  const { actions, stopWhen, maxIterations = 200 } = action;
  let iteration = 0;

  console.log('[Walkthrough] Starting repeat-until loop, stopWhen:', stopWhen);

  while (iteration < maxIterations) {
    // Check stop condition first
    if (checkCondition(stopWhen)) {
      console.log('[Walkthrough] Stop condition met after', iteration, 'iterations');
      window.parent.postMessage({
        type: 'walkthrough-response',
        query: 'repeat-until-complete',
        data: { iterations: iteration, reason: 'condition_met' }
      }, '*');
      return;
    }

    iteration++;
    console.log('[Walkthrough] Repeat-until iteration', iteration);

    // Execute each sub-action
    for (const subAction of actions) {
      const result = await executeAction(subAction);

      // If a required action failed (element not found), end the loop
      if (!result.success && subAction.type !== 'click-if-exists') {
        console.log('[Walkthrough] Sub-action failed, ending loop:', result);
        window.parent.postMessage({
          type: 'walkthrough-response',
          query: 'repeat-until-complete',
          data: { iterations: iteration, reason: 'action_failed', result }
        }, '*');
        return;
      }

      // Wait between sub-actions if specified
      if (subAction.waitAfter) {
        await new Promise(r => setTimeout(r, subAction.waitAfter));
      }
    }

    // Small delay between iterations to allow UI updates
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('[Walkthrough] Max iterations reached:', maxIterations);
  window.parent.postMessage({
    type: 'walkthrough-response',
    query: 'repeat-until-complete',
    data: { iterations: iteration, reason: 'max_iterations' }
  }, '*');
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

  // Handle repeat-until specially (it's async and reports completion)
  if (action.type === 'repeat-until') {
    executeRepeatUntil(action);
    return;
  }

  // Execute regular action
  executeAction(action);
});

// Notify parent that listener is ready
if (window.parent !== window) {
  window.parent.postMessage({ type: 'walkthrough-ready' }, '*');
}

console.log('[Walkthrough] Listener initialized');
