import ReservationQueuePage from "../components/reservation/ReservationQueuePage";

const bookingTabs = [
  { label: "Pending", status: "pending", emptyMessage: "No pending reservations." },
  { label: "Confirmed", status: "confirmed", emptyMessage: "No confirmed reservations." },
  { label: "Checked in", status: "checked_in", emptyMessage: "No checked in reservations." },
  { label: "No show", status: "no_show", emptyMessage: "No no-show reservations." },
  { label: "Cancelled", status: "cancelled", emptyMessage: "No cancelled reservations." },
];

export default function BookingsPage() {
  return (
    <ReservationQueuePage
      title="Bookings"
      status="pending"
      tabs={bookingTabs}
      hideTitleCount
      showStayNights
    />
  );
}
