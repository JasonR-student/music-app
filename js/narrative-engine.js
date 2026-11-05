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

const NARRATIVES_EN = {
  '引子': { title: 'Introduction · Spring Radiance', subtitle: 'Flute plays a graceful melody, depicting a scenic spring landscape', story: 'A spring breeze sweeps across Jiangnan, flowers in full bloom. In a scholarly courtyard, a legend is about to unfold...', emotion: 'Serene · Anticipation' },
  '相爱': { title: 'Exposition · Oath at Caoqiao', subtitle: 'Violin presents the love theme, cello responds', story: 'Liang Shanbo and Zhu Yingtai meet at Caoqiao bridge, instant kindred spirits. Seeds of love quietly sprout in the spring breeze.', emotion: 'Tender · Affectionate' },
  '同窗': { title: 'Exposition · Three Years of Schooling', subtitle: 'Light allegretto, depicting three joyful years together', story: 'Three years as classmates, together day and night. Studying, playing, debating — their bond deepens, yet unspoken feelings remain.', emotion: 'Joyful · Lively' },
  '相送': { title: 'Exposition · Eighteen Miles of Farewell', subtitle: 'Slow movement, lingering melody, the sorrow of parting', story: 'Farewell at the long pavilion, eighteen miles of escort. Zhu hints at her true identity through metaphors, but Liang remains oblivious.', emotion: 'Reluctant · Longing' },
  '抗婚': { title: 'Development · Resisting the Marriage', subtitle: 'Stern brass rhythms, solo recitative of defiance', story: 'Zhu is betrothed to the Ma family but staunchly refuses. Feudal propriety bears down like stern brass, while the violin fights back with fierce recitative.', emotion: 'Grief · Defiance' },
  '楼台会': { title: 'Development · Reunion at the Tower', subtitle: 'Cello and violin in dialogue, weeping and pleading', story: 'At the tower, the lovers reunite. Cello and violin intertwine in anguished dialogue, pouring out their hearts.', emotion: 'Sorrowful · Devoted' },
  '哭灵': { title: 'Development · Mourning at the Grave', subtitle: 'Sudden descent, drums and gongs crash — the climactic peak', story: 'Liang Shanbo dies of grief. Zhu arrives at the grave in mourning. Suddenly thunder and wind rage — the tomb splits open, and Zhu leaps in...', emotion: 'Anguished · Heroic' },
  '化蝶': { title: 'Recapitulation · Transformation into Butterflies', subtitle: 'Flute returns to serenity, the love theme reprised', story: 'The storm clears, skies brighten. From among the flowers emerge two butterflies, dancing gracefully. They are the spirits of Liang and Zhu, never to be separated again.', emotion: 'Transcendent · Eternal' }
};

var lang = 'zh';
let currentChapter = null;
let subtitleEl = null;
let storyEl = null;
let emotionEl = null;
let titleEl = null;
let onChapterChange = null;
let subtitleAnim = null;
let fadeCleanAnim = null;

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

function t(narrative, field){
  if(lang === 'en' && narrative[field + 'En']) return narrative[field + 'En'];
  return narrative[field];
}

function showNarrative(narrative){
  if(subtitleAnim){
    clearTimeout(subtitleAnim);
    subtitleAnim = null;
  }
  if(fadeCleanAnim){
    clearTimeout(fadeCleanAnim);
    fadeCleanAnim = null;
  }

  if(titleEl) titleEl.classList.add('narrative-fade-out');
  if(subtitleEl) subtitleEl.classList.add('narrative-fade-out');
  if(storyEl) storyEl.classList.add('narrative-fade-out');
  if(emotionEl) emotionEl.classList.add('narrative-fade-out');

  subtitleAnim = setTimeout(function(){
    subtitleAnim = null;
    if(titleEl){
      titleEl.textContent = t(narrative, 'title');
      titleEl.style.color = narrative.color;
      titleEl.classList.remove('narrative-fade-out');
      titleEl.classList.add('narrative-fade-in');
    }
    if(subtitleEl){
      subtitleEl.textContent = t(narrative, 'subtitle');
      subtitleEl.classList.remove('narrative-fade-out');
      subtitleEl.classList.add('narrative-fade-in');
    }
    if(storyEl){
      storyEl.textContent = t(narrative, 'story');
      storyEl.classList.remove('narrative-fade-out');
      storyEl.classList.add('narrative-fade-in');
    }
    if(emotionEl){
      emotionEl.textContent = t(narrative, 'emotion');
      emotionEl.style.color = narrative.color;
      emotionEl.classList.remove('narrative-fade-out');
      emotionEl.classList.add('narrative-fade-in');
    }
    fadeCleanAnim = setTimeout(function(){
      fadeCleanAnim = null;
      if(titleEl) titleEl.classList.remove('narrative-fade-in');
      if(subtitleEl) subtitleEl.classList.remove('narrative-fade-in');
      if(storyEl) storyEl.classList.remove('narrative-fade-in');
      if(emotionEl) emotionEl.classList.remove('narrative-fade-in');
    }, 800);
  }, 400);
}

function getCurrentChapter(){ return currentChapter; }
function getCurrentNarrative(){ return currentChapter ? NARRATIVES[currentChapter] : null; }
function getNarrative(chapterName){ return NARRATIVES[chapterName] || null; }
function getAllChapters(){
  return Object.keys(NARRATIVES).map(function(name){
    return Object.assign({name: name}, NARRATIVES[name]);
  });
}
function getChapterAtTime2(time){ return getChapterAtTime(time); }

function setLanguage(l){
  lang = l === 'en' ? 'en' : 'zh';
  if(currentChapter){
    var narrative = NARRATIVES[currentChapter];
    if(narrative) showNarrative(narrative);
  }
}

function getLanguage(){ return lang; }

export const NarrativeEngine = {
  init, update,
  getCurrentChapter, getCurrentNarrative, getNarrative, getAllChapters,
  getChapterAtTime: getChapterAtTime2,
  setLanguage, getLanguage
};
