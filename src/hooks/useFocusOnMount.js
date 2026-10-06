import { useEffect, useRef } from "react";

/** Focuses `ref` once when the component mounts, if `enabled` was true at mount time. */
export default function useFocusOnMount(enabled) {
  const ref = useRef(null);
  const enabledAtMount = useRef(enabled);
  useEffect(() => {
    if (enabledAtMount.current) ref.current?.focus();
  }, []);
  return ref;
}
