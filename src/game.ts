import { Script, Vector3 } from "oasis-engine";
import { RoleScript } from "./RoleScript";
import * as TWEEN from "@tweenjs/tween.js";
import { SceneScript } from "./SceneScript";
import { CameraScript } from "./CameraScript";
import { Table } from "./Table";

enum HitResult {
  EdgeOut,
  Inner,
  Outer,
}

export class GameScript extends Script {
  private roleScript: RoleScript;
  private sceneScript: SceneScript;
  private cameraScript: CameraScript;
  private roleDirection: Vector3 = new Vector3();
  private score = 0;

  onAwake() {
    this.roleScript = this.entity.findByName("role").getComponent(RoleScript);
    this.sceneScript = this.entity.getComponent(SceneScript);
    this.cameraScript = this.entity
      .findByName("camera")
      .getComponent(CameraScript);
    document.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.roleScript.press();
    });
    document.addEventListener("pointerup", (e) => {
      e.preventDefault();
      Vector3.subtract(
        this.sceneScript.targetTable.entity.transform.position,
        this.roleScript.entity.transform.position,
        this.roleDirection
      );
      this.roleScript.release(this.roleDirection);
    });

    this.roleScript.onJumpComplete = () => {
      setTimeout(() => {
        this.checkHitResult();
      }, 300);
    };

    // this.roleScript.subscribeJumpComplete(() => {
    //   setTimeout(() => {
    //     this.checkHitResult();
    //   }, 300);
    // });
  }

  onStart(): void {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.sceneScript.reset();
    this.roleScript.reset();
    this.cameraScript.reset();
    TWEEN.removeAll();
  }

  private checkHitResult() {
    const currentHitResult = this.checkHitWithTable(
      this.sceneScript.currentTable
    );
    if (currentHitResult === HitResult.Inner) {
      return;
    }
    if (currentHitResult === HitResult.Outer) {
      console.log("current outer");
      this.checkTargetTable();
      return;
    }
    if (currentHitResult === HitResult.EdgeOut) {
      console.log("current edge outer");
      this.roleScript.jumpRotate();
    }
  }

  private checkTargetTable() {
    const hitResult = this.checkHitWithTable(this.sceneScript.targetTable);
    if (hitResult === HitResult.Inner) {
      this.onJumpSucceed();
      return;
    }

    if (hitResult === HitResult.Outer) {
      this.roleScript.dieVertical(this.onJumpFail.bind(this));
    } else if (hitResult === HitResult.EdgeOut) {
      this.roleScript.dieRotate(
        this.sceneScript.targetTable,
        this.onJumpFail.bind(this)
      );
    }
  }

  private checkHitWithTable(table: Table) {
    const tablePos = table.entity.transform.position;
    const rolePos = this.roleScript.entity.transform.position;

    const distance = Math.sqrt(
      (tablePos.x - rolePos.x) * (tablePos.x - rolePos.x) +
        (tablePos.z - rolePos.z) * (tablePos.z - rolePos.z)
    );

    if (distance < table.size / 2) {
      return HitResult.Inner;
    }
    if (distance > table.size / 2 + this.roleScript.size / 2) {
      return HitResult.Outer;
    }

    return HitResult.EdgeOut;
  }

  private onJumpSucceed() {
    this.sceneScript.goNextTable();
  }

  private onJumpFail() {
    alert("Game Over");
    this.reset();
  }

  onUpdate(deltaTime: number): void {
    TWEEN.update();
  }
}
