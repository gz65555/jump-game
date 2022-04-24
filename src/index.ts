import {
  Camera,
  Vector3,
  WebGLEngine,
  DirectLight,
  MeshRenderer,
  PrimitiveMesh,
  UnlitMaterial,
} from "oasis-engine";
import { SceneScript } from "./SceneScript";

const engine = new WebGLEngine("canvas");
engine.canvas.resizeByClientSize();

const zeroVector = new Vector3(0, 0, 0);

// 设置背景色
const scene = engine.sceneManager.activeScene;
window["scene"] = scene;
scene.background.solidColor.setValue(208 / 255, 210 / 255, 211 / 255, 1);
scene.ambientLight.diffuseSolidColor.setValue(0.5, 0.5, 0.5, 1);

const rootEntity = scene.createRootEntity();
const cameraEntity = rootEntity.createChild("camera");
const camera = cameraEntity.addComponent(Camera);
const sceneScript = rootEntity.addComponent(SceneScript);
const renderer = rootEntity.addComponent(MeshRenderer);
renderer.mesh = PrimitiveMesh.createCuboid(engine);
sceneScript.reset();

// init camera
camera.isOrthographic = true;
camera.nearClipPlane = 0.1;
camera.farClipPlane = 1000;
cameraEntity.transform.setPosition(-100, 100, 100);
cameraEntity.transform.lookAt(zeroVector);

const directLightEntity = rootEntity.createChild("directLight");
const directLight = directLightEntity.addComponent(DirectLight);
directLight.intensity = 0.5;
directLightEntity.transform.setPosition(10, 30, 20);
directLightEntity.transform.lookAt(zeroVector);

engine.run();
