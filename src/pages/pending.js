import ReservationQueuePage from "../components/reservation/ReservationQueuePage";

export default function PendingPage() {
  return (
    <ReservationQueuePage
      title="Pending reservations"
      status="pending"
      emptyMessage="No pending reservations."
    />
  );
}
