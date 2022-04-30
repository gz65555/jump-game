import { Easing, Tween } from "@tweenjs/tween.js";
import { Entity } from "oasis-engine";

export class Table {
  constructor(public entity: Entity, public size: number) {}

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
}
