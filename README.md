# 场景逻辑

场景逻辑主要是 Table 的生成逻辑，当跳一跳角色一直往前跳动时，新的 Table 不断的生成，镜头也随之移动，完成这几点之后效果如下所示：

<img src="https://gw.alipayobjects.com/zos/OasisHub/f266060e-e852-44a2-a73e-63336f0b1aac/Jump-2.gif" alt="Jump-2" style="zoom:50%;" />



接下来我就带大家完成这个效果。



## 重构代码

随着逻辑的递增，代码的重构是不断的。为了更好地实现这样的效果，我们需要先把一小部分代码重构。

首先新增 `Table.ts` 文件，把 Table 的相关部分都往这里迁移：

```typescript
import { Easing, Tween } from "@tweenjs/tween.js";
import { Entity } from "oasis-engine";

export class Table {
  constructor(public entity: Entity, public size: number) {}
}

```

`TableManager.ts` 里的 `createCuboid` 方法修改成返回 `Table`：

```typescript
createCuboid(x: number, y: number, z: number) {
  ...
  return new Table(cuboid, Config.tableSize);
}
```

为之后 Table 的统一操作做一些准备。



第二是把 Camera 的创建代码迁移到 `SceneScript` 内：

```typescript
onAwake() { 
	const cameraEntity = this.entity.createChild("camera");
	this.cameraScript = cameraEntity.addComponent(CameraScript);
}
```

并且通过 `CameraScript.ts` 去初始化 Camera 的参数：

```typescript
import { Camera, Script, Vector3 } from "oasis-engine";

export class CameraScript extends Script {
  onAwake(): void {
    // init camera
    const { entity } = this;
    const camera = entity.addComponent(Camera);
    camera.isOrthographic = true;
    camera.nearClipPlane = 0.1;
    camera.farClipPlane = 1000;
    entity.transform.setPosition(-100, 100, 100);
    entity.transform.lookAt(new Vector3());
  }
}

```

这样我们就把代码更加结构化。我们可以开始新功能代码编写。



## 下一个 Table

我们要实现下一个 Table 的功能，先对此进行拆解，第一步是新 Table 的生成，第二步是镜头的移动。

在 `SceneScript` 中加上：

```typescript
goNextTable() {
  // 新 Table 的生成
  this.tableManager.createNextTable();
  // 镜头移动
  this.cameraScript.updateCameraPosition();
}
```



### 新 Table 的生成

新 Table 的生成是基于当前 Table 的位置，向前或者是向左随机一段距离创建一个新的。

那我们先在 `TableManager.ts` 里加上方法 `createNextTable()`，因为是基于当前 Table 创建的，所以参数需要传入一个 `Table`：

```typescript
createNextTable(currentTable: Table) {
  const currentPosition = currentTable.entity.transform.position;
  if (Math.random() > 0.5) {
    const nextX = currentPosition.x + this.getRandomDistance();
    return this.createCuboid(nextX, currentPosition.y, currentPosition.z);
  } else {
    const nextZ = currentPosition.z - this.getRandomDistance();
    return this.createCuboid(currentPosition.x, currentPosition.y, nextZ);
  }
}
```

我们目前简化一下，50% 概率往前，50% 概率往左。再根据当前坐标，加一个随机距离。随机一段距离的代码也很简单：

```typescript
/**  Table 距离 */
private getRandomDistance() {
  return 3.2 + Math.floor(Math.random() * 7);
}
```

根据实际情况调整一下参数就行了。



### 相机的移动

相机的移动是根据当前 Table 和下一个 Table 的位置来定的，因为需要看到两个 Table，所以相机应当 lookAt 两个 Table 中间的位置，只需要在原始位置的基础上加上这个中间位置即可。

我们在 CameraScript 中加入方法 ：

```typescript
 updateCameraPosition(currentTable: Table, nextTable: Table) {
   const currentTablePosition = currentTable.entity.transform.position;
   const nextTablePosition = nextTable.entity.transform.position;
   this.entity.transform.setPosition(
     (nextTablePosition.x + currentTablePosition.x) / 2 - 100,
     (nextTablePosition.y + currentTablePosition.y) / 2 + 100,
     (nextTablePosition.z + currentTablePosition.z) / 2 + 100
   );
 }
```



### Scene 脚本修改

在相机移动和新 Table 生成的地方，都依赖于 `currentTable` 和 `targetTable` 两个对象，所以我们在 `SceneScript` 需要添加对当前和下一个 Table 的管理。

在初始化的方法里，先缓存开始的 `currentTable` 和 `targetTable`：

```typescript
reset() {
  this.ground.clearChildren();
  this.currentTable = this.tableManager.createCuboid(-2.5, 0, 0);
  this.targetTable = this.tableManager.createCuboid(4.2, 0, 0);
}
```

在到 `goNextTable` 方法里加上 current 和 target 的转换：

```typescript
goNextTable() {
  this.currentTable = this.targetTable;
  this.targetTable = this.tableManager.createNextTable(this.currentTable);
  this.cameraScript.updateCameraPosition(this.currentTable, this.targetTable);
}
```



这样就可以完成了基本的场景逻辑，每次调用 `goNextTable` 方法，都会切换到新的 Table。但是作为一款游戏还少了非常重要的一部分，就是动画效果。



## 添加动画效果

这款游戏里用的动画大部分都比较简单，只需要使用简单缓动动画就可以实现，我们需要先安装 `tween.js` 来实现镜头移动和 Table 落下的效果。（关于 Tween.js 详细文档可以查看官网）

```shell
npm install @tweenjs/tween.js --save
```



我们先暂时在 `SceneScript` 添加 `Tween` 的更新：

```typescript
...
import * as TWEEN from "@tweenjs/tween.js";

export class SceneScript extends Script {
  ...
	onUpdate() {
    TWEEN.update();
  }
}
```



### 镜头移动效果

我们修改 `TableScript` 的 `updateCameraPosition` 方法：

```typescript
updateCameraPosition(currentTable: Table, nextTable: Table) {
  const currentTablePosition = currentTable.entity.transform.position;
  const nextTablePosition = nextTable.entity.transform.position;
  new Tween(this.entity.transform.position)
    .to(
    {
      x: (nextTablePosition.x + currentTablePosition.x) / 2 - 100,
      y: (nextTablePosition.y + currentTablePosition.y) / 2 + 100,
      z: (nextTablePosition.z + currentTablePosition.z) / 2 + 100,
    },
    800
  )
    .start()
    .onUpdate(() => {
    const pos = this.entity.transform.position;
    this.entity.transform.position = pos;
  });
}
```

这样就会把 Camera 的位置在 800ms 内线性移动到目标位置。



### Table 下落

在 `Table.ts` 中添加 `show` 方法：

```typescript
show() {
  const pos = this.entity.transform.position;
  pos.y = 3.5;
  this.entity.transform.position = pos;
  new Tween({ posY: this.entity.transform.position.y })
    .to({ posY: 0 }, 800)
    .onUpdate((obj) => {
    const pos = this.entity.transform.position;
    pos.y = obj.posY;
    this.entity.transform.position = pos;
  })
    .easing(Easing.Quartic.In)
    .start();
}
```

同时在 `TableManager` 里修改 `createNextTable` 方法：

```typescript
createNextTable(currentTable: Table) {
  const currentPosition = currentTable.entity.transform.position;
  let table: Table;
  if (Math.random() > 0.5) {
    const nextX = currentPosition.x + this.getRandomDistance();
    table = this.createCuboid(nextX, currentPosition.y, currentPosition.z);
  } else {
    const nextZ = currentPosition.z - this.getRandomDistance();
    table = this.createCuboid(currentPosition.x, currentPosition.y, nextZ);
  }
  table.show();
  return table;
}
```

在创建下一个 Table 时先调用 `table.show()` ，这样就会产生一个下落的效果。



经过上述一系列操作之后，我们就实现了开始的效果，下一章会带来角色的创建和角色动画，敬请期待。本小节代码可以参考：https://github.com/gz65555/jump-game/tree/feat/scene-logic