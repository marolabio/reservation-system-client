import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AdminLayout from "../../../components/layout/AdminLayout";
import supabase from "../../../utils/supabase";
import {
  addReservationPayment,
  cancelReservation,
  deleteReservationPayment,
  getAdminReservationById,
  getReservationFinancials,
  updateReservationPayment,
} from "../../../services/resortService";
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
} from "../../../utils/reservationUi";

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

export default function ReservationDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelForm, setCancelForm] = useState(emptyCancelForm);
  const [editPayment, setEditPayment] = useState(null);
  const [editPaymentSaving, setEditPaymentSaving] = useState(false);
  const [editPaymentDeleting, setEditPaymentDeleting] = useState(false);
  const [editPaymentForm, setEditPaymentForm] = useState(emptyPaymentForm);

  useEffect(() => {
    async function loadReservation() {
      if (!router.isReady) return;

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/admin");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const nextReservation = await getAdminReservationById(id);
        setReservation(nextReservation);
      } catch (err) {
        setError(err.message || "Unable to load reservation.");
      } finally {
        setLoading(false);
      }
    }

    loadReservation();
  }, [id, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  };

  const financials = reservation ? getReservationFinancials(reservation) : null;
  const nextAction = reservation && financials ? nextReservationAction(reservation, financials) : null;
  const basePath = reservation ? `/reservations/${reservation.id}` : "";

  const reloadReservation = async () => {
    const nextReservation = await getAdminReservationById(id);
    setReservation(nextReservation);
    return nextReservation;
  };

  const openPaymentModal = (paymentType = "downpayment") => {
    const nextAmount =
      paymentType === "refund"
        ? financials.netPaid
        : paymentType === "full_payment"
          ? financials.balance
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
    if (!reservation) return;
    setPaymentSaving(true);
    setError("");

    try {
      await addReservationPayment(reservation, paymentForm);
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
    if (!reservation) return;
    setCancelSaving(true);
    setError("");

    try {
      await cancelReservation(reservation, cancelForm);
      await reloadReservation();
      setCancelOpen(false);
      setCancelForm(emptyCancelForm);
    } catch (err) {
      setError(err.message || "Unable to cancel reservation.");
    } finally {
      setCancelSaving(false);
    }
  };

  const openEditPaymentModal = (payment) => {
    setEditPayment(payment);
    setEditPaymentForm({
      paymentType: payment.payment_type,
      amount: String(payment.amount),
      method: payment.method || "cash",
      referenceNumber: payment.reference_number || "",
      notes: payment.notes || "",
    });
  };

  const closeEditPaymentModal = () => {
    if (editPaymentSaving || editPaymentDeleting) return;
    setEditPayment(null);
    setEditPaymentForm(emptyPaymentForm);
  };

  const handleEditPaymentFormChange = (event) => {
    setEditPaymentForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSaveEditPayment = async () => {
    if (!reservation || !editPayment) return;
    setEditPaymentSaving(true);
    setError("");

    try {
      await updateReservationPayment(reservation, editPayment.id, editPaymentForm);
      await reloadReservation();
      setEditPayment(null);
      setEditPaymentForm(emptyPaymentForm);
    } catch (err) {
      setError(err.message || "Unable to update payment.");
    } finally {
      setEditPaymentSaving(false);
    }
  };

  const handleDeleteEditPayment = async () => {
    if (!reservation || !editPayment) return;
    if (!window.confirm("Delete this payment record?")) return;

    setEditPaymentDeleting(true);
    setError("");
    try {
      await deleteReservationPayment(reservation, editPayment.id);
      await reloadReservation();
      setEditPayment(null);
      setEditPaymentForm(emptyPaymentForm);
    } catch (err) {
      setError(err.message || "Unable to delete payment.");
    } finally {
      setEditPaymentDeleting(false);
    }
  };

  const handlePrimaryAction = () => {
    if (!nextAction) return;

    if (nextAction.href.startsWith("payment")) {
      const paymentType = nextAction.href.includes("full_payment") ? "full_payment" : "downpayment";
      openPaymentModal(paymentType);
    }
  };

  return (
    <AdminLayout onSignOut={handleLogout}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Button onClick={handleBack} sx={{ alignSelf: "flex-start" }}>
            Back
          </Button>

          {loading && <LinearProgress sx={{ borderRadius: 8 }} />}
          {error && <Alert severity="error">{error}</Alert>}

          {reservation && (
            <>
              <Paper elevation={1} sx={{ p: { xs: 2.5, md: 3 } }}>
                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto" },
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {guestName(reservation.customers)}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 1 }}>
                      Ref {shortReference(reservation.id)} / {formatDateRange(reservation)}
                    </Typography>
                    <Chip label={reservation.status} color={statusColors[reservation.status] || "default"} size="small" />
                  </Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent={{ xs: "flex-start", md: "flex-end" }}
                    sx={{ justifySelf: { xs: "start", md: "end" }, minWidth: 0 }}
                  >
                    {nextAction?.href.startsWith("payment") ? (
                      <Button onClick={handlePrimaryAction} variant="contained">
                        {nextAction.label}
                      </Button>
                    ) : nextAction ? (
                      <Button component={Link} href={`${basePath}/${nextAction.href}`} variant="contained">
                        {nextAction.label}
                      </Button>
                    ) : null}
                  </Stack>
                </Box>
              </Paper>

              <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 340px" } }}>
                <Stack spacing={3}>
                  <Paper elevation={1} sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                      Rooms
                    </Typography>
                    <Stack divider={<Divider />} spacing={1.5}>
                      {(reservation.reserved_rooms || []).map((reservedRoom) => (
                        <Box key={reservedRoom.id} sx={{ py: 1 }}>
                          <Typography sx={{ fontWeight: 800 }}>
                            {reservedRoom.rooms?.name || "Room"} x {reservedRoom.reserved_quantity}
                          </Typography>
                          <Typography color="text.secondary">
                            {formatMoney(reservedRoom.rooms?.rate)} per night
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>

                  <Paper elevation={1} sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                      Payment history
                    </Typography>
                    {(reservation.reservation_payments || []).length ? (
                      <Stack divider={<Divider />} spacing={1.5}>
                        {[...(reservation.reservation_payments || [])]
                          .sort((first, second) => new Date(second.paid_at) - new Date(first.paid_at))
                          .map((payment) => (
                            <Box
                              key={payment.id}
                              sx={{
                                display: "grid",
                                gap: 1,
                                gridTemplateColumns: { xs: "1fr", sm: "1fr auto auto" },
                                alignItems: "center",
                                py: 1,
                              }}
                            >
                              <Box>
                                <Typography sx={{ fontWeight: 800 }}>
                                  {paymentTypeLabels[payment.payment_type] || payment.payment_type}
                                </Typography>
                                <Typography color="text.secondary" variant="body2">
                                  {payment.method.replace("_", " ")}
                                  {payment.reference_number ? ` / ${payment.reference_number}` : ""} /{" "}
                                  {formatDateTime(payment.paid_at)}
                                </Typography>
                                {payment.notes && (
                                  <Typography color="text.secondary" variant="body2">
                                    {payment.notes}
                                  </Typography>
                                )}
                              </Box>
                              <Typography
                                sx={{
                                  fontWeight: 800,
                                  color: payment.payment_type === "refund" ? "error.main" : "success.main",
                                }}
                              >
                                {payment.payment_type === "refund" ? "-" : "+"}
                                {formatMoney(payment.amount)}
                              </Typography>
                              <Button
                                onClick={() => openEditPaymentModal(payment)}
                                size="small"
                                variant="outlined"
                              >
                                Edit
                              </Button>
                            </Box>
                          ))}
                      </Stack>
                    ) : (
                      <Typography color="text.secondary">No payments recorded.</Typography>
                    )}
                  </Paper>
                </Stack>

                <Stack spacing={3}>
                  <Paper elevation={1} sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                      Balance
                    </Typography>
                    <Stack spacing={1} sx={{ width: "100%" }}>
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: "100%" }}>
                        <Typography color="text.secondary">Total</Typography>
                        <Typography sx={{ flex: 1, fontWeight: 800, textAlign: "right", whiteSpace: "nowrap" }}>
                          {formatMoney(financials.total)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: "100%" }}>
                        <Typography color="text.secondary">Paid</Typography>
                        <Typography sx={{ flex: 1, fontWeight: 800, textAlign: "right", whiteSpace: "nowrap" }}>
                          {formatMoney(financials.paid)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: "100%" }}>
                        <Typography color="text.secondary">Refunded</Typography>
                        <Typography sx={{ flex: 1, fontWeight: 800, textAlign: "right", whiteSpace: "nowrap" }}>
                          {formatMoney(financials.refunded)}
                        </Typography>
                      </Stack>
                      <Divider />
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: "100%" }}>
                        <Typography sx={{ fontWeight: 800 }}>Balance</Typography>
                        <Typography
                          sx={{ flex: 1, fontWeight: 800, textAlign: "right", whiteSpace: "nowrap" }}
                          color={financials.balance > 0 ? "error" : "success.main"}
                        >
                          {formatMoney(financials.balance)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Paper>

                  <Paper elevation={1} sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                      Actions
                    </Typography>
                    <Stack spacing={1}>
                      <Button onClick={() => openPaymentModal("downpayment")} variant="outlined" fullWidth disabled={financials.balance <= 0}>
                        Record payment
                      </Button>
                      <Button onClick={() => openPaymentModal("refund")} variant="outlined" fullWidth disabled={financials.netPaid <= 0}>
                        Refund
                      </Button>
                      <Button onClick={openCancelModal} color="error" variant="outlined" fullWidth disabled={reservation.status === "cancelled"}>
                        Cancel reservation
                      </Button>
                    </Stack>
                  </Paper>
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </Container>

      <Dialog open={paymentOpen} onClose={closePaymentModal} fullWidth maxWidth="xs">
        <DialogTitle>{paymentForm.paymentType === "refund" ? "Record refund" : "Record payment"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>{reservation ? guestName(reservation.customers) : ""}</Typography>
              <Typography color="text.secondary" variant="body2">
                Balance {formatMoney(financials?.balance)} / Net paid {formatMoney(financials?.netPaid)}
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
            <TextField label="Reference number" name="referenceNumber" value={paymentForm.referenceNumber} onChange={handlePaymentFormChange} fullWidth />
            <TextField label="Notes" name="notes" value={paymentForm.notes} onChange={handlePaymentFormChange} fullWidth multiline minRows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePaymentModal} disabled={paymentSaving}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePayment} disabled={paymentSaving || !paymentForm.amount}>
            {paymentSaving ? "Saving..." : paymentForm.paymentType === "refund" ? "Save refund" : "Save payment"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelOpen} onClose={closeCancelModal} fullWidth maxWidth="xs">
        <DialogTitle>Cancel reservation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>{reservation ? guestName(reservation.customers) : ""}</Typography>
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
                <MenuItem key={method.value} value={method.value}>
                  {method.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Reference number" name="referenceNumber" value={cancelForm.referenceNumber} onChange={handleCancelFormChange} fullWidth />
            <TextField label="Cancellation notes" name="notes" value={cancelForm.notes} onChange={handleCancelFormChange} fullWidth multiline minRows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancelModal} disabled={cancelSaving}>Close</Button>
          <Button color="error" variant="contained" onClick={handleCancelReservation} disabled={cancelSaving}>
            {cancelSaving ? "Cancelling..." : "Cancel reservation"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editPayment)} onClose={closeEditPaymentModal} fullWidth maxWidth="xs">
        <DialogTitle>Edit payment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>{reservation ? guestName(reservation.customers) : ""}</Typography>
              <Typography color="text.secondary" variant="body2">
                Balance {formatMoney(financials?.balance)} / Net paid {formatMoney(financials?.netPaid)}
              </Typography>
            </Paper>
            <TextField
              select
              label="Type"
              name="paymentType"
              value={editPaymentForm.paymentType}
              onChange={handleEditPaymentFormChange}
              fullWidth
            >
              <MenuItem value="downpayment">{paymentTypeLabels.downpayment}</MenuItem>
              <MenuItem value="full_payment">{paymentTypeLabels.full_payment}</MenuItem>
              <MenuItem value="refund">{paymentTypeLabels.refund}</MenuItem>
            </TextField>
            <TextField
              label="Amount"
              name="amount"
              type="number"
              value={editPaymentForm.amount}
              onChange={handleEditPaymentFormChange}
              inputProps={{ min: 1, step: "0.01" }}
              fullWidth
              required
            />
            <TextField
              select
              label="Method"
              name="method"
              value={editPaymentForm.method}
              onChange={handleEditPaymentFormChange}
              fullWidth
            >
              {paymentMethods.map((method) => (
                <MenuItem key={method.value} value={method.value}>
                  {method.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Reference number" name="referenceNumber" value={editPaymentForm.referenceNumber} onChange={handleEditPaymentFormChange} fullWidth />
            <TextField label="Notes" name="notes" value={editPaymentForm.notes} onChange={handleEditPaymentFormChange} fullWidth multiline minRows={3} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Button color="error" onClick={handleDeleteEditPayment} disabled={editPaymentSaving || editPaymentDeleting}>
            {editPaymentDeleting ? "Deleting..." : "Delete"}
          </Button>
          <Stack direction="row" spacing={1}>
            <Button onClick={closeEditPaymentModal} disabled={editPaymentSaving || editPaymentDeleting}>
              Close
            </Button>
            <Button variant="contained" onClick={handleSaveEditPayment} disabled={editPaymentSaving || editPaymentDeleting || !editPaymentForm.amount}>
              {editPaymentSaving ? "Saving..." : "Save changes"}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
