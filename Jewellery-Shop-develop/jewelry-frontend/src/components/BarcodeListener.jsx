import { useEffect, useRef } from "react";

/**
 * Global barcode scanner listener with focus management.
 *
 * Key behavior:
 * - Intercepts barcode scanner keystrokes BEFORE they reach focused fields
 * - Always routes barcode input to onBarcode callback (doesn't let it fill form fields)
 * - Prevents accidental data entry into focused fields
 *
 * Props:
 *  - onBarcode(code: string) : callback when a barcode is received
 *  - enabled (optional boolean) : default true
 */
export default function BarcodeListener({ onBarcode, enabled = true }) {
  const bufferRef = useRef("");
  const timerRef = useRef(null);
  const lastKeystrokeTimeRef = useRef(0); // Track timing between keystrokes
  const keystrokeTimingsRef = useRef([]); // Store intervals between keystrokes
  const resetAfterMs = 180; // ms between keystrokes to consider end-of-scan
  const isInInputRef = useRef(false); // Track if we're in a barcode entry

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e) {
      console.log(e, "-------- Found e target");
      // Safety check - some events don't have a key property
      if (!e || !e.key) return;

      // Detect Enter key (end of barcode scan)
      if (e.key === "Enter") {
        const code = bufferRef.current.trim();
        bufferRef.current = "";
        keystrokeTimingsRef.current = [];
        lastKeystrokeTimeRef.current = 0;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }

        // If we have a buffered code, it's a barcode - prevent Enter from reaching focused field
        if (code && code.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          isInInputRef.current = false;
          try {
            onBarcode(code);
          } catch (err) {
            console.warn("onBarcode callback error", err);
          }
          return;
        }
        isInInputRef.current = false;
        return;
      }

      // Detect single character input (from scanner or keyboard)
      if (e.key.length === 1) {
        // Track timing between keystrokes to detect scanner vs manual typing
        const now = Date.now();
        const timeSinceLastKey = lastKeystrokeTimeRef.current
          ? now - lastKeystrokeTimeRef.current
          : 0;
        lastKeystrokeTimeRef.current = now;

        // Only track timing if we have a previous keystroke
        if (timeSinceLastKey > 0) {
          keystrokeTimingsRef.current.push(timeSinceLastKey);
        }

        // ALWAYS prevent the character from entering ANY field
        // We'll let manual typing through only if it's slow enough
        e.preventDefault();
        e.stopPropagation();

        bufferRef.current += e.key;
        isInInputRef.current = true;

        // Reset existing timer
        if (timerRef.current) clearTimeout(timerRef.current);

        // Set new timer to process buffer after delay
        timerRef.current = setTimeout(() => {
          const buf = bufferRef.current;
          bufferRef.current = "";

          // Calculate average time between keystrokes
          const timings = keystrokeTimingsRef.current;
          const avgInterval =
            timings.length > 0
              ? timings.reduce((a, b) => a + b, 0) / timings.length
              : 1000;

          keystrokeTimingsRef.current = [];
          lastKeystrokeTimeRef.current = 0;
          timerRef.current = null;
          isInInputRef.current = false;

          // Barcode scanners type very fast (usually <50ms between chars)
          // Manual typing is slower (usually >80ms between chars)
          const isFastTyping = avgInterval < 60 && timings.length >= 2;

          // If buffer looks like a barcode AND typing was fast, send it
          if (buf.length >= 3 && isFastTyping) {
            try {
              onBarcode(buf);
            } catch (err) {
              console.warn("onBarcode callback error", err);
            }
          } else if (buf.length === 1 || buf.length === 2) {
            // Single or double character typed slowly - restore to focused field
            const active = document.activeElement;
            if (
              active &&
              (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
            ) {
              try {
                // Manually insert the character that was typed
                const inputType = active.type || "text";
                const currentValue = active.value || "";

                // For inputs that support selection (text, search, url, tel, password)
                if (
                  inputType !== "number" &&
                  inputType !== "email" &&
                  inputType !== "date"
                ) {
                  const start = active.selectionStart || 0;
                  const end = active.selectionEnd || 0;
                  const newValue =
                    currentValue.substring(0, start) +
                    buf +
                    currentValue.substring(end);

                  // Use native setter to trigger React's onChange
                  const nativeInputValueSetter =
                    Object.getOwnPropertyDescriptor(
                      window.HTMLInputElement.prototype,
                      "value",
                    ).set;
                  nativeInputValueSetter.call(active, newValue);

                  // Trigger input event for React
                  const inputEvent = new Event("input", { bubbles: true });
                  active.dispatchEvent(inputEvent);

                  // Set cursor position
                  active.selectionStart = active.selectionEnd =
                    start + buf.length;
                } else {
                  // For number/email/date inputs, just append to the end
                  const newValue = currentValue + buf;

                  const nativeInputValueSetter =
                    Object.getOwnPropertyDescriptor(
                      window.HTMLInputElement.prototype,
                      "value",
                    ).set;
                  nativeInputValueSetter.call(active, newValue);

                  const inputEvent = new Event("input", { bubbles: true });
                  active.dispatchEvent(inputEvent);
                }
              } catch (err) {
                console.warn("Failed to restore character to field:", err);
              }
            }
          }
        }, resetAfterMs);
      }
    }

    window.addEventListener("keydown", handleKeyDown, true); // Use capture phase
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onBarcode, enabled]);

  return null;
}
