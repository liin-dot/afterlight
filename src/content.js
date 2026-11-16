// All entries are local, original game content. Levels share the combat formulas in stats.js.
export const NEW_WEAPONS = {
  capacitor:{name:'鸣雷线圈',evolution:'终焉·电冕',color:'#e4c179',category:'雷电 / 跳跃放电',desc:'向近敌释放电弧，在不同目标间跳跃；进化后末端爆发雷环。',upgrades:['电弧跳向两个不同目标。','增加一个连锁目标，提高伤害。','提高电弧伤害与连锁距离。','再次增加连锁目标，放电更快。','提高电弧伤害与连锁距离。','进化：再增一个连锁目标，末端爆发雷环。'],cooldown:1.1},
  tide:{name:'回潮法印',evolution:'终焉·沧浪',color:'#91d9e0',category:'寒潮 / 移动波阵',desc:'向近敌推出缓慢前进的潮环，击退并减速沿途敌人；同一潮环只命中每名敌人一次。',upgrades:['推出击退与减速潮环。','提高潮环伤害与半径。','每轮推出两道潮环。','提高伤害与减速持续。','潮环覆盖更远。','进化：三道宽阔寒潮冻结敌人。'],cooldown:2.1},
  needle:{name:'霜织飞梭',evolution:'终焉·千针雪',color:'#badfee',category:'投射 / 寒针穿透',desc:'发射高速寒针，穿透并减速；进化后命中附带短暂冻结。',upgrades:['发射两枚穿透寒针。','提高伤害与穿透。','增加一枚寒针。','提高伤害与射速。','增加寒针与穿透目标。','进化：六枚寒针冻结追兵。'],cooldown:1.8},
  lantern:{name:'渡魂天灯',evolution:'终焉·千灯渡',color:'#c2e7bb',category:'灵魂 / 追踪灯火',desc:'放飞追踪魂灯，穿过敌群；进化后每枚魂灯首次命中引发魂光震荡。',upgrades:['放飞两枚追踪魂灯。','提高魂灯伤害。','增加魂灯数量。','提高伤害与穿透。','再次增加魂灯数量。','进化：魂灯首击引发范围震荡。'],cooldown:2.8},
  arcforge:{name:'万雷熔心',fusion:true,maxLevel:3,color:'#f0c77d',category:'融合 / 电弧熔炉',desc:'密集电弧横穿敌群，末端引发大范围雷爆。',upgrades:['连续电弧与末端雷爆。','增加目标、雷爆范围与伤害。','熔心极境：更密集、更快的雷网。'],cooldown:2.4},
  maelstrom:{name:'归墟潮眼',fusion:true,maxLevel:3,color:'#91e0dd',category:'融合 / 牵引寒潮',desc:'多道潮眼前进，牵引并冻结沿途敌人；每道对每个敌人命中一次。',upgrades:['推出三道牵引潮眼。','增加潮眼与冻结范围。','归墟极境：五道宽阔潮眼。'],cooldown:3.2},
  frostloom:{name:'织冬星梭',fusion:true,maxLevel:3,color:'#d6e9f7',category:'融合 / 追踪冰针',desc:'追踪穿透冰针冻结敌人，首击展开碎冰震荡。',upgrades:['追踪冰针与首击冰爆。','增加穿透与碎冰伤害。','织冬极境：更密集的寒针风暴。'],cooldown:1.9},
  beacon:{name:'彼岸万灯',fusion:true,maxLevel:3,color:'#e4e9af',category:'融合 / 追魂共鸣',desc:'放飞多枚追踪魂灯，每枚首次命中产生魂光震荡。',upgrades:['魂灯群与范围共鸣。','提高灯群数量与共鸣范围。','彼岸极境：更强的魂光奔流。'],cooldown:2.6},
  hailfire:{name:'烬雪天灾',fusion:true,maxLevel:3,color:'#dfbbb1',category:'融合 / 冻星与余火',desc:'降下冰火陨星，落地冻结敌人并留下持续燃烧、减速的余烬寒域。首领只会被短暂冻结。',upgrades:['冻星落地后留下冰火寒域。','增加冻星与寒域持续时间。','天灾极境：密集冻星与广域余火。'],cooldown:4.6},
  soulforge:{name:'群星灵龛',fusion:true,maxLevel:3,color:'#b4d9df',category:'融合 / 追魂召唤',desc:'部署发射多枚追踪魂火的灵龛，魂火可以穿透；灵龛到期或被替换时释放散魂震波，最多同时存在两座。',upgrades:['灵龛发射追踪魂火，消散时震荡。','增加魂火数量与散魂范围。','灵龛极境：更密集的追魂齐射。'],cooldown:6.5},
  shard:{name:'骸骨飞轮',evolution:'终焉·骨旋',rarity:'uncommon',color:'#d8cbb2',category:'投射物 / 跳弹',desc:'掷出骸骨飞轮，命中后弹向另一名敌人；同一飞轮不会重复命中同一目标。',upgrades:['飞轮在两名敌人间弹跳。','提高伤害与弹跳次数。','增加每轮飞轮数量。','提高弹跳伤害。','再次增加每轮飞轮数量。','进化：更多飞轮齐发，追逐更多目标。'],cooldown:2.6},
  meteor:{name:'陨星烛台',evolution:'终焉·流火',rarity:'rare',color:'#efa575',category:'火焰 / 延迟轰炸',desc:'标记敌人所在位置，短暂延迟后陨星坠落；需要预判移动，擅长击破密集敌群。',upgrades:['标记敌人位置，召来陨星。','提高轰炸伤害与范围。','增加每轮陨星落点。','缩短落地等待。','再次增加每轮陨星落点。','进化：陨星落地后留下燃烧区。'],cooldown:4.6},
  mine:{name:'墓灯雷匣',evolution:'终焉·雷葬',color:'#d6b87b',category:'机关 / 路径陷阱',desc:'在脚下布设墓灯，武装后被靠近的敌人引爆；未触发的墓灯会在到期时爆炸。',upgrades:['在脚边布下感应墓灯。','提高爆炸伤害与范围。','增加每轮墓灯数量。','延长留存时间。','再次增加每轮墓灯数量。','进化：大范围连环雷葬。'],cooldown:3.8},
  tether:{name:'缚魂锁',evolution:'终焉·锁魂',rarity:'uncommon',color:'#a9c9db',category:'灵魂 / 禁锢锁链',desc:'锁链跳向邻近敌人，将其禁锢在原地并减速；首领禁锢时间较短。',upgrades:['锁链将敌人禁锢在原地并减速。','增加锁定目标、伤害与跳跃距离。','提高锁链伤害与范围。','增加锁定目标与禁锢持续时间。','强化锁链伤害与禁锢。','进化：原地禁锢整组敌人并震荡灵魂。'],cooldown:3.2},
  sentinel:{name:'守望石像',evolution:'终焉·守望者',rarity:'rare',color:'#b8cfab',category:'召唤 / 固定炮台',desc:'放置一座短暂存续的石像，自动向近敌发射石弹。新石像替换最旧的一座，最多同时存在两座。',upgrades:['石像自动发射石弹。','提高石弹伤害。','延长石像存续。','提高射速。','石弹穿透额外目标。','进化：双重石弹与更长守望。'],cooldown:6.2},
  lance:{name:'破晓长枪',evolution:'终焉·贯日',color:'#e7d69b',category:'近战 / 横扫与贯穿',desc:'先横扫身前敌群，再刺出宽阔枪芒；正面目标可承受两段伤害。进化后横扫全周，并从角色当前位置追刺近敌。',upgrades:['横扫身前，再贯穿正面敌群。','提高横扫与突刺伤害。','增加枪芒宽度与横扫范围。','攻击更快，突刺更远。','提高双段伤害与覆盖范围。','进化：全周横扫，追加随身追刺。'],cooldown:1.45},
  axe:{name:'裂阵重斧',evolution:'终焉·断岳',color:'#d9b58e',category:'近战 / 重型横扫',desc:'向近敌挥出宽幅重斩；距离超过斩击半径 60% 的敌人受到斧刃重击，伤害提高 50%。进化后旋斩全周。',upgrades:['宽幅重斩，外圈斧刃伤害更高。','提高伤害与攻击距离。','扩大挥砍角度。','挥砍更快，斧刃覆盖更远。','提高重斩伤害与范围。','进化：全周断岳斩，保留外圈重击。'],cooldown:1.9},
  hammer:{name:'震地战锤',evolution:'终焉·崩山',color:'#b9c5ce',category:'近战 / 震地击退',desc:'锤击脚下，震伤、击退并减速周围敌人；进化后从角色当前位置追加一次余震。',upgrades:['全周锤击，击退并减速敌人。','提高震击伤害与范围。','延长减速，扩大震击范围。','提高伤害，锤击更快。','进一步提高伤害与减速持续。','进化：追加一次随身余震。'],cooldown:2.3},
  whirlwind:{name:'裂风双斧',fusion:true,maxLevel:3,color:'#dbd7ac',category:'融合 / 双重旋斩',desc:'连续两次全周旋斩，第二斩跟随角色移动；外圈斧刃伤害提高 50%，可在敌群边缘移动收割。',upgrades:['双重全周旋斩，外圈重击。','扩大双斧范围，提高伤害。','裂风极境：更快、更强的双重旋斩。'],cooldown:2.1},
  quake:{name:'万钧震岳',fusion:true,maxLevel:3,color:'#d2c7ae',category:'融合 / 三重震击',desc:'全周重锤后连续追加两次随身余震，击退并减速周围敌人，为近战争取移动空间。',upgrades:['重锤加两次余震，每次跟随角色。','提高震击伤害与控制范围。','震岳极境：更强余震，更长减速。'],cooldown:2.65},
  starfall:{name:'焚星天幕',fusion:true,maxLevel:3,color:'#f2a36e',category:'融合 / 陨火与易伤',desc:'召来陨星雨，落地造成爆炸并留下燃烧区；命中的敌人短暂易伤。',upgrades:['陨星雨附加灼烧与易伤。','扩大火雨覆盖与持续时间。','天幕极境：更多陨星，更强燃烧。'],cooldown:4.4},
  bastion:{name:'不落堡垒',fusion:true,maxLevel:3,color:'#c1dab0',category:'融合 / 炮台与守护',desc:'部署穿透石弹堡垒；靠近堡垒时周期补充护盾。护盾有上限且不能叠加储存。',upgrades:['部署堡垒，近身获得护盾。','提高石弹与护盾强度。','堡垒极境：双重石弹与更长存续。'],cooldown:6.5},
  wintermine:{name:'永冻陵园',fusion:true,maxLevel:3,color:'#b2e4e5',category:'融合 / 陷阱与寒域',desc:'冰棺陷阱被触发后冻结敌人，留下持续减速的寒域；首领只被短暂冻结。',upgrades:['冰棺爆炸留下寒域。','增加冰棺数量与范围。','陵园极境：更长寒域与更强冻结。'],cooldown:4},
  soulchain:{name:'冥河锁狱',fusion:true,maxLevel:3,color:'#b8c8e6',category:'融合 / 禁锢与回声',desc:'灵魂锁链将多个目标禁锢在原地并减速，每个锁定点随后发生延迟震爆；首领禁锢时间较短。',upgrades:['锁链原地禁锢目标，随后延迟震爆。','增加锁定目标与震爆威力。','锁狱极境：连锁震爆覆盖敌阵。'],cooldown:3.8},
  ricochet:{name:'白骨风暴',fusion:true,maxLevel:3,color:'#e8d9bc',category:'融合 / 弹跳与碎片',desc:'骨轮连续弹跳，首次命中时分裂追踪骨片；骨片不会再次分裂。',upgrades:['弹跳骨轮分裂两枚追踪骨片。','增加骨轮数量与弹跳。','风暴极境：更强碎片与更多骨轮。'],cooldown:2.7},
  execution:{name:'终焉裁决',fusion:true,maxLevel:3,color:'#efd99d',category:'融合 / 环扫与处决',desc:'全周环扫后连续两次贯穿近敌，追刺跟随角色并重新瞄准。所有斩刺对低生命目标增伤，首领处决加成减半。',upgrades:['环扫与双重追刺，重创低血目标。','增加枪芒宽度、环扫范围与处决加成。','裁决极境：更强环扫与双重追刺。'],cooldown:1.8},
  supernova:{name:'天陨熔炉',fusion:true,maxLevel:3,color:'#edb2b1',category:'融合 / 陨星与交叉光束',desc:'星核落地后炸裂，在落点释放四道交叉光束，轰炸和光束各自命中。',upgrades:['星核爆炸释放交叉光束。','增加星核数量与光束长度。','熔炉极境：更广爆炸与更强光束。'],cooldown:4.8},
  stormsentry:{name:'雷鸣哨戒',fusion:true,maxLevel:3,color:'#c9b6ee',category:'融合 / 炮台与传导',desc:'雷塔发射穿透电弹，每轮首发命中会向附近目标传导闪电；最多两座雷塔。',upgrades:['雷塔自动发射传导电弹。','增加传导目标并提高射速。','哨戒极境：双发电弹。'],cooldown:6.4},
  pestilence:{name:'腐生雷园',fusion:true,maxLevel:3,color:'#c6d889',category:'融合 / 陷阱与疫池',desc:'布下孢子雷，爆炸后留下传播侵蚀的疫池；疫池到期再引发一次毒爆。',upgrades:['孢子雷爆炸后形成疫池。','增加孢子雷与疫池持续。','雷园极境：双重毒爆。'],cooldown:4.2},
  crescent: {name:'回旋月镰',evolution:'终焉·月蚀',color:'#c3cbe5',category:'刃器 / 往返投掷',desc:'投出穿透敌群的月镰，飞出后折返身边；往返各可命中一次。',upgrades:['投出月镰，往返切割。','增加直击伤害与切割范围。','增加每轮月镰数量。','提高伤害，往返覆盖更宽。','再次增加每轮月镰数量。','进化：更多巨大月镰，回收途中追随角色。'],cooldown:2.2},
  thorn: {name:'黑棘毒瓶',evolution:'终焉·瘟潮',color:'#afc978',category:'毒素 / 毒池与侵蚀',desc:'向敌人投出毒瓶，落地留下毒池，持续施加侵蚀。',upgrades:['解锁毒瓶；毒池与侵蚀分别造成持续伤害。','扩大毒池，提高毒素伤害。','增加每轮毒瓶数量。','延长毒池持续时间。','侵蚀伤害与毒池范围提高。','进化：更多毒瓶，留下广域毒池。'],cooldown:3.5},
  bell: {name:'送葬铜钟',evolution:'终焉·丧钟',color:'#d4b47d',category:'灵魂 / 双重震波',desc:'敲响身边的铜钟，第一道震波击退敌人，短暂延迟后回响再次命中。',upgrades:['解锁双重钟波，第二击为首击的 60%。','提高钟波伤害与范围。','回响伤害提高至首击的 80%。','进一步扩大钟波范围。','回响伤害提高至首击的 100%。','进化：新增一次回响，连续震击敌群。'],cooldown:3.8},
  prism: {name:'裂光棱镜',evolution:'终焉·万华',color:'#e0bfe2',category:'光束 / 穿透折射',desc:'朝最近的敌人发射贯穿光束；成长后分出扇形光束，切开整条路径。',upgrades:['解锁穿透光束。','提高光束伤害与宽度。','增加每轮光束数量。','提高照射距离和伤害。','再次增加每轮光束数量。','进化：密集万华光束，横扫敌群。'],cooldown:2.5},
  eclipse: {name:'蚀月收割者',fusion:true,maxLevel:3,color:'#d5c9ed',category:'融合 / 往返巨镰',desc:'发射多柄蚀月巨镰；去程贯穿，返程再斩，命中附带小范围切割。',upgrades:['铸成蚀月巨镰，往返均产生范围切割。','增加一柄巨镰，强化切割范围。','月蚀极境：更多巨镰与更高返程伤害。'],cooldown:2.1},
  requiem: {name:'冥河渡魂',fusion:true,maxLevel:3,color:'#aedacb',category:'融合 / 钟波与追魂',desc:'冥钟震退近敌并唤出追魂灯火，随后第二道钟波扫过战场。',upgrades:['融合为冥钟，震波召唤追踪灵魂。','增加追魂数量，提高钟波伤害。','渡魂极境：更密集的追魂与更强回响。'],cooldown:3.2},
  plague: {name:'万棘疫庭',fusion:true,maxLevel:3,color:'#c2d783',category:'融合 / 疫池与孢爆',desc:'投出疫种形成大片毒庭，持续侵蚀敌人；毒庭消散时引发孢子爆裂。',upgrades:['毒瓶与孢子囊融为疫种，毒庭结束时爆裂。','增加一枚疫种，扩大孢爆范围。','疫庭极境：更多疫种，强化持续侵蚀。'],cooldown:3.7},
  bloodmoon: {name:'饮血月冕',fusion:true,maxLevel:3,color:'#e1a0a2',category:'融合 / 血镰与汲取',desc:'血色月镰往返收割，命中汲取生命；汲取有独立冷却，不随命中数量无限增长。',upgrades:['月镰吞下血契牙，获得固有汲取能力。','增加血镰与每次恢复量。','血月极境：更强血镰，更短汲取冷却。'],cooldown:2},
  tempest: {name:'万雷天光',fusion:true,maxLevel:3,color:'#d0bbf4',category:'融合 / 雷束与传导',desc:'折射雷束贯穿敌群，每次施放从首个命中目标向周围传导连锁闪电。',upgrades:['棱镜熔入引雷针，光束获得连锁雷霆。','增加光束与连锁目标。','天光极境：密集雷束覆盖战场。'],cooldown:2.3},
  absolute: {name:'零度圣域',fusion:true,maxLevel:3,color:'#b7e6ec',category:'融合 / 冻结与碎冰',desc:'展开冻结领域，短暂延迟后碎冰震爆；可冻结首领，但首领冻结时间更短。',upgrades:['寒霜与霜纹镜融为圣域，冻结后碎冰。','扩大圣域，提高两段伤害。','零度极境：更长冻结与更强碎冰。'],cooldown:4.6},
};

export const RELICS = {
  circuit:{name:'过载铜环',color:'#e7c27d',max:3,relic:true,trigger:'雷电直接命中',families:['lightning'],desc:'每累计六次雷电命中，向附近目标放出额外电弧。',lore:'过载的余音，也能成为兵器。'},
  brine:{name:'深盐结晶',color:'#9cdae0',max:3,relic:true,trigger:'寒霜、灵魂直接命中',families:['cold','spirit'],desc:'命中留下减速盐痕，并附加短暂易伤。',lore:'大海退去之后，伤口仍记得它。'},
  wake:{name:'破浪罗盘',color:'#99d3df',max:3,relic:true,trigger:'累计移动',families:['travel'],desc:'每累计移动 240 像素，向身后放出扇形穿透魂矢。',lore:'归路永远指向你身后的潮声。'},
  souljar:{name:'拾魂瓮',color:'#c4dcaa',max:3,relic:true,trigger:'击败敌人',families:['hit'],desc:'每击败十二个非召唤敌人，放出三枚追踪魂火。',lore:'没有一个灵魂愿意独自远行。'},
  sundial:{name:'逆刻日晷',color:'#ddc69e',max:3,relic:true,trigger:'武器主动施放',families:['cast'],desc:'每施放五次武器，推进当前冷却最长的武器。',lore:'它不使时间倒流，只偷走等待。'},
  emberheart:{name:'炉心余温',color:'#e4ac8c',max:3,relic:true,trigger:'击败精英、首领',families:['guard'],desc:'击败精英或首领后恢复生命，并补充护盾。',lore:'熄灭的炉膛，也能温暖归人。'},
  everseed:{name:'无尽薪种',color:'#e4cc82',max:3,relic:true,rarity:'rare',trigger:'学习天赋后，角色能力命中',families:['talent'],desc:'学会任一天赋后，角色能力每次命中有 3% / 4.5% / 6% 概率随机获得伤害 +1%、范围 +1% 或最大生命 +2。本局累计无层数上限，无触发冷却；增加生命上限不治疗。',lore:'偶然拾到的微光，也能燃成无尽长夜。'},
  soulpact:{name:'牧魂契',color:'#acd3da',max:3,relic:true,catalyst:true,rarity:'uncommon',trigger:'灵魂与召唤武器',families:['spirit','summon'],desc:'强化灵魂与召唤武器的伤害，并加快石像的射击节奏。学习星群路线后，也强化角色伴星。',lore:'灯火有了守护灯火的人。'},
  hoarfrost:{name:'霜行石',color:'#b7dce2',max:3,relic:true,rarity:'uncommon',trigger:'累计移动',families:['travel'],desc:'每累计移动 240 像素，脚下爆发冰环，冻结并减速追兵；可为碎冰、雷霜反应提供寒冷状态。',lore:'踏过的地方，脚步仍留在冬天。'},
  rotclock:{name:'腐时沙漏',color:'#c6bd81',max:3,relic:true,rarity:'uncommon',trigger:'燃烧与侵蚀状态伤害',families:['fire','poison'],desc:'提高附着在敌人身上的燃烧与侵蚀伤害；地面火场、毒池的独立伤害不受影响。',lore:'流逝的不是沙，是尚未腐尽的时间。'},
  bulwark:{name:'碎灯棱片',color:'#d1dbae',max:3,relic:true,rarity:'rare',trigger:'护盾被击破',families:['guard'],desc:'每次护盾被击破都向外释放追踪棱片；补盾后可再次触发，无独立冷却。',lore:'每一片碎光，都记得来袭的方向。'},
  forkseed:{name:'分岔骨钉',color:'#d7b6cf',max:3,relic:true,rarity:'rare',trigger:'武器暴击',families:['hit'],desc:'暴击时从目标位置分裂两枚追踪骨片，寻找其他敌人；骨片不暴击或再次分裂。',lore:'命运在骨缝间分出岔路。'},
  stormcoil:{name:'蓄雷瓶',color:'#c3b2e8',max:3,relic:true,rarity:'uncommon',trigger:'雷电武器命中',families:['lightning'],desc:'累计雷电武器直接命中，释放近身雷环并补充少量护盾；追加闪电不计数。',lore:'把七声远雷，藏成一道护身的光。'},
  frostbrand:{name:'寒髓针',color:'#a5d7e4',max:3,relic:true,rarity:'uncommon',trigger:'投射物、光束命中',families:['projectile','beam'],desc:'命中时施加短暂减速，让远程武器也能触发碎冰与冰雷联动。',lore:'把冬天藏在针尖。'},
  venomfang:{name:'蚀骨针',color:'#bad37b',max:3,relic:true,rarity:'uncommon',trigger:'刃器、投射物命中',families:['melee','projectile'],desc:'每次命中立即造成额外侵蚀伤害，并附加持续侵蚀，可与孢子囊、沸血瓶联动。',lore:'一滴绿意，侵入白骨。'},
  volatile:{name:'沸血瓶',color:'#dcaa79',max:3,relic:true,rarity:'rare',trigger:'命中同时燃烧、侵蚀的敌人',families:['fire','poison'],desc:'每次命中同时燃烧、侵蚀的目标，消耗两种状态并造成范围炼金爆炸，无独立冷却。',lore:'两种灾厄在瓶中握手。'},
  stormseal:{name:'雷霜符',color:'#b6cef1',max:3,relic:true,rarity:'rare',trigger:'雷电命中减速或冻结的敌人',families:['lightning'],desc:'冰雷反应传导额外闪电，并短暂冻结首个目标。',lore:'雷声响起时，雪花停止坠落。'},
  executioner:{name:'断头徽',color:'#dab193',max:3,relic:true,catalyst:true,rarity:'rare',trigger:'武器命中低生命敌人',families:['hit'],desc:'对生命不高于 30% 的敌人增加武器伤害；首领加成减半。',lore:'不承诺胜利，只终结挣扎。'},
  deadeye:{name:'猎魂目',color:'#d0b2da',max:3,relic:true,rarity:'uncommon',trigger:'武器暴击',families:['hit'],desc:'暴击标记目标，短时间内受到更多伤害；重复暴击刷新标记，不叠层。',lore:'看见每一道裂隙。'},
  aegis:{name:'灯塔护符',color:'#c1d6ad',max:3,relic:true,catalyst:true,rarity:'uncommon',trigger:'武器直接命中',families:['guard'],desc:'每次武器直接命中补充少量护盾，最多储存规定上限；无独立冷却。',lore:'灯光照向尚未到来的伤口。'},
  thorns:{name:'铁棘印',color:'#c4b99d',max:3,relic:true,trigger:'受到攻击',families:['guard'],desc:'每次受到攻击都向周围反击；护甲提高反击伤害，无独立冷却。',lore:'盔甲上的每一道旧伤，都朝外生长。'},
  dashfire:{name:'踏火灰',color:'#e5ac72',max:3,relic:true,trigger:'累计移动',families:['travel'],desc:'每累计移动 240 像素，脚下留下燃烧区域，诱导追兵进入火场。',lore:'将退路点成火。'},
  harvest:{name:'拾穗烛',color:'#d3d99d',max:3,relic:true,rarity:'uncommon',trigger:'拾取经验',families:['pickup'],desc:'累计拾取一定基础经验后释放追踪魂火；经验合并不会减少充能。',lore:'每一缕遗光，都愿再守你一程。'},
  embercore:{name:'不熄燃芯',color:'#e5a16a',max:3,relic:true,catalyst:true,trigger:'刃器、投射物命中',families:['melee','projectile'],desc:'刃器或投射物命中点燃敌人，灼烧持续 2 秒。',lore:'灰烬中仍在跳动的火。'},
  conductor:{name:'引雷针',color:'#c4b2e9',max:3,relic:true,catalyst:true,trigger:'投射物、光束命中',families:['projectile','beam'],desc:'每次命中都向附近其他敌人传导闪电，无独立触发冷却。',lore:'将远方的雷声缝入武器。'},
  rime:{name:'霜纹镜',color:'#aee1e1',max:3,relic:true,catalyst:true,trigger:'攻击减速或冻结的敌人',families:['cold'],desc:'每次攻击寒冷敌人都触发小范围碎冰，无独立触发冷却。',lore:'镜中封着一场尚未落下的雪。'},
  spore:{name:'孢子囊',color:'#b4c978',max:3,relic:true,catalyst:true,trigger:'击败被侵蚀的敌人',families:['poison'],desc:'侵蚀中的敌人死亡时释放毒爆，并向附近敌人传播侵蚀。',lore:'每一场凋零，都是新的播种。'},
  siphon:{name:'血契牙',color:'#d99498',max:3,relic:true,catalyst:true,trigger:'刃器命中',families:['melee'],desc:'每次刃器命中都汲取少量生命，无独立触发冷却。',lore:'用敌人的生命偿还长夜。'},
  echo:{name:'回声铃',color:'#d4c190',max:3,relic:true,trigger:'主动施放武器',families:['cast'],desc:'每施放三次武器，在身边释放一次额外震波。环绕接触不计数。',lore:'第三声，来自你身后的黑暗。'},
  lens:{name:'裂光透镜',color:'#d9bada',max:3,relic:true,catalyst:true,trigger:'发射投射物',families:['projectile'],desc:'每轮投射物追加一枚折射弹，追踪敌人并造成原弹部分伤害。',lore:'一道光，照出另一条道路。'},
  cinder:{name:'死火余烬',color:'#d9a377',max:3,relic:true,trigger:'击败燃烧的敌人',families:['fire'],desc:'燃烧中的敌人死亡时引发爆燃，对周围敌人造成范围伤害。',lore:'熄灭前，最后一次盛放。'},
};

export const WEAPON_FAMILIES = {
  capacitor:['lightning','cast'],arcforge:['lightning','area','cast'],tide:['cold','area','cast'],maelstrom:['cold','spirit','area','cast'],needle:['cold','projectile','cast'],frostloom:['cold','projectile','area','cast'],lantern:['spirit','projectile','cast'],beacon:['spirit','projectile','area','cast'],
  hailfire:['fire','cold','cast'],soulforge:['spirit','summon','projectile','cast'],
  shard:['projectile','cast'],meteor:['fire','cast'],mine:['blast','cast'],tether:['spirit','cast'],sentinel:['summon','projectile','cast'],lance:['melee','beam','cast'],
  starfall:['fire','cast'],bastion:['summon','projectile','cast'],wintermine:['cold','cast'],soulchain:['spirit','cast'],ricochet:['projectile','cast'],execution:['melee','beam','cast'],supernova:['fire','beam','cast'],stormsentry:['summon','projectile','lightning','cast'],pestilence:['poison','cast'],
  blade:['melee','cast'],axe:['melee','cast'],hammer:['melee','cast'],whirlwind:['melee','cast'],quake:['melee','cast'], bolt:['projectile','cast'], orbit:['spirit'], storm:['lightning','cast'],
  flame:['fire','projectile','cast'], frost:['cold','cast'], crescent:['melee','projectile','cast'],
  thorn:['poison','projectile','cast'], bell:['spirit','cast'], prism:['beam','cast'],
  solar:['melee','fire','cast'], thunderbolt:['projectile','lightning','cast'], glacier:['spirit','cold','cast'],
  eclipse:['melee','projectile','cast'], requiem:['spirit','projectile','cast'], plague:['poison','projectile','cast'],
  bloodmoon:['melee','projectile','cast'], tempest:['beam','lightning','cast'], absolute:['cold','cast'],
};

export const WEAPON_RUNES={
  fire:{name:'烈焰',icon:'flame',color:'#e8ab7a',damage:.8,description:'武器伤害 −20%；直接命中点燃 2 秒，每半秒造成该次伤害的 12%。追加火焰标签，可接爆燃、腐时与炼金。'},
  cold:{name:'寒霜',icon:'frost',color:'#b2dfe8',damage:.85,description:'武器伤害 −15%；直接命中减速 55% 持续 1.5 秒。追加寒霜标签，可接盐痕、碎冰与冰雷。'},
  lightning:{name:'雷电',icon:'storm',color:'#c9b8ea',damage:.8,description:'武器伤害 −20%；每 5 次直接命中传导 2 个其他目标，各造成该次伤害的 40%。追加雷电标签，可接蓄电与雷盾。'},
  poison:{name:'剧毒',icon:'thorn',color:'#b9cd82',damage:.8,description:'武器伤害 −20%；直接命中施加 3 秒侵蚀，每秒造成该次伤害的 18%。追加侵蚀标签，可接孢爆、腐时与炼金。'},
};
export function weaponFamilies(key,runes={}){
  const tags=WEAPON_FAMILIES[key]||[],rune=runes[key];
  return tags.length&&Object.hasOwn(WEAPON_RUNES,rune)&&!tags.includes(rune)?[...tags,rune]:tags;
}

export const REFINEMENT_RARITIES={
  white:{name:'白 · 普通',color:'#e3e4db',weight:60,index:0},green:{name:'绿 · 精良',color:'#91d4a0',weight:28,index:1},
  purple:{name:'紫 · 稀有',color:'#c5a1ed',weight:10,index:2},gold:{name:'黄 · 传说',color:'#f0ce72',weight:2,index:3},
};
export const WEAPON_REFINEMENTS={
  damage:{name:'锋芒',label:'伤害',values:[.04,.07,.11,.16],fields:['damage']},
  area:{name:'扩域',label:'范围',values:[.03,.05,.08,.12],max:1,fields:['radius','contactRadius','range','chainRange','width','innerRadius','outerOffset','fieldRadius','splashRadius','blastRadius','shieldRadius']},
  haste:{name:'疾奏',label:'攻击频率',values:[.03,.05,.08,.12],max:1,fields:['cooldown','hitInterval','fieldInterval','fireInterval']},
  duration:{name:'长明',label:'领域 / 召唤持续',values:[.04,.07,.11,.16],max:1,tags:['fire','poison','cold','spirit','summon','blast'],fields:['duration','fieldDuration','poisonDuration','lifetime']},
  amount:{name:'多重',label:'弹道 / 数量',values:[0,0,1,2],max:4,fields:['count'],flat:true},
  pierce:{name:'穿行',label:'穿透 / 弹跳目标',values:[0,0,1,2],max:4,tags:['projectile'],fields:['pierce','bounces'],flat:true},
  critical:{name:'锐刃',label:'暴击率',values:[.01,.02,.03,.05],max:1,tags:['melee'],points:true},
  affliction:{name:'余灾',label:'灼烧 / 侵蚀 / 领域伤害',values:[.06,.10,.16,.24],tags:['fire','poison'],fields:['burnDamage','poisonDamage','fieldDamage']},
  control:{name:'缚影',label:'减速 / 普通冻结与禁锢 / 牵引',values:[.04,.07,.11,.16],max:1,tags:['cold','spirit','melee'],fields:['slowDuration','freeze','rootDuration','pull','pullSpeed']},
  anomaly:{name:'异变',label:'异常触发率',values:[.03,.05,.08,.12],max:1,tags:['fire','cold','poison','lightning'],points:true},
};
export const refinementGain=(key,value)=>WEAPON_REFINEMENTS[key].label+' +'+Number((value*(WEAPON_REFINEMENTS[key].flat?1:100)).toFixed(2))+(WEAPON_REFINEMENTS[key].flat?'':WEAPON_REFINEMENTS[key].points?' 个百分点':'%');
export function weaponAnomalyText(key){
  return (WEAPON_FAMILIES[key]||[]).map(tag=>({fire:'点燃 2 秒，每 0.5 秒造成命中伤害的 15%',poison:'侵蚀 3 秒，每秒造成命中伤害的 30%',cold:'深冻，本次武器冻结时长 +25%',lightning:'感电 3 秒，易伤 +15%'}[tag])).filter(Boolean).join('；');
}

// Build tags describe player intent; combat families above still control actual triggers.
export const BUILD_TAGS={
  melee:{name:'近战',color:'#e4bf8c'},projectile:{name:'远程',color:'#cbd9a0'},fire:{name:'火焰',color:'#e8ab7a'},cold:{name:'寒霜',color:'#b2dfe8'},
  lightning:{name:'雷电',color:'#c9b8ea'},poison:{name:'侵蚀',color:'#b9cd82'},spirit:{name:'灵魂',color:'#afd7cf'},summon:{name:'召唤',color:'#b1d3b1'},
  area:{name:'范围',color:'#d5c495'},control:{name:'控制',color:'#b6c6df'},critical:{name:'暴击',color:'#d4b3cc'},guard:{name:'守护',color:'#d2d7b0'},
  mobility:{name:'游击',color:'#bfce9d'},growth:{name:'成长',color:'#bdd396'},versatile:{name:'通用',color:'#b8baa6'},
};
const EXTRA_TAGS={
  circuit:['lightning','projectile'],brine:['cold','spirit','control'],wake:['mobility','projectile'],souljar:['spirit','growth'],sundial:['versatile'],emberheart:['guard'],
  everseed:['growth'],
  meteor:['area'],mine:['area'],tether:['control'],lance:['area'],execution:['area'],axe:['area'],hammer:['area','control'],whirlwind:['area'],quake:['area','control'],starfall:['area'],bastion:['guard'],wintermine:['area','control'],soulchain:['control','area'],supernova:['area'],pestilence:['area'],
  orbit:['guard'],storm:['area'],flame:['area'],frost:['area','control'],thorn:['area'],bell:['area','control'],solar:['area'],glacier:['control','guard'],requiem:['area'],plague:['area'],bloodmoon:['guard'],absolute:['control','area'],hailfire:['area','control'],soulforge:['area'],
  power:['versatile'],haste:['versatile'],vitality:['guard'],speed:['mobility'],magnet:['growth'],armor:['guard'],regen:['guard'],luck:['critical'],area:['area'],duration:['fire','poison','control','summon'],amount:['projectile','spirit','lightning'],focus:['critical'],growth:['growth'],curse:['growth'],
  frostbrand:['cold','projectile','control'],venomfang:['poison','melee','projectile'],volatile:['fire','poison','area'],stormseal:['lightning','cold','control'],executioner:['melee','critical'],deadeye:['critical'],
  aegis:['guard'],thorns:['guard','melee'],dashfire:['mobility','fire'],harvest:['growth','spirit'],embercore:['fire','melee','projectile'],conductor:['lightning','projectile'],rime:['cold','area'],spore:['poison','area'],siphon:['melee','guard'],echo:['spirit','area'],lens:['projectile'],cinder:['fire','area'],
  soulpact:['spirit','summon'],hoarfrost:['mobility','cold','control'],rotclock:['fire','poison'],bulwark:['guard','projectile'],forkseed:['critical','projectile'],stormcoil:['lightning','guard'],
};
export function itemTags(key,runes={}){
  const families=weaponFamilies(key,runes).map(tag=>tag==='beam'?'projectile':tag==='blast'?'area':tag).filter(tag=>BUILD_TAGS[tag]);
  return [...new Set([...families,...(EXTRA_TAGS[key]||[])])];
}

export const SYNERGIES=[
  {items:['circuit','stormcoil'],name:'双环过载',resonance:true,desc:'雷电积蓄电弧与护盾，连续命中形成连锁。'},
  {items:['brine','rime'],name:'盐霜碎镜',resonance:true,desc:'盐痕制造寒冷易伤，后续命中引发碎冰。'},
  {items:['wake','speed'],name:'逐浪归航',resonance:true,desc:'提高移速，更快积蓄移动距离，让身后不断留下魂矢。'},
  {items:['souljar','soulpact'],name:'万魂归瓮',desc:'召唤武器完成击杀，魂瓮追加追踪火力。'},
  {items:['hoarfrost','rime'],name:'踏雪碎镜',resonance:true,desc:'移动蓄满后冻结追兵，后续武器命中触发碎冰。'},
  {items:['hoarfrost','stormseal'],name:'逐雷寒径',resonance:true,desc:'移动蓄满后施加寒冷，再由雷电武器传导冻结。'},
  {items:['embercore','rotclock'],name:'迟燃余烬',resonance:true,desc:'燃芯提供附着灼烧，沙漏提高每次灼烧伤害。'},
  {items:['venomfang','rotclock'],name:'侵蚀倒计时',resonance:true,desc:'蚀骨针附加侵蚀，沙漏强化每次侵蚀伤害。'},
  {items:['aegis','bulwark'],name:'碎光再生',desc:'灯塔补充护盾，护盾被击破后棱片追击敌群。'},
  {items:['stormcoil','bulwark'],name:'雷光碎盾',desc:'雷环提供护盾，破盾时释放追踪棱片。'},
  {items:['luck','forkseed'],name:'命运分岔',resonance:true,desc:'提高暴击频率，更稳定地触发骨片追击。'},
  {items:['soulpact','duration'],name:'长明魂契',resonance:true,desc:'延长石像存在时间，让更快、更强的射击持续输出。'},
  {items:['frostbrand','rime'],name:'冰针碎镜',resonance:true,desc:'远程命中施加减速，后续命中触发范围碎冰。'},
  {items:['venomfang','spore'],name:'侵蚀播种',resonance:true,desc:'先附加侵蚀，击杀后传播毒素与孢爆。'},
  {items:['embercore','cinder'],name:'余火连爆',resonance:true,desc:'命中点燃，燃烧目标死亡触发爆燃。'},
  {items:['embercore','venomfang','volatile'],name:'炼金沸腾',resonance:true,desc:'火与毒在同一目标上相遇，消耗状态换取爆炸。'},
  {items:['frostbrand','stormseal'],name:'霜雷回路',resonance:true,desc:'先以投射物减速，再由雷属性武器引发冰雷反应。'},
  {items:['luck','deadeye'],name:'猎魂印记',resonance:true,desc:'提高暴击频率，让易伤标记更稳定。'},
  {items:['focus','executioner'],name:'破军终结',resonance:true,desc:'高倍暴击配合低血增伤，更快击破重型目标。'},
  {items:['aegis','thorns'],name:'灯盾反击',desc:'护盾承受的攻击也会触发铁棘反击。'},
  {items:['armor','thorns'],name:'重甲荆棘',desc:'护甲既减伤，也直接提高铁棘反击伤害。'},
  {items:['speed','dashfire'],name:'踏火游击',desc:'提高移速，更快积蓄移动距离，留下更多火场阻断追兵。'},
  {items:['magnet','harvest'],name:'拾光引魂',desc:'扩大收集范围，更安全地积累魂火充能。'},
];

export function relicValues(key,level,stats) {
  const damage=base=>base*(stats?.damageMultiplier||1);
  switch(key) {
    case 'circuit': return {hits:6,damage:damage(12+level*10),count:level+1,range:145};
    case 'brine': return {duration:1+level*.4,multiplier:1.04+level*.04};
    case 'wake': return {damage:damage(15+level*12),count:2+level,pierce:2};
    case 'souljar': return {kills:12,count:3,damage:damage(16+level*12)};
    case 'sundial': return {casts:5,advance:level*.5};
    case 'emberheart': return {heal:2+level*2,shield:4+level*4};
    case 'everseed': return {chance:.015+level*.015};
    case 'soulpact': return {multiplier:1+level*.18,interval:1-level*.06};
    case 'hoarfrost': return {damage:damage(15+level*13),radius:65+level*9,freeze:.4+level*.2,bossFreeze:.15,slowDuration:2+level*.4};
    case 'rotclock': return {multiplier:1+level*.25};
    case 'bulwark': return {damage:damage(5+level*5),count:3+level};
    case 'forkseed': return {damage:damage(5+level*5),count:2};
    case 'stormcoil': return {damage:damage(12+level*10),radius:72+level*8,shield:1+level,hits:7};
    case 'frostbrand': return {duration:.5+level*.3};
    case 'venomfang': return {damage:damage(3+level*4),hitDamage:damage(3+level*2),duration:3};
    case 'volatile': return {damage:damage(18+level*12),radius:42+level*7};
    case 'stormseal': return {damage:damage(10+level*8),count:level+1,range:135,freeze:.12+level*.08,bossFreeze:.1};
    case 'executioner': return {multiplier:1+level*.2,threshold:.3};
    case 'deadeye': return {multiplier:1+level*.08,duration:3};
    case 'aegis': return {shield:8+level*5,gain:level*.15};
    case 'thorns': return {damage:damage(6+level*6+(stats?.armor||0)*2),radius:65+level*8};
    case 'dashfire': return {damage:damage(6+level*7),radius:35+level*6,duration:2+level*.5};
    case 'harvest': return {damage:damage(18+level*14),count:level+1,charge:60};
    case 'embercore': return {damage:damage(3+level*2),duration:2,interval:.5};
    case 'conductor': return {damage:damage(12+level*6),count:level+1,range:130};
    case 'rime': return {damage:damage(3+level*2),radius:24+level*6};
    case 'spore': return {damage:damage(8+level*6),radius:42+level*8,poisonDamage:damage(4+level*3),duration:3};
    case 'siphon': return {heal:level*.12};
    case 'echo': return {damage:damage(10+level*9),radius:65+level*14,casts:3};
    case 'lens': return {multiplier:.3+level*.15};
    case 'cinder': return {damage:damage(10+level*8),radius:40+level*10};
  }
}

export function relicDescription(key,level,stats) {
  const v=relicValues(key,level,stats),d=n=>Math.round(n),s=n=>Number(n.toFixed(2));
  switch(key) {
    case 'circuit': return '每累计 6 次雷电直接命中，传导 '+v.count+' 个其他目标，各 '+d(v.damage)+' 伤害；追加电弧不递归触发。';
    case 'brine': return '寒霜、灵魂武器直接命中减速 55%，并施加 '+d((v.multiplier-1)*100)+'% 易伤，持续 '+s(v.duration)+' 秒；同类刷新，易伤只取最高。';
    case 'wake': return '每累计移动 240 像素，向身后发射 '+v.count+' 枚魂矢，各 '+d(v.damage)+' 伤害，穿透 2 个目标；不触发命中遗物。';
    case 'souljar': return '击败 12 个非召唤敌人，放出 3 枚追踪魂火，各 '+d(v.damage)+' 伤害；追加火力不触发命中遗物。';
    case 'sundial': return '每施放 5 次武器，将剩余施放冷却最长的一件武器推进 '+s(v.advance)+' 秒；环绕接触不计数。';
    case 'emberheart': return '击败精英或首领恢复 '+v.heal+' 生命，护盾补至 '+v.shield+'；不超过生命上限，不覆盖更高护盾。';
    case 'everseed': return '学会天赋后，角色能力命中：'+s(v.chance*100)+'% 随机获得伤害 +1%、范围 +1% 或生命上限 +2；本局无限累加、无冷却，加生命不治疗。';
    case 'soulpact': return '灵魂、召唤武器伤害 +'+d((v.multiplier-1)*100)+'%；石像与灵龛射击间隔缩短 '+d((1-v.interval)*100)+'%。学习星群路线后，伴星继承上述两项加成。';
    case 'hoarfrost': return '每累计移动 240 像素，脚下爆发半径 '+v.radius+' 冰环，造成 '+d(v.damage)+' 伤害；冻结普通敌人 '+s(v.freeze)+' 秒、首领 '+v.bossFreeze+' 秒，再减速 55% 持续 '+s(v.slowDuration)+' 秒。';
    case 'rotclock': return '附着燃烧、侵蚀的每次状态伤害 +'+d((v.multiplier-1)*100)+'%；地面火场与毒池伤害不变。';
    case 'bulwark': return '每次护盾被击破都释放 '+v.count+' 枚追踪棱片，各造成 '+d(v.damage)+' 伤害，无独立冷却。棱片不暴击或触发命中遗物。';
    case 'forkseed': return '每次武器暴击都分裂 '+v.count+' 枚追踪骨片，寻找其他敌人，各造成 '+d(v.damage)+' 伤害，无独立冷却。骨片不暴击、不触发命中遗物。';
    case 'stormcoil': return '每累计 '+v.hits+' 次雷电武器直接命中，释放半径 '+v.radius+' 雷环，造成 '+d(v.damage)+' 伤害并将护盾补至 '+v.shield+'；无独立冷却，追加闪电不计数。';
    case 'frostbrand': return '投射物或光束命中减速 55%，持续 '+s(v.duration)+' 秒；可触发霜纹镜。';
    case 'venomfang': return '刃器／投射物每次命中：'+d(v.hitDamage)+' 侵蚀伤害，另附 '+v.duration+' 秒侵蚀，每秒 '+d(v.damage)+' 伤害；重复命中仍触发即时伤害，持续侵蚀刷新、不叠加。';
    case 'volatile': return '每次武器命中同时燃烧、侵蚀的敌人，消耗两种状态，造成半径 '+v.radius+'、'+d(v.damage)+' 伤害的炼金爆炸；无独立冷却。';
    case 'stormseal': return '每次雷电命中寒冷敌人，传导 '+v.count+' 个目标，各 '+d(v.damage)+' 伤害，首个目标冻结 '+s(v.freeze)+' 秒（首领 '+v.bossFreeze+' 秒）；无独立冷却。';
    case 'executioner': return '武器对生命不高于 30% 的敌人伤害 +'+d((v.multiplier-1)*100)+'%；首领加成减半；持续状态伤害不触发。';
    case 'deadeye': return '武器暴击后标记 '+v.duration+' 秒，目标受到伤害 +'+d((v.multiplier-1)*100)+'%；刷新不叠加。';
    case 'aegis': return '每次武器直接命中补充 '+s(v.gain)+' 护盾，最多存至 '+v.shield+' 点；无独立冷却，不能提高已有的更高护盾。';
    case 'thorns': return '每次受到攻击，都在半径 '+v.radius+' 内反击 '+d(v.damage)+' 伤害（已计护甲）；无独立冷却。';
    case 'dashfire': return '每累计移动 240 像素，脚下留下半径 '+v.radius+' 火场，持续 '+s(v.duration)+' 秒，每 0.5 秒造成 '+d(v.damage)+' 伤害并点燃。';
    case 'harvest': return '累计拾取 '+v.charge+' 基础经验释放 '+v.count+' 枚追踪魂火，各造成 '+d(v.damage)+' 伤害；合并结晶按完整经验充能。';
    case 'embercore': return '刃器或投射物命中点燃 2 秒，每 0.5 秒造成 '+d(v.damage)+' 灼烧伤害；重复命中刷新持续时间。';
    case 'conductor': return '每次投射物或光束命中，都向 '+v.count+' 个其他目标传导各 '+d(v.damage)+' 伤害；无独立冷却，追加闪电不递归触发。';
    case 'rime': return '每次攻击减速或冻结的敌人，都触发半径 '+v.radius+' 的碎冰，造成 '+d(v.damage)+' 伤害；无独立冷却。';
    case 'spore': return '每个被侵蚀的敌人死亡时，都在半径 '+v.radius+' 内造成 '+d(v.damage)+' 毒爆伤害，并传播持续 3 秒、每秒 '+d(v.poisonDamage)+' 伤害的侵蚀；无独立冷却。';
    case 'siphon': return '每次刃器命中都恢复 '+s(v.heal)+' 点生命，无独立冷却；不超过最大生命。';
    case 'echo': return '每施放 '+v.casts+' 次武器产生半径 '+v.radius+' 的回声，造成 '+d(v.damage)+' 伤害；无独立冷却，环绕接触不计数。';
    case 'lens': return '每轮投射物追加一枚追踪折射弹，伤害为该轮单枚投射物的 '+d(v.multiplier*100)+'%；附加弹不重复折射。';
    case 'cinder': return '每个燃烧中的敌人死亡时，都在半径 '+v.radius+' 内引发 '+d(v.damage)+' 伤害的爆燃；无独立冷却。';
  }
}

// Run-only altar bargains: gains affect the hero; costs add enemy pressure.
export const ALTAR_BOONS={
  horizon:{name:'裂界星图',icon:'area',positive:'范围 +45%',negative:'普通刷怪与怪潮数量 +50%',multiply:{areaMultiplier:1.45},difficulty:{population:.5}},
  frenzy:{name:'疾鸣沙漏',icon:'haste',positive:'攻击频率 +35%',negative:'随机精英出现概率 +50%',multiply:{haste:1/1.35},difficulty:{elite:.5}},
  glass:{name:'碎命烛冠',icon:'curse',positive:'伤害 +40%',negative:'后续每波首领数量 +1',multiply:{damageMultiplier:1.4},difficulty:{bosses:1}},
  stride:{name:'逐风契约',icon:'speed',positive:'移速 +25%，拾取范围 +25%',negative:'怪物移动速度 +12%',multiply:{moveSpeed:1.25,pickupRadius:1.25},difficulty:{speed:.12}},
  winter:{name:'长夜寒誓',icon:'duration',positive:'持续时间 +55%，范围 +15%',negative:'怪物与首领生命 +25%',multiply:{durationMultiplier:1.55,areaMultiplier:1.15},difficulty:{hp:.25}},
  twins:{name:'破碎双生',icon:'amount',positive:'投射物、环绕物与落雷目标 +2',negative:'后续每波首领数量 +1',add:{amount:2},difficulty:{bosses:1}},
  harvest:{name:'饥渴灵冠',icon:'growth',positive:'经验 +35%，拾取范围 +60%',negative:'普通刷怪与怪潮数量 +50%',multiply:{xpMultiplier:1.35,pickupRadius:1.6},difficulty:{population:.5}},
  fortress:{name:'负山灯壁',icon:'armor',positive:'最大生命 +30%，护甲 +3',negative:'怪物与首领伤害 +20%',add:{armor:3},multiply:{maxHp:1.3},difficulty:{damage:.2}},
  precision:{name:'孤注猎瞳',icon:'focus',positive:'暴击率 +20 个百分点，暴击倍率 +0.5',negative:'随机精英出现概率 +50%',add:{criticalChance:.2,criticalMultiplier:.5},difficulty:{elite:.5}},
  renewal:{name:'回生苔心',icon:'regen',positive:'每秒恢复 0.8 生命',negative:'怪物与首领生命 +25%',add:{regeneration:.8},difficulty:{hp:.25}},
  pilgrim:{name:'灰烬行者',icon:'dashfire',positive:'护甲 +3，受到伤害 −15%',negative:'怪物移动速度 +12%',add:{armor:3},multiply:{damageTakenMultiplier:.85},difficulty:{speed:.12}},
  souls:{name:'群魂共鸣',icon:'soulpact',positive:'灵魂、召唤武器与伴星伤害 +45%',negative:'怪物与首领伤害 +20%',multiply:{summonMultiplier:1.45},difficulty:{damage:.2}},
};

export function compatibleWeapons(key,weapons,passives={},talents={},characterId=null,weaponUpgrades={},weaponRunes={},cores={}) {
  if(key==='everseed')return Object.keys(talents).length?Object.keys(weapons):[];
  const families=RELICS[key]?.families||[];
  const tags=Object.keys(weapons).flatMap(id=>weaponFamilies(id,weaponRunes));
  const enabled=id=>!!passives[id]&&RELICS[id].families.some(tag=>tags.includes(tag));
  const fire=tags.includes('fire')||enabled('embercore')||!!passives.dashfire||!!talents.w_flame2||!!cores.garden;
  const poison=tags.includes('poison')||enabled('venomfang');
  const cold=tags.includes('cold')||!!weapons.tether||!!weapons.soulchain||!!weapons.hammer||!!weapons.quake||enabled('frostbrand')||enabled('brine')||!!talents.s_frost1||!!passives.hoarfrost||characterId==='mariner'||!!cores.stride;
  if(key==='bulwark'&&!passives.aegis&&!passives.emberheart&&!weapons.bastion&&!talents.s_scholar2&&!talents.f_guard1&&!talents.m_guard1&&characterId!=='warden'&&!(passives.stormcoil&&tags.includes('lightning'))&&!cores.ward)return [];
  const refinedBurn=Object.keys(weapons).some(id=>weaponUpgrades[id]?.anomaly>0&&WEAPON_FAMILIES[id]?.includes('fire'));
  if(key==='rotclock'&&!poison&&!enabled('embercore')&&!talents.w_flame2&&!refinedBurn&&!Object.values(weaponRunes).includes('fire'))return [];
  if(key==='volatile'&&!(fire&&poison)||key==='stormseal'&&!cold)return [];
  return Object.keys(weapons).filter(id=>{
    const tags=weaponFamilies(id,weaponRunes);
    return families.some(tag=>['hit','guard','travel','pickup'].includes(tag))||tags.some(tag=>families.includes(tag))
      || key==='cinder'&&fire
      || key==='spore'&&poison
      || key==='rime'&&cold
      || key==='rotclock'
      || key==='volatile'&&(fire&&poison);
  });
}
