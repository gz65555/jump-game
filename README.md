# 角色创建和角色动画



<img src="https://gw.alipayobjects.com/zos/OasisHub/3bca2bad-edf8-4d90-867f-dc492b4d8bb5/image-20220509173559682.png" alt="image-20220509173559682" style="zoom:50%;" />

在完成场景逻辑之后我们需要把角色放到场景中，这小节主要将如何把角色模型和角色动画创建出来。

## 角色模型

角色制作有两种方式：

1. 使用 Oasis 的 PrimitiveMesh 创建，使用 Tween.js 写角色动画
2. 使用 Blender 或其他 DCC 工具建模和动画制作

我们先对模型进行分解：

<img src="https://gw.alipayobjects.com/zos/OasisHub/4c593c34-2409-4d4e-b48a-5c17966a16a7/image-20220211143703610.png" alt="image-20220211143703610" style="zoom:50%;" />

从上图可以看出，角色由下面四个形状组成：

- 球
- 球（Y 轴压缩）
- 圆柱
- 圆柱

因为模型本身比较简单，这里直接使用 [PrimitiveMesh](https://oasisengine.cn/0.7/api/core/PrimitiveMesh) 创建模型，使用：

- [createSphere](https://oasisengine.cn/0.7/api/core/PrimitiveMesh#createSphere)
- [createCylinder](https://oasisengine.cn/0.7/api/core/PrimitiveMesh#createCylinder)

可以完成对模型的创建。因为动画的缘故我们把角色分成两部分，头部和身体（下面角色动画会提到），本身逻辑非常简单，我们直接看代码吧，添加 `RoleScript.ts`：

```typescript
import {
  BlinnPhongMaterial,
  Material,
  Mesh,
  MeshRenderer,
  PrimitiveMesh,
  Script,
  Entity,
} from "oasis-engine";
import { Config } from "./Config";

export class RoleScript extends Script {
  private bodyEntity: Entity;
  private headEntity: Entity;

  onAwake() {
    this.createRoleModel();
  }

  /**
   * 创建角色模型
   */
  private createRoleModel() {
    const engine = this.engine;
    const material = new BlinnPhongMaterial(engine);
    material.baseColor.setValue(0, 0, 1, 1);

    // 创建角色头部
    const headEntity = this.createRolePart(
      "head",
      PrimitiveMesh.createSphere(engine, 0.3),
      material,
      this.entity
    );
    headEntity.transform.setPosition(0, 1.6, 0);

    // 创建角色身体
    const bodyEntity = this.entity.createChild("body");

    const bottomEntity = this.createRolePart(
      "bottom",
      PrimitiveMesh.createCylinder(engine, 0.2, 0.34, 0.67, 20),
      material,
      bodyEntity
    );

    bottomEntity.transform.setPosition(0, 0.34, 0);

    const middleEntity = this.createRolePart(
      "middle",
      PrimitiveMesh.createCylinder(engine, 0.27, 0.2, 0.43),
      material,
      bodyEntity
    );
    middleEntity.transform.setPosition(0, 0.77, 0);

    const middleSphere = this.createRolePart(
      "middleSphere",
      PrimitiveMesh.createSphere(engine, 0.27),
      material,
      bodyEntity
    );

    middleSphere.transform.setScale(1, 0.54, 1);
    middleSphere.transform.setPosition(0, 1, 0);

    this.bodyEntity = bodyEntity;
    this.headEntity = headEntity;
  }

  /**
   * 创建角色部件
   * @param name - entity 名称
   * @param mesh - mesh
   * @param material - material
   * @param parent - 父 entity
   * @returns 
   */
  private createRolePart(
    name: string,
    mesh: Mesh,
    material: Material,
    parent: Entity
  ) {
    const entity = parent.createChild(name);
    const meshRenderer = entity.addComponent(MeshRenderer);
    meshRenderer.mesh = mesh;
    meshRenderer.setMaterial(material);
    return entity;
  }

  reset() {
    const initPosition = Config.roleInitPosition;
    this.entity.transform.setPosition(
      initPosition[0],
      initPosition[1],
      initPosition[2]
    );
    this.entity.transform.setRotation(0, 0, 0);
  }
}
```

`createRoleModel` 创建了角色的模型，`createRolePart` 创建了角色部件，`reset` 方法设置了角色初始化的位置和旋转角度，这里的 Cylinder 和 Sphere 都是根据实际情况调整的。

我们在 `index.ts` 加上角色：

```typescript
rootEntity.createChild("role").addComponent(RoleScript).reset();
```

即可看到：

<img src="https://gw.alipayobjects.com/zos/OasisHub/0883a8ac-651d-4844-af0d-a9be8f1d97a1/image-20220509173138134.png" alt="image-20220509173138134" style="zoom:50%;" />

角色被放置到场景中了。

## 角色动画

接下来我们来看看角色动画，角色动画分三大类：

- **交互动画**：即用户长按屏幕，角色会有按压和回弹的效果
- **跳跃动画：**根据用户按压时长，角色的抛物线动画及空中旋转
- **失败动画**：若角色未跳到下一个台子上，会直接下落，或者是翻倒的效果。

### 交互动画

#### 按压

按压本质上是一种角色状态，当用户处于按压时，角色切换到被按压状态，在 onUpdate 生命周期里，Body 部分被压缩，头部下降，整体也会有一个下降（由于 Table 也会被压缩）。我们也需要设置一个按压过程中最极限的部分。

<img src="https://gw.alipayobjects.com/zos/OasisHub/402243da-487c-46dd-8a2a-d016192653e7/press.gif" alt="press" style="zoom:50%;" />

我们先添加一个 `RoleStatus` 的枚举变量：

```typescript
enum RoleStatus {
  Idle,
  Pressed,
  Jump,
  Dead,
}
```

并且在 `RoleScript` 里添加状态，并且添加 `press` 方法，：

```typescript
class RoleScript {
	private status: RoleStatus = RoleStatus.Idle;
	
	press() {
		if (this.status === RoleStatus.Idle) {
      this.status = RoleStatus.Pressed;
      this.touchStartTime = Date.now();
    }
  }
}
```

按压开始时也需要记录一下开始的时间，为了后续计算水平和垂直的速度。

需要在 `onUpdate` 生命周期中，执行对 `RoleStatus.Pressed ` 状态进行判断，并且修改当前角色的不同部件的位置或缩放：

```typescript
onUpdate(deltaTime: number): void {
  switch (this.status) {
    case RoleStatus.Pressed: {
      const scale = this.bodyEntity.transform.scale;
      scale.x += 0.0003 * deltaTime;
      if (scale.x > 1.8) {
        scale.x = 1.8;
      }
      scale.z = scale.x;

      scale.y -= 0.0001 * deltaTime;
      if (scale.y < 0.8) {
        scale.y = 0.8;
      }

      const headPosition = this.headEntity.transform.position;
      headPosition.y -= 0.000175 * deltaTime;
      if (headPosition.y < 1.25) {
        headPosition.y = 1.25;
      }
      break;
    }
  }
}
```



#### 回弹

<img src="https://gw.alipayobjects.com/zos/OasisHub/363242b9-4e2b-43e5-8f2b-e70cfd07575a/rebounce.gif" alt="rebounce" style="zoom:50%;" />

(动画效果已经放慢)

回弹动画非常简单，记录好 Body 和 Head 初始状态，使用 Tween 动画还原初始状态即可：

```typescript
reBounce() {
  const scale = this.bodyEntity.transform.scale;
  const position = this.headEntity.transform.position;

  this.reBounceTween && remove(this.reBounceTween);

  this.reBounceTween = new Tween({
    scaleX: scale.x,
    scaleY: scale.y,
    scaleZ: scale.z,
    positionY: position.y,
  })
    .to({ scaleX: 1, scaleY: 1, scaleZ: 1, positionY: 9.5 }, 200)
    .onUpdate((obj) => {
    scale.setValue(obj.scaleX, obj.scaleY, obj.scaleZ);
    position.y = obj.positionY;
    this.headEntity.transform.position = position;
    this.bodyEntity.transform.scale = scale;
  })
    .easing(Easing.Elastic.Out)
    .start();
}
```

本质上只有 Body 的 scale 和 Head 的 position.y 发生了改变，200 毫秒把角色还原回去就行。

### 跳跃动画

<img src="https://gw.alipayobjects.com/zos/OasisHub/c30989a8-2766-4622-a0ea-4d1ae83c1961/jump.gif" alt="jump" style="zoom:50%;" />

跳跃部分本质上是抛物线运动和旋转。

抛物线运动在水平方向是匀速直接运动，垂直方向是匀加速直线运动。我们需要根据按压的时长，计算出一个水平初速度和垂直初速度。再设定一个重力加速度去控制下落即可。

首先我们需要一个计算初速度的方法，根据时间计算出水平和垂直的速度：

```typescript
private calculateVelocity(duration: number) {
  this.velocityHorizontal = Math.min((0.02 / 2000) * duration, 0.02);
  this.velocityVertical = Math.min((0.04 / 2000) * duration, 0.04);
}
```

同样也在 `onUpdate` 方法里处理跳跃状态：

```typescript
onUpdate(dt: number) {
  switch (this.status) {
    case RoleStatus.Pressed:
      ...
      case RoleStatus.Jump: {
        const translateVertical = this.velocityVertical * dt;
        const translateHorizontal = this.velocityHorizontal * dt;
        this.velocityVertical = this.velocityVertical - this.gravity * dt;
        const pos = this.entity.transform.position;
        this.entity.transform.setPosition(
          pos.x + translateHorizontal * this.translateDirection.x,
          pos.y + translateY,
          pos.z + translateHorizontal * this.translateDirection.z
        );
        break;
      }
  }
}
```

其中需要注意判断降落到最低点，这里只是计算了一下 jumpTime（跳跃经过的时间）和 jumpTotalTime（跳跃总时间），如果超过了 jumpTotalTime，角色状态切换，角色位置固定。然后进入到 to be or not to be 的判断之中。

旋转非常简单，我们水平距离计算出跳跃的总时间，在时间内使用 Tween 旋转两圈。还有需要计算的一点就是旋转方向，这个和跳跃的方向有关，这里我们先放到参数里。根据目标方向和上方向的叉乘结果得到旋转的方向。

```typescript
jumpRotate(jumpTotalTime: number, direction: Vector3) {
  const { rotateAxis } = this;
  rotateAxis.setValue(direction.x, 0, direction.z);
  Vector3.cross(rotateAxis, upVec, rotateAxis);

  const quat = this.entity.transform.rotationQuaternion;
  new Tween({
    rotation: 0,
  })
    .to({ rotation: -360 }, jumpTotalTime * 1000)
    .onUpdate((obj) => {
    Quaternion.rotationAxisAngle(
      rotateAxis,
      (Math.PI * obj.rotation) / 180,
      quat
    );
    this.entity.transform.rotationQuaternion = quat;
  })
    .onComplete(() => {
    this.entity.transform.setRotation(0, 0, 0);
  })
    .easing(Easing.Linear.None)
    .start();
}
```

其中 `upVec` 就是 `new Vector3(0, 1, 0)` 。

### 失败动画

#### 直接落地

<img src="https://gw.alipayobjects.com/zos/OasisHub/532b8db5-7733-44c4-8dc7-1f10a4ae7775/dieVerticle.gif" alt="dieVerticle" style="zoom:50%;" />

#### 倾斜倒地

<img src="https://gw.alipayobjects.com/zos/OasisHub/e2dedf42-3d82-4fd9-b2c6-7e6f93b5f3e2/dieRotate.gif" alt="dieRotate" style="zoom:50%;" />

倾斜倒地需要计算的会更复杂一些，需要拿到 Table 的坐标和当前角色的坐标，才能知道是往哪个方位倾倒。

```typescript
const { rotateAxis } = this;
this.status = RoleStatus.Dead;
const tablePos = table.entity.transform.position;
const rolePos = this.entity.transform.position;
rotateAxis.setValue(rolePos.x - tablePos.x, 0, rolePos.z - tablePos.z);
Vector3.cross(rotateAxis, upVec, rotateAxis);
const quat = this.entity.transform.rotationQuaternion;
new Tween({ rotation: 0 })
  .to({ rotation: -120 }, 800)
  .onUpdate((obj) => {
  Quaternion.rotationAxisAngle(
    rotateAxis,
    (Math.PI * obj.rotation) / 180,
    quat
  );
  this.entity.transform.rotationQuaternion = quat;
})
  .start();
```

同样也需要使用到叉乘去找到旋转平面的法线。理想情况下最好还是找到角色和 Table 相接的点作为旋转的 pivot，但是这里做得不算太严谨，还是以角色底部中心点作为旋转点，简化了一点运算。

这样，角色动画就基本完成了。BTW，上面很多动画效果都用到了 direction，本身的 direction 的向量计算非常简单，使用 Target Table 的 position 和 当前角色的 position 相减就可以得到。

我们在释放的时候可以组合调用回弹、旋转、跳跃等动画，同时我们需要计算跳跃的总时间得出旋转的时长：

```typescript
release(direction: Vector3) {
  if (this.status === RoleStatus.Pressed) {
    this.translateDirection
      .setValue(direction.x, direction.y, direction.z)
      .normalize();
    this.calculateVelocity(Date.now() - this.touchStartTime);
    this.jumpTime = 0;
    this.jumpTotalTime = this.calculateTotalTime(
      this.velocityVertical,
      Config.gravity,
      Math.abs(this.entity.transform.position.y - Config.groundY)
    );
    this.reBounce();
    this.jumpRotate();
    this.status = RoleStatus.Jump;
  }
}

private calculateTotalTime(v: number, g: number, h: number) {
  const moreTime = (-v + Math.sqrt(v * v - 2 * g * -h)) / g;
  return (v / g) * 2 - moreTime;
}
```

其中计算总时长是一元二次方程的求解公式。

对于失败动画，涉及到游戏逻辑部分，先不在本小节展开。

## 最后

本小节内容较多，部分内容涉及一点数学运算，有一元二次方程求解，叉乘的运用。重力和速度的调整非常麻烦，详细可以参考代码：https://github.com/gz65555/jump-game/tree/feat/role







