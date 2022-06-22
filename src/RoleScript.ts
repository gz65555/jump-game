import { Easing, remove, Tween } from "@tweenjs/tween.js";
import {
  BlinnPhongMaterial,
  Material,
  Mesh,
  MeshRenderer,
  PrimitiveMesh,
  Script,
  Entity,
  Vector3,
  Quaternion,
} from "oasis-engine";
import { Config } from "./Config";
import { Table } from "./Table";

enum RoleStatus {
  Idle,
  Pressed,
  Jump,
  Dead,
}

const upVec = new Vector3(0, 1, 0);
const rotateAxis = new Vector3(0, 1, 0);
export class RoleScript extends Script {
  set onJumpComplete(func: Function) {
    this._onJumpComplete = func;
  }

  readonly size = 0.1;
  private bodyEntity: Entity;
  private headEntity: Entity;
  private status: RoleStatus = RoleStatus.Idle;
  private rotateAxis = new Vector3(0, 1, 0);
  private velocityVertical = 0;
  private velocityHorizontal = 0;
  private reBounceTween: Tween<any>;
  private touchStartTime: number;
  private jumpTime: number;
  private jumpTotalTime: number;
  private translateDirection: Vector3 = new Vector3();
  private _onJumpComplete: Function;

  press() {
    if (this.status === RoleStatus.Idle) {
      this.status = RoleStatus.Pressed;
      this.touchStartTime = Date.now();
    }
  }

  release(direction: Vector3) {
    if (this.status === RoleStatus.Pressed) {
      const duration = Date.now() - this.touchStartTime;
      this.translateDirection
        .setValue(direction.x, direction.y, direction.z)
        .normalize();
      this.calculateVelocity(duration);
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

  jumpRotate() {
    const direction = this.translateDirection;
    const { rotateAxis, jumpTotalTime } = this;
    rotateAxis.setValue(direction.x, 0, direction.z);
    Vector3.cross(rotateAxis, upVec, rotateAxis);

    const quat = this.entity.transform.rotationQuaternion;
    new Tween({
      rotation: 0,
    })
      .to({ rotation: -360 }, jumpTotalTime)
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

  dieRotate(table: Table, onComplete: Function) {
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
      .onComplete(onComplete as any)
      .start();
  }

  dieVertical(onComplete: Function) {
    this.status = RoleStatus.Dead;
    new Tween({ y: Config.groundY })
      .to({ y: -0.5 }, 800)
      .onUpdate((obj) => {
        const pos = this.entity.transform.position;
        pos.y = obj.y;
        this.entity.transform.position = pos;
      })
      .onComplete(onComplete as any)
      .start();
  }

  reset() {
    const initPosition = Config.roleInitPosition;
    this.entity.transform.setPosition(
      initPosition[0],
      initPosition[1],
      initPosition[2]
    );
    this.status = RoleStatus.Idle;
    this.entity.transform.setRotation(0, 0, 0);
  }

  onAwake() {
    window["role"] = this;
    this.createRoleModel();
  }

  onUpdate(deltaTime: number): void {
    switch (this.status) {
      case RoleStatus.Pressed: {
        const scale = this.bodyEntity.transform.scale;
        scale.x += 0.0006 * deltaTime;
        if (scale.x > 1.8) {
          scale.x = 1.8;
        }
        scale.z = scale.x;

        scale.y -= 0.0002 * deltaTime;
        if (scale.y < 0.8) {
          scale.y = 0.8;
        }

        const headPosition = this.headEntity.transform.position;
        headPosition.y -= 0.00035 * deltaTime;
        if (headPosition.y < 1.25) {
          headPosition.y = 1.25;
        }
        break;
      }
      case RoleStatus.Jump: {
        if (this.jumpTime > this.jumpTotalTime) {
          this.status = RoleStatus.Idle;
          this.entity.transform.position.y = Config.groundY;
          this._onJumpComplete && this._onJumpComplete();
          return;
        }
        const translateVertical = this.velocityVertical * deltaTime;
        const translateHorizontal = this.velocityHorizontal * deltaTime;
        this.velocityVertical =
          this.velocityVertical - Config.gravity * deltaTime;
        this.entity.transform.position.y += translateVertical;
        this.entity.transform.position.x +=
          translateHorizontal * this.translateDirection.x;
        this.entity.transform.position.z +=
          translateHorizontal * this.translateDirection.z;
        this.jumpTime += deltaTime;
        break;
      }
    }
  }

  private reBounce() {
    const scale = this.bodyEntity.transform.scale;
    const position = this.headEntity.transform.position;

    this.reBounceTween && remove(this.reBounceTween);

    this.reBounceTween = new Tween({
      scaleX: scale.x,
      scaleY: scale.y,
      scaleZ: scale.z,
      positionY: position.y,
    })
      .to({ scaleX: 1, scaleY: 1, scaleZ: 1, positionY: 1.6 }, 200)
      .onUpdate((obj) => {
        scale.setValue(obj.scaleX, obj.scaleY, obj.scaleZ);
        this.headEntity.transform.position.y = obj.positionY;
        this.bodyEntity.transform.scale = scale;
      })
      .easing(Easing.Elastic.Out)
      .start();
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

  private calculateTotalTime(v: number, g: number, h: number) {
    const moreTime = (-v + Math.sqrt(v * v - 2 * g * -h)) / g;
    return (v / g) * 2 - moreTime;
  }

  private calculateVelocity(duration: number) {
    // duration = 80;
    this.velocityHorizontal = duration / 36000;
    this.velocityVertical = 0.025 + duration / 100000;
  }
}
