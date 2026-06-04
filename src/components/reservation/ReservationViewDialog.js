import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PrintIcon from "@mui/icons-material/Print";
import {
  addReservationPayment,
  cancelReservation,
  deleteReservationPayment,
  getAdminReservationById,
  getReservationFinancials,
  updateReservationPayment,
  updateReservationStatus,
} from "../../services/resortService";
import {
  formatDateRange,
  formatDateTime,
  formatMoney,
  guestName,
  nextReservationAction,
  paymentMethods,
  paymentTypeLabels,
  shortReference,
  statusColors,
} from "../../utils/reservationUi";

const emptyPaymentForm = {
  paymentType: "partial_payment",
  amount: "",
  method: "cash",
  referenceNumber: "",
  notes: "",
};

const emptyCancelForm = {
  refundAmount: "",
  method: "cash",
  referenceNumber: "",
  notes: "",
};

function primaryStatusFromHref(href = "") {
  if (href === "confirm") return "confirmed";
  if (href === "check-in") return "checked_in";
  return "";
}

function DialogCloseButton({ onClick, disabled = false }) {
  return (
    <IconButton
      aria-label="Close"
      onClick={onClick}
      disabled={disabled}
      sx={{ position: "absolute", right: 8, top: 8 }}
    >
      <CloseIcon />
    </IconButton>
  );
}

function FinancialKpi({ label, value, color }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      justifyContent="space-between"
    >
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography
        color={color}
        sx={{ fontWeight: 700, textAlign: "right", whiteSpace: "nowrap" }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function escapePrintValue(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

function formatStatusLabel(status) {
  return String(status || "").replace("_", " ");
}

export default function ReservationViewDialog({
  open,
  reservation,
  onClose,
  onReservationUpdated,
}) {
  const [currentReservation, setCurrentReservation] = useState(reservation);
  const [error, setError] = useState("");
  const [actionSaving, setActionSaving] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [editingPayment, setEditingPayment] = useState(null);
  const [deletePayment, setDeletePayment] = useState(null);
  const [deletePaymentSaving, setDeletePaymentSaving] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelForm, setCancelForm] = useState(emptyCancelForm);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSaving, setCheckoutSaving] = useState(false);

  useEffect(() => {
    setCurrentReservation(reservation);
    setError("");
  }, [reservation]);

  const customer = currentReservation?.customers || {};
  const financials = currentReservation
    ? getReservationFinancials(currentReservation)
    : null;
  const canRecordRefund = (financials?.netPaid || 0) > 0;
  const rooms = currentReservation?.reserved_rooms || [];
  const payments = currentReservation?.reservation_payments || [];
  const stayNights = currentReservation
    ? Math.max(
        Math.ceil(
          (new Date(currentReservation.checkout) -
            new Date(currentReservation.checkin)) /
            (1000 * 60 * 60 * 24),
        ),
        0,
      )
    : 0;
  const nextAction =
    currentReservation && financials
      ? nextReservationAction(currentReservation, financials)
      : null;
  const actionsAvailable =
    currentReservation &&
    !["checked_out", "cancelled"].includes(currentReservation.status);
  const canModifyPayments = !["checked_out", "cancelled"].includes(
    currentReservation?.status,
  );
  const paymentGridColumns = canModifyPayments
    ? "140px minmax(180px, 1fr) 120px 150px 112px"
    : "140px minmax(180px, 1fr) 120px 150px";
  const paymentTableMinWidth = canModifyPayments ? 700 : 588;
  const fullPaymentAmount = Math.max(
    (financials?.balance || 0) +
      (editingPayment && editingPayment.payment_type !== "refund"
        ? Number(editingPayment.amount || 0)
        : 0),
    0,
  );
  const canCancelReservation =
    currentReservation &&
    !["checked_in", "checked_out", "cancelled"].includes(
      currentReservation.status,
    );
  const canPrintReservation = [
    "confirmed",
    "checked_out",
    "cancelled",
  ].includes(currentReservation?.status);
  const printTitle =
    currentReservation?.status === "checked_out"
      ? "Reservation Receipt"
      : currentReservation?.status === "cancelled"
        ? "Cancelled Reservation"
        : "Reservation Confirmation";
  const statusAction =
    currentReservation?.status === "pending"
      ? {
          label: "Confirm reservation",
          href: "confirm",
          disabled: (financials?.netPaid || 0) <= 0,
        }
      : currentReservation?.status === "confirmed"
        ? {
            label: "Check in",
            href: "check-in",
            disabled:
              (financials?.netPaid || 0) <
              (financials?.checkInPaymentRequired || 0),
          }
        : currentReservation?.status === "checked_in"
          ? {
              label: "Check out",
              href: "check-out",
              disabled: (financials?.balance || 0) > 0,
            }
          : null;
  const paymentAction =
    currentReservation?.status === "pending" && (financials?.netPaid || 0) <= 0
      ? { paymentType: "partial_payment", target: "" }
      : currentReservation?.status === "confirmed" &&
          (financials?.netPaid || 0) < (financials?.checkInPaymentRequired || 0)
        ? { paymentType: "partial_payment", target: "check_in" }
        : currentReservation?.status === "checked_in" &&
            (financials?.balance || 0) > 0
          ? { paymentType: "full_payment", target: "" }
          : null;

  const reloadReservation = async () => {
    const nextReservation = await getAdminReservationById(
      currentReservation.id,
    );
    setCurrentReservation(nextReservation);
    onReservationUpdated?.(nextReservation);
    return nextReservation;
  };

  const openPaymentModal = (paymentType = "partial_payment", target = "") => {
    const amountNeededForCheckIn = Math.max(
      (financials?.checkInPaymentRequired || 0) - (financials?.netPaid || 0),
      0,
    );
    const nextAmount =
      paymentType === "refund"
        ? financials.netPaid
        : paymentType === "full_payment"
          ? financials.balance
          : target === "check_in"
            ? Math.min(amountNeededForCheckIn, financials.balance)
            : Math.min(financials.downpaymentRequired, financials.balance);

    setPaymentForm({
      ...emptyPaymentForm,
      paymentType,
      amount: nextAmount > 0 ? String(nextAmount) : "",
    });
    setEditingPayment(null);
    setPaymentOpen(true);
  };

  const openEditPaymentModal = (payment) => {
    setPaymentForm({
      paymentType:
        payment.payment_type === "downpayment"
          ? "partial_payment"
          : payment.payment_type || "partial_payment",
      amount: String(payment.amount || ""),
      method: payment.method || "cash",
      referenceNumber: payment.reference_number || "",
      notes: payment.notes || "",
      paidAt: payment.paid_at || "",
    });
    setEditingPayment(payment);
    setPaymentOpen(true);
  };

  const closePaymentModal = () => {
    if (paymentSaving) return;
    setPaymentOpen(false);
    setPaymentForm(emptyPaymentForm);
    setEditingPayment(null);
  };

  const handlePaymentFormChange = (event) => {
    const { name, value } = event.target;
    setPaymentForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "paymentType" && value === "full_payment"
        ? { amount: fullPaymentAmount > 0 ? String(fullPaymentAmount) : "" }
        : {}),
    }));
  };

  const handleSavePayment = async () => {
    if (!currentReservation) return;
    setPaymentSaving(true);
    setError("");

    try {
      if (editingPayment) {
        await updateReservationPayment(
          currentReservation,
          editingPayment.id,
          paymentForm,
        );
      } else {
        await addReservationPayment(currentReservation, paymentForm);
      }
      await reloadReservation();
      setPaymentOpen(false);
      setPaymentForm(emptyPaymentForm);
      setEditingPayment(null);
    } catch (err) {
      setError(err.message || "Unable to save payment.");
    } finally {
      setPaymentSaving(false);
    }
  };

  const closeDeletePaymentModal = () => {
    if (deletePaymentSaving) return;
    setDeletePayment(null);
  };

  const handleDeletePayment = async () => {
    if (!currentReservation || !deletePayment) return;
    setDeletePaymentSaving(true);
    setError("");

    try {
      await deleteReservationPayment(currentReservation, deletePayment.id);
      await reloadReservation();
      setDeletePayment(null);
    } catch (err) {
      setError(err.message || "Unable to delete payment.");
    } finally {
      setDeletePaymentSaving(false);
    }
  };

  const openCancelModal = () => {
    setCancelForm({
      ...emptyCancelForm,
      refundAmount: canRecordRefund ? String(financials.netPaid) : "",
    });
    setCancelOpen(true);
  };

  const closeCancelModal = () => {
    if (cancelSaving) return;
    setCancelOpen(false);
    setCancelForm(emptyCancelForm);
  };

  const handleCancelFormChange = (event) => {
    setCancelForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleCancelReservation = async () => {
    if (!currentReservation) return;
    setCancelSaving(true);
    setError("");

    try {
      await cancelReservation(currentReservation, cancelForm);
      await reloadReservation();
      setCancelOpen(false);
      setCancelForm(emptyCancelForm);
      onClose?.();
    } catch (err) {
      setError(err.message || "Unable to cancel reservation.");
    } finally {
      setCancelSaving(false);
    }
  };

  const closeCheckoutModal = () => {
    if (checkoutSaving) return;
    setCheckoutOpen(false);
  };

  const handleCheckoutReservation = async () => {
    if (!currentReservation) return;
    setCheckoutSaving(true);
    setError("");

    try {
      await updateReservationStatus(currentReservation.id, "checked_out");
      await reloadReservation();
      setCheckoutOpen(false);
      onClose?.();
    } catch (err) {
      setError(err.message || "Unable to check out guest.");
    } finally {
      setCheckoutSaving(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (!nextAction || !currentReservation) return;

    if (nextAction.href.startsWith("payment")) {
      const paymentType = nextAction.href.includes("full_payment")
        ? "full_payment"
        : nextAction.href.includes("partial_payment")
          ? "partial_payment"
          : "partial_payment";
      const target = nextAction.href.includes("target=check_in")
        ? "check_in"
        : "";
      openPaymentModal(paymentType, target);
      return;
    }

    if (nextAction.href === "check-out") {
      setCheckoutOpen(true);
      return;
    }

    const nextStatus = primaryStatusFromHref(nextAction.href);
    if (!nextStatus) return;

    setActionSaving(true);
    setError("");
    try {
      await updateReservationStatus(currentReservation.id, nextStatus);
      await reloadReservation();
    } catch (err) {
      setError(err.message || "Unable to update reservation.");
    } finally {
      setActionSaving(false);
    }
  };

  const handleStatusAction = async () => {
    if (!statusAction || !currentReservation || statusAction.disabled) return;

    if (statusAction.href === "check-out") {
      setCheckoutOpen(true);
      return;
    }

    const nextStatus = primaryStatusFromHref(statusAction.href);
    if (!nextStatus) return;

    setActionSaving(true);
    setError("");
    try {
      await updateReservationStatus(currentReservation.id, nextStatus);
      await reloadReservation();
      onClose?.();
    } catch (err) {
      setError(err.message || "Unable to update reservation.");
    } finally {
      setActionSaving(false);
    }
  };

  const handlePrintConfirmation = () => {
    if (!currentReservation || !financials) return;

    const printWindow = window.open("", "_blank", "width=840,height=960");
    if (!printWindow) {
      setError("Unable to open print window.");
      return;
    }

    const roomRows = rooms.length
      ? rooms
          .map(
            (reservedRoom) => `
          <tr>
            <td>${escapePrintValue(reservedRoom.rooms?.name || "Room")}</td>
            <td>${escapePrintValue(reservedRoom.reserved_quantity || 0)}</td>
            <td>${escapePrintValue(formatMoney(reservedRoom.rooms?.rate))} / night</td>
          </tr>
        `,
          )
          .join("")
      : `<tr><td colspan="3">No rooms recorded.</td></tr>`;

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapePrintValue(printTitle)} ${escapePrintValue(shortReference(currentReservation.id))}</title>
          <style>
            body { color: #111827; font-family: Arial, sans-serif; margin: 40px; }
            h1 { font-size: 24px; margin: 0 0 4px; }
            h2 { border-bottom: 1px solid #e5e7eb; font-size: 15px; margin: 28px 0 12px; padding-bottom: 8px; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border-bottom: 1px solid #e5e7eb; padding: 9px 0; text-align: left; }
            th { color: #6b7280; font-size: 12px; text-transform: uppercase; }
            .muted { color: #6b7280; }
            .grid { display: grid; gap: 12px 32px; grid-template-columns: 1fr 1fr; }
            .label { color: #6b7280; font-size: 12px; margin-bottom: 3px; }
            .value { font-weight: 700; }
            .summary td:last-child { font-weight: 700; text-align: right; }
            @media print { body { margin: 24px; } }
          </style>
        </head>
        <body>
          <h1>${escapePrintValue(printTitle)}</h1>
          <div class="muted">Ref ${escapePrintValue(shortReference(currentReservation.id))}</div>

          <h2>Guest</h2>
          <div class="grid">
            <div><div class="label">Name</div><div class="value">${escapePrintValue(guestName(customer))}</div></div>
            <div><div class="label">Status</div><div class="value">${escapePrintValue(formatStatusLabel(currentReservation.status))}</div></div>
            <div><div class="label">Email</div><div class="value">${escapePrintValue(customer.email || "No email")}</div></div>
            <div><div class="label">Contact</div><div class="value">${escapePrintValue(customer.contact_number || "No contact number")}</div></div>
            <div><div class="label">Stay</div><div class="value">${escapePrintValue(formatDateRange(currentReservation))}</div></div>
            <div><div class="label">Guests</div><div class="value">${escapePrintValue(`${currentReservation.adult || 0} adult, ${currentReservation.children || 0} child`)}</div></div>
          </div>

          <h2>Rooms</h2>
          <table>
            <thead><tr><th>Room</th><th>Qty</th><th>Rate</th></tr></thead>
            <tbody>${roomRows}</tbody>
          </table>

          <h2>Payment Summary</h2>
          <table class="summary">
            <tbody>
              <tr><td>Total</td><td>${escapePrintValue(formatMoney(financials.total))}</td></tr>
              <tr><td>Paid</td><td>${escapePrintValue(formatMoney(financials.paid))}</td></tr>
              ${financials.refunded > 0 ? `<tr><td>Refunded</td><td>${escapePrintValue(formatMoney(financials.refunded))}</td></tr>` : ""}
              <tr><td>Balance</td><td>${escapePrintValue(formatMoney(financials.balance))}</td></tr>
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ pb: 1, pr: 6, position: "relative" }}>
          <DialogCloseButton onClick={onClose} />
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Box>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ flexWrap: "wrap" }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {currentReservation ? guestName(customer) : "Reservation"}
                </Typography>
                {currentReservation && (
                  <Chip
                    label={currentReservation.status}
                    color={statusColors[currentReservation.status] || "default"}
                    size="small"
                  />
                )}
              </Stack>
              {currentReservation && (
                <Typography color="text.secondary" variant="body2">
                  Ref {shortReference(currentReservation.id)} /{" "}
                  {formatDateRange(currentReservation)}
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {currentReservation && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
                  Reservation summary
                </Typography>
                <Stack spacing={2.5}>
                  <Box
                    sx={{
                      display: "grid",
                      gap: 3,
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "minmax(0, 1.3fr) minmax(0, 1fr) minmax(220px, 0.8fr)",
                      },
                    }}
                  >
                    <Stack spacing={1}>
                      <Box>
                        <Typography color="text.secondary" variant="caption">
                          Guest
                        </Typography>
                        <Typography>{guestName(customer)}</Typography>
                      </Box>
                      <Box>
                        <Typography color="text.secondary" variant="caption">
                          Contact
                        </Typography>
                        <Typography variant="body2">
                          {customer.email || "No email"}
                        </Typography>
                        <Typography variant="body2">
                          {customer.contact_number || "No contact number"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography color="text.secondary" variant="caption">
                          Status
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ textTransform: "capitalize" }}
                        >
                          {String(currentReservation.status || "").replace(
                            "_",
                            " ",
                          )}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack spacing={1}>
                      <Box>
                        <Typography color="text.secondary" variant="caption">
                          Stay
                        </Typography>
                        <Typography variant="body2">
                          {formatDateRange(currentReservation)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography color="text.secondary" variant="caption">
                          Nights
                        </Typography>
                        <Typography variant="body2">
                          {stayNights} {stayNights === 1 ? "night" : "nights"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography color="text.secondary" variant="caption">
                          Guests
                        </Typography>
                        <Typography variant="body2">
                          {currentReservation.adult || 0} adult
                          {Number(currentReservation.adult) === 1 ? "" : "s"},{" "}
                          {currentReservation.children || 0} child
                          {Number(currentReservation.children) === 1
                            ? ""
                            : "ren"}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack
                      spacing={1.25}
                      sx={{ bgcolor: "action.hover", borderRadius: 1, p: 1.5 }}
                    >
                      <FinancialKpi
                        label="Total"
                        value={formatMoney(financials.total)}
                      />
                      <FinancialKpi
                        label="Paid"
                        value={formatMoney(financials.paid)}
                        color="success.main"
                      />
                      <Divider />
                      <FinancialKpi
                        label="Balance"
                        value={formatMoney(financials.balance)}
                        color={
                          financials.balance > 0 ? "error.main" : "success.main"
                        }
                      />
                    </Stack>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
                      Rooms
                    </Typography>
                    {rooms.length ? (
                      <Box
                        sx={{
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          overflowX: "auto",
                        }}
                      >
                        <Box
                          sx={{
                            bgcolor: "action.hover",
                            display: "grid",
                            gap: 1,
                            gridTemplateColumns:
                              "minmax(160px, 1fr) 64px 120px 72px 120px",
                            minWidth: 620,
                            px: 1.5,
                            py: 1,
                          }}
                        >
                          <Typography color="text.secondary" variant="caption">
                            Room
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="caption"
                            sx={{ textAlign: "right" }}
                          >
                            Qty
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="caption"
                            sx={{ textAlign: "right" }}
                          >
                            Rate
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="caption"
                            sx={{ textAlign: "right" }}
                          >
                            Nights
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="caption"
                            sx={{ textAlign: "right" }}
                          >
                            Total
                          </Typography>
                        </Box>
                        {rooms.map((reservedRoom) => {
                          const quantity = Number(
                            reservedRoom.reserved_quantity || 0,
                          );
                          const rate = Number(reservedRoom.rooms?.rate || 0);
                          const lineTotal = quantity * rate * stayNights;

                          return (
                            <Box
                              key={reservedRoom.id}
                              sx={{
                                borderTop: 1,
                                borderColor: "divider",
                                display: "grid",
                                gap: 1,
                                gridTemplateColumns:
                                  "minmax(160px, 1fr) 64px 120px 72px 120px",
                                minWidth: 620,
                                px: 1.5,
                                py: 1.25,
                              }}
                            >
                              <Typography>
                                {reservedRoom.rooms?.name || "Room"}
                              </Typography>
                              <Typography sx={{ textAlign: "right" }}>
                                {quantity}
                              </Typography>
                              <Typography sx={{ textAlign: "right" }}>
                                {formatMoney(rate)}
                              </Typography>
                              <Typography sx={{ textAlign: "right" }}>
                                {stayNights}
                              </Typography>
                              <Typography sx={{ textAlign: "right" }}>
                                {formatMoney(lineTotal)}
                              </Typography>
                            </Box>
                          );
                        })}
                        <Box
                          sx={{
                            borderTop: 1,
                            borderColor: "divider",
                            display: "grid",
                            gap: 1,
                            gridTemplateColumns:
                              "minmax(160px, 1fr) 64px 120px 72px 120px",
                            minWidth: 620,
                            px: 1.5,
                            py: 1.25,
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: 700,
                              gridColumn: "1 / 5",
                              textAlign: "right",
                            }}
                          >
                            Room total
                          </Typography>
                          <Typography
                            sx={{ fontWeight: 700, textAlign: "right" }}
                          >
                            {formatMoney(financials.total)}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        No rooms recorded.
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
                  Payments
                </Typography>
                {payments.length ? (
                  <Box
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      overflowX: "auto",
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: "action.hover",
                        display: "grid",
                        gap: 1,
                        gridTemplateColumns: paymentGridColumns,
                        minWidth: paymentTableMinWidth,
                        pl: 1.5,
                        pr: 0.75,
                        py: 1,
                      }}
                    >
                      <Typography color="text.secondary" variant="caption">
                        Date
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        Type
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        Method
                      </Typography>
                      <Typography
                        color="text.secondary"
                        variant="caption"
                        sx={{ textAlign: "right" }}
                      >
                        Amount
                      </Typography>
                      {canModifyPayments && (
                        <Typography
                          color="text.secondary"
                          variant="caption"
                          sx={{ textAlign: "right" }}
                        >
                          Actions
                        </Typography>
                      )}
                    </Box>
                    {[...payments]
                      .sort(
                        (first, second) =>
                          new Date(second.paid_at) - new Date(first.paid_at),
                      )
                      .map((payment) => (
                        <Box
                          key={payment.id}
                          sx={{
                            alignItems: "center",
                            borderTop: 1,
                            borderColor: "divider",
                            display: "grid",
                            gap: 1,
                            gridTemplateColumns: paymentGridColumns,
                            minWidth: paymentTableMinWidth,
                            pl: 1.5,
                            pr: 0.75,
                            py: 1,
                          }}
                        >
                          <Typography variant="body2">
                            {formatDateTime(payment.paid_at)}
                          </Typography>
                          <Typography variant="body2">
                            {paymentTypeLabels[payment.payment_type] ||
                              payment.payment_type}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ textTransform: "capitalize" }}
                          >
                            {String(payment.method || "").replace("_", " ")}
                          </Typography>
                          <Typography
                            sx={{ textAlign: "right", whiteSpace: "nowrap" }}
                            color={
                              payment.payment_type === "refund"
                                ? "error.main"
                                : "success.main"
                            }
                          >
                            {payment.payment_type === "refund" ? "-" : "+"}
                            {formatMoney(payment.amount)}
                          </Typography>
                          {canModifyPayments && (
                            <Box sx={{ display: "flex", justifyContent:"flex-end" }}>
                              <IconButton
                                aria-label="Edit payment"
                                size="small"
                                onClick={() => openEditPaymentModal(payment)}
                                sx={{ p: 0.5 }}
                              >
                                <EditIcon fontSize="inherit" />
                              </IconButton>
                              <IconButton
                                aria-label="Delete payment"
                                size="small"
                                color="error"
                                onClick={() => setDeletePayment(payment)}
                                sx={{ p: 0.5 }}
                              >
                                <DeleteIcon fontSize="inherit" />
                              </IconButton>
                            </Box>
                          )}
                        </Box>
                      ))}
                    <Box
                      sx={{
                        borderTop: 1,
                        borderColor: "divider",
                        display: "grid",
                        gap: 1,
                        gridTemplateColumns: paymentGridColumns,
                        minWidth: paymentTableMinWidth,
                        pl: 1.5,
                        pr: 0.75,
                        py: 1.25,
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 700,
                          gridColumn: "1 / 4",
                          textAlign: "right",
                        }}
                      >
                        Net paid
                      </Typography>
                      <Typography sx={{ fontWeight: 700, textAlign: "right" }}>
                        {formatMoney(financials.netPaid)}
                      </Typography>
                      {canModifyPayments && <Box />}
                    </Box>
                  </Box>
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    No payments recorded.
                  </Typography>
                )}
              </Paper>
            </Stack>
          )}
        </DialogContent>
        {currentReservation && (actionsAvailable || canPrintReservation) && (
          <DialogActions
            sx={{
              flexWrap: "wrap",
              gap: 1,
              justifyContent: "flex-end",
              px: 3,
              py: 2,
            }}
          >
            {canPrintReservation && (
              <Button
                onClick={handlePrintConfirmation}
                variant="outlined"
                startIcon={<PrintIcon />}
              >
                {currentReservation.status === "checked_out"
                  ? "Print receipt"
                  : currentReservation.status === "cancelled"
                    ? "Print cancellation"
                    : "Print confirmation"}
              </Button>
            )}
            {canCancelReservation && (
              <Button
                onClick={openCancelModal}
                color="error"
                variant="outlined"
              >
                Cancel reservation
              </Button>
            )}
            {paymentAction && (
              <Button
                onClick={() =>
                  openPaymentModal(
                    paymentAction.paymentType,
                    paymentAction.target,
                  )
                }
                variant="outlined"
              >
                Record payment
              </Button>
            )}
            {statusAction ? (
              <Button
                variant="contained"
                onClick={handleStatusAction}
                disabled={actionSaving || statusAction.disabled}
              >
                {actionSaving ? "Saving..." : statusAction.label}
              </Button>
            ) : nextAction ? (
              <Button
                variant="contained"
                onClick={handlePrimaryAction}
                disabled={actionSaving}
              >
                {actionSaving ? "Saving..." : nextAction.label}
              </Button>
            ) : null}
          </DialogActions>
        )}
      </Dialog>

      <Dialog
        open={paymentOpen}
        onClose={closePaymentModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          {editingPayment ? "Edit payment" : "Record payment"}
          <DialogCloseButton
            onClick={closePaymentModal}
            disabled={paymentSaving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {currentReservation
                  ? guestName(currentReservation.customers)
                  : ""}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Balance {formatMoney(financials?.balance)} / Net paid{" "}
                {formatMoney(financials?.netPaid)}
              </Typography>
            </Paper>
            <TextField
              select
              label="Type"
              name="paymentType"
              value={paymentForm.paymentType}
              onChange={handlePaymentFormChange}
              fullWidth
            >
              <MenuItem value="partial_payment">
                {paymentTypeLabels.partial_payment}
              </MenuItem>
              <MenuItem value="full_payment">
                {paymentTypeLabels.full_payment}
              </MenuItem>
              {editingPayment?.payment_type === "refund" && (
                <MenuItem value="refund">
                  {paymentTypeLabels.refund || "Refund"}
                </MenuItem>
              )}
            </TextField>
            <TextField
              label="Amount"
              name="amount"
              type="number"
              value={paymentForm.amount}
              onChange={handlePaymentFormChange}
              inputProps={{
                min:
                  paymentForm.paymentType === "full_payment"
                    ? fullPaymentAmount || 1
                    : 1,
                readOnly: paymentForm.paymentType === "full_payment",
                step: "0.01",
              }}
              helperText={
                paymentForm.paymentType === "full_payment"
                  ? "Full payment uses the remaining balance."
                  : ""
              }
              fullWidth
              required
            />
            <TextField
              select
              label="Method"
              name="method"
              value={paymentForm.method}
              onChange={handlePaymentFormChange}
              fullWidth
            >
              {paymentMethods.map((method) => (
                <MenuItem key={method.value} value={method.value}>
                  {method.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Notes"
              name="notes"
              value={paymentForm.notes}
              onChange={handlePaymentFormChange}
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={handleSavePayment}
            disabled={paymentSaving || !paymentForm.amount}
          >
            {paymentSaving
              ? "Saving..."
              : editingPayment
                ? "Update payment"
                : "Save payment"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deletePayment)}
        onClose={closeDeletePaymentModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          Delete payment
          <DialogCloseButton
            onClick={closeDeletePaymentModal}
            disabled={deletePaymentSaving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              This will remove the payment from the reservation and recalculate
              the financials.
            </Alert>
            {deletePayment && (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 800 }}>
                  {deletePayment.payment_type === "refund" ? "-" : "+"}
                  {formatMoney(deletePayment.amount)}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {paymentTypeLabels[deletePayment.payment_type] ||
                    deletePayment.payment_type}{" "}
                  / {formatDateTime(deletePayment.paid_at)}
                </Typography>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeDeletePaymentModal}
            disabled={deletePaymentSaving}
          >
            Keep payment
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeletePayment}
            disabled={deletePaymentSaving}
          >
            {deletePaymentSaving ? "Deleting..." : "Delete payment"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={cancelOpen}
        onClose={closeCancelModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          Cancel reservation
          <DialogCloseButton
            onClick={closeCancelModal}
            disabled={cancelSaving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {currentReservation
                  ? guestName(currentReservation.customers)
                  : ""}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Net paid {formatMoney(financials?.netPaid)}
              </Typography>
            </Paper>
            {canRecordRefund ? (
              <>
                <TextField
                  label="Refund amount"
                  name="refundAmount"
                  type="number"
                  value={cancelForm.refundAmount}
                  onChange={handleCancelFormChange}
                  inputProps={{
                    min: 0.01,
                    max: financials?.netPaid || 0,
                    step: "0.01",
                  }}
                  helperText="Required when there is a refundable amount."
                  fullWidth
                />
                <TextField
                  select
                  label="Refund method"
                  name="method"
                  value={cancelForm.method}
                  onChange={handleCancelFormChange}
                  fullWidth
                >
                  {paymentMethods.map((method) => (
                    <MenuItem key={method.value} value={method.value}>
                      {method.label}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            ) : (
              <Typography color="text.secondary" variant="body2">
                No refundable amount.
              </Typography>
            )}
            <TextField
              label="Cancellation notes"
              name="notes"
              value={cancelForm.notes}
              onChange={handleCancelFormChange}
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            variant="contained"
            onClick={handleCancelReservation}
            disabled={
              cancelSaving ||
              (
                canRecordRefund &&
                (!Number.isFinite(Number(cancelForm.refundAmount)) || Number(cancelForm.refundAmount) <= 0)
              )
            }
          >
            {cancelSaving ? "Cancelling..." : "Cancel reservation"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={checkoutOpen}
        onClose={closeCheckoutModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          Check out guest
          <DialogCloseButton
            onClick={closeCheckoutModal}
            disabled={checkoutSaving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {currentReservation
                  ? guestName(currentReservation.customers)
                  : ""}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Balance {formatMoney(financials?.balance)}
              </Typography>
            </Paper>
            <Typography color="text.secondary">
              Confirm that the guest has settled the stay and is ready to check
              out.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={handleCheckoutReservation}
            disabled={checkoutSaving || (financials?.balance || 0) > 0}
          >
            {checkoutSaving ? "Checking out..." : "Check out"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
