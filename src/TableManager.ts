import {
  BlinnPhongMaterial,
  Engine,
  Entity,
  MeshRenderer,
  ModelMesh,
  PrimitiveMesh,
} from "oasis-engine";
import { Config } from "./Config";
import { Table } from "./Table";

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

  createCuboid(x: number, y: number, z: number) {
    const cuboid = this.sceneEntity.createChild("cuboid");
    const renderEntity = cuboid.createChild("render");
    renderEntity.transform.setPosition(0, Config.tableHeight / 2, 0);
    cuboid.transform.setPosition(x, y, z);
    const renderer = renderEntity.addComponent(MeshRenderer);
    renderer.mesh = this.cuboidMesh;
    renderer.setMaterial(this.cuboidMaterial);
    return new Table(cuboid, Config.tableSize);
  }

  /** 台子距离 */
  private getRandomDistance() {
    return 3.2 + Math.floor(Math.random() * 7);
  }

  clearAll() {
    this.sceneEntity.clearChildren();
  }
}
