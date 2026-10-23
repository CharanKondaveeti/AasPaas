// Original low-poly illustration. Not surveyed architectural geometry.
import {
  Scene,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  MeshStandardMaterial,
} from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { mkdir, writeFile } from "node:fs/promises";
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((value) => {
      this.result =
        "data:application/octet-stream;base64," +
        Buffer.from(value).toString("base64");
      this.onloadend?.();
    });
  }
};
const scene = new Scene();
scene.name = "Charminar — original stylized miniature";
const stone = new MeshStandardMaterial({ color: 0xdac69f, roughness: 1 }),
  trim = new MeshStandardMaterial({ color: 0xb39b73, roughness: 1 });
function add(g, x, y, z, m = stone) {
  const mesh = new Mesh(g, m);
  mesh.position.set(x, y, z);
  scene.add(mesh);
}
add(new BoxGeometry(30, 1, 30), 0, 0.5, 0, trim);
for (const x of [-11, 11])
  for (const z of [-11, 11]) {
    add(new CylinderGeometry(2, 2.5, 28, 12), x, 15, z);
    for (const y of [13, 22, 29])
      add(new CylinderGeometry(3, 3, 1, 12), x, y, z, trim);
    add(
      new SphereGeometry(2.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      x,
      30,
      z,
    );
    add(new CylinderGeometry(0, 0.5, 3, 8), x, 34, z, trim);
  }
// Open central passages, raised upper gallery, repeated facade piers.
for (const x of [-9, 9])
  for (const z of [-9, 9]) add(new BoxGeometry(5, 12, 5), x, 7, z);
add(new BoxGeometry(22, 3, 22), 0, 14, 0);
for (const v of [-8, -4, 0, 4, 8]) {
  add(new BoxGeometry(1, 5, 1), v, 18, 10);
  add(new BoxGeometry(1, 5, 1), v, 18, -10);
  add(new BoxGeometry(1, 5, 1), 10, 18, v);
  add(new BoxGeometry(1, 5, 1), -10, 18, v);
}
add(new BoxGeometry(24, 1.5, 24), 0, 21, 0, trim);
const result = await new GLTFExporter().parseAsync(scene, { binary: true });
await mkdir("public/models", { recursive: true });
await writeFile("public/models/charminar.glb", Buffer.from(result));
