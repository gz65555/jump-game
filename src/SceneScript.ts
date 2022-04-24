import { Entity, Script } from "oasis-engine";
import { TableManager } from "./TableManager";

export class SceneScript extends Script {
  private ground: Entity;
  private tableManager: TableManager;
  onAwake() {
    this.ground = this.entity.createChild("ground");
    this.tableManager = new TableManager(this._engine, this.ground);
  }

  reset() {
    this.ground.clearChildren();
    this.tableManager.createCuboid(-2.5, 0, 0);
    this.tableManager.createCuboid(4.2, 0, 0);
  }
}
