import ReservationQueuePage from "../components/reservation/ReservationQueuePage";

export default function CancelledPage() {
  return (
    <ReservationQueuePage
      title="Cancelled reservations"
      status="cancelled"
      emptyMessage="No cancelled reservations."
    />
  );
}
