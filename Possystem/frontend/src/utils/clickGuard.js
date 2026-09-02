/**
 * Global Click & Submit Guard
 * Prevents rapid double-clicks and duplicate form submissions across the entire system.
 */

(function initClickGuard() {
    if (typeof window === 'undefined') return;

    let lastClickTime = 0;
    let lastClickedButton = null;
    const DEBOUNCE_WINDOW_MS = 600; // 600ms debounce on the exact same button

    // Capturing click listener to catch events before any synthetic or bubble handlers
    window.addEventListener('click', (event) => {
        const button = event.target.closest('button, [role="button"], input[type="submit"], input[type="button"]');
        if (!button) return;

        // Skip buttons specifically designated for rapid continuous clicking (e.g. quantity steppers)
        const isStepper = button.closest('.quantity-stepper, .stepper, .counter, .no-debounce') ||
            button.getAttribute('data-allow-double-click') === 'true' ||
            button.classList.contains('allow-fast-click');
        if (isStepper) return;

        const now = Date.now();

        // 1. If the exact same button is clicked within DEBOUNCE_WINDOW_MS, cancel it
        if (button === lastClickedButton && (now - lastClickTime) < DEBOUNCE_WINDOW_MS) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            return;
        }

        // 2. If the button is currently marked as disabled or aria-busy, cancel it
        if (button.hasAttribute('disabled') || button.getAttribute('aria-busy') === 'true' || button.classList.contains('submitting') || button.classList.contains('disabled')) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            return;
        }

        lastClickTime = now;
        lastClickedButton = button;
    }, true);

    // Capturing submit listener to prevent duplicate form submissions
    const activeSubmittingForms = new WeakSet();
    window.addEventListener('submit', (event) => {
        const form = event.target;
        if (!form) return;

        if (activeSubmittingForms.has(form)) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            return;
        }

        activeSubmittingForms.add(form);

        // Auto-release after 3 seconds to prevent permanent locking in case of network timeout
        setTimeout(() => {
            activeSubmittingForms.delete(form);
        }, 3000);
    }, true);
})();
