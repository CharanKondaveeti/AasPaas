"use client";
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Map as LibreMap, Marker, type GeoJSONSource } from "maplibre-gl";
import { LocateFixed, Plus, Minus, Compass, RotateCcw } from "lucide-react";
import { CITY_CENTER, placeDiscoveryGroup, isVerifiedGem, type Place, type Bounds } from "@/lib/types";
import { loadCityStyle, applyCityPalette } from "../layers/style";
import { addIndiaAvailabilityLayers, containsHyderabad, loadIndiaRegions, INDIA_MIN_ZOOM, INDIA_VIEW_BOUNDS, HYDERABAD_OVERVIEW_ZOOM } from "../layers/indiaRegions";
import type { MultiPolygon } from "geojson";
import { iconFor, iconNames, extraFoodIcons, iconPath, storedIconPath } from "../layers/icons";
import { drawShopMarker, drawCompactShopMarker, markerDishLabel, shopMarkerId } from "../layers/shopPillMarker";
import { drawDiscoveryMarker } from "../layers/discoveryMarker";
import { selectVisiblePlaces } from "../layers/markerPersistence";
import { fullNameCard, minMarkerDistance, prominenceScore } from "../layers/prominence";

const PLACE_ICON_LAYER = "aaspaas-place-icons";
const COMPACT_ICON_LAYER = "aaspaas-compact-food-icons";
const SELECTED_ICON_LAYER = "aaspaas-selected-food-icon";
type Props = {
  places: Place[];
  markerScope: string;
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
    foodArt = useRef<Map<string, HTMLImageElement>>(new Map()),
    lastMarkerScope = useRef(""),
    lastMarkerSnapshot = useRef(""),
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
          fadeDuration: 0, // prevent collision fade during map movements
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
            // Food miniatures are composed with white rounded name pills
            // and orange dots into one native GPU image per shop.
            const loadedIcons = await Promise.allSettled(
              [...iconNames,...extraFoodIcons].map(async (name) => {
                // Prefer new Supabase Storage art, but never leave a broken marker
                // if an icon has not been uploaded or the CDN is unavailable.
                for (const src of [storedIconPath(name), iconPath(name)]) {
                  if (!src) continue;
                  try {
                    const image = new Image();
                    image.crossOrigin = "anonymous"; // map canvas reads alpha pixels
                    image.src = src;
                    await image.decode();
                    return { name, image };
                  } catch { /* Try bundled local illustration. */ }
                }
                throw new Error(`No illustration for ${name}`);
              }),
            );
            if (disposed) return;
            foodArt.current.clear();
            for (const result of loadedIcons) {
              if (result.status !== "fulfilled") continue;
              const { name, image } = result.value;
              foodArt.current.set(name, image);
            }
            instance.addSource("aaspaas-places", {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
            });
            // Iconic places display name + speciality at city overview zoom.
            // Lower priority places reveal progressively as the user zooms in.
            instance.addSource("aaspaas-selected-place", {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
            });
            instance.addLayer({
              id: COMPACT_ICON_LAYER,
              type: "symbol",
              source: "aaspaas-places",
              minzoom: 7.8,
              filter: ["==", ["get", "fullCard"], false],
              layout: {
                "icon-image": ["get", "iconCompact"],
                "icon-size": ["interpolate",["linear"],["zoom"],7.8,0.36,10.8,0.46,12.8,0.64,13.6,0.78],
                "symbol-sort-key": ["get", "priority"],
                "icon-anchor": "bottom",
                "icon-offset": [0,14], // align orange dot with map coordinate
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
                "icon-rotation-alignment": "viewport",
                "icon-pitch-alignment": "viewport",
              },
            });
            instance.addLayer({
              id: PLACE_ICON_LAYER,
              type: "symbol",
              source: "aaspaas-places",
              minzoom: 7.8,
              filter: ["==", ["get", "fullCard"], true],
              layout: {
                "icon-image": ["get", "icon"],
                "icon-size": ["interpolate",["linear"],["zoom"],7.8,0.68,9.9,0.75,13.6,0.78,15,0.85,18,0.9],
                "symbol-sort-key": ["get", "priority"],
                "icon-anchor": "bottom",
                "icon-offset": [0,16],
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
                "icon-rotation-alignment": "viewport",
                "icon-pitch-alignment": "viewport",
              },
            });
            instance.addLayer({
              id: SELECTED_ICON_LAYER,
              type: "symbol",
              source: "aaspaas-selected-place",
              minzoom: 7.8,
              layout: {
                "icon-image": ["get", "icon"],
                "icon-size": ["interpolate",["linear"],["zoom"],7.8,0.7,9.9,0.78,12.8,0.82,15,0.9,18,1],
                "icon-anchor": "bottom",
                "icon-offset": [0,16],
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
                "icon-rotation-alignment": "viewport",
                "icon-pitch-alignment": "viewport",
              },
            });
            for (const layer of [PLACE_ICON_LAYER,COMPACT_ICON_LAYER,SELECTED_ICON_LAYER]) {
              instance.on("click", layer, (e) => {
                if (latest.current.picking) return;
                const id = e.features?.[0]?.properties?.id;
                if (typeof id !== "string") return;
                const place = latest.current.places.find((item) => item.id === id);
                if (place) latest.current.onSelect(place);
              });
              instance.on("mouseenter", layer, () => {
                if (!instance || latest.current.picking) return;
                instance.getCanvas().style.cursor = "pointer";
              });
              instance.on("mouseleave", layer, () => {
                if (!instance || latest.current.picking) return;
                instance.getCanvas().style.cursor = "";
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
  // Composite WebP + white label + dots into ONE stable GPU symbol per shop.
  // Rebuild only for new/edited shops, never during pan or zoom.
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    const source = instance.getSource("aaspaas-places") as GeoJSONSource | undefined;
    if (!source) return;
    const syncPlaces = () => {
      // A filter change invalidates the rendered snapshot, not a marker memory.
      if (lastMarkerScope.current !== props.markerScope) {
        lastMarkerScope.current = props.markerScope;
        lastMarkerSnapshot.current = "";
      }
      const view = instance.getBounds();
      const zoom = instance.getZoom();
      const minDistance = minMarkerDistance(zoom);
      const visible = selectVisiblePlaces(
        props.places,
        zoom,
        (place) => view.contains([place.longitude, place.latitude]),
        (candidate, visible) => {
          const point = instance.project([candidate.longitude, candidate.latitude]);
          return visible.every(other => {
            const existing = instance.project([other.longitude, other.latitude]);
            return Math.hypot(point.x - existing.x, point.y - existing.y) >= minDistance;
          });
        },
      );
      // Zooming OUT immediately drops lower-priority places and re-applies spacing.
      const snapshot = JSON.stringify(visible.map((p) => [
        p.id, p.longitude, p.latitude, p.name, p.category,
        p.dish, p.famous_for, isVerifiedGem(p),
        prominenceScore(p), fullNameCard(p, zoom),
      ]));
      if (snapshot === lastMarkerSnapshot.current) return;
      lastMarkerSnapshot.current = snapshot;
      source.setData({
      type: "FeatureCollection",
      features: visible.flatMap((p) => {
        if (!Number.isFinite(p.longitude) || !Number.isFinite(p.latitude)) return [];
        const icon = iconFor(p.category, p.dish, p.name, p.famous_for);
        const image = icon ? foodArt.current.get(icon) : undefined;
        const group = placeDiscoveryGroup(p);
        const gem = isVerifiedGem(p);
        // Real or natural-looking preview shop names, with the actual
        // signature-dish label shown underneath. Demo identity is conveyed
        // separately in the overlay, not baked into restaurant names.
        const mapName = p.name;
        const signature = markerDishLabel(p.dish,p.famous_for);
        const imageId = icon && image
          ? shopMarkerId(p.id, mapName, icon + "|" + signature + (gem?"|gem":""))
          : shopMarkerId(p.id, mapName, "discovery-" + group + "-" + gem);
        if (!instance.hasImage(imageId)) {
          try {
            const marker = icon && image
              ? drawShopMarker(image, mapName, signature, {verifiedGem:gem})
              : drawDiscoveryMarker(mapName, group, gem);
            instance.addImage(imageId,marker,{pixelRatio:3});
          } catch (error) {
            console.warn("Could not render illustrated place marker:",error);
            return [];
          }
        }
        const compactId=icon&&image?"food-overview-"+icon:imageId;
        if(icon&&image&&!instance.hasImage(compactId)){
          try {
            instance.addImage(compactId,drawCompactShopMarker(image),{pixelRatio:3});
          } catch(error) {
            console.warn("Could not render compact food icon:",error);
          }
        }
        return [{
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [p.longitude, p.latitude],
          },
          properties: {
            id: p.id,
            name: p.name,
            icon: imageId,
            iconCompact: instance.hasImage(compactId) ? compactId : imageId,
            fullCard: fullNameCard(p, zoom),
            priority: prominenceScore(p),
          },
        }];
      }),
      });
    };
    syncPlaces();
    instance.on("zoomend", syncPlaces);
    instance.on("moveend", syncPlaces);
    return () => {
      instance.off("zoomend", syncPlaces);
      instance.off("moveend", syncPlaces);
    };
  }, [props.places, props.markerScope, ready]);

  // Selected marker gets a highlighted card and always paints above
  // other places. On mobile, its position stays glued to the map geometry.
  useEffect(() => {
    const instance=map.current;
    if(!ready||!instance)return;
    const filter:["!=",["get",string],string]=["!=",["get","id"],props.selected?.id||""];
    instance.setFilter(PLACE_ICON_LAYER,["all",filter,["==",["get","fullCard"],true]]);
    instance.setFilter(COMPACT_ICON_LAYER,["all",filter,["==",["get","fullCard"],false]]);
    const selectedSource=instance.getSource("aaspaas-selected-place") as GeoJSONSource|undefined;
    if(!selectedSource)return;
    const p=props.selected;
    if(!p||!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)){
      selectedSource.setData({type:"FeatureCollection",features:[]});
      return;
    }
    const icon=iconFor(p.category,p.dish,p.name,p.famous_for);
    const image=icon?foodArt.current.get(icon):undefined;
    const group=placeDiscoveryGroup(p),gem=isVerifiedGem(p);
    const signature=markerDishLabel(p.dish,p.famous_for);
    const imageId=shopMarkerId(p.id,p.name,(icon||group)+"|"+signature+"|selected");
    if(!instance.hasImage(imageId)){
      try{
        const highlighted=image
          ?drawShopMarker(image,p.name,signature,{selected:true,verifiedGem:gem})
          :drawDiscoveryMarker(p.name,group,gem);
        instance.addImage(imageId,highlighted,{pixelRatio:3});
      }catch(error){console.warn("Could not highlight map marker:",error);return;}
    }
    selectedSource.setData({type:"FeatureCollection",features:[{
      type:"Feature",geometry:{type:"Point",coordinates:[p.longitude,p.latitude]},
      properties:{id:p.id,icon:imageId}
    }]});
  },[props.selected,ready]);

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
