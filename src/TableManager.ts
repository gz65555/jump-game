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
