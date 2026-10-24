import { useState } from "react";
import { ArrowUpRight, MapPin, Clock, Wallet, X, Gem, BadgeCheck } from "lucide-react";
import { isVerifiedGem, type Place } from "@/lib/types";
import { iconFor, iconPath } from "@/features/map/layers/icons";
/** Fall back gracefully when a photo or an illustration is unavailable. */
function DetailPhoto({ id, name }: { id: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span>Discover Hyderabad</span>
  ) : (
    <img
      src={`/api/photos?id=${encodeURIComponent(id)}`}
      alt={name}
      onError={() => setFailed(true)}
    />
  );
}
function DetailFoodIcon({ icon }: { icon: NonNullable<ReturnType<typeof iconFor>> }) {
  const [failed, setFailed] = useState(false);
  // Only display the new high-definition illustration. Never fall back
  // to obsolete 128px artwork, which made detail views appear blurry.
  if (failed) return null;
  return (
    <img
      className="detail-place-icon"
      src={iconPath(icon)}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}
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
          <DetailPhoto key={place.id} id={place.id} name={place.name} />
        ) : (
          <span>Discover Hyderabad</span>
        )}
      </div>
      <div className="detail-body">
        {(() => {
          const icon = iconFor(place.category, place.dish, place.name, place.famous_for);
          return icon ? <DetailFoodIcon key={place.id + icon} icon={icon} /> : null;
        })()}
        <span className="eyebrow">
          {place.category} {place.dish && ` / ${place.dish}`}
        </span>
        <h2>{place.name}</h2>
        <div className="detail-discovery-badges">
          {isVerifiedGem(place) && <span className="detail-gem-badge"><Gem size={14} /> Hidden Gem</span>}
          {place.listing_verified_at && <span className="detail-verified-badge"><BadgeCheck size={14} /> Curator verified</span>}
        </div>
        <p className="famous">{place.famous_for}</p>
        {isVerifiedGem(place) && place.hidden_gem_reason && (
          <p className="detail-gem-reason">{place.hidden_gem_reason}</p>
        )}
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
        <p className="quiet">
          {place.listing_verified_at
            ? `Listing checked ${new Date(place.listing_verified_at).toLocaleDateString("en-IN")}. Confirm opening hours before visiting.`
            : "Details are source-listed but not recently verified. Check hours and access before visiting."}
        </p>
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
