import ReservationQueuePage from "../components/reservation/ReservationQueuePage";

export default function CheckOutPage() {
  return (
    <ReservationQueuePage
      title="Checked out reservations"
      status="checked_out"
      emptyMessage="No checked out reservations."
      hideTitleCount
      showStayNights
    />
  );
}
