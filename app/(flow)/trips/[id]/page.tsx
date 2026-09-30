import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, LogIn, MapPin } from "lucide-react";
import PressureBadge from "@/components/PressureBadge";
import TopBar from "@/components/TopBar";
import { getDestination } from "@/lib/destinations";
import { formatDate, getTrip } from "@/lib/trips";
import DeleteTripButton from "./DeleteTripButton";
import SavedTripView from "./SavedTripView";

export const metadata = { title: "Saved trip · Travela" };

export default async function TripPage({ params }: PageProps<"/trips/[id]">) {
  const { id } = await params;
  const trip = await getTrip(id);

  if (trip === null) {
    return (
      <>
        <TopBar title="Saved trip" />
        <div className="mx-4 mt-6 rounded-3xl bg-surface p-6 text-center shadow-card">
          <h1 className="font-display text-xl font-extrabold text-navy">Sign in to view this trip</h1>
          <Link
            href={`/login?next=${encodeURIComponent(`/trips/${id}`)}`}
            className="mt-5 flex h-12 items-center justify-center gap-2 rounded-2xl bg-navy font-semibold text-white"
          >
            <LogIn className="size-5" aria-hidden />
            Sign in
          </Link>
        </div>
      </>
    );
  }
  if (trip === "missing") notFound();

  const image = getDestination(trip.destination_slug)?.image;

  return (
    <>
      <div className="relative h-[220px] overflow-hidden rounded-b-[36px] bg-navy">
        <TopBar overlay />
        {image ? (
          <Image src={image} alt={trip.destination_name} fill preload sizes="(max-width: 480px) 100vw, 480px" className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-brand-gradient opacity-90" aria-hidden />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5 text-white">
          <h1 className="font-display text-[26px] leading-tight font-black text-balance">{trip.itinerary.title}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-white/85">
            <span className="flex items-center gap-1">
              <MapPin className="size-4" aria-hidden />
              {trip.destination_name}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="size-4" aria-hidden />
              {trip.days} {trip.days === 1 ? "day" : "days"}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 px-4">
        {trip.pressure_score !== null && <PressureBadge score={trip.pressure_score} showScore />}
        {trip.interests.map((i) => (
          <span key={i} className="rounded-full bg-surface px-3 py-1 text-[12px] font-semibold text-navy ring-1 ring-line">
            {i}
          </span>
        ))}
      </div>
      <p className="mt-2 px-4 text-[12px] text-ink-muted">
        Saved {formatDate(trip.created_at)} ·{" "}
        <Link href={`/d/${trip.destination_slug}`} className="font-semibold text-ocean">
          View destination analysis
        </Link>
      </p>

      <SavedTripView itinerary={trip.itinerary} route={trip.route} destinationName={trip.destination_name} />

      <div className="mt-8 px-4">
        <DeleteTripButton id={trip.id} />
      </div>
    </>
  );
}
