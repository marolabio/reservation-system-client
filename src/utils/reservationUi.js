import moment from "moment";

export const statusColors = {
  pending: "default",
  confirmed: "primary",
  checked_in: "success",
  checked_out: "warning",
  cancelled: "secondary",
};

export const paymentTypeLabels = {
  downpayment: "Partial payment",
  partial_payment: "Partial payment",
  full_payment: "Full payment",
  refund: "Refund",
};

export const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "e_wallet", label: "E-wallet" },
  { value: "other", label: "Other" },
];

export function formatMoney(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

export function shortReference(id) {
  return String(id || "").slice(0, 8);
}

export function guestName(customer = {}) {
  return `${customer.first_name || ""} ${customer.last_name || ""}`.trim().toUpperCase() || "GUEST";
}

export function formatDateRange(reservation) {
  if (!reservation) return "";
  return `${moment(reservation.checkin).format("MMM D, YYYY")} - ${moment(reservation.checkout).format("MMM D, YYYY")}`;
}

export function formatDateTime(value) {
  return value ? moment(value).format("MMM D, YYYY h:mm A") : "";
}

export function nextReservationAction(reservation, financials) {
  if (!reservation || ["cancelled", "checked_out"].includes(reservation.status)) return null;

  if (reservation.status === "pending") {
    if (financials.netPaid <= 0) return { label: "Record payment", href: "payment?type=partial_payment" };
    return { label: "Confirm reservation", href: "confirm" };
  }

  if (reservation.status === "confirmed") {
    if (financials.netPaid < financials.checkInPaymentRequired) {
      return { label: "Record payment", href: "payment?type=partial_payment&target=check_in" };
    }
    return { label: "Check in", href: "check-in" };
  }

  if (reservation.status === "checked_in") {
    if (financials.balance > 0) return { label: "Record payment", href: "payment?type=full_payment" };
    return { label: "Check out", href: "check-out" };
  }

  return null;
}
