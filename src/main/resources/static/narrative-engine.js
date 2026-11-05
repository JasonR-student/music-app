// ===================================================
// 「乐见」叙事引擎
// 章节叙事匹配 + 字幕生成 + 音乐故事实时呈现
// ===================================================
(function(){
  'use strict';

  const NarrativeEngine = (function(){

    // 梁祝完整叙事文本
    const NARRATIVES = {
      '引子': {
        title: '引子 · 春光明媚',
        subtitle: '长笛吹奏优美旋律，描绘鸟语花香的春景',
        story: '春风拂过江南，百花盛开。在书香的庭院中，一段传奇即将展开……',
        emotion: '宁静 · 期待',
        color: '#7ab648',
        duration: [0, 60]
      },
      '相爱': {
        title: '呈示部 · 草桥结拜',
        subtitle: '小提琴奏出爱情主题，大提琴对答',
        story: '梁山伯与祝英台在草桥相遇，一见如故，义结金兰。爱情的种子在春风中悄然萌芽。',
        emotion: '温柔 · 深情',
        color: '#d4768a',
        duration: [60, 300]
      },
      '同窗': {
        title: '呈示部 · 同窗三载',
        subtitle: '轻快小快板，描绘三载同窗的欢愉时光',
        story: '三年同窗，朝夕相处。读书、嬉戏、论道，两人情谊日渐深厚，却各有心事未曾说出口。',
        emotion: '欢快 · 活泼',
        color: '#d4a843',
        duration: [300, 480]
      },
      '相送': {
        title: '呈示部 · 十八相送',
        subtitle: '慢板，缠绵旋律，惜别之情',
        story: '长亭送别，十八里相送。祝英台借景喻情，暗示女儿身，梁山伯却浑然不解。依依不舍，步步回头。',
        emotion: '缠绵 · 不舍',
        color: '#6a9bc3',
        duration: [480, 660]
      },
      '抗婚': {
        title: '展开部 · 抗婚',
        subtitle: '铜管严峻节奏，独奏散板反抗',
        story: '祝英台被许配马家，坚决不从。封建礼教如铜管般威严压来，小提琴以散板激烈抗争，戏剧冲突达到顶点。',
        emotion: '悲愤 · 抗争',
        color: '#c43030',
        duration: [660, 840]
      },
      '楼台会': {
        title: '展开部 · 楼台相会',
        subtitle: '大提琴与小提琴对答，如泣如诉',
        story: '楼台之上，两人重逢。大提琴与小提琴缠绵对答，互诉衷肠。"梁兄啊""贤弟呀"，字字血泪，声声断肠。',
        emotion: '悲伤 · 深情',
        color: '#8a6ab8',
        duration: [840, 1020]
      },
      '哭灵': {
        title: '展开部 · 哭灵投坟',
        subtitle: '急转直下，锣鼓齐鸣，全曲最高潮',
        story: '梁山伯悲痛而亡。祝英台披红挂孝来到坟前，哭诉衷肠。忽然风雷大作，坟墓裂开，祝英台纵身跃入……',
        emotion: '悲恸 · 壮烈',
        color: '#a01010',
        duration: [1020, 1200]
      },
      '化蝶': {
        title: '再现部 · 化蝶',
        subtitle: '长笛回归宁静，爱情主题再现',
        story: '雨过天晴，百花丛中飞出两只蝴蝶，翩翩起舞。它们便是梁山伯与祝英台的化身，从此永不分离。',
        emotion: '超脱 · 永恒',
        color: '#5ab8a8',
        duration: [1200, Infinity]
      }
    };

    let currentChapter = null;
    let subtitleEl = null;
    let storyEl = null;
    let emotionEl = null;
    let titleEl = null;
    let onChapterChange = null;

    // 字幕动画状态
    let subtitleAnim = null;

    function init(elements, callback){
      subtitleEl = elements.subtitle;
      storyEl = elements.story;
      emotionEl = elements.emotion;
      titleEl = elements.title;
      onChapterChange = callback;
    }

    function update(currentTime){
      const chapter = getChapterAtTime(currentTime);

      if(chapter && chapter !== currentChapter){
        currentChapter = chapter;
        const narrative = NARRATIVES[chapter];
        if(narrative){
          showNarrative(narrative);
          if(onChapterChange) onChapterChange(chapter, narrative);
        }
      }
    }

    function getChapterAtTime(time){
      for(const name in NARRATIVES){
        const n = NARRATIVES[name];
        if(time >= n.duration[0] && time < n.duration[1]){
          return name;
        }
      }
      return null;
    }

    function showNarrative(narrative){
      // 清除之前的动画
      if(subtitleAnim){
        clearTimeout(subtitleAnim);
      }

      // 淡出
      if(titleEl) titleEl.classList.add('narrative-fade-out');
      if(subtitleEl) subtitleEl.classList.add('narrative-fade-out');
      if(storyEl) storyEl.classList.add('narrative-fade-out');
      if(emotionEl) emotionEl.classList.add('narrative-fade-out');

      // 等待淡出完成后更新内容并淡入
      subtitleAnim = setTimeout(function(){
        if(titleEl){
          titleEl.textContent = narrative.title;
          titleEl.style.color = narrative.color;
          titleEl.classList.remove('narrative-fade-out');
          titleEl.classList.add('narrative-fade-in');
        }

        if(subtitleEl){
          subtitleEl.textContent = narrative.subtitle;
          subtitleEl.classList.remove('narrative-fade-out');
          subtitleEl.classList.add('narrative-fade-in');
        }

        if(storyEl){
          storyEl.textContent = narrative.story;
          storyEl.classList.remove('narrative-fade-out');
          storyEl.classList.add('narrative-fade-in');
        }

        if(emotionEl){
          emotionEl.textContent = narrative.emotion;
          emotionEl.style.color = narrative.color;
          emotionEl.classList.remove('narrative-fade-out');
          emotionEl.classList.add('narrative-fade-in');
        }

        // 移除 fade-in 类（动画结束后）
        subtitleAnim = setTimeout(function(){
          if(titleEl) titleEl.classList.remove('narrative-fade-in');
          if(subtitleEl) subtitleEl.classList.remove('narrative-fade-in');
          if(storyEl) storyEl.classList.remove('narrative-fade-in');
          if(emotionEl) emotionEl.classList.remove('narrative-fade-in');
        }, 800);

      }, 400);
    }

    function getCurrentChapter(){
      return currentChapter;
    }

    function getCurrentNarrative(){
      return currentChapter ? NARRATIVES[currentChapter] : null;
    }

    function getNarrative(chapterName){
      return NARRATIVES[chapterName] || null;
    }

    function getAllChapters(){
      return Object.keys(NARRATIVES).map(function(name){
        return Object.assign({name: name}, NARRATIVES[name]);
      });
    }

    return {
      init: init,
      update: update,
      getCurrentChapter: getCurrentChapter,
      getCurrentNarrative: getCurrentNarrative,
      getNarrative: getNarrative,
      getAllChapters: getAllChapters,
      getChapterAtTime: getChapterAtTime
    };

  })();

  window.NarrativeEngine = NarrativeEngine;

})();
