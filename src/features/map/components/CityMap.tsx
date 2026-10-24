"use client";
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Map as LibreMap, Marker, type GeoJSONSource } from "maplibre-gl";
import { LocateFixed, Plus, Minus, Compass, RotateCcw } from "lucide-react";
import { CITY_CENTER, type Place, type Bounds } from "@/lib/types";
import { loadCityStyle, applyCityPalette } from "../layers/style";
import { addIndiaAvailabilityLayers, containsHyderabad, loadIndiaRegions, INDIA_MIN_ZOOM, INDIA_VIEW_BOUNDS, HYDERABAD_OVERVIEW_ZOOM } from "../layers/indiaRegions";
import type { MultiPolygon } from "geojson";
import { iconFor, iconNames, iconPath } from "../layers/icons";

/** Only reveal small real-place icons after zooming into Hyderabad. */
const PLACE_ICON_MIN_ZOOM = 12.8;
const PLACE_ICON_LAYER = "aaspaas-place-icons";
type Props = {
  places: Place[];
  selected: Place | null;
  onSelect: (p: Place) => void;
  onBounds: (b: Bounds) => void;
  picking: boolean;
  onPick: (p: [number, number]) => void;
  target: [number, number] | null;
  onRegionAvailability?: (available: boolean) => void;
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
    let resizeObserver: ResizeObserver | undefined;
    let cityBoundary: MultiPolygon | null = null;
    let lastAvailability: boolean | null = null;
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
          zoom: HYDERABAD_OVERVIEW_ZOOM,
          minZoom: INDIA_MIN_ZOOM,
          maxZoom: 19,
          attributionControl: { compact: true },
          // No Hyderabad-only camera limits: visitors may explore all India.
          renderWorldCopies: false,
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
            // Geographic outline and labels are GPU-drawn and track the map.
            try {
              const regions = await loadIndiaRegions(abort.signal);
              if (disposed) return;
              cityBoundary = addIndiaAvailabilityLayers(instance, regions);
            } catch (error) {
              console.warn("Geographic launch boundary unavailable:", error);
            }
            // Ten miniature WebP food illustrations replace the old SVGs.
            // Native MapLibre symbols keep each shop name below its icon,
            // and both follow map dragging with no HTML marker lag.
            const loadedIcons = await Promise.allSettled(
              iconNames.map(async (name) => {
                const image = new Image();
                image.src = iconPath(name);
                await image.decode();
                return { name, image };
              }),
            );
            if (disposed) return;
            for (const result of loadedIcons) {
              if (result.status !== "fulfilled") continue;
              const { name, image } = result.value;
              if (!instance.hasImage(name)) instance.addImage(name, image, { pixelRatio: 2 });
            }
            instance.addSource("aaspaas-places", {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
            });
            instance.addLayer({
              id: PLACE_ICON_LAYER,
              type: "symbol",
              source: "aaspaas-places",
              minzoom: PLACE_ICON_MIN_ZOOM,
              layout: {
                // WebP icons are 128px and added with pixelRatio 2,
                // giving ~55px miniature dishes, anchored at real coordinates.
                "icon-image": ["get", "icon"],
                "icon-size": 0.86,
                "icon-anchor": "bottom",
                "icon-allow-overlap": false,
                "icon-ignore-placement": false,
                "icon-rotation-alignment": "viewport",
                "icon-pitch-alignment": "viewport",
                // Shop name sits immediately below its dish illustration.
                "text-field": ["get", "name"],
                "text-font": ["Noto Sans Bold"],
                "text-size": 11,
                "text-max-width": 10,
                "text-max-lines": 2,
                "text-anchor": "top",
                "text-offset": [0, 0.35],
                "text-allow-overlap": false,
                "text-optional": false,
              },
              paint: {
                "text-color": "#163b32",
                "text-halo-color": "#ffffff",
                "text-halo-width": 2,
                "text-halo-blur": 0.25,
              },
            });
            instance.on("click", PLACE_ICON_LAYER, (e) => {
              if (latest.current.picking) return;
              const id = e.features?.[0]?.properties?.id;
              if (typeof id !== "string") return;
              const place = latest.current.places.find((item) => item.id === id);
              if (place) latest.current.onSelect(place);
            });
            instance.on("mouseenter", PLACE_ICON_LAYER, () => {
              if (!instance || latest.current.picking) return;
              instance.getCanvas().style.cursor = "pointer";
            });
            instance.on("mouseleave", PLACE_ICON_LAYER, () => {
              if (!instance || latest.current.picking) return;
              instance.getCanvas().style.cursor = "";
            });
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
              if (cityBoundary) {
                const c = instance.getCenter();
                const available = containsHyderabad([c.lng, c.lat], cityBoundary);
                if (available !== lastAvailability) {
                  lastAvailability = available;
                  latest.current.onRegionAvailability?.(available);
                }
              }
            };
            instance.on("moveend", bounds);
            bounds();
            setReady(true);
          } catch {
            setError("Map could not load. Please retry.");
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
  // Keep map symbols synced to the visible Supabase search and filters.
  // This preserves the existing selection flow and avoids DOM marker lag.
  useEffect(() => {
    if (!ready || !map.current) return;
    const source = map.current.getSource("aaspaas-places") as GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: props.places.flatMap((p) => {
        if (!Number.isFinite(p.longitude) || !Number.isFinite(p.latitude)) return [];
        const icon = iconFor(p.category, p.dish, p.name, p.famous_for);
        // Show only places with a genuinely matching illustrated food asset.
        // Other categories still work in search, filters and the places list.
        if (!icon) return [];
        return [{
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [p.longitude, p.latitude],
          },
          properties: {
            id: p.id,
            name: p.name,
            icon,
          },
        }];
      }),
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
        if (lng < INDIA_VIEW_BOUNDS[0][0] || lng > INDIA_VIEW_BOUNDS[1][0]
          || lat < INDIA_VIEW_BOUNDS[0][1] || lat > INDIA_VIEW_BOUNDS[1][1]) {
          setError("Location is outside the supported India map.");
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
              zoom: HYDERABAD_OVERVIEW_ZOOM,
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
