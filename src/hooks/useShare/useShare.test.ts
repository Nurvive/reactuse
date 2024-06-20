import { renderHook } from '@testing-library/react';

import { useShare } from './useShare';

const mockNavigatorShare = vi.fn(() => Promise.resolve());

beforeEach(() => {
  Object.assign(navigator, {
    canShare: () => true,
    share: mockNavigatorShare
  });
});

it('Should use share', () => {
  const { result } = renderHook(() => useShare());

  expect(result.current.isLoading).toBe(false);
  expect(result.current.isSupported).toBe(true);
  expect(typeof result.current.share).toBe('function');
});

it('Should not support', () => {
  delete navigator.share;
  const { result } = renderHook(() => useShare());
  expect(result.current.isSupported).toBe(false);
});

it('Should not call share when unsupported', () => {
  delete navigator.share;
  const { result } = renderHook(() => useShare());
  result.current.share();
  expect(mockNavigatorShare).not.toHaveBeenCalledOnce();
});
