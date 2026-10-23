import { ArrowUpRight, MapPin, Clock, Wallet, X } from "lucide-react";
import type { Place } from "@/lib/types";
import { iconFor } from "@/features/map/layers/icons";
export default function PlaceDetails({
  place,
  onClose,
}: {
  place: Place;
  onClose: () => void;
}) {
  return (
    <section className="place-details" aria-label={`${place.name} details`}>
      <button
        className="detail-close icon-button"
        aria-label="Close place details"
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <div
        className={`place-cover ${place.category === "Nature" ? "nature-cover" : ""}`}
      >
        {place.photo_path ? (
          <img src={`/api/photos?id=${place.id}`} alt={place.name} />
        ) : (
          <>
            <img
              className="cover-illustration"
              src={`/icons/${iconFor(place.category, place.dish)}.svg`}
              alt=""
            />
            <span>Discover Hyderabad</span>
          </>
        )}
      </div>
      <div className="detail-body">
        <span className="eyebrow">
          {place.category} {place.dish && ` / ${place.dish}`}
        </span>
        <h2>{place.name}</h2>
        <p className="famous">{place.famous_for}</p>
        <p className="description">{place.description}</p>
        <div className="detail-facts">
          <p>
            <MapPin size={17} />
            {place.area || "Hyderabad"}
          </p>
          {place.hours && (
            <p>
              <Clock size={17} />
              {place.hours}
            </p>
          )}
          {place.price && (
            <p>
              <Wallet size={17} />
              {place.price}
            </p>
          )}
        </div>
        <a
          className="primary directions"
          href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get directions <ArrowUpRight size={18} />
        </a>
        {place.name === "Charminar" && (
          <p className="quiet">
            Zoom in and tilt the map to see our stylized 3D miniature.
          </p>
        )}
        <p className="quiet">Check current hours and access before visiting.</p>
        {place.source_url && (
          <a
            className="source-link"
            href={place.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Location source ↗
          </a>
        )}
        {place.photo_path && place.photo_credit && (
          <p className="quiet">Photo: {place.photo_credit}</p>
        )}
      </div>
    </section>
  );
}
