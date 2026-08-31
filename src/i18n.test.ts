import { describe, expect, it } from 'vitest';
import { hasTranslation, translate, validateTranslations } from './i18n';

describe('localization', () => {
  it('contains complete English and Thai translations', () => {
    expect(validateTranslations()).toBe(true);
    expect(hasTranslation('dashboard')).toBe(true);
  });

  it('supports English, Thai, and bilingual modes', () => {
    expect(translate('dashboard', 'en')).toBe('Dashboard');
    expect(translate('dashboard', 'th')).toContain('แดชบอร์ด');
    expect(translate('dashboard', 'bilingual')).toContain('Dashboard /');
  });
});
