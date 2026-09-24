import { describe, it, expect } from 'vitest';
import { pushBackHandler, setRootBackHandler, handleBack } from '../src/utils/backButton.js';

describe('Android Back button (spec 8.9)', () => {
  it('the newest overlay answers first, then the screen; with nothing, the app may close', () => {
    const calls = [];
    expect(handleBack()).toBe(false);
    const clearRoot = setRootBackHandler(() => calls.push('screen'));
    const closeModal = pushBackHandler(() => calls.push('modal'));
    const closeReveal = pushBackHandler(() => calls.push('reveal'));
    handleBack();
    closeReveal();
    handleBack();
    closeModal();
    handleBack();
    expect(calls).toEqual(['reveal', 'modal', 'screen']);
    clearRoot();
    expect(handleBack()).toBe(false);
  });
});
