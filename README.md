# Yellow War · 黄色伙伴战争

一款在浏览器中运行的单人横版即时战略游戏。经营矿脉、招募六种黄色伙伴、指挥全军，摧毁敌方营地取得胜利。

- 游戏地址：https://luan-0328.github.io/yellow-war/
- 源码仓库：https://github.com/luan-0328/yellow-war
- 技术栈：**Phaser 4.2.1 / TypeScript / Vite / GitHub Pages**。

## 本地运行

Node.js 22.12+，推荐 Node.js 24 LTS。

```powershell
cd D:\tool\yellow-war
npm ci
npm run dev
```

打开 http://127.0.0.1:5173/yellow-war/ 。依赖已安装时直接运行 `npm run dev`。

```powershell
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

预览地址：http://127.0.0.1:4173/yellow-war/ 。`dist/` 为静态发布产物。

## 1.1 动作更新

从主菜单进入「兵种演练」，或直接打开 https://luan-0328.github.io/yellow-war/?view=drill 。1–4 切换行军、采矿、战斗、待机，P 暂停，按钮切换左右朝向，Esc 返回。主菜单 H 打开操作帮助。

攻击先蓄力再结算，配合斩击、箭矢、法术、巨人震地、尘土和分兵种音效。暂停同时冻结动作与特效。

## 玩法

双方各有 1800 基地生命、400 初始金币、1 名矿工，人口上限均为 30。矿工自动往返独立矿区，每次采矿 2.5 秒，回营地交付 55 金币。敌人接近时矿工撤退。

| 操作 | 功能 |
| --- | --- |
| 点击兵种 / 1–6 | 招募矿工、剑士、弓箭手、盾矛兵、法师、巨人 |
| A / 点击进攻 | 全军向敌方推进 |
| D / 点击防守 | 返回己方防线，攻击进入射程的敌人 |
| R / 点击集合 | 回集合点整队，近距离自卫 |
| Esc / 点击暂停 | 暂停所有对局计时；调整音量、静音或返回菜单 |
| Tab / Shift+Tab、Enter / Space | 选择与操作画布按钮 |

建议先补矿工，再搭配盾矛兵与远程兵种。矿工不受全军指令影响。金币不足、人口已满、基地被毁时招募不会扣款。

盾矛兵减伤 20%；法师使用带 50% 范围溅射的秘法投射物；巨人重击有 35% 范围溅射。敌方每 4 秒评估经济、兵种和战线，使用自己的矿工收入招兵，没有额外金币补贴。

摧毁敌方营地获胜，己方营地被摧毁失败。结算显示战斗时长、击杀、招募数和剩余金币，可重新开始或返回菜单。离开标签页时自动暂停。音量与静音保存在本机 localStorage；存储受限时仍可游玩。

## 美术与显示

六种角色直接使用用户提供的正式静态 PNG，保留外观、装备、颜色和比例。1.1 使用原始纹理的程序化网格动画，实现交替抬脚、手臂与武器摆动、采矿、攻击蓄力与回收、受击和死亡反馈；不是新增手绘逐帧、骨骼动画或 3D 模型。WebGL 使用 Mesh2D，Canvas 环境回退为静态图片。

战场普通单位高 160–175，巨人高 240 设计像素。bottom-center 锚点、按脚底 y 排序、阵营圆环与血条区分双方，敌方水平翻转。

1280×720 固定设计画面，FIT 保持 16:9；手机横屏时主要控件加高，竖屏提示旋转。场景为本项目自绘旷野、远山和堡垒，音效为本地 Web Audio 合成，无外部字体或音频依赖。

| 原文件 | 正式资源 |
| --- | --- |
| 01_miner.png | public/assets/characters/miner.png |
| 02_swordsman.png | public/assets/characters/swordsman.png |
| 03_archer.png | public/assets/characters/archer.png |
| 04_spearman_shield.png | public/assets/characters/spearman.png |
| 05_mage.png | public/assets/characters/mage.png |
| 06_giant.png | public/assets/characters/giant.png |

原始 PNG 按字节保留。素材中腿间等位置的白色残留在首次加载时通过派生 CanvasTexture 清理透明度，不覆盖原图。美术验收基准位于 `docs/reference/character-lineup-reference.png`。

`scripts/setup-assets.py` 仅用于首次从父目录原始素材包复制资源和生成 alpha 边界元数据，已执行。日常安装、运行、构建不需要 Python。

## 工程结构

```text
src/
  game/       Phaser 启动、全局配置、独立于渲染的 BattleModel
  scenes/     Boot、Preload、Menu、Battle、Pause、Result
  entities/   真实角色显示、血条、脚底定位、矿点显示
  systems/    Economy、Spawn、Combat、EnemyAI、Order、Match
  ui/         HUD、RecruitPanel、CommandPanel、自绘场景、画布按钮
  config/     unitConfig、balanceConfig、原始 alpha 边界数据
  types/      兵种、阵营、单位运行状态、对局与投射物类型
  services/   LocalSettings、AudioService、透明纹理预处理
tests/        经济、招募、战斗、AI、暂停及完整对局测试
.github/      main 分支推送时自动测试、构建并部署 Pages
```

业务状态独立于 Phaser Image；界面通过 BattleModel 请求招募和指令，不直接修改金币。对局仅在 `playing` 状态推进，时间使用秒，卡顿时分步推进并限制单帧补偿。死亡单位立即停止业务活动，短暂淡出后清理；命中失效目标的投射物直接销毁。

## 发布

GitHub Pages 使用 GitHub Actions 发布 `dist/`。工作流固定 Node.js 24，使用 `npm ci` 和 lockfile 安装，先运行测试，再构建。Vite `base` 根据仓库名自动设置，素材 URL 从 `import.meta.env.BASE_URL` 生成，支持项目子路径。

推送到 `main` 自动发布。Actions 页面：https://github.com/luan-0328/yellow-war/actions 。根仓库或自定义域名构建可设置 `VITE_BASE_PATH=/`。

## 当前边界

这是第一轮平衡的可玩版本，单一战线、基础位置分离、基础合成音效。没有联机、账号、后端、复杂寻路或真实动作帧。手机布局在浏览器横屏视口验收，真实手机性能与音频兼容仍需设备测试。测试记录见 `docs/verification.md`。
