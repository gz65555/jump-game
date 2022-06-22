import { Vector3, WebGLEngine, DirectLight } from "oasis-engine";
import { GameScript } from "./game";
import { RoleScript } from "./RoleScript";
import { SceneScript } from "./SceneScript";

const engine = new WebGLEngine("canvas");
engine.canvas.resizeByClientSize();

document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

const zeroVector = new Vector3(0, 0, 0);

// 设置背景色
const scene = engine.sceneManager.activeScene;
scene.background.solidColor.setValue(208 / 255, 210 / 255, 211 / 255, 1);
scene.ambientLight.diffuseSolidColor.setValue(0.5, 0.5, 0.5, 1);

const rootEntity = scene.createRootEntity();
rootEntity.addComponent(SceneScript);
// sceneScript.reset();

rootEntity.createChild("role").addComponent(RoleScript);

const gameScript = rootEntity.addComponent(GameScript);
gameScript.reset();

const directLightEntity = rootEntity.createChild("directLight");
const directLight = directLightEntity.addComponent(DirectLight);
directLight.intensity = 0.5;
directLightEntity.transform.setPosition(10, 30, 20);
directLightEntity.transform.lookAt(zeroVector);

engine.run();
