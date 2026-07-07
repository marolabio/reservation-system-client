import ReservationQueuePage from "../components/reservation/ReservationQueuePage";

export default function NoShowPage() {
  return (
    <ReservationQueuePage
      title="No-show reservations"
      status="no_show"
      emptyMessage="No no-show reservations."
      hideTitleCount
      hideFinancials
      showStayNights
    />
  );
}
