import { useState } from 'react';

import { useIsomorphicLayoutEffect } from '../useIsomorphicLayoutEffect/useIsomorphicLayoutEffect';

/** The use orientation return type */
export interface UseOrientationReturn {
  /** The current screen orientation angle */
  angle: number;
  /** The screen orientation type */
  type: OrientationType;
}

/**
 * @name useOrientation
 * @description - Hook that returns the current screen orientation
 *
 * @returns {UseOrientationReturn} An object containing the current screen orientation
 *
 * @example
 * const { angle, type } = useOrientation();
 */
export const useOrientation = (): UseOrientationReturn => {
  const [orientation, setOrientation] = useState<{
    angle: number;
    type: OrientationType;
  }>({ angle: 0, type: 'landscape-primary' });

  useIsomorphicLayoutEffect(() => {
    const onChange = () => {
      const { angle, type } = window.screen.orientation;
      setOrientation({
        angle,
        type
      });
    };

    window.screen.orientation?.addEventListener('change', onChange);
    return () => window.screen.orientation?.removeEventListener('change', onChange);
  }, []);

  return orientation;
};
