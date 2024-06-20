import { useEffect, useState } from 'react';

export interface UseShareOptions {
  title?: string;
  files?: File[];
  text?: string;
  url?: string;
}

/** The use share return type */
export interface UseShareReturn {
  /** Indicates that sharing is in a process */
  isLoading: boolean;
  /** Indicates that the device supports Share API */
  isSupported: boolean;
  /** Share function */
  share: (overrideOptions?: UseShareOptions) => undefined | Promise<void>;
}

/**
 * @name useShare
 * @description - Hook that provides Share API
 *
 * @returns {UseShareReturn} An object containing two boolean values and function
 *
 * @example
 * const { isLoading, isSupported, share } = useShare({ title: 'Reactuse is awesome!', text: 'useShare too!' });
 */
export const useShare = (options: UseShareOptions): UseShareReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (navigator && 'share' in navigator) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
    }
  }, []);

  const share = (overrideOptions: UseShareOptions = {}) => {
    if (!isSupported) return;

    const resultOptions = { ...options, ...overrideOptions };

    let granted = true;

    if (resultOptions.files && navigator.canShare) {
      granted = navigator.canShare({ files: resultOptions.files });
    }

    if (granted) {
      setIsLoading(true);
      return navigator.share(resultOptions).finally(() => setIsLoading(false));
    }
  };

  return { isSupported, isLoading, share };
};
