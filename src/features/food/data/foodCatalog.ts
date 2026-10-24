import { storedIconPath } from "@/features/map/layers/icons";
/** Illustrated icons are original AasPaas art, not third-party logos or venue photos. */
export const foodCategories = [
 { key:"Biryani", label:"Biryani", icon:"biryani" },
 { key:"Punugulu", label:"Punugulu", icon:"punugulu" },
 { key:"Tea", label:"Irani Chai", icon:"chai" },
 { key:"Dosa", label:"Dosa", icon:"dosa" },
 { key:"Mandi", label:"Mandi", icon:"mandi" },
 { key:"Samosa", label:"Samosa", icon:"samosa" },
 { key:"Chaat", label:"Chaat", icon:"chaat" },
 { key:"Vada", label:"Vada", icon:"vada" },
 { key:"Sweets", label:"Sweets", icon:"sweets" },
 { key:"Idli", label:"Idli", icon:"idli" },
 { key:"Haleem", label:"Haleem", icon:"haleem" },
 { key:"Kebab", label:"Kebabs", icon:"kebab" },
 { key:"Pani Puri", label:"Pani Puri", icon:"pani-puri" },
 { key:"Jalebi", label:"Jalebi", icon:"jalebi" },
 { key:"Mirchi Bajji", label:"Mirchi Bajji", icon:"mirchi-bajji" },
 { key:"Osmania Biscuits", label:"Biscuits", icon:"osmania-biscuits" },
 { key:"Juice", label:"Juices", icon:"juice" },
 { key:"Tiffins", label:"Tiffins", icon:"tiffins" },
 { key:"Rolls", label:"Rolls", icon:"rolls" },
 { key:"Ice Cream", label:"Ice cream", icon:"ice-cream" },
] as const;
export const foodStyleFilters = [
 {key:"street_food",label:"Street food"},{key:"tiffins",label:"Tiffins"},
 {key:"breakfast",label:"Breakfast"},{key:"midnight",label:"Midnight"},
 {key:"iconic",label:"Iconic"},{key:"old_favourite",label:"Old favourites"},
 {key:"desserts",label:"Desserts"},{key:"cafes",label:"Cafés"},
] as const;
export const foodBudgets = [50,100,200,500] as const;
export function foodArtworkFallback(name:string):string {
 return `${import.meta.env.BASE_URL}food-art/${name}.svg`;
}
export function foodArtwork(name:string):string {
 return storedIconPath(name) ?? foodArtworkFallback(name);
}
