# 跳一跳开发

《跳一跳》是微信小游戏里第一款制作精良，也是非常受大家喜爱的游戏。这里以一个跳一跳 MVP（最简可行版本） 版本为例，让大家了解《如何用 Oasis 开发一款 Web 3D 游戏》这一过程。

首先，我们需要分析 跳一跳的 MVP 版本有哪些内容：

<img src="https://gw.alipayobjects.com/zos/OasisHub/0e1da064-1a75-442c-b209-96f9fb35d38d/image-20220411200354354.png" alt="image-20220411200354354" style="zoom:20%;" />

我们把核心的部分分成三大部分，**场景**、**角色**和**游戏逻辑**，后面的教程会以这三大部分为主，实现一个跳一跳的最小可用版本（并非完整的游戏）。

第一期我们准备制作最基本的场景，完成灯光，相机，基本底座的摆放。

在具体进入开发之前，我们需要先把整个项目工程搭建好。

## 工程搭建

由 oasisengine.cn 官网可以知道，使用 create-oasis-app 创建项目。

使用命令的第一步需要安装 Node.js。如果已安装 Node.js(version >= 12.0.0) 可以执行命令创建 oasis 模板：

```shell
npm init @oasis-engine/oasis-app
```

因为我们无需额外开发前端部分，所以直接使用 Vanilla 模板即可。下面是调用命令的过程。

<img src="https://gw.alipayobjects.com/zos/OasisHub/93ac04b6-4319-455d-9258-3cfd0041291a/init.gif" alt="init" style="zoom: 80%;" />

当执行完成后，我们进入到项目中的 terminal 里，执行：

```
npm install
```

在安装完依赖后再使用：

```shell
npm run dev
```

启动 dev 服务器，过程如下图所示：

<img src="https://gw.alipayobjects.com/zos/OasisHub/c97211af-5f18-46ba-8966-166cba9424df/init-install.gif" alt="init-install" style="zoom:80%;" />

再打开 http://localhost:3000 即可看到：

![image-20220414170930449](https://gw.alipayobjects.com/zos/OasisHub/c267e5c1-7ab7-430d-ad96-8328a4839544/image-20220414170930449.png)

说明工程搭建已经完成。

## 基本场景搭建

### 引擎和场景初始化

我们用 IDE 打开项目，找到 `/src/index.ts`

如下面代码所示：

```typescript
import { Camera, Vector3, WebGLEngine, DirectLight } from "oasis-engine";

// 初始化引擎
const engine = new WebGLEngine("canvas");
// 根据页面设置 canvas 大小
engine.canvas.resizeByClientSize();

const zeroVector = new Vector3(0, 0, 0);

// 设置背景色
const scene = engine.sceneManager.activeScene;
scene.background.solidColor.setValue(208 / 255, 210 / 255, 211 / 255, 1);
scene.ambientLight.diffuseSolidColor.setValue(0.5, 0.5, 0.5, 1);

// 创建根节点
const rootEntity = scene.createRootEntity();
const cameraEntity = rootEntity.createChild("camera");
cameraEntity.transform.setPosition(-100, 100, 100);
const camera = cameraEntity.addComponent(Camera);

// 初始化相机
camera.isOrthographic = true;
cameraEntity.transform.lookAt(zeroVector);

// 初始化灯光
const directLightEntity = rootEntity.createChild("directLight");
const directLight = directLightEntity.addComponent(DirectLight);
directLight.intensity = 0.5;
directLightEntity.transform.setPosition(10, 30, 20);
directLightEntity.transform.lookAt(zeroVector);

engine.run();
```

此段代码创建了引擎，场景，并且初始化了相机，灯光。

相机使用正交相机，朝向原点。

直接光也设置为朝向原点。

完成以上步骤可以场景里还是一片灰色，我们来给场景添加底座生成和相机移动的逻辑

### 场景底座初始化

我们先新建一个 `SceneScript.ts` 的脚本的 `TableManager` 的文件 ，并且在 `rootEntity` 上添加：

```typescript
const sceneScript = rootEntity.addComponent(SceneScript);
```

在 `SceneScript` 的 `onAwake` 生命周期中创建一个 ground entity，用来摆放跳一跳的底座。

同时创建 `TableManager` 对象来控制底座的生成。

```typescript
onAwake() {
  this.ground = this.entity.createChild("ground");
  this.tableManager = new TableManager(this._engine, this.ground);
}
```

我们在 `TableManager` 里创建不同材质(Material)和网格(Mesh)的 Table，因为是 MVP 版本，我这里只用一个红色的立方体 Table 作为示意：

```typescript
import {
  BlinnPhongMaterial,
  Engine,
  Entity,
  MeshRenderer,
  ModelMesh,
  PrimitiveMesh,
} from "oasis-engine";
import { Config } from "./Config";

export class TableManager {
  private cuboidMesh: ModelMesh;
  private cuboidMaterial: BlinnPhongMaterial;

  constructor(engine: Engine, private sceneEntity: Entity) {
    this.cuboidMesh = PrimitiveMesh.createCuboid(
      engine,
      Config.tableSize,
      Config.tableHeight,
      Config.tableSize
    );
    this.cuboidMaterial = new BlinnPhongMaterial(engine);
    this.cuboidMaterial.baseColor.setValue(1, 0, 0, 1);
  }

  createCuboid(x: number, y: number, z: number) {
    const cuboid = this.sceneEntity.createChild("cuboid");
    const renderEntity = cuboid.createChild("render");
    renderEntity.transform.setPosition(0, Config.tableHeight / 2, 0);
    cuboid.transform.setPosition(x, y, z);
    const renderer = renderEntity.addComponent(MeshRenderer);
    renderer.mesh = this.cuboidMesh;
    renderer.setMaterial(this.cuboidMaterial);
    return { entity: cuboid, size: Config.tableSize };
  }

  clearAll() {
    this.sceneEntity.clearChildren();
  }
}
```

我们可以看到上面的的 `tableSize` 和 `tableHeight` 都是在 `GameConfig` 里定义的，我们也需要创建一个 `Config.ts` 来设置游戏配置：

```typescript
export module Config {
  export const tableHeight = 5 / 3;
  export const tableSize = 8 / 3;
}
```

我们再到 `SceneScript` 中添加 `reset` 方法：

```typescript
reset() {
  this.ground.clearChildren();
  this.tableManager.createCuboid(-2.5, 0, 0);
  this.tableManager.createCuboid(4.2, 0, 0);
}
```

`reset` 方法是之后每次游戏开始时和结束后都需要调用的方法。

上面的几个数值都是实际开发中调试出的结果，相对来说比较接近真实的游戏。

我们在 `index.ts` 调用 `sceneScript.reset()` 即可看到效果：

<img src="https://gw.alipayobjects.com/zos/OasisHub/421c96e6-279d-45f8-8a29-c7ea6fe6363e/image-20220424111857180.png" alt="image-20220424111857180" style="zoom:50%;" />

那么本次的教程的目的已经完成，下一期会带来场景逻辑部分：底座生成和相机移动的部分。

本次教程代码可参考 [feat/init](https://github.com/gz65555/jump-game/tree/feat/init) 分支。
