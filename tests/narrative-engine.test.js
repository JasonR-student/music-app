import { describe, it, expect } from 'vitest';
import { NarrativeEngine } from '../js/narrative-engine.js';

describe('NarrativeEngine', () => {
  describe('getChapterAtTime', () => {
    it('should return 引子 for time 0', () => {
      expect(NarrativeEngine.getChapterAtTime(0)).toBe('引子');
    });

    it('should return 引子 for time 30 (within 0-60)', () => {
      expect(NarrativeEngine.getChapterAtTime(30)).toBe('引子');
    });

    it('should return 相爱 for time 60', () => {
      expect(NarrativeEngine.getChapterAtTime(60)).toBe('相爱');
    });

    it('should return 相爱 for time 150', () => {
      expect(NarrativeEngine.getChapterAtTime(150)).toBe('相爱');
    });

    it('should return 同窗 for time 300', () => {
      expect(NarrativeEngine.getChapterAtTime(300)).toBe('同窗');
    });

    it('should return 相送 for time 500', () => {
      expect(NarrativeEngine.getChapterAtTime(500)).toBe('相送');
    });

    it('should return 抗婚 for time 700', () => {
      expect(NarrativeEngine.getChapterAtTime(700)).toBe('抗婚');
    });

    it('should return 楼台会 for time 900', () => {
      expect(NarrativeEngine.getChapterAtTime(900)).toBe('楼台会');
    });

    it('should return 哭灵 for time 1100', () => {
      expect(NarrativeEngine.getChapterAtTime(1100)).toBe('哭灵');
    });

    it('should return 化蝶 for time 1200', () => {
      expect(NarrativeEngine.getChapterAtTime(1200)).toBe('化蝶');
    });

    it('should return 化蝶 for time 9999 (beyond last chapter)', () => {
      expect(NarrativeEngine.getChapterAtTime(9999)).toBe('化蝶');
    });

    it('should return null for negative time', () => {
      expect(NarrativeEngine.getChapterAtTime(-1)).toBeNull();
    });
  });

  describe('getNarrative', () => {
    it('should return narrative object for valid chapter', () => {
      const narrative = NarrativeEngine.getNarrative('引子');
      expect(narrative).toBeDefined();
      expect(narrative.title).toContain('引子');
      expect(narrative.color).toBe('#7ab648');
    });

    it('should return null for invalid chapter', () => {
      expect(NarrativeEngine.getNarrative('不存在的章节')).toBeNull();
    });

    it('should have all required fields', () => {
      const narrative = NarrativeEngine.getNarrative('相爱');
      expect(narrative.title).toBeDefined();
      expect(narrative.subtitle).toBeDefined();
      expect(narrative.story).toBeDefined();
      expect(narrative.emotion).toBeDefined();
      expect(narrative.color).toBeDefined();
      expect(narrative.duration).toBeDefined();
    });
  });

  describe('getAllChapters', () => {
    it('should return 8 chapters', () => {
      const chapters = NarrativeEngine.getAllChapters();
      expect(chapters.length).toBe(8);
    });

    it('should include chapter name in each entry', () => {
      const chapters = NarrativeEngine.getAllChapters();
      chapters.forEach(ch => {
        expect(ch.name).toBeDefined();
        expect(ch.title).toBeDefined();
      });
    });

    it('should have chapters in correct order', () => {
      const chapters = NarrativeEngine.getAllChapters();
      expect(chapters[0].name).toBe('引子');
      expect(chapters[7].name).toBe('化蝶');
    });
  });

  describe('language switching', () => {
    it('should default to Chinese', () => {
      expect(NarrativeEngine.getLanguage()).toBe('zh');
    });

    it('should switch to English', () => {
      NarrativeEngine.setLanguage('en');
      expect(NarrativeEngine.getLanguage()).toBe('en');
      NarrativeEngine.setLanguage('zh');
    });

    it('should ignore invalid language codes', () => {
      NarrativeEngine.setLanguage('fr');
      expect(NarrativeEngine.getLanguage()).toBe('zh');
    });
  });
});
