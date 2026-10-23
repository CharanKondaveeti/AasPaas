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

const hero = new Set([
  "Charminar", "Golconda Fort", "Hussain Sagar", "Durgam Cheruvu",
  "Nehru Zoological Park", "Salar Jung Museum", "Inorbit Mall",
  "Sanjeevaiah Park", "Birla Mandir", "Falaknuma Palace",
]);

export const isFeaturedPlace = (place: Place) => featured.has(place.name);
export const isProminentPlace = (place: Place) => hero.has(place.name);

export function illustrationFor(place: Place): string {
  const n = place.name.toLowerCase();
  let art = "palace";
  if (n.includes("charminar")) art = "charminar";
  else if (n.includes("golconda") || n.includes("fort")) art = "fort";
  else if (/qutb|tomb|salar jung|museum/.test(n)) art = "tomb";
  else if (/chowmahalla|falaknuma|secretariat|palace/.test(n)) art = "palace";
  else if (/bridge/.test(n)) art = "bridge";
  else if (/sagar|cheruvu|lake|tank/.test(n)) art = "lake";
  else if (/temple|mandir|masjid|gurdwara/.test(n)) art = "temple";
  else if (place.category === "Nature") art = "tree";
  else if (place.category === "Food") art = /cafe|chai|tea/.test(n) ? "tea" : "food";
  else if (place.category === "Shopping") art = "shopping";
  else if (place.category === "Fun & Activities") art = "fun";
  return `/map-art/${art}.svg`;
}

const categoryBadges: Record<Place["category"], string> = {
  Food: "🍴",
  Places: "🏛",
  Nature: "🌳",
  Shopping: "🛍",
  "Fun & Activities": "🎡",
};

export function makeIllustratedMarker(
  place: Place,
  onSelect: (place: Place) => void,
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "illustrated-pin";
  button.dataset.kind = place.category;
  button.dataset.prominent = isProminentPlace(place) ? "yes" : "no";
  button.setAttribute("aria-label", `Discover ${place.name}`);
  button.title = `${place.name} · ${place.category}`;

  const image = document.createElement("img");
  image.src = illustrationFor(place);
  image.alt = "";
  image.loading = "eager";
  image.draggable = false;

  const label = document.createElement("span");
  label.className = "illustrated-pin-label";
  const category = document.createElement("span");
  category.className = "illustrated-pin-category";
  category.textContent = categoryBadges[place.category] ?? "📍";
  category.setAttribute("aria-hidden", "true");
  const name = document.createElement("span");
  name.className = "illustrated-pin-name";
  name.textContent = place.name;
  label.append(category, name);
  button.append(image, label);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onSelect(place);
  });
  return button;
}
