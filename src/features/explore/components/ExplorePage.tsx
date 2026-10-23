"use client";
import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import {
  Search,
  MapPin,
  ArrowUpRight,
  Plus,
  X,
  SlidersHorizontal,
  ChevronRight,
  Leaf,
  Landmark,
  Utensils,
  ShoppingBag,
  FerrisWheel,
  Compass,
} from "lucide-react";
import {
  categories,
  dishes,
  CITY_BOUNDS,
  type Bounds,
  type Place,
} from "@/lib/types";
import { getPlaces } from "@/services/placeService";
import { iconFor } from "@/features/map/layers/icons";
import PlaceDetails from "./PlaceDetails";
import SuggestionForm from "@/features/suggestions/components/SuggestionForm";
const CityMap = dynamic(() => import("@/features/map/components/CityMap"), {
  ssr: false,
});
const categoryIcons = [
  Compass,
  Utensils,
  Landmark,
  Leaf,
  ShoppingBag,
  FerrisWheel,
];
export default function ExplorePage() {
  const [bounds, setBounds] = useState<Bounds>(CITY_BOUNDS),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
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
    const timer = setTimeout(() => {
      setLoading(true);
      getPlaces(bounds, query, category, dish, abort.signal)
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
  }, [bounds, query, category, dish, retry]);
  function select(p: Place) {
    setSelected(p);
    setShowList(false);
  }
  return (
    <main className="explore">
      <CityMap
        places={places}
        selected={selected}
        onSelect={select}
        onBounds={updateBounds}
        picking={picking}
        onPick={setPoint}
        target={target}
      />
      <header className="topbar">
        <a className="brand" href="/" aria-label="AasPaas home">
          <span className="brand-mark">
            <MapPin size={22} />
          </span>
          <span>
            AasPaas<span className="brand-dot">.</span>
          </span>
        </a>
        <span className="brand-line" />
        <span className="city-label">
          HYDERABAD <span>·</span> INDIA
        </span>
        <span className="topbar-spacer" />
        <span className="tagline">A little closer to your city.</span>
        <button className="suggest-top" onClick={() => setShowSuggest(true)}>
          <Plus size={17} />
          <span>Suggest a place</span>
        </button>
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
          {categories.map((c, i) => {
            const Icon = categoryIcons[i];
            return (
              <button
                key={c}
                className={c === category ? "active" : ""}
                aria-pressed={c === category}
                onClick={() => {
                  setCategory(c);
                  setDish("");
                  setSelected(null);
                }}
              >
                <Icon size={16} />
                {c === "Fun & Activities" ? "Things to do" : c}
              </button>
            );
          })}
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
                      : "Old-city stories. A cup of chai. A little green. Find your kind of Hyderabad."}
                  </p>
                  <div className="panel-count">
                    <span className="live-dot" />
                    {loading
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
                  {error ? (
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
                        Try another category, move the map, or suggest a
                        favourite place.
                      </p>
                      <button
                        onClick={() => {
                          setQuery("");
                          setCategory("All");
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
                          <img
                            src={`/icons/${iconFor(p.category, p.dish)}.svg`}
                            alt=""
                          />
                        </span>
                        <span className="place-row-text">
                          <strong>{p.name}</strong>
                          <span>
                            {p.dish || p.category} <b>·</b> {p.area}
                          </span>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ))
                  )}
                </div>
                <div className="panel-footer">
                  <span>
                    {truncated
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
          <div className="map-note">
            <span className="live-dot" /> A city full of little discoveries
          </div>
          <button
            className="mobile-list-toggle"
            onClick={() => setShowList(!showList)}
          >
            {showList ? "Back to map" : `Explore ${places.length} places`}
          </button>
          <button
            className="suggest-float"
            onClick={() => setShowSuggest(true)}
          >
            <Plus size={17} /> Share your favourite corner
          </button>
        </>
      )}
      {showSuggest && (
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
      <a href="/admin" className="admin-link">
        Curator access
      </a>
    </main>
  );
}
