type DevicePixelRatioChangeCallback = (newRatio: number) => void;

/**
 * Tracks changes in window.devicePixelRatio reactively.
 * 
 * @param callback The function to call when the devicePixelRatio changes.
 * @returns A cleanup function to stop listening for changes.
 */
export function trackPixelRatioChange(callback: DevicePixelRatioChangeCallback): () => void {
  // The media query listener for 'change' events provides the event object, 
  // but we can just check window.devicePixelRatio inside the handler.
  const handler = () => {
    callback(window.devicePixelRatio);
  };

  // Modern browsers support listening for 'change' events directly on the matchMedia result, 
  // but we must use the correct query that will always match the current state to be notified of *any* change.
  // The 'resolution' media feature can't be used to match the current value to be notified when it changes from it.
  
  // The recommended approach is to use the `change` event on a broad matchMedia query (though this event is primarily for when the *matching status* of a query changes).
  
  // Let's use the widely accepted recursive method with a slight improvement for cleanup:
  
  let mediaQueryList: MediaQueryList;
  const setupListener = (initialRatio: number) => {
    if (mediaQueryList) {
      mediaQueryList.removeEventListener('change', listener);
    }
    mediaQueryList = window.matchMedia(`screen and (resolution: ${initialRatio}dppx)`);
    mediaQueryList.addEventListener('change', listener);
  };

  const listener = () => {
    const newRatio = window.devicePixelRatio;
    callback(newRatio);
    // Recursively set up for the new ratio
    setupListener(newRatio); 
  };

  // Initial setup
  setupListener(window.devicePixelRatio);

  // Return the cleanup function
  return () => {
    if (mediaQueryList) {
      mediaQueryList.removeEventListener('change', listener);
    }
  };
}

// Example Usage:
// const cleanup = trackPixelRatioChange((newRatio) => {
//   console.log('Device Pixel Ratio changed to:', newRatio);
// });
// To stop tracking: cleanup();
