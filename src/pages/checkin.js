import ReservationQueuePage from "../components/reservation/ReservationQueuePage";

export default function CheckInPage() {
  return (
    <ReservationQueuePage
      title="Checked in reservations"
      status="checked_in"
      emptyMessage="No checked in reservations."
      hideTitleCount
      showStayNights
    />
  );
}
