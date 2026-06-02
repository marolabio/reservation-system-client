import ReservationQueuePage from "../components/reservation/ReservationQueuePage";

export default function ConfirmedPage() {
  return (
    <ReservationQueuePage
      title="Confirmed reservations"
      status="confirmed"
      emptyMessage="No confirmed reservations."
    />
  );
}
