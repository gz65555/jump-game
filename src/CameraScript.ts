import { Tween } from "@tweenjs/tween.js";
import { Camera, Script, Vector3 } from "oasis-engine";
import { Table } from "./Table";

export class CameraScript extends Script {
  onAwake(): void {
    // init camera
    const { entity } = this;
    const camera = entity.addComponent(Camera);
    camera.isOrthographic = true;
    camera.nearClipPlane = 0.1;
    camera.farClipPlane = 1000;
    this.reset();
  }

  reset() {
    this.entity.transform.setPosition(-100, 100, 100);
    this.entity.transform.lookAt(new Vector3());
  }

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
}
