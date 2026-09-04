/**
 * @nova/motion — Nova Office's motion system.
 *
 * Three rules, enforced by what this package does and does not export:
 *
 * 1. Motion is described as physics, not as durations. Presets are named for
 *    what moves ('control', 'panel', 'overlay'), so a component picks by intent.
 * 2. Travel is short. Motion says where a thing came from; it is not the effect.
 * 3. Reduced motion removes movement, not feedback. Transforms are dropped;
 *    opacity cross-fades survive, shortened.
 */

export {
  springValueAt,
  springVelocityAt,
  springDuration,
  springToCssEasing,
  springKeyframes,
  regimeOf,
  dampingRatio,
  type SpringConfig,
  type SpringRegime,
} from './spring';

export {
  springs,
  transitions,
  distances,
  scales,
  cssTransition,
  type SpringName,
  type TransitionName,
} from './presets';

export {
  prefersReducedMotion,
  usePrefersReducedMotion,
  useHasMounted,
} from './reduced-motion';

export {
  useSpring,
  usePresence,
  usePressScale,
  type UseSpringOptions,
  type UsePresenceResult,
  type PresenceStatus,
} from './useSpring';
