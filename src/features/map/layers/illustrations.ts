import type { Place } from "@/lib/types";

const featured = new Set([
  "Charminar", "Golconda Fort", "Qutb Shahi Tombs", "Hussain Sagar",
  "Buddha Statue", "Chowmahalla Palace", "Mecca Masjid", "Falaknuma Palace",
  "Birla Mandir", "Nehru Zoological Park", "Durgam Cheruvu",
  "Durgam Cheruvu Cable Bridge", "Salar Jung Museum", "Inorbit Mall",
  "Sarath City Capital Mall", "Lumbini Park", "Sanjeevaiah Park",
  "Indira Park", "Nimrah Cafe", "PullaReddy Sweets", "T-Hub",
  "Telangana Secretariat", "General Bazaar", "B. M. Birla Planetarium",
  "GVK One Mall", "Chilkur Balaji Temple", "Biodiversity Park",
  "PVR Icon", "Forum Sujana Mall", "Jalagam Vengal Rao Park",
]);

const prominent = new Set([
  "Charminar", "Golconda Fort", "Hussain Sagar", "Durgam Cheruvu",
  "Nehru Zoological Park", "Inorbit Mall", "Sarath City Capital Mall",
  "Sanjeevaiah Park", "Birla Mandir", "Falaknuma Palace",
]);

export const isFeaturedPlace = (place: Place) => featured.has(place.name);
export const isProminentPlace = (place: Place) => prominent.has(place.name);

export function illustrationFor(place: Place): string {
  const n = place.name.toLowerCase();
  let art = "palace";
  if (n.includes("charminar")) art = "charminar";
  else if (n.includes("fort") || n.includes("golconda")) art = "fort";
  else if (/sagar|cheruvu|lake|tank|bund/.test(n)) art = "lake";
  else if (place.category === "Nature") art = "tree";
  else if (place.category === "Food") art = /cafe|chai|tea/.test(n) ? "tea" : "food";
  else if (place.category === "Shopping") art = "shopping";
  else if (place.category === "Fun & Activities") art = "fun";
  else if (/temple|mandir|masjid|gurdwara/.test(n)) art = "temple";
  return `/map-art/${art}.svg`;
}

export function makeIllustratedMarker(place: Place, onSelect: (place: Place) => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "illustrated-pin";
  button.dataset.kind = place.category;
  button.dataset.prominent = isProminentPlace(place) ? "yes" : "no";
  button.setAttribute("aria-label", `View ${place.name}`);

  const image = document.createElement("img");
  image.src = illustrationFor(place);
  image.alt = "";
  image.loading = "lazy";
  image.draggable = false;

  const label = document.createElement("span");
  label.className = "illustrated-pin-label";
  label.textContent = place.name;
  button.append(image, label);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onSelect(place);
  });
  return button;
}

/**
 * Decorative trees only; locations are an illustration, not surveyed trees.
 * Use actual park POI coordinates as anchors, so decoration tracks the map.
 */
export function buildTreeFeatures(places: Place[]) {
  const parks = places.filter(
    p => p.category === "Nature" && !/lake|sagar|cheruvu|tank|bridge/i.test(p.name)
  );
  const features = parks.flatMap((p, i) =>
    Array.from({length: 3}, (_, j) => {
      const angle = (i * 47 + j * 120) * Math.PI / 180;
      const radius = (0.0009 + (j % 2) * 0.0007);
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [
            p.longitude + Math.cos(angle) * radius,
            p.latitude + Math.sin(angle) * radius,
          ] as [number, number],
        },
        properties: { id: `tree-${p.id}-${j}` },
      };
    })
  );
  return {type: "FeatureCollection" as const, features};
}
