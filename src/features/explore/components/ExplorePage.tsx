"use client";
import {lazy,Suspense} from "react";
import { useEffect, useState, useCallback } from "react";
import {
  Search,
  MapPin,
  ArrowUpRight,
  Plus,
  X,
  SlidersHorizontal,
  ChevronRight,
  Landmark,
  Utensils,
  ShoppingBag,
  Compass,
  Gem,
} from "lucide-react";
import {
  isVerifiedGem,
  dishes,
  CITY_BOUNDS,
  CITY_CENTER,
  type Bounds,
  type Place,
} from "@/lib/types";
import { getPlaces } from "@/services/placeService";
import { iconFor, iconPath } from "@/features/map/layers/icons";
import PlaceDetails from "./PlaceDetails";
import SuggestionForm from "@/features/suggestions/components/SuggestionForm";
const CityMap=lazy(()=>import("@/features/map/components/CityMap"));
const githubPagesPreview = import.meta.env.VITE_GITHUB_PAGES === "true";
const discoveryTabs = [
  { value: "all", label: "Discover", Icon: Compass },
  { value: "food", label: "Famous Food", Icon: Utensils },
  { value: "experiences", label: "Scenic & Culture", Icon: Landmark },
  { value: "specialty_shops", label: "Special Shops", Icon: ShoppingBag },
] as const;
export default function ExplorePage() {
  const [bounds, setBounds] = useState<Bounds>(CITY_BOUNDS),
    [query, setQuery] = useState(""),
    [cityAvailable, setCityAvailable] = useState(true),
    [category, setCategory] = useState("All"),
    [group, setGroup] = useState("all"),
    [hiddenOnly, setHiddenOnly] = useState(false),
    [dish, setDish] = useState(""),
    [places, setPlaces] = useState<Place[]>([]),
    [selected, setSelected] = useState<Place | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [mode, setMode] = useState("curated"),
    [showSuggest, setShowSuggest] = useState(false),
    [picking, setPicking] = useState(false),
    [point, setPoint] = useState<[number, number] | null>(null),
    [draft, setDraft] = useState<Record<string, string>>({}),
    [target, setTarget] = useState<[number, number] | null>(null),
    [showList, setShowList] = useState(false),
    [truncated, setTruncated] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setQuery(q.slice(0, 100));
      setShowList(true);
    }
  }, []);
  const updateBounds = useCallback((b: Bounds) => setBounds(b), []);
  useEffect(() => {
    const abort = new AbortController();
    // AasPaas's approved place collection is still Hyderabad-only.
    // Clamp large India map viewports to the supported city area so the
    // Supabase spatial RPC is never asked to scan the whole country.
    const cityBounds: Bounds = [
      Math.max(bounds[0], CITY_BOUNDS[0]),
      Math.max(bounds[1], CITY_BOUNDS[1]),
      Math.min(bounds[2], CITY_BOUNDS[2]),
      Math.min(bounds[3], CITY_BOUNDS[3]),
    ];
    const intersectsCity = cityBounds[0] <= cityBounds[2]
      && cityBounds[1] <= cityBounds[3];
    if (!intersectsCity && !query.trim()) {
      setPlaces([]);
      setLoading(false);
      setTruncated(false);
      setError("");
      return () => abort.abort();
    }
    const timer = setTimeout(() => {
      setLoading(true);
      getPlaces(intersectsCity ? cityBounds : CITY_BOUNDS, query, category, dish, group, hiddenOnly, abort.signal)
        .then((data) => {
          setPlaces(data.places);
          setMode(data.mode);
          setTruncated(data.truncated);
          setError("");
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 220);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [bounds, query, category, dish, group, hiddenOnly, retry]);
  function select(p: Place) {
    setSelected(p);
    setShowList(false);
  }
  return (
    <main className="explore">
      <Suspense fallback={<div className="map-loading">Opening Hyderabad…</div>}><CityMap
        places={places}
        selected={selected}
        onSelect={select}
        onBounds={updateBounds}
        onRegionAvailability={setCityAvailable}
        picking={picking}
        onPick={setPoint}
        target={target}
      /></Suspense>
      <header className="topbar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="AasPaas home">
          <span className="brand-mark">
            <MapPin size={22} />
          </span>
          <span>
            AasPaas<span className="brand-dot">.</span>
          </span>
        </a>
        <span className="brand-line" />
        <span className="city-label">
          {cityAvailable ? "HYDERABAD" : "EXPLORE INDIA"} <span>·</span> INDIA
        </span>
        <span className="topbar-spacer" />
        <span className="tagline">A little closer to your city.</span>
        {!githubPagesPreview && (
          <button className="suggest-top" onClick={() => setShowSuggest(true)}>
            <Plus size={17} />
            <span>Suggest a place</span>
          </button>
        )}
      </header>
      <div className="discovery-toolbar">
        <div className="search-box">
          <Search size={20} />
          <input
            aria-label="Search places, food or areas"
            placeholder="A place, a craving, a little adventure…"
            value={query}
            maxLength={100}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setShowList(true);
            }}
          />
          {query ? (
            <button aria-label="Clear search" onClick={() => setQuery("")}>
              <X size={17} />
            </button>
          ) : (
            <span className="search-hint">Explore</span>
          )}
        </div>
        <nav className="category-filters" aria-label="Place categories">
          {discoveryTabs.map(({ value, label, Icon }) => (
            <button
              key={value}
              className={group === value ? "active" : ""}
              aria-pressed={group === value}
              onClick={() => {
                setGroup(value);
                setCategory(value === "food" ? "Food" : "All");
                setDish("");
                setSelected(null);
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          <button
            className={hiddenOnly ? "active hidden-gems-filter" : "hidden-gems-filter"}
            aria-pressed={hiddenOnly}
            onClick={() => {
              setHiddenOnly((value) => !value);
              setSelected(null);
            }}
          >
            <Gem size={16} />
            Hidden Gems
          </button>
        </nav>
        {category === "Food" && (
          <nav className="dish-filters" aria-label="Food filters">
            {dishes.map((d) => (
              <button
                key={d}
                className={dish === d ? "active" : ""}
                aria-pressed={dish === d}
                onClick={() => setDish(dish === d ? "" : d)}
              >
                {d}
              </button>
            ))}
          </nav>
        )}
      </div>
      {picking ? (
        <div className="picking-banner">
          <MapPin size={20} />
          <div>
            <strong>Put your favourite place on the map.</strong>
            <span>
              {point
                ? "Location selected. You can tap again to adjust."
                : "Tap the map to choose the exact location."}
            </span>
          </div>
          <button
            disabled={!point}
            className="primary"
            onClick={() => {
              setPicking(false);
              setShowSuggest(true);
            }}
          >
            Use this spot
          </button>
          <button
            className="icon-button"
            aria-label="Cancel location selection"
            onClick={() => {
              setPicking(false);
              setShowSuggest(true);
            }}
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <>
          <aside
            className={`discovery-panel ${showList ? "mobile-expanded" : ""}`}
            aria-label="Places to explore"
          >
            {selected ? (
              <PlaceDetails
                place={selected}
                onClose={() => setSelected(null)}
              />
            ) : (
              <>
                <div className="panel-intro">
                  <span className="eyebrow">TAKE THE SCENIC DETOUR</span>
                  <h1>
                    {query ? (
                      "Find your next stop."
                    ) : (
                      <>
                        There’s more
                        <br />
                        around the corner.
                      </>
                    )}
                  </h1>
                  <p>
                    {query
                      ? `Searching Hyderabad for “${query}”`
                      : "Famous dishes, hidden gems and special local corners. Discover what makes Hyderabad different."}
                  </p>
                  <div className="panel-count">
                    <span className="live-dot" />
                    {!cityAvailable && !query
                      ? "More regions coming soon"
                      : loading
                        ? "Looking around…"
                        : `${places.length} places ${query ? "found" : "in this view"}`}
                    <button
                      onClick={() => setShowList(!showList)}
                      aria-label="Toggle place list"
                    >
                      <SlidersHorizontal size={16} />
                    </button>
                  </div>
                </div>
                <div className="places-list">
                  {query.toLowerCase().trim() === "ameerpet" && (
                    <button
                      className="place-row"
                      onClick={() => {
                        setTarget([78.448288, 17.437462]);
                        setQuery("");
                        setShowList(false);
                      }}
                    >
                      <MapPin size={24} />
                      <span className="place-row-text">
                        <strong>Ameerpet</strong>
                        <span>Explore this neighbourhood</span>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  )}
                  {!cityAvailable && !query ? (
                    <div className="empty-state">
                      <Compass size={28} />
                      <h3>Coming soon</h3>
                      <p>Explore India freely. Hyderabad is our first available city.</p>
                      <button onClick={() => setTarget([...CITY_CENTER])}>
                        Explore Hyderabad
                      </button>
                    </div>
                  ) : error ? (
                    <div className="empty-state">
                      <p>{error}</p>
                      <button onClick={() => setRetry((v) => v + 1)}>
                        Try again
                      </button>
                    </div>
                  ) : places.length === 0 && !loading ? (
                    <div className="empty-state">
                      <Compass size={28} />
                      <h3>A little unexplored, for now.</h3>
                      <p>
                        {hiddenOnly
                          ? "No curator-verified Hidden Gems here yet. Explore more of the map or try other discoveries."
                          : "Try another category, move the map, or suggest a favourite place."}
                      </p>
                      <button
                        onClick={() => {
                          setQuery("");
                          setCategory("All");
                          setGroup("all");
                          setHiddenOnly(false);
                          setDish("");
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    places.map((p) => (
                      <button
                        className="place-row"
                        key={p.id}
                        onClick={() => select(p)}
                      >
                        <span
                          className={`place-icon ${p.category === "Nature" ? "green" : ""}`}
                        >
                          {iconFor(p.category, p.dish, p.name, p.famous_for) ? (
                            <img
                              src={iconPath(iconFor(p.category, p.dish, p.name, p.famous_for)!)}
                              alt=""
                            />
                          ) : (
                            <MapPin size={19} aria-hidden="true" />
                          )}
                        </span>
                        <span className="place-row-text">
                          <strong>{p.name}</strong>
                          <span>
                            {isVerifiedGem(p) ? "♦ Hidden Gem" : (p.dish || p.category)} <b>·</b> {p.area}
                          </span>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ))
                  )}
                </div>
                <div className="panel-footer">
                  <span>
                    {githubPagesPreview
                      ? "GitHub Pages preview · view only."
                      : truncated
                        ? "Zoom in to see more places."
                      : mode === "curated"
                        ? "A small, source-checked city collection."
                        : "Local favourites, carefully reviewed."}
                  </span>
                  <ArrowUpRight size={15} />
                </div>
              </>
            )}
          </aside>
          {selected && (
            <div className="mobile-detail">
              <PlaceDetails
                place={selected}
                onClose={() => setSelected(null)}
              />
            </div>
          )}
          {cityAvailable && (
            <div className="map-note">
              <span className="live-dot" /> A city full of little discoveries
            </div>
          )}
          <button
            className="mobile-list-toggle"
            onClick={() => setShowList(!showList)}
          >
            {showList ? "Back to map" : `Explore ${places.length} places`}
          </button>
          {!githubPagesPreview && (
            <button
              className="suggest-float"
              onClick={() => setShowSuggest(true)}
            >
              <Plus size={17} /> Share your favourite corner
            </button>
          )}
        </>
      )}
      {!githubPagesPreview && showSuggest && (
        <SuggestionForm
          point={point}
          draft={draft}
          onDraft={setDraft}
          onClose={() => setShowSuggest(false)}
          onPick={() => {
            setShowSuggest(false);
            setPicking(true);
            setSelected(null);
          }}
        />
      )}
      {!githubPagesPreview && (
        <a href="/admin" className="admin-link">
          Curator access
        </a>
      )}
    </main>
  );
}
