/**
 * 批量为荷兰语动词添加变位数据
 */

const fs = require('fs');
const path = require('path');

// 非动词黑名单（常见以 -en 结尾但不是动词的词）
const NON_VERBS = new Set([
  // 形容词
  'algemeen', 'eigen', 'even', 'golden', 'open', 'broken', 'frozen',
  // 副词/介词
  'binnen', 'boven', 'bovendien', 'buiten', 'echter', 'ergen', 'toen', 'tussen',
  // 连词
  'en', 'toen', 'wanneer',
  // 名词
  'jongen', 'ogen', 'oren', 'benen', 'handen', 'kinderen', 'mensen', 'vrouwen', 
  'mannen', 'dieren', 'zaken', 'jaren', 'dagen', 'weken', 'maanden', 'uren',
  'minuten', 'seconden', 'tijden', 'keren', 'kanten', 'dingen', 'deden',
  'steden', 'landen', 'straten', 'huizen', 'kamers', 'deuren', 'ramen',
  'tafelen', 'stoelen', 'bedden', 'kleren', 'schoenen', 'brillen',
  'boeken', 'kranten', 'brieven', 'woorden', 'zinnen', 'regelen',
  'bloemen', 'bomen', 'planten', 'sterren', 'wolken', 'bergen',
  'rivieren', 'meren', 'zeeën', 'eilanden', 'bossen', 'velden',
  // 代词
  'hen', 'een', 'geen', 'men',
  // 其他
  'geleden', 'gisteren', 'morgen', 'vanavond',
]);

// 不规则动词变位（手动定义）
const IRREGULAR_VERBS = {
  'zijn': {
    present: { ik: 'ben', jij: 'bent', hij: 'is', wij: 'zijn', jullie: 'zijn', zij: 'zijn' },
    past: { ik: 'was', jij: 'was', hij: 'was', wij: 'waren', jullie: 'waren', zij: 'waren' },
    perfect: { auxiliary: 'zijn', pastParticiple: 'geweest' }
  },
  'hebben': {
    present: { ik: 'heb', jij: 'hebt', hij: 'heeft', wij: 'hebben', jullie: 'hebben', zij: 'hebben' },
    past: { ik: 'had', jij: 'had', hij: 'had', wij: 'hadden', jullie: 'hadden', zij: 'hadden' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gehad' }
  },
  'gaan': {
    present: { ik: 'ga', jij: 'gaat', hij: 'gaat', wij: 'gaan', jullie: 'gaan', zij: 'gaan' },
    past: { ik: 'ging', jij: 'ging', hij: 'ging', wij: 'gingen', jullie: 'gingen', zij: 'gingen' },
    perfect: { auxiliary: 'zijn', pastParticiple: 'gegaan' }
  },
  'komen': {
    present: { ik: 'kom', jij: 'komt', hij: 'komt', wij: 'komen', jullie: 'komen', zij: 'komen' },
    past: { ik: 'kwam', jij: 'kwam', hij: 'kwam', wij: 'kwamen', jullie: 'kwamen', zij: 'kwamen' },
    perfect: { auxiliary: 'zijn', pastParticiple: 'gekomen' }
  },
  'doen': {
    present: { ik: 'doe', jij: 'doet', hij: 'doet', wij: 'doen', jullie: 'doen', zij: 'doen' },
    past: { ik: 'deed', jij: 'deed', hij: 'deed', wij: 'deden', jullie: 'deden', zij: 'deden' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gedaan' }
  },
  'staan': {
    present: { ik: 'sta', jij: 'staat', hij: 'staat', wij: 'staan', jullie: 'staan', zij: 'staan' },
    past: { ik: 'stond', jij: 'stond', hij: 'stond', wij: 'stonden', jullie: 'stonden', zij: 'stonden' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gestaan' }
  },
  'zien': {
    present: { ik: 'zie', jij: 'ziet', hij: 'ziet', wij: 'zien', jullie: 'zien', zij: 'zien' },
    past: { ik: 'zag', jij: 'zag', hij: 'zag', wij: 'zagen', jullie: 'zagen', zij: 'zagen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gezien' }
  },
  'geven': {
    present: { ik: 'geef', jij: 'geeft', hij: 'geeft', wij: 'geven', jullie: 'geven', zij: 'geven' },
    past: { ik: 'gaf', jij: 'gaf', hij: 'gaf', wij: 'gaven', jullie: 'gaven', zij: 'gaven' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gegeven' }
  },
  'nemen': {
    present: { ik: 'neem', jij: 'neemt', hij: 'neemt', wij: 'nemen', jullie: 'nemen', zij: 'nemen' },
    past: { ik: 'nam', jij: 'nam', hij: 'nam', wij: 'namen', jullie: 'namen', zij: 'namen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'genomen' }
  },
  'weten': {
    present: { ik: 'weet', jij: 'weet', hij: 'weet', wij: 'weten', jullie: 'weten', zij: 'weten' },
    past: { ik: 'wist', jij: 'wist', hij: 'wist', wij: 'wisten', jullie: 'wisten', zij: 'wisten' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'geweten' }
  },
  'zeggen': {
    present: { ik: 'zeg', jij: 'zegt', hij: 'zegt', wij: 'zeggen', jullie: 'zeggen', zij: 'zeggen' },
    past: { ik: 'zei', jij: 'zei', hij: 'zei', wij: 'zeiden', jullie: 'zeiden', zij: 'zeiden' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gezegd' }
  },
  'kunnen': {
    present: { ik: 'kan', jij: 'kan/kunt', hij: 'kan', wij: 'kunnen', jullie: 'kunnen', zij: 'kunnen' },
    past: { ik: 'kon', jij: 'kon', hij: 'kon', wij: 'konden', jullie: 'konden', zij: 'konden' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gekund' }
  },
  'moeten': {
    present: { ik: 'moet', jij: 'moet', hij: 'moet', wij: 'moeten', jullie: 'moeten', zij: 'moeten' },
    past: { ik: 'moest', jij: 'moest', hij: 'moest', wij: 'moesten', jullie: 'moesten', zij: 'moesten' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gemoeten' }
  },
  'willen': {
    present: { ik: 'wil', jij: 'wil/wilt', hij: 'wil', wij: 'willen', jullie: 'willen', zij: 'willen' },
    past: { ik: 'wilde/wou', jij: 'wilde/wou', hij: 'wilde/wou', wij: 'wilden/wouden', jullie: 'wilden/wouden', zij: 'wilden/wouden' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gewild' }
  },
  'zullen': {
    present: { ik: 'zal', jij: 'zal/zult', hij: 'zal', wij: 'zullen', jullie: 'zullen', zij: 'zullen' },
    past: { ik: 'zou', jij: 'zou', hij: 'zou', wij: 'zouden', jullie: 'zouden', zij: 'zouden' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'n/a' }
  },
  'mogen': {
    present: { ik: 'mag', jij: 'mag', hij: 'mag', wij: 'mogen', jullie: 'mogen', zij: 'mogen' },
    past: { ik: 'mocht', jij: 'mocht', hij: 'mocht', wij: 'mochten', jullie: 'mochten', zij: 'mochten' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gemogen' }
  },
  'lopen': {
    present: { ik: 'loop', jij: 'loopt', hij: 'loopt', wij: 'lopen', jullie: 'lopen', zij: 'lopen' },
    past: { ik: 'liep', jij: 'liep', hij: 'liep', wij: 'liepen', jullie: 'liepen', zij: 'liepen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gelopen' }
  },
  'rijden': {
    present: { ik: 'rijd', jij: 'rijdt', hij: 'rijdt', wij: 'rijden', jullie: 'rijden', zij: 'rijden' },
    past: { ik: 'reed', jij: 'reed', hij: 'reed', wij: 'reden', jullie: 'reden', zij: 'reden' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gereden' }
  },
  'schrijven': {
    present: { ik: 'schrijf', jij: 'schrijft', hij: 'schrijft', wij: 'schrijven', jullie: 'schrijven', zij: 'schrijven' },
    past: { ik: 'schreef', jij: 'schreef', hij: 'schreef', wij: 'schreven', jullie: 'schreven', zij: 'schreven' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'geschreven' }
  },
  'lezen': {
    present: { ik: 'lees', jij: 'leest', hij: 'leest', wij: 'lezen', jullie: 'lezen', zij: 'lezen' },
    past: { ik: 'las', jij: 'las', hij: 'las', wij: 'lazen', jullie: 'lazen', zij: 'lazen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gelezen' }
  },
  'liggen': {
    present: { ik: 'lig', jij: 'ligt', hij: 'ligt', wij: 'liggen', jullie: 'liggen', zij: 'liggen' },
    past: { ik: 'lag', jij: 'lag', hij: 'lag', wij: 'lagen', jullie: 'lagen', zij: 'lagen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gelegen' }
  },
  'zitten': {
    present: { ik: 'zit', jij: 'zit', hij: 'zit', wij: 'zitten', jullie: 'zitten', zij: 'zitten' },
    past: { ik: 'zat', jij: 'zat', hij: 'zat', wij: 'zaten', jullie: 'zaten', zij: 'zaten' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gezeten' }
  },
  'slapen': {
    present: { ik: 'slaap', jij: 'slaapt', hij: 'slaapt', wij: 'slapen', jullie: 'slapen', zij: 'slapen' },
    past: { ik: 'sliep', jij: 'sliep', hij: 'sliep', wij: 'sliepen', jullie: 'sliepen', zij: 'sliepen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'geslapen' }
  },
  'eten': {
    present: { ik: 'eet', jij: 'eet', hij: 'eet', wij: 'eten', jullie: 'eten', zij: 'eten' },
    past: { ik: 'at', jij: 'at', hij: 'at', wij: 'aten', jullie: 'aten', zij: 'aten' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gegeten' }
  },
  'drinken': {
    present: { ik: 'drink', jij: 'drinkt', hij: 'drinkt', wij: 'drinken', jullie: 'drinken', zij: 'drinken' },
    past: { ik: 'dronk', jij: 'dronk', hij: 'dronk', wij: 'dronken', jullie: 'dronken', zij: 'dronken' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gedronken' }
  },
  'spreken': {
    present: { ik: 'spreek', jij: 'spreekt', hij: 'spreekt', wij: 'spreken', jullie: 'spreken', zij: 'spreken' },
    past: { ik: 'sprak', jij: 'sprak', hij: 'sprak', wij: 'spraken', jullie: 'spraken', zij: 'spraken' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gesproken' }
  },
  'breken': {
    present: { ik: 'breek', jij: 'breekt', hij: 'breekt', wij: 'breken', jullie: 'breken', zij: 'breken' },
    past: { ik: 'brak', jij: 'brak', hij: 'brak', wij: 'braken', jullie: 'braken', zij: 'braken' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gebroken' }
  },
  'vinden': {
    present: { ik: 'vind', jij: 'vindt', hij: 'vindt', wij: 'vinden', jullie: 'vinden', zij: 'vinden' },
    past: { ik: 'vond', jij: 'vond', hij: 'vond', wij: 'vonden', jullie: 'vonden', zij: 'vonden' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gevonden' }
  },
  'binden': {
    present: { ik: 'bind', jij: 'bindt', hij: 'bindt', wij: 'binden', jullie: 'binden', zij: 'binden' },
    past: { ik: 'bond', jij: 'bond', hij: 'bond', wij: 'bonden', jullie: 'bonden', zij: 'bonden' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gebonden' }
  },
  'zingen': {
    present: { ik: 'zing', jij: 'zingt', hij: 'zingt', wij: 'zingen', jullie: 'zingen', zij: 'zingen' },
    past: { ik: 'zong', jij: 'zong', hij: 'zong', wij: 'zongen', jullie: 'zongen', zij: 'zongen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gezongen' }
  },
  'springen': {
    present: { ik: 'spring', jij: 'springt', hij: 'springt', wij: 'springen', jullie: 'springen', zij: 'springen' },
    past: { ik: 'sprong', jij: 'sprong', hij: 'sprong', wij: 'sprongen', jullie: 'sprongen', zij: 'sprongen' },
    perfect: { auxiliary: 'zijn', pastParticiple: 'gesprongen' }
  },
  'beginnen': {
    present: { ik: 'begin', jij: 'begint', hij: 'begint', wij: 'beginnen', jullie: 'beginnen', zij: 'beginnen' },
    past: { ik: 'begon', jij: 'begon', hij: 'begon', wij: 'begonnen', jullie: 'begonnen', zij: 'begonnen' },
    perfect: { auxiliary: 'zijn', pastParticiple: 'begonnen' }
  },
  'winnen': {
    present: { ik: 'win', jij: 'wint', hij: 'wint', wij: 'winnen', jullie: 'winnen', zij: 'winnen' },
    past: { ik: 'won', jij: 'won', hij: 'won', wij: 'wonnen', jullie: 'wonnen', zij: 'wonnen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gewonnen' }
  },
  'zwemmen': {
    present: { ik: 'zwem', jij: 'zwemt', hij: 'zwemt', wij: 'zwemmen', jullie: 'zwemmen', zij: 'zwemmen' },
    past: { ik: 'zwom', jij: 'zwom', hij: 'zwom', wij: 'zwommen', jullie: 'zwommen', zij: 'zwommen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gezwommen' }
  },
  'helpen': {
    present: { ik: 'help', jij: 'helpt', hij: 'helpt', wij: 'helpen', jullie: 'helpen', zij: 'helpen' },
    past: { ik: 'hielp', jij: 'hielp', hij: 'hielp', wij: 'hielpen', jullie: 'hielpen', zij: 'hielpen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'geholpen' }
  },
  'sterven': {
    present: { ik: 'sterf', jij: 'sterft', hij: 'sterft', wij: 'sterven', jullie: 'sterven', zij: 'sterven' },
    past: { ik: 'stierf', jij: 'stierf', hij: 'stierf', wij: 'stierven', jullie: 'stierven', zij: 'stierven' },
    perfect: { auxiliary: 'zijn', pastParticiple: 'gestorven' }
  },
  'werpen': {
    present: { ik: 'werp', jij: 'werpt', hij: 'werpt', wij: 'werpen', jullie: 'werpen', zij: 'werpen' },
    past: { ik: 'wierp', jij: 'wierp', hij: 'wierp', wij: 'wierpen', jullie: 'wierpen', zij: 'wierpen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'geworpen' }
  },
  'treffen': {
    present: { ik: 'tref', jij: 'treft', hij: 'treft', wij: 'treffen', jullie: 'treffen', zij: 'treffen' },
    past: { ik: 'trof', jij: 'trof', hij: 'trof', wij: 'troffen', jullie: 'troffen', zij: 'troffen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'getroffen' }
  },
  'trekken': {
    present: { ik: 'trek', jij: 'trekt', hij: 'trekt', wij: 'trekken', jullie: 'trekken', zij: 'trekken' },
    past: { ik: 'trok', jij: 'trok', hij: 'trok', wij: 'trokken', jullie: 'trokken', zij: 'trokken' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'getrokken' }
  },
  'hangen': {
    present: { ik: 'hang', jij: 'hangt', hij: 'hangt', wij: 'hangen', jullie: 'hangen', zij: 'hangen' },
    past: { ik: 'hing', jij: 'hing', hij: 'hing', wij: 'hingen', jullie: 'hingen', zij: 'hingen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gehangen' }
  },
  'vangen': {
    present: { ik: 'vang', jij: 'vangt', hij: 'vangt', wij: 'vangen', jullie: 'vangen', zij: 'vangen' },
    past: { ik: 'ving', jij: 'ving', hij: 'ving', wij: 'vingen', jullie: 'vingen', zij: 'vingen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gevangen' }
  },
  'houden': {
    present: { ik: 'houd', jij: 'houdt', hij: 'houdt', wij: 'houden', jullie: 'houden', zij: 'houden' },
    past: { ik: 'hield', jij: 'hield', hij: 'hield', wij: 'hielden', jullie: 'hielden', zij: 'hielden' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gehouden' }
  },
  'laten': {
    present: { ik: 'laat', jij: 'laat', hij: 'laat', wij: 'laten', jullie: 'laten', zij: 'laten' },
    past: { ik: 'liet', jij: 'liet', hij: 'liet', wij: 'lieten', jullie: 'lieten', zij: 'lieten' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gelaten' }
  },
  'vallen': {
    present: { ik: 'val', jij: 'valt', hij: 'valt', wij: 'vallen', jullie: 'vallen', zij: 'vallen' },
    past: { ik: 'viel', jij: 'viel', hij: 'viel', wij: 'vielen', jullie: 'vielen', zij: 'vielen' },
    perfect: { auxiliary: 'zijn', pastParticiple: 'gevallen' }
  },
  'roepen': {
    present: { ik: 'roep', jij: 'roept', hij: 'roept', wij: 'roepen', jullie: 'roepen', zij: 'roepen' },
    past: { ik: 'riep', jij: 'riep', hij: 'riep', wij: 'riepen', jullie: 'riepen', zij: 'riepen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'geroepen' }
  },
  'lopen': {
    present: { ik: 'loop', jij: 'loopt', hij: 'loopt', wij: 'lopen', jullie: 'lopen', zij: 'lopen' },
    past: { ik: 'liep', jij: 'liep', hij: 'liep', wij: 'liepen', jullie: 'liepen', zij: 'liepen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gelopen' }
  },
  'blijven': {
    present: { ik: 'blijf', jij: 'blijft', hij: 'blijft', wij: 'blijven', jullie: 'blijven', zij: 'blijven' },
    past: { ik: 'bleef', jij: 'bleef', hij: 'bleef', wij: 'bleven', jullie: 'bleven', zij: 'bleven' },
    perfect: { auxiliary: 'zijn', pastParticiple: 'gebleven' }
  },
  'krijgen': {
    present: { ik: 'krijg', jij: 'krijgt', hij: 'krijgt', wij: 'krijgen', jullie: 'krijgen', zij: 'krijgen' },
    past: { ik: 'kreeg', jij: 'kreeg', hij: 'kreeg', wij: 'kregen', jullie: 'kregen', zij: 'kregen' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gekregen' }
  },
  'kijken': {
    present: { ik: 'kijk', jij: 'kijkt', hij: 'kijkt', wij: 'kijken', jullie: 'kijken', zij: 'kijken' },
    past: { ik: 'keek', jij: 'keek', hij: 'keek', wij: 'keken', jullie: 'keken', zij: 'keken' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gekeken' }
  },
  'vergeten': {
    present: { ik: 'vergeet', jij: 'vergeet', hij: 'vergeet', wij: 'vergeten', jullie: 'vergeten', zij: 'vergeten' },
    past: { ik: 'vergat', jij: 'vergat', hij: 'vergat', wij: 'vergaten', jullie: 'vergaten', zij: 'vergaten' },
    perfect: { auxiliary: 'zijn', pastParticiple: 'vergeten' }
  },
  'brengen': {
    present: { ik: 'breng', jij: 'brengt', hij: 'brengt', wij: 'brengen', jullie: 'brengen', zij: 'brengen' },
    past: { ik: 'bracht', jij: 'bracht', hij: 'bracht', wij: 'brachten', jullie: 'brachten', zij: 'brachten' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gebracht' }
  },
  'denken': {
    present: { ik: 'denk', jij: 'denkt', hij: 'denkt', wij: 'denken', jullie: 'denken', zij: 'denken' },
    past: { ik: 'dacht', jij: 'dacht', hij: 'dacht', wij: 'dachten', jullie: 'dachten', zij: 'dachten' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gedacht' }
  },
  'kopen': {
    present: { ik: 'koop', jij: 'koopt', hij: 'koopt', wij: 'kopen', jullie: 'kopen', zij: 'kopen' },
    past: { ik: 'kocht', jij: 'kocht', hij: 'kocht', wij: 'kochten', jullie: 'kochten', zij: 'kochten' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gekocht' }
  },
  'zoeken': {
    present: { ik: 'zoek', jij: 'zoekt', hij: 'zoekt', wij: 'zoeken', jullie: 'zoeken', zij: 'zoeken' },
    past: { ik: 'zocht', jij: 'zocht', hij: 'zocht', wij: 'zochten', jullie: 'zochten', zij: 'zochten' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gezocht' }
  },
  'worden': {
    present: { ik: 'word', jij: 'wordt', hij: 'wordt', wij: 'worden', jullie: 'worden', zij: 'worden' },
    past: { ik: 'werd', jij: 'werd', hij: 'werd', wij: 'werden', jullie: 'werden', zij: 'werden' },
    perfect: { auxiliary: 'zijn', pastParticiple: 'geworden' }
  },
  'groeien': {
    present: { ik: 'groei', jij: 'groeit', hij: 'groeit', wij: 'groeien', jullie: 'groeien', zij: 'groeien' },
    past: { ik: 'groeide', jij: 'groeide', hij: 'groeide', wij: 'groeiden', jullie: 'groeiden', zij: 'groeiden' },
    perfect: { auxiliary: 'zijn', pastParticiple: 'gegroeid' }
  },
  'bouwen': {
    present: { ik: 'bouw', jij: 'bouwt', hij: 'bouwt', wij: 'bouwen', jullie: 'bouwen', zij: 'bouwen' },
    past: { ik: 'bouwde', jij: 'bouwde', hij: 'bouwde', wij: 'bouwden', jullie: 'bouwden', zij: 'bouwden' },
    perfect: { auxiliary: 'hebben', pastParticiple: 'gebouwd' }
  },
};

// 使用 zijn 的动词列表（运动/状态变化动词）
const ZIJN_VERBS = new Set([
  'gaan', 'komen', 'blijven', 'worden', 'zijn', 'vallen', 'sterven',
  'groeien', 'beginnen', 'stoppen', 'vertrekken', 'aankomen', 'terugkomen',
  'opstaan', 'thuiskomen', 'weggaan', 'binnenkomen', 'uitgaan',
  'verschijnen', 'verdwijnen', 'gebeuren', 'lukken', 'mislukken',
  'slagen', 'zakken', 'stijgen', 'dalen', 'veranderen', 'trouwen',
  'scheiden', 'bevallen', 'overlijden', 'genezen', 'herstellen',
]);

/**
 * 获取词干
 */
function getStem(infinitive) {
  // 去掉 -en
  let stem = infinitive.slice(0, -2);
  
  // 拼写规则调整
  // 双元音变单元音（如 lopen -> loop, 但 stem 需要 loop）
  // 实际上对于 lopen，stem 是 loop（保持长元音）
  
  // 处理双辅音：如果以双辅音结尾且前面是短元音，保留双辅音
  // 例如：werken -> werk, zitten -> zit
  
  // 处理单元音变双元音：如果原形有双元音，词干也保持
  // 例如：lopen -> loop (原形 lopen，去掉 en 后是 lop，但要保持 oo)
  
  // 简化处理：检查原形中的元音模式
  const vowels = 'aeiou';
  const doubleVowels = ['aa', 'ee', 'oo', 'uu'];
  
  // 如果原形去掉 -en 后，需要调整拼写
  // 规则：开音节（以元音+单辅音+en结尾）-> 词干用双元音
  const beforeEn = infinitive.slice(0, -2);
  
  // 检查是否需要双写元音
  if (beforeEn.length >= 2) {
    const lastChar = beforeEn.slice(-1);
    const secondLast = beforeEn.slice(-2, -1);
    
    // 如果是：元音 + 单辅音，且元音是单个，则需要双写
    if (vowels.includes(secondLast) && !vowels.includes(lastChar)) {
      // 检查是否已经是双元音
      const thirdLast = beforeEn.length >= 3 ? beforeEn.slice(-3, -2) : '';
      if (!vowels.includes(thirdLast)) {
        // 单元音 + 单辅音 -> 双写元音
        stem = beforeEn.slice(0, -2) + secondLast + secondLast + lastChar;
      }
    }
  }
  
  return stem;
}

/**
 * 检查是否是 't kofschip 规则（过去时用 -te 而不是 -de）
 */
function isTKofschip(stem) {
  const endings = ['t', 'k', 'f', 's', 'ch', 'p'];
  for (const ending of endings) {
    if (stem.endsWith(ending)) return true;
  }
  return false;
}

/**
 * 为规则动词生成变位
 */
function generateRegularConjugation(infinitive) {
  const stem = getStem(infinitive);
  const tkofschip = isTKofschip(stem);
  const usesZijn = ZIJN_VERBS.has(infinitive);
  
  // 现在时
  const present = {
    ik: stem,
    jij: stem.endsWith('t') ? stem : stem + 't',
    hij: stem.endsWith('t') ? stem : stem + 't',
    wij: infinitive,
    jullie: infinitive,
    zij: infinitive,
  };
  
  // 过去时
  const pastSuffix = tkofschip ? 'te' : 'de';
  const pastPluralSuffix = tkofschip ? 'ten' : 'den';
  const past = {
    ik: stem + pastSuffix,
    jij: stem + pastSuffix,
    hij: stem + pastSuffix,
    wij: stem + pastPluralSuffix,
    jullie: stem + pastPluralSuffix,
    zij: stem + pastPluralSuffix,
  };
  
  // 完成时
  const participleSuffix = tkofschip ? 't' : 'd';
  let pastParticiple = 'ge' + stem + participleSuffix;
  
  // 处理以 be-, ge-, ver-, her-, ont- 开头的动词（不加 ge-）
  const prefixes = ['be', 'ge', 'ver', 'her', 'ont', 'er'];
  for (const prefix of prefixes) {
    if (infinitive.startsWith(prefix)) {
      pastParticiple = stem + participleSuffix;
      break;
    }
  }
  
  return {
    present,
    past,
    perfect: {
      auxiliary: usesZijn ? 'zijn' : 'hebben',
      pastParticiple,
    },
  };
}

/**
 * 判断是否可能是动词
 */
function isLikelyVerb(word) {
  // 必须以 -en 结尾
  if (!word.endsWith('en')) return false;
  
  // 在黑名单中
  if (NON_VERBS.has(word)) return false;
  
  // 太短（少于 4 个字符，如 "en"）
  if (word.length < 4) return false;
  
  // 以 -eren 结尾通常是名词复数（如 kinderen）
  // 但很多动词也以 -eren 结尾（如 wandelen -> 不对，wandelen 是 -elen）
  // 跳过明显的复数：以 -en 结尾但词干是常见名词
  
  // 进一步的动词特征检查可以在这里添加
  
  return true;
}

// 主程序
const wordsPath = path.join(__dirname, '../src/data/words.json');
const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

let addedCount = 0;
let skippedCount = 0;
let irregularCount = 0;

for (const word of words) {
  // 跳过已有变位的
  if (word.conjugation) {
    skippedCount++;
    continue;
  }
  
  const dutch = word.dutch;
  
  // 检查是否是动词
  if (!isLikelyVerb(dutch)) {
    continue;
  }
  
  // 检查是否是不规则动词
  if (IRREGULAR_VERBS[dutch]) {
    word.conjugation = IRREGULAR_VERBS[dutch];
    word.partOfSpeech = 'verb';
    irregularCount++;
    addedCount++;
    continue;
  }
  
  // 生成规则动词变位
  word.conjugation = generateRegularConjugation(dutch);
  word.partOfSpeech = 'verb';
  addedCount++;
}

// 写回文件
fs.writeFileSync(wordsPath, JSON.stringify(words, null, 2), 'utf-8');

console.log(`✅ 完成！`);
console.log(`   新增变位: ${addedCount} 个`);
console.log(`   不规则动词: ${irregularCount} 个`);
console.log(`   已有变位跳过: ${skippedCount} 个`);
