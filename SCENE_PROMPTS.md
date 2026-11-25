# Gavin's Blog · 基于你的「冬天雪夜」母图的 12 张完整出图 Prompt 指南

> 本指南已完全适配你刚生成的 **`manor-winter-night.jpg`**（左侧石屋暖窗 + 白鹰红旗 + 挂灯 + 柴堆木桶 + 右侧木石围栏 + 山谷石桥河流 + 远山尖顶教堂与冒烟小屋 + 巍峨雪山与银河的写实电影级西幻风格）。

---

## 一、最优出图顺序（从你现有的 `manor-winter-night.jpg` 出发，再生成 11 张）

> **核心技巧**：不要直接用「深夜雪图」一口气转「夏天白天」（跨度太大容易跑偏构图）。按下面 **3 步树状法**，先同季转白天，再以「冬·白天」融雪出「春/夏/秋·白天」，最后各季转「晨昏」与「深夜」，12 张会像同一架三脚架拍出的延时摄影一样严丝合缝！

```text
已有母图：manor-winter-night.jpg（冬·深夜 ✅）
  │
  ├──► 第 1 步（先补齐冬季另外 2 张）
  │      ├── manor-winter-day.jpg     （参考：manor-winter-night.jpg）
  │      └── manor-winter-golden.jpg  （参考：manor-winter-night.jpg）
  │
  ├──► 第 2 步（以 manor-winter-day.jpg 为底图，融雪生成其余 3 季白天）
  │      ├── manor-spring-day.jpg     （参考：manor-winter-day.jpg）
  │      ├── manor-summer-day.jpg     （参考：manor-winter-day.jpg）
  │      └── manor-autumn-day.jpg     （参考：manor-winter-day.jpg）
  │
  └──► 第 3 步（分别以各自季节的 *-day.jpg 为底图，生成晨昏与深夜共 6 张）
         ├── 春：manor-spring-golden.jpg / manor-spring-night.jpg
         ├── 夏：manor-summer-golden.jpg / manor-summer-night.jpg
         └── 秋：manor-autumn-golden.jpg / manor-autumn-night.jpg
```

---

## 二、第 1 步：补齐冬季的「白天」与「晨昏」（参考图：`manor-winter-night.jpg`）

### 1. 冬 · 白天 (`manor-winter-day.jpg`)
**英文 Prompt（推荐）**：
```text
Edit the reference image `manor-winter-night.jpg` into crisp sunlit WINTER DAYTIME. Keep the EXACT same camera angle, framing, and every architectural and landscape element in identical pixel positions: the stone cottage on the left with snow-covered roof, mullioned window, crimson banner with white eagle, hanging wrought-iron lantern, stacked firewood, wooden barrel, snowy path with footprints, stone-and-wood rail fence on the right, snow-laden pine forest, distant hilltop spire church, riverside cottages with rising chimney smoke, stone arch bridge over the river, and the towering jagged snow-capped alpine mountains. Change ONLY the sky and lighting to bright clear alpine winter daytime: replace the starry Milky Way night sky with a crisp vivid icy-blue winter sky with soft wind-streaked white clouds; bathe the snow-capped mountains, snowy valley, and cottage in clean natural winter sunlight with cool crisp blue shadows across the snow; soften the cottage window and wrought-iron lantern into unlit or faint daytime glass (no strong night glow); preserve the exact cinematic photorealistic dark-fantasy film aesthetic, rich tactile stone and snow textures, no people, no text, no watermark.
```
**中文 Prompt**：
```text
以参考图为底图，严格保持完全一致的镜头视角、构图与所有建筑地貌位置（左侧雪顶石屋、木格窗、白鹰红旗、锻铁挂灯、柴堆与木桶、脚印雪路、右侧石基木围栏、覆雪松林、远处山丘尖顶教堂、河畔冒烟农舍、石拱桥、河流与高耸雪山），仅将时间与光影改为清澈明朗的【冬日白天】：将银河星空替换为澄澈冰蓝的冬日晴空与微风拉长的洁白云缕；自然通透的冬日阳光洒在雪峰、覆雪屋檐与山谷白雪上，在雪地投下清冷的淡蓝阴影；熄灭挂灯与远方窗灯改为自然日光反光；保持完全一致的电影级写实西幻摄影质感，无人物、无文字。
```

### 2. 冬 · 晨昏霞光 (`manor-winter-golden.jpg`)
**英文 Prompt（推荐）**：
```text
Edit the reference image `manor-winter-night.jpg` into dramatic alpine WINTER GOLDEN HOUR (sunrise/sunset). Keep the EXACT same camera angle, framing, stone cottage, crimson white-eagle banner, hanging lantern, firewood, barrel, snowy path, right-side stone-and-wood fence, snow-laden pines, distant church, riverside cottages with chimney smoke, stone bridge, river, and towering snow-capped mountains in identical pixel positions. Change ONLY the sky and lighting to luminous golden hour: replace the night sky with a glowing twilight-amber, peach-gold, and rose-violet horizon sky with sunlit clouds; paint the distant snow-capped alpine peaks with vivid pink-gold alpenglow; cast warm low-angle golden sunlight across the snow ridges and long cool violet-blue shadows across the path and valley; keep the cottage window, wrought-iron lantern, and distant village windows softly glowing warm amber; reflect warm golden-pink sky light on the river surface. Same cinematic photorealistic fantasy aesthetic, no people, no text.
```
**中文 Prompt**：
```text
以参考图为底图，严格保持完全一致的镜头视角、构图与全部建筑地貌元素位置不变，仅将时间与光影改为壮丽的【冬日晨昏霞光（日照金山）】：天空变为琥珀金、桃红与暮紫交织的晚霞流云，远处巍峨雪峰染上耀眼的粉金色日照金山；低角度暖金色阳光斜掠雪坡与木围栏，投下修长的蓝紫色阴影；左侧石屋窗户、锻铁挂灯与远方教堂农舍亮起柔和温暖的橘黄灯光，河面映出微光与霞色；保持完全一致的电影级写实西幻质感，无人物、无文字。
```

---

## 三、第 2 步：以 `manor-winter-day.jpg` 为底图，融雪生成「春 / 夏 / 秋」白天

> **提示**：上传刚刚生成的 `manor-winter-day.jpg` 作为参考图，下面 3 段会自动把屋顶、路径、木围栏和山谷里的积雪融化成对应季节的植被，同时**永久保留远处高耸雪山的积雪**！

### 3. 春 · 白天 (`manor-spring-day.jpg`)
**英文 Prompt（推荐）**：
```text
Edit the reference image `manor-winter-day.jpg` into fresh sunlit alpine SPRING DAYTIME. Keep the EXACT same camera angle, framing, stone cottage on the left, crimson white-eagle banner, hanging lantern, firewood stack, wooden barrel, stone-and-wood rail fence on the right, pine trees, distant hilltop church, riverside cottages with subtle chimney smoke, stone arch bridge, river, and towering alpine mountains in identical pixel positions. Transform the season from winter to SPRING: completely melt all snow from the cottage roof, firewood, barrel, footpath, stone fence, pine trees, and valley meadows; replace the snowy slopes with lush fresh spring-green grass dotted with alpine wildflowers (white daisies, pale purple crocus, yellow buttercups); add blooming wild cherry and apple blossom trees with delicate pale pink and white flowers near the cottage edge and valley; turn the footpath into damp earthy spring dirt bordered by young green moss and scattered wind-blown pink petals; make the river flow crisp clear turquoise snowmelt water; keep crisp white snow and glaciers ONLY on the high distant alpine mountain peaks under a bright pastel-blue spring sky with breezy white clouds. Same cinematic photorealistic fantasy aesthetic, no people, no text.
```
**中文 Prompt**：
```text
以 `manor-winter-day.jpg` 为参考底图，严格保持完全一致的镜头机位、构图与所有建筑地貌位置不变，将季节改为生机勃勃的【春日白天】：彻底融化屋顶、柴堆、木桶、小路、木石围栏、松林与山谷中的所有积雪；山坡与河谷铺满嫩绿的春草与阿尔卑斯野花（雏菊、淡紫番红花、金黄毛茛），在石屋旁与山谷间点缀盛开的粉白野樱与果树花枝；雪路化为带着青苔与散落花瓣的春泥土路，微风吹起轻盈花瓣；山谷河流变为清澈碧蓝的融雪春水；仅保留远处巍峨高山峰顶的皑皑白雪，天空为清透淡蓝的春日晴空与微风白云。保持完全一致的电影级写实西幻摄影质感，无人物、无文字。
```

### 4. 夏 · 白天 (`manor-summer-day.jpg`)
**英文 Prompt（推荐）**：
```text
Edit the reference image `manor-winter-day.jpg` into lush sunlit alpine SUMMER DAYTIME. Keep the EXACT same camera angle, framing, stone cottage on the left, crimson white-eagle banner gently billowing in the breeze, hanging lantern, firewood stack, wooden barrel, stone-and-wood rail fence on the right, conifers, distant hilltop church, riverside cottages, stone arch bridge, river, and towering alpine mountains in identical pixel positions. Transform the season from winter to high SUMMER: completely remove all snow from the cottage roof, firewood, barrel, dirt footpath, stone fence, trees, and entire valley; cover the rolling slopes and meadows in rich, deep emerald-green summer grass and tall swaying wildflowers bending gently in the mountain breeze; add lush green climbing ivy along the weathered stone cottage wall and mossy stones; make the alpine river sparkle bright sunlit blue; keep dramatic white glaciers and snowfields ONLY on the high jagged distant alpine peaks under a deep vibrant sunlit summer blue sky with sweeping high-altitude clouds. Same cinematic photorealistic fantasy aesthetic, rich natural sunlight, no people, no text.
```
**中文 Prompt**：
```text
以 `manor-winter-day.jpg` 为参考底图，严格保持完全一致的镜头机位、构图与所有建筑地貌位置不变，将季节改为丰茂澄澈的【夏日白天】：彻底融化屋顶、柴堆、木桶、小路、围栏与整片山谷的积雪；山坡化为浓郁翠绿的高山夏日草甸与随山风成片摇曳的野花，石墙与苔石间爬上翠绿常春藤，白鹰红旗随清风轻扬；河流在饱满日光下波光粼粼；仅在远处高耸险峻的雪山顶峰保留冰川与积雪，天空为澄澈蔚蓝的夏日晴空与高空流云。保持完全一致的电影级写实西幻质感，无人物、无文字。
```

### 5. 秋 · 白天 (`manor-autumn-day.jpg`)
**英文 Prompt（推荐）**：
```text
Edit the reference image `manor-winter-day.jpg` into crisp golden alpine AUTUMN DAYTIME. Keep the EXACT same camera angle, framing, stone cottage on the left, crimson white-eagle banner, hanging lantern, firewood stack, wooden barrel, stone-and-wood rail fence on the right, trees, distant hilltop church, riverside cottages with rising chimney smoke, stone arch bridge, river, and towering alpine mountains in identical pixel positions. Transform the season from winter to vivid AUTUMN: completely remove snow from the cottage roof, firewood, barrel, footpath, fence, and valley; turn the valley meadows into warm harvest-gold, ochre, and russet autumn grass bending in the crisp mountain wind; mix blazing golden alpine larches, burnt orange, and deep crimson autumn foliage among the dark green spruce trees across the valley; scatter fallen red and golden leaves along the dirt footpath, wooden barrel, firewood, and stone fence; keep fresh autumn snow dusting the high distant jagged alpine peaks under a clear crisp autumn sky with soft sunlit clouds. Same cinematic photorealistic fantasy aesthetic, no people, no text.
```
**中文 Prompt**：
```text
以 `manor-winter-day.jpg` 为参考底图，严格保持完全一致的镜头机位、构图与所有建筑地貌位置不变，将季节改为斑斓明净的【秋日白天】：彻底融化屋顶、柴堆、木桶、小路、围栏与山谷积雪；草坡转为温暖的秋金、赭黄与赤褐色，山风吹动枯黄草浪；山谷暗绿松林间穿插大片金黄落叶松、焦糖橙与深红秋叶；泥土小路、木桶、柴堆与石墙边散落红黄落叶；远处巍峨高山峰顶覆盖着清冽秋雪，天空为高爽通透的秋日晴空与轻云。保持完全一致的电影级写实西幻质感，无人物、无文字。
```

---

## 四、第 3 步：把「春 / 夏 / 秋」的白天图各转出「晨昏」与「深夜」（共 6 张）

> **操作方式**：分别上传 `manor-spring-day.jpg`、`manor-summer-day.jpg`、`manor-autumn-day.jpg` 作为底图，套用下面两段通用光影转换词即可（如果你用的工具支持**双图参考**，生成 `-night.jpg` 时可以同时附上你的 `manor-winter-night.jpg` 作为星空与灯光的风格参考，银河一致性会直接封神！）。

### A. 通用「晨昏霞光」转换词（生成 `spring/summer/autumn-golden.jpg`）
**英文 Prompt**：
```text
Keep the EXACT same composition, seasonal foliage, grass, wildflowers/leaves, stone cottage, crimson white-eagle banner, hanging lantern, firewood, barrel, dirt path, stone-and-wood fence, valley, distant church, cottages with chimney smoke, stone bridge, river, and snow-capped alpine peaks from the reference image in identical pixel positions. Change ONLY the lighting and sky to breathtaking GOLDEN HOUR (low-angle sunrise/sunset): bathe the sky in luminous molten amber, warm peach-gold, and soft rose-violet drifting clouds; paint the distant snow-capped mountain peaks with glowing pink-gold alpenglow; cast rich warm low-angle golden light across the seasonal landscape and long atmospheric shadows along the path and fence; softly illuminate the cottage window, hanging wrought-iron wall lantern, and distant hilltop church windows with warm amber firelight; reflect warm sunset gold across the alpine river. Preserve the exact cinematic photorealistic dark-fantasy film aesthetic, no people, no text.
```
**中文 Prompt**：
```text
严格保持参考图的完全一致构图、当前季节植被（春花/夏草/秋叶）与所有建筑地貌元素位置不变，仅将天空与光影改为极富氛围感的【晨昏霞光（日出/夕阳）】：天空染上熔金琥珀、暖桃红与淡紫交织的晚霞流云，远处雪峰泛起粉金色日照金山；低角度暖金色阳光斜照草坡、木围栏与石墙，拉出修长温柔的阴影；左侧石屋窗户、锻铁挂灯与远处教堂农舍亮起暖橘色灯火，山谷河面映出金色霞光；保持完全一致的电影级写实西幻质感，无人物、无文字。
```

### B. 通用「银河深夜」转换词（生成 `spring/summer/autumn-night.jpg`）
**英文 Prompt**：
```text
Keep the EXACT same composition, seasonal foliage, grass, wildflowers/leaves (NO snow in the valley, roof, or path—keep the exact season from the reference image!), stone cottage, crimson white-eagle banner, hanging lantern, firewood, barrel, dirt path, stone-and-wood fence, valley, distant church, cottages with chimney smoke, stone bridge, river, and distant snow-capped alpine peaks in identical pixel positions. Change ONLY the lighting and sky to breathtaking STARRY ALPINE MIDNIGHT matching the lighting mood of dark-fantasy moonlight: transform the sky into a deep velvety midnight-blue starry sky with a luminous Milky Way arching diagonally from top-center to upper-right above the moonlit snow-capped mountains; bathe the seasonal valley, trees, and wooden fence in cool silver moonlight and deep atmospheric night shadows; illuminate the stone cottage's mullioned window on the left with cozy glowing warm orange hearth firelight from inside, light the hanging wrought-iron wall lantern with a bright warm golden flame casting a realistic pool of warm amber light onto the dirt path, barrel, and stone wall; light the tiny windows of the distant hilltop church and riverside cottages with warm golden pinpoints reflecting softly in the dark river. Preserve the exact cinematic photorealistic dark-fantasy film aesthetic, no people, no text.
```
**中文 Prompt**：
```text
严格保持参考图的完全一致构图、当前季节植被（春花/夏草/秋叶——山谷、屋顶和小路绝不加雪，保持与底图一致的季节！）与所有建筑地貌元素位置不变，仅将天空与光影改为静谧深邃的【银河深夜】：天空变为深邃丝绒午夜蓝，繁星密布，璀璨银河从画面中上方斜掠向右上方雪山之上；清冷银白月光照亮远处雪峰轮廓与山谷草木、木石围栏；左侧石屋木格窗内透出温暖跃动的室内炉火橘光，石墙锻铁挂灯点亮温暖金黄火光，在门口土路、木桶与石墙上洒下真实的暖色光晕；远处山丘教堂与河畔农舍亮起细碎温暖的金色窗灯，并倒映在幽暗的河面上。保持完全一致的电影级写实西幻摄影质感，无人物、无文字。
```

---

## 五、12 张交付验收核对表

全部放入 `public/assets/` 后即可完整解锁 4 季 × 6 北京时段原生光影：

- [x] `public/assets/manor-winter-night.jpg`（已装入 ✅）
- [x] `public/assets/manor-winter-day.jpg`（已装入 ✅）
- [x] `public/assets/manor-winter-golden.jpg`（已装入 ✅）
- [x] `public/assets/manor-spring-day.jpg`（已装入 ✅）
- [x] `public/assets/manor-spring-golden.jpg`（已装入 ✅）
- [x] `public/assets/manor-spring-night.jpg`（已装入 ✅）
- [x] `public/assets/manor-summer-day.jpg`（已装入 ✅）
- [x] `public/assets/manor-summer-golden.jpg`（已装入 ✅）
- [x] `public/assets/manor-summer-night.jpg`（已装入 ✅）
- [x] `public/assets/manor-autumn-day.jpg`（已装入 ✅）
- [x] `public/assets/manor-autumn-golden.jpg`（已装入 ✅）
- [x] `public/assets/manor-autumn-night.jpg`（已装入 ✅）
