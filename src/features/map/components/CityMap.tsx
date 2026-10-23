"use client";
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Map as LibreMap, GeoJSONSource, Marker } from "maplibre-gl";
import { LocateFixed, Plus, Minus, Compass, RotateCcw } from "lucide-react";
import { CITY_CENTER, type Place, type Bounds } from "@/lib/types";
import { loadCityStyle } from "../layers/style";
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
    pickMarker = useRef<Marker | null>(null);
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
    let instance: LibreMap | undefined;
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
          zoom: 11.8,
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
        // Style validation warnings are non-fatal. Do not replace the entire
        // map with a raster style when a glyph or shield expression warns.
        instance.on("error", (event) => {
          console.error("MapLibre resource error:", event.error);
        });
        instance.on("load", async () => {
          if (!instance || disposed) return;
          try {
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
            instance.addSource("places", {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
              cluster: true,
              clusterMaxZoom: 14,
              clusterRadius: 48,
            });
            instance.addLayer({
              id: "clusters",
              type: "circle",
              source: "places",
              filter: ["has", "point_count"],
              paint: {
                "circle-color": "#176750",
                "circle-radius": 22,
                "circle-stroke-width": 5,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-opacity": 0.8,
              },
            });
            instance.addLayer({
              id: "cluster-count",
              type: "symbol",
              source: "places",
              filter: ["has", "point_count"],
              layout: {
                "text-field": ["get", "point_count_abbreviated"],
                "text-font": ["Noto Sans Bold"],
                "text-size": 13,
              },
              paint: { "text-color": "#ffffff" },
            });
            instance.addLayer({
              id: "place-icons",
              type: "symbol",
              source: "places",
              filter: ["!", ["has", "point_count"]],
              layout: {
                "icon-image": ["get", "icon"],
                "icon-size": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10,
                  0.8,
                  16,
                  1.25,
                ],
                "icon-allow-overlap": false,
                "text-field": ["step", ["zoom"], "", 12, ["get", "name"]],
                "text-font": ["Noto Sans Bold"],
                "text-size": 11,
                "text-offset": [0, 2.4],
                "text-anchor": "top",
                "text-optional": true,
                "text-max-width": 12,
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
            instance.on("click", "clusters", async (e) => {
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
            });
            for (const id of ["place-icons", "clusters"]) {
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
            let modelRequested = false;
            instance.on("moveend", () => {
              if (!instance || modelRequested || instance.getZoom() < 16)
                return;
              modelRequested = true;
              import("../layers/landmark")
                .then(({ landmarkLayer }) => {
                  if (!disposed && instance)
                    instance.addLayer(landmarkLayer(), "place-icons");
                })
                .catch(() => {
                  modelRequested = false;
                });
            });
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
      features: props.places.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
        properties: {
          id: p.id,
          name: p.name,
          icon: iconFor(p.category, p.dish),
        },
      })),
    });
  }, [props.places, ready]);
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
