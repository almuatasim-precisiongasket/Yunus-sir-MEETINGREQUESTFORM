/**
 * Tactile micro-haptic feedback utility.
 * Gracefully degrades on unsupported systems (like desktops or iOS Safari, which restricts/does not support Vibration API).
 */
export const triggerHaptic = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn("Haptic feedback failed to execute:", e);
    }
  }
};

export const hapticFeedback = {
  /**
   * Crisp 10ms click vibration. Perfect for page transitions, tab switches, and key selections.
   */
  tap: () => triggerHaptic(10),

  /**
   * Positive double-tap pulse on successful events (e.g. booking confirmation, database saves).
   */
  success: () => triggerHaptic([15, 45, 30]),

  /**
   * Cautionary triple-pulse for warning states, missing inputs, and validation shake animations.
   */
  error: () => triggerHaptic([40, 60, 40]),
};
