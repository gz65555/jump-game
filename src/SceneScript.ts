import { Entity, Script } from "oasis-engine";
import { CameraScript } from "./CameraScript";
import { Table } from "./Table";
import { TableManager } from "./TableManager";
import * as TWEEN from "@tweenjs/tween.js";

export class SceneScript extends Script {
  private ground: Entity;
  private tableManager: TableManager;
  // private tarTargetTable
  public _currentTable: Table;
  public _targetTable: Table;
  private cameraScript: CameraScript;

  get currentTable() {
    return this._currentTable;
  }

  get targetTable() {
    return this._targetTable;
  }

  onAwake() {
    this.ground = this.entity.createChild("ground");
    this.tableManager = new TableManager(this._engine, this.ground);
    const cameraEntity = this.entity.createChild("camera");
    this.cameraScript = cameraEntity.addComponent(CameraScript);
    window["scene"] = this;
  }

  goNextTable() {
    this._currentTable = this.targetTable;
    this._targetTable = this.tableManager.createNextTable(this.currentTable);
    this.targetTable.show();
    this.cameraScript.updateCameraPosition(this.currentTable, this.targetTable);
  }

  reset() {
    this.ground.clearChildren();
    this._currentTable = this.tableManager.createCuboid(-2.5, 0, 0);
    this._targetTable = this.tableManager.createCuboid(4.2, 0, 0);
  }

  onUpdate(deltaTime: number): void {
    TWEEN.update();
  }
}
