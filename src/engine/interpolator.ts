import type { Keyframe, EasingType } from "../types/scene";

// ── Easing Functions ────────────────────────────────────────────────────────

function easeLinear(t: number): number {
  return t;
}

function easeIn(t: number): number {
  return t * t;
}

function easeOut(t: number): number {
  return t * (2 - t);
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function easeSpring(t: number): number {
  return 1 - Math.pow(1 - t, 2) * Math.cos((1 - t) * Math.PI * 2.5);
}

function easeBounce(t: number): number {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    const t2 = t - 1.5 / 2.75;
    return 7.5625 * t2 * t2 + 0.75;
  } else if (t < 2.5 / 2.75) {
    const t2 = t - 2.25 / 2.75;
    return 7.5625 * t2 * t2 + 0.9375;
  } else {
    const t2 = t - 2.625 / 2.75;
    return 7.5625 * t2 * t2 + 0.984375;
  }
}

function easeStep(t: number): number {
  return t >= 1 ? 1 : 0;
}

const EASING_MAP: Record<EasingType, (t: number) => number> = {
  linear: easeLinear,
  "ease-in": easeIn,
  "ease-out": easeOut,
  "ease-in-out": easeInOut,
  spring: easeSpring,
  bounce: easeBounce,
  step: easeStep,
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Interpolate between two values using the given easing function.
 * `t` is expected in [0, 1].
 */
export function interpolateValue(
  from: number,
  to: number,
  t: number,
  easing: EasingType
): number {
  const clampedT = Math.max(0, Math.min(1, t));
  const easedT = EASING_MAP[easing](clampedT);
  return from + (to - from) * easedT;
}

/**
 * Given a sorted array of keyframes, find the value of the specified
 * `property` at the given `time`. If no keyframes exist for that property,
 * returns 0.
 */
export function interpolateKeyframes(
  keyframes: Keyframe[],
  property: string,
  time: number
): number {
  // Filter to only keyframes for the requested property, sorted by time
  const relevant = keyframes
    .filter((kf) => kf.property === property)
    .sort((a, b) => a.time - b.time);

  if (relevant.length === 0) {
    return 0;
  }

  // Before first keyframe: hold first value
  if (time <= relevant[0].time) {
    return relevant[0].value;
  }

  // After last keyframe: hold last value
  if (time >= relevant[relevant.length - 1].time) {
    return relevant[relevant.length - 1].value;
  }

  // Find surrounding keyframes
  for (let i = 0; i < relevant.length - 1; i++) {
    const a = relevant[i];
    const b = relevant[i + 1];

    if (time >= a.time && time <= b.time) {
      const segmentDuration = b.time - a.time;
      if (segmentDuration === 0) {
        return b.value;
      }
      const localT = (time - a.time) / segmentDuration;
      return interpolateValue(a.value, b.value, localT, b.easing);
    }
  }

  // Fallback (should not reach here)
  return relevant[relevant.length - 1].value;
}
