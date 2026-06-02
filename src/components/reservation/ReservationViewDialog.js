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
import {
  addReservationPayment,
  cancelReservation,
  getAdminReservationById,
  getReservationFinancials,
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
  paymentType: "downpayment",
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

export default function ReservationViewDialog({ open, reservation, onClose, onReservationUpdated }) {
  const [currentReservation, setCurrentReservation] = useState(reservation);
  const [error, setError] = useState("");
  const [actionSaving, setActionSaving] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
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
  const financials = currentReservation ? getReservationFinancials(currentReservation) : null;
  const rooms = currentReservation?.reserved_rooms || [];
  const payments = currentReservation?.reservation_payments || [];
  const nextAction = currentReservation && financials ? nextReservationAction(currentReservation, financials) : null;
  const actionsAvailable = currentReservation && !["checked_out", "cancelled"].includes(currentReservation.status);
  const canCancelReservation = currentReservation && !["checked_in", "checked_out", "cancelled"].includes(currentReservation.status);

  const reloadReservation = async () => {
    const nextReservation = await getAdminReservationById(currentReservation.id);
    setCurrentReservation(nextReservation);
    onReservationUpdated?.(nextReservation);
    return nextReservation;
  };

  const openPaymentModal = (paymentType = "downpayment", target = "") => {
    const amountNeededForCheckIn = Math.max((financials?.checkInPaymentRequired || 0) - (financials?.netPaid || 0), 0);
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
    setPaymentOpen(true);
  };

  const closePaymentModal = () => {
    if (paymentSaving) return;
    setPaymentOpen(false);
    setPaymentForm(emptyPaymentForm);
  };

  const handlePaymentFormChange = (event) => {
    setPaymentForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSavePayment = async () => {
    if (!currentReservation) return;
    setPaymentSaving(true);
    setError("");

    try {
      await addReservationPayment(currentReservation, paymentForm);
      await reloadReservation();
      setPaymentOpen(false);
      setPaymentForm(emptyPaymentForm);
    } catch (err) {
      setError(err.message || "Unable to record payment.");
    } finally {
      setPaymentSaving(false);
    }
  };

  const openCancelModal = () => {
    setCancelForm(emptyCancelForm);
    setCancelOpen(true);
  };

  const closeCancelModal = () => {
    if (cancelSaving) return;
    setCancelOpen(false);
    setCancelForm(emptyCancelForm);
  };

  const handleCancelFormChange = (event) => {
    setCancelForm((current) => ({ ...current, [event.target.name]: event.target.value }));
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
    } catch (err) {
      setError(err.message || "Unable to check out guest.");
    } finally {
      setCheckoutSaving(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (!nextAction || !currentReservation) return;

    if (nextAction.href.startsWith("payment")) {
      const paymentType = nextAction.href.includes("full_payment") ? "full_payment" : "downpayment";
      const target = nextAction.href.includes("target=check_in") ? "check_in" : "";
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

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ pb: 1, pr: 6, position: "relative" }}>
          <DialogCloseButton onClick={onClose} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {currentReservation ? guestName(customer) : "Reservation"}
                </Typography>
                {currentReservation && (
                  <Chip label={currentReservation.status} color={statusColors[currentReservation.status] || "default"} size="small" />
                )}
              </Stack>
              {currentReservation && (
                <Typography color="text.secondary" variant="body2">
                  Ref {shortReference(currentReservation.id)} / {formatDateRange(currentReservation)}
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {currentReservation && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                  }}
                >
                  <Box>
                    <Typography color="text.secondary" variant="caption">Contact</Typography>
                    <Typography variant="body2">{customer.email || "No email"}</Typography>
                    <Typography variant="body2">{customer.contact_number || "No contact number"}</Typography>
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="caption">Guests</Typography>
                    <Typography variant="body2">
                      {currentReservation.adult || 0} adult{Number(currentReservation.adult) === 1 ? "" : "s"}, {currentReservation.children || 0} child
                      {Number(currentReservation.children) === 1 ? "" : "ren"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="caption">Stay</Typography>
                    <Typography variant="body2">{formatDateRange(currentReservation)}</Typography>
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="caption">Status</Typography>
                    <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                      {String(currentReservation.status || "").replace("_", " ")}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>Financials</Typography>
                <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(4, minmax(0, 1fr))" } }}>
                  <Box>
                    <Typography color="text.secondary" variant="caption">Total</Typography>
                    <Typography sx={{ fontWeight: 800 }}>{formatMoney(financials.total)}</Typography>
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="caption">Paid</Typography>
                    <Typography sx={{ fontWeight: 800 }}>{formatMoney(financials.paid)}</Typography>
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="caption">Refunded</Typography>
                    <Typography sx={{ fontWeight: 800 }}>{formatMoney(financials.refunded)}</Typography>
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="caption">Balance</Typography>
                    <Typography sx={{ fontWeight: 800 }} color={financials.balance > 0 ? "error" : "success.main"}>
                      {formatMoney(financials.balance)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>Rooms</Typography>
                {rooms.length ? (
                  <Stack divider={<Divider />} spacing={1}>
                    {rooms.map((reservedRoom) => (
                      <Box key={reservedRoom.id} sx={{ py: 0.75 }}>
                        <Typography sx={{ fontWeight: 700 }}>
                          {reservedRoom.rooms?.name || "Room"} x {reservedRoom.reserved_quantity}
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                          {formatMoney(reservedRoom.rooms?.rate)} / night
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary" variant="body2">No rooms recorded.</Typography>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>Payments</Typography>
                {payments.length ? (
                  <Stack divider={<Divider />} spacing={1}>
                    {[...payments]
                      .sort((first, second) => new Date(second.paid_at) - new Date(first.paid_at))
                      .map((payment) => (
                        <Box key={payment.id} sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "1fr auto" }, py: 0.75 }}>
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>
                              {paymentTypeLabels[payment.payment_type] || payment.payment_type}
                            </Typography>
                            <Typography color="text.secondary" variant="body2">
                              {String(payment.method || "").replace("_", " ")}
                              {payment.reference_number ? ` / ${payment.reference_number}` : ""} / {formatDateTime(payment.paid_at)}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontWeight: 800 }} color={payment.payment_type === "refund" ? "error.main" : "success.main"}>
                            {payment.payment_type === "refund" ? "-" : "+"}
                            {formatMoney(payment.amount)}
                          </Typography>
                        </Box>
                      ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary" variant="body2">No payments recorded.</Typography>
                )}
              </Paper>
            </Stack>
          )}
        </DialogContent>
        {currentReservation && actionsAvailable && (
          <DialogActions sx={{ flexWrap: "wrap", gap: 1, justifyContent: "flex-end", px: 3, py: 2 }}>
            <Button onClick={() => openPaymentModal("downpayment")} variant="outlined" disabled={financials.balance <= 0}>
              Record payment
            </Button>
            <Button onClick={() => openPaymentModal("refund")} variant="outlined" disabled={financials.netPaid <= 0}>
              Refund
            </Button>
            {canCancelReservation && (
              <Button onClick={openCancelModal} color="error" variant="outlined">
                Cancel reservation
              </Button>
            )}
            {nextAction && (
              <Button variant="contained" onClick={handlePrimaryAction} disabled={actionSaving}>
                {actionSaving ? "Saving..." : nextAction.label}
              </Button>
            )}
          </DialogActions>
        )}
      </Dialog>

      <Dialog open={paymentOpen} onClose={closePaymentModal} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          {paymentForm.paymentType === "refund" ? "Record refund" : "Record payment"}
          <DialogCloseButton onClick={closePaymentModal} disabled={paymentSaving} />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>{currentReservation ? guestName(currentReservation.customers) : ""}</Typography>
              <Typography color="text.secondary" variant="body2">
                Balance {formatMoney(financials?.balance)} / Net paid {formatMoney(financials?.netPaid)}
              </Typography>
            </Paper>
            <TextField select label="Type" name="paymentType" value={paymentForm.paymentType} onChange={handlePaymentFormChange} fullWidth>
              <MenuItem value="downpayment">{paymentTypeLabels.downpayment}</MenuItem>
              <MenuItem value="full_payment">{paymentTypeLabels.full_payment}</MenuItem>
              <MenuItem value="refund">{paymentTypeLabels.refund}</MenuItem>
            </TextField>
            <TextField
              label="Amount"
              name="amount"
              type="number"
              value={paymentForm.amount}
              onChange={handlePaymentFormChange}
              inputProps={{ min: 1, step: "0.01" }}
              fullWidth
              required
            />
            <TextField select label="Method" name="method" value={paymentForm.method} onChange={handlePaymentFormChange} fullWidth>
              {paymentMethods.map((method) => (
                <MenuItem key={method.value} value={method.value}>{method.label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Reference number" name="referenceNumber" value={paymentForm.referenceNumber} onChange={handlePaymentFormChange} fullWidth />
            <TextField label="Notes" name="notes" value={paymentForm.notes} onChange={handlePaymentFormChange} fullWidth multiline minRows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleSavePayment} disabled={paymentSaving || !paymentForm.amount}>
            {paymentSaving ? "Saving..." : paymentForm.paymentType === "refund" ? "Save refund" : "Save payment"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelOpen} onClose={closeCancelModal} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          Cancel reservation
          <DialogCloseButton onClick={closeCancelModal} disabled={cancelSaving} />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>{currentReservation ? guestName(currentReservation.customers) : ""}</Typography>
              <Typography color="text.secondary" variant="body2">
                Net paid {formatMoney(financials?.netPaid)}
              </Typography>
            </Paper>
            <TextField
              label="Refund amount"
              name="refundAmount"
              type="number"
              value={cancelForm.refundAmount}
              onChange={handleCancelFormChange}
              inputProps={{ min: 0, max: financials?.netPaid || 0, step: "0.01" }}
              helperText="Leave blank or 0 if there is no refund."
              fullWidth
            />
            <TextField select label="Refund method" name="method" value={cancelForm.method} onChange={handleCancelFormChange} fullWidth>
              {paymentMethods.map((method) => (
                <MenuItem key={method.value} value={method.value}>{method.label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Reference number" name="referenceNumber" value={cancelForm.referenceNumber} onChange={handleCancelFormChange} fullWidth />
            <TextField label="Cancellation notes" name="notes" value={cancelForm.notes} onChange={handleCancelFormChange} fullWidth multiline minRows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="error" variant="contained" onClick={handleCancelReservation} disabled={cancelSaving}>
            {cancelSaving ? "Cancelling..." : "Cancel reservation"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={checkoutOpen} onClose={closeCheckoutModal} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          Check out guest
          <DialogCloseButton onClick={closeCheckoutModal} disabled={checkoutSaving} />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>{currentReservation ? guestName(currentReservation.customers) : ""}</Typography>
              <Typography color="text.secondary" variant="body2">
                Balance {formatMoney(financials?.balance)}
              </Typography>
            </Paper>
            <Typography color="text.secondary">
              Confirm that the guest has settled the stay and is ready to check out.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleCheckoutReservation} disabled={checkoutSaving || (financials?.balance || 0) > 0}>
            {checkoutSaving ? "Checking out..." : "Check out"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
