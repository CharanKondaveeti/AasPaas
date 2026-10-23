"use client";
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Map as LibreMap, GeoJSONSource, Marker } from "maplibre-gl";
import { LocateFixed, Plus, Minus, Compass, RotateCcw } from "lucide-react";
import { CITY_CENTER, type Place, type Bounds } from "@/lib/types";
import { loadCityStyle, applyCityPalette, applyBushyGreenTexture, GALLI_BUSH_PATTERN_ID } from "../layers/style";
import { isParkPlace, loadGeneratedScenery } from "../layers/scenery";
import { GREENERY_ASSETS, greeneryImagePath } from "../layers/greeneryAssets";
import { iconNames, iconFor } from "../layers/icons";
type Props = {
  places: Place[];
  selected: Place | null;
  onSelect: (p: Place) => void;
  onBounds: (b: Bounds) => void;
  picking: boolean;
  onPick: (p: [number, number]) => void;
  target: [number, number] | null;
};
export default function CityMap(props: Props) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<LibreMap | null>(null),
    latest = useRef(props),
    pickMarker = useRef<Marker | null>(null),
    generatedScenery = useRef(false);
  latest.current = props;
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [tilted, setTilted] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    let disposed = false;
    setReady(false);
    setError("");
    generatedScenery.current = false;
    let instance: LibreMap | undefined;
    let resizeObserver: ResizeObserver | undefined;
    (async () => {
      try {
        const style = await loadCityStyle(abort.signal);
        if (disposed || !container.current) return;
        // Vite needs the worker URL emitted by its bundler.
        maplibregl.setWorkerUrl(workerUrl);
        instance = new maplibregl.Map({
          container: container.current,
          style,
          center: CITY_CENTER,
          zoom: 12.05,
          minZoom: 9,
          maxZoom: 19,
          attributionControl: { compact: true },
          maxBounds: [
            [77.9, 16.9],
            [79.1, 17.9],
          ],
          canvasContextAttributes: { antialias: true },
        });
        map.current = instance;
        // Keep WebGL size in sync with the actual map container.
        resizeObserver = new ResizeObserver(() => {
          if (!disposed && instance) instance.resize();
        });
        resizeObserver.observe(container.current);
        // Style validation warnings are non-fatal. Do not replace the entire
        // map with a raster style when a glyph or shield expression warns.
        instance.on("error", (event) => {
          console.error("MapLibre resource error:", event.error);
        });
        instance.on("load", async () => {
          if (!instance || disposed) return;
          try {
            applyCityPalette(instance);
            // Leafy greenery is drawn by MapLibre inside the original park
            // polygons; unlike DOM artwork, it stays aligned during dragging.
            try {
              const bushTexture = new Image(128, 128);
              bushTexture.src = "/map-art/bushy-green-pattern.svg";
              await bushTexture.decode();
              if (disposed) return;
              instance.addImage(GALLI_BUSH_PATTERN_ID, bushTexture, { pixelRatio: 1 });
              applyBushyGreenTexture(instance);
            } catch (reason) {
              // If the decorative texture fails to load, solid green parks
              // remain visible and all map controls and POIs still function.
              console.warn("Bush texture unavailable; using green fills:", reason);
            }
            const loadedIcons = await Promise.all(
              iconNames.map(async (name) => {
                const image = new Image(80, 80);
                image.src = `/icons/${name}.svg`;
                await image.decode();
                return { name, image };
              }),
            );
            if (disposed) return;
            for (const { name, image } of loadedIcons)
              instance.addImage(name, image, { pixelRatio: 2 });
            // Use MapLibre's GPU symbol layers rather than HTML overlays:
            // greenery moves exactly with the map and never causes DOM drag lag.
            // Register only the new illustrated WebP greenery. The old SVG
            // tree/garden icons are intentionally not used on the map.
            const decoded = await Promise.allSettled(
              GREENERY_ASSETS.map(async asset => {
                const image = new Image(80, 80);
                image.src = greeneryImagePath(asset.id);
                await image.decode();
                return { id: asset.id, image };
              }),
            );
            if (disposed) return;
            let loaded = 0;
            for (const item of decoded) {
              if (item.status !== "fulfilled") continue;
              instance.addImage(item.value.id, item.value.image, { pixelRatio: 1.2 });
              loaded++;
            }
            if (loaded !== GREENERY_ASSETS.length)
              console.warn("Some illustrated park greenery could not load:", loaded);
            instance.addSource("aaspaas-scenery", {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
            });
            const firstBasemapLabel = instance.getStyle().layers
              .find(layer => layer.type === "symbol")?.id;
            const tierLayers = [
              { id: "galli-greenery-base", tier: "base", minzoom: 11.1, size: [11, 0.37, 13, 0.60, 16, 1.04] },
              { id: "galli-greenery-park", tier: "park", minzoom: 12.4, size: [11, 0.32, 13, 0.51, 16, 0.94] },
              { id: "galli-greenery-detail", tier: "detail", minzoom: 14.0, size: [11, 0.29, 13, 0.46, 16, 0.86] },
            ] as const;
            for (const layer of tierLayers) {
              instance.addLayer({
                id: layer.id,
                type: "symbol",
                source: "aaspaas-scenery",
                filter: ["==", ["get", "tier"], layer.tier],
                minzoom: layer.minzoom,
                layout: {
                  "icon-image": ["get", "sprite"],
                  // MapLibre requires ["zoom"] to be the direct input
                  // of a top-level interpolate/step expression. Do not
                  // wrap that expression in a multiply or match operator.
                  "icon-size": [
                    "interpolate", ["linear"], ["zoom"],
                    layer.size[0], layer.size[1],
                    layer.size[2], layer.size[3],
                    layer.size[4], layer.size[5],
                  ],
                  "icon-allow-overlap": false,
                  // Decorative images must not hide important place labels.
                  "icon-ignore-placement": true,
                  "icon-anchor": "bottom",
                },
              }, firstBasemapLabel);
            }
            // Keep native MapLibre clustering for speed, but render only
            // nearby category symbols; never render a number bubble.
            instance.addSource("places", {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
              cluster: true,
              clusterMaxZoom: 14,
              clusterRadius: 58,
              clusterProperties: {
                foodCount: ["+", ["case", ["==", ["get", "category"], "Food"], 1, 0]],
                placesCount: ["+", ["case", ["==", ["get", "category"], "Places"], 1, 0]],
                natureCount: ["+", ["case", ["==", ["get", "category"], "Nature"], 1, 0]],
                shoppingCount: ["+", ["case", ["==", ["get", "category"], "Shopping"], 1, 0]],
                funCount: ["+", ["case", ["==", ["get", "category"], "Fun & Activities"], 1, 0]],
              },
            });

            // For two nearby places show two overlapping icons; for 3+
            // show three. These are canvas/WebGL symbols, not laggy HTML markers.
            instance.addLayer({
              id: "cluster-icon-left",
              type: "symbol",
              source: "places",
              filter: ["has", "point_count"],
              layout: {
                "icon-image": [
                  "case",
                  [">", ["get", "foodCount"], 0], "food",
                  [">", ["get", "placesCount"], 0], "places",
                  [">", ["get", "natureCount"], 0], "nature",
                  [">", ["get", "shoppingCount"], 0], "shopping",
                  "fun",
                ],
                "icon-size": 0.73,
                "icon-offset": [-15, 4],
                "icon-allow-overlap": true,
                "icon-ignore-placement": false,
              },
            });
            instance.addLayer({
              id: "cluster-icon-middle",
              type: "symbol",
              source: "places",
              filter: ["has", "point_count"],
              layout: {
                "icon-image": [
                  "case",
                  [">", ["get", "placesCount"], 0], "places",
                  [">", ["get", "natureCount"], 0], "nature",
                  [">", ["get", "foodCount"], 0], "food",
                  [">", ["get", "funCount"], 0], "fun",
                  "shopping",
                ],
                "icon-size": 0.82,
                "icon-offset": [10, -3],
                "icon-allow-overlap": true,
                "icon-ignore-placement": false,
              },
            });
            instance.addLayer({
              id: "cluster-icon-right",
              type: "symbol",
              source: "places",
              filter: ["all", ["has", "point_count"], [">=", ["get", "point_count"], 3]],
              layout: {
                "icon-image": [
                  "case",
                  [">", ["get", "natureCount"], 0], "nature",
                  [">", ["get", "shoppingCount"], 0], "shopping",
                  [">", ["get", "funCount"], 0], "fun",
                  [">", ["get", "foodCount"], 0], "food",
                  "places",
                ],
                "icon-size": 0.73,
                "icon-offset": [26, 6],
                "icon-allow-overlap": true,
                "icon-ignore-placement": false,
              },
            });
            instance.addLayer({
              id: "place-icons",
              type: "symbol",
              source: "places",
              filter: ["!", ["has", "point_count"]],
              layout: {
                "icon-image": ["get", "icon"],
                "icon-size": [
                  "interpolate", ["linear"], ["zoom"],
                  10, 0.82,
                  13, 0.98,
                  16, 1.12,
                ],
                "icon-allow-overlap": false,
                "icon-ignore-placement": false,
                "text-field": ["step", ["zoom"], "", 13, ["get", "name"]],
                "text-font": ["Noto Sans Bold"],
                "text-size": 11,
                "text-offset": [0, 1.9],
                "text-anchor": "top",
                "text-optional": true,
                "text-max-width": 11,
              },
              paint: {
                "text-color": "#24493c",
                "text-halo-color": "#ffffff",
                "text-halo-width": 2,
              },
            });
            instance.on("click", "place-icons", (e) => {
              if (latest.current.picking) return;
              const id = e.features?.[0]?.properties?.id;
              const place = latest.current.places.find((p) => p.id === id);
              if (place) latest.current.onSelect(place);
            });
            const zoomCluster = async (e: maplibregl.MapLayerMouseEvent) => {
              if (latest.current.picking || !instance) return;
              const f = e.features?.[0];
              if (!f || f.geometry.type !== "Point") return;
              const zoom = await (
                instance.getSource("places") as GeoJSONSource
              ).getClusterExpansionZoom(f.properties?.cluster_id);
              instance.easeTo({
                center: f.geometry.coordinates as [number, number],
                zoom,
              });
            };
            const interactiveLayers = [
              "place-icons",
              "cluster-icon-left",
              "cluster-icon-middle",
              "cluster-icon-right",
            ];
            for (const id of interactiveLayers.slice(1)) {
              instance.on("click", id, zoomCluster);
            }
            for (const id of interactiveLayers) {
              instance.on("mouseenter", id, () => {
                if (instance) instance.getCanvas().style.cursor = "pointer";
              });
              instance.on("mouseleave", id, () => {
                if (instance)
                  instance.getCanvas().style.cursor = latest.current.picking
                    ? "crosshair"
                    : "";
              });
            }
            instance.on("click", (e) => {
              if (!latest.current.picking || !instance) return;
              pickMarker.current?.remove();
              pickMarker.current = new Marker({ color: "#176750" })
                .setLngLat(e.lngLat)
                .addTo(instance);
              latest.current.onPick([e.lngLat.lng, e.lngLat.lat]);
            });
            const bounds = () => {
              if (!instance) return;
              const b = instance.getBounds();
              latest.current.onBounds([
                b.getWest(),
                b.getSouth(),
                b.getEast(),
                b.getNorth(),
              ]);
            };
            instance.on("moveend", bounds);
            bounds();
            setReady(true);
          } catch {
            setError("Map icons could not load. Please retry.");
          }
        });
      } catch (e) {
        if (!disposed && !(e instanceof Error && e.name === "AbortError"))
          setError(
            "The map could not load. Your places are still available in the list.",
          );
      }
    })();
    return () => {
      disposed = true;
      abort.abort();
      resizeObserver?.disconnect();
      pickMarker.current?.remove();
      instance?.remove();
      map.current = null;
    };
  }, [attempt]);
  useEffect(() => {
    if (!ready) return;
    const source = map.current?.getSource("places") as
      | GeoJSONSource
      | undefined;
    source?.setData({
      type: "FeatureCollection",
      // Parks remain searchable/selectable through the list. Their old
      // plain tree pins are hidden; WebP trees now decorate park boundaries.
      features: props.places.filter(place => !isParkPlace(place)).map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
        properties: {
          id: p.id,
          name: p.name,
          icon: iconFor(p.category, p.dish),
          category: p.category,
        },
      })),
    });
  }, [props.places, ready]);
  // Geographic tree points are generated once from OSM green-space polygons.
  // Keep the backdrop independent from food/place category filters.
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    (async () => {
      try {
        const data = await loadGeneratedScenery(controller.signal);
        if (controller.signal.aborted || !data) return;
        const source = map.current?.getSource("aaspaas-scenery") as GeoJSONSource | undefined;
        source?.setData(data);
        generatedScenery.current = true;
      } catch (error) {
        if (!controller.signal.aborted)
          console.warn("Using the basic illustrated tree backdrop:", error);
      }
    })();
    return () => controller.abort();
  }, [ready]);

  // If geographic scenery is unavailable, keep the styled park polygons
  // rather than inventing tree coordinates or showing old SVG park icons.

  useEffect(() => {
    if (props.selected && ready)
      map.current?.flyTo({
        center: [props.selected.longitude, props.selected.latitude],
        zoom: 15,
        essential: false,
      });
  }, [props.selected, ready]);
  useEffect(() => {
    if (props.target && ready)
      map.current?.flyTo({ center: props.target, zoom: 14 });
  }, [props.target, ready]);
  useEffect(() => {
    if (!props.picking) pickMarker.current?.remove();
    if (map.current)
      map.current.getCanvas().style.cursor = props.picking ? "crosshair" : "";
  }, [props.picking]);
  function locate() {
    if (!navigator.geolocation) {
      setError("Location is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { longitude: lng, latitude: lat } = p.coords;
        if (lng < 77.9 || lng > 79.1 || lat < 16.9 || lat > 17.9) {
          setError(
            "You are outside Hyderabad. Explore the city with search instead.",
          );
          return;
        }
        map.current?.flyTo({ center: [lng, lat], zoom: 15 });
        if (map.current)
          new Marker({ color: "#487bc0" })
            .setLngLat([lng, lat])
            .addTo(map.current);
      },
      () =>
        setError(
          "Location access is unavailable. You can still browse the map.",
        ),
      { timeout: 10000 },
    );
  }
  return (
    <>
      <div
        ref={container}
        className="map-canvas"
        aria-label="Interactive Hyderabad map"
      />
      {!ready && !error && (
        <div className="map-loading">Opening Hyderabad…</div>
      )}
      {error && (
        <div className="map-error" role="status">
          {error}
          <button onClick={() => setAttempt((v) => v + 1)}>Retry map</button>
          <button aria-label="Dismiss message" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
      <div className="map-controls">
        <button
          aria-label="Find my location"
          title="Find my location"
          onClick={locate}
        >
          <LocateFixed size={19} />
        </button>
        <div className="control-group">
          <button aria-label="Zoom in" onClick={() => map.current?.zoomIn()}>
            <Plus size={19} />
          </button>
          <button aria-label="Zoom out" onClick={() => map.current?.zoomOut()}>
            <Minus size={19} />
          </button>
        </div>
        <button
          aria-label="Toggle tilted map"
          aria-pressed={tilted}
          onClick={() => {
            setTilted(!tilted);
            map.current?.easeTo({
              pitch: tilted ? 0 : 45,
              bearing: tilted ? 0 : -15,
            });
          }}
        >
          <Compass size={19} />
        </button>
        <button
          aria-label="Reset to Hyderabad"
          onClick={() =>
            map.current?.flyTo({
              center: CITY_CENTER,
              zoom: 11.8,
              pitch: 0,
              bearing: 0,
            })
          }
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </>
  );
}
