import { Entity, Script } from "oasis-engine";
import { CameraScript } from "./CameraScript";
import { Table } from "./Table";
import { TableManager } from "./TableManager";
import * as TWEEN from "@tweenjs/tween.js";

export class SceneScript extends Script {
  private ground: Entity;
  private tableManager: TableManager;
  // private tarTargetTable
  private currentTable: Table;
  private targetTable: Table;
  private cameraScript: CameraScript;

  onAwake() {
    this.ground = this.entity.createChild("ground");
    this.tableManager = new TableManager(this._engine, this.ground);
    const cameraEntity = this.entity.createChild("camera");
    this.cameraScript = cameraEntity.addComponent(CameraScript);
    window["scene"] = this;
  }

  goNextTable() {
    this.currentTable = this.targetTable;
    this.targetTable = this.tableManager.createNextTable(this.currentTable);
    this.targetTable.show();
    this.cameraScript.updateCameraPosition(this.currentTable, this.targetTable);
  }

  reset() {
    this.ground.clearChildren();
    this.currentTable = this.tableManager.createCuboid(-2.5, 0, 0);
    this.targetTable = this.tableManager.createCuboid(4.2, 0, 0);
  }

  onUpdate(deltaTime: number): void {
    TWEEN.update();
  }
}
