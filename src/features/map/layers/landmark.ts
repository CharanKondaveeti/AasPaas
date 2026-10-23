import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type Map,
} from "maplibre-gl";
import {
  Camera,
  Scene,
  HemisphereLight,
  DirectionalLight,
  WebGLRenderer,
  Matrix4,
  Vector3,
  Mesh,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
/** Original stylized miniature, anchored to UNESCO's Charminar coordinates. */
export function landmarkLayer(): CustomLayerInterface {
  const scene = new Scene(),
    camera = new Camera();
  let renderer: WebGLRenderer | undefined,
    map: Map | undefined,
    disposed = false;
  const origin = MercatorCoordinate.fromLngLat([78.474444, 17.361425], 0),
    scale = origin.meterInMercatorCoordinateUnits();
  const modelMatrix = new Matrix4()
    .makeTranslation(origin.x, origin.y, origin.z)
    .scale(new Vector3(scale, -scale, scale))
    .multiply(new Matrix4().makeRotationX(Math.PI / 2));
  return {
    id: "charminar-miniature",
    type: "custom",
    renderingMode: "3d",
    onAdd(current, gl) {
      map = current;
      scene.add(new HemisphereLight(0xffffff, 0x6a8062, 2.4));
      const sun = new DirectionalLight(0xffefd3, 2);
      sun.position.set(20, 50, 40);
      scene.add(sun);
      renderer = new WebGLRenderer({
        canvas: current.getCanvas(),
        context: gl as WebGL2RenderingContext,
        antialias: true,
      });
      renderer.autoClear = false;
      new GLTFLoader().load(
        "/models/charminar.glb",
        (gltf) => {
          if (disposed) {
            gltf.scene.traverse((o) => {
              if (o instanceof Mesh) {
                o.geometry.dispose();
                const materials = Array.isArray(o.material)
                  ? o.material
                  : [o.material];
                materials.forEach((m) => m.dispose());
              }
            });
            return;
          }
          scene.add(gltf.scene);
          map?.triggerRepaint();
        },
        undefined,
        () => {
          /* Illustrated map marker remains available if the optional model fails. */
        },
      );
    },
    render(_gl, args) {
      if (!renderer || !map || map.getZoom() < 16) return;
      camera.projectionMatrix = new Matrix4()
        .fromArray(args.defaultProjectionData.mainMatrix)
        .multiply(modelMatrix);
      renderer.resetState();
      renderer.render(scene, camera);
    },
    onRemove() {
      disposed = true;
      scene.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose();
          const materials = Array.isArray(o.material)
            ? o.material
            : [o.material];
          materials.forEach((m) => m.dispose());
        }
      });
      renderer?.dispose();
      scene.clear();
    },
  };
}
