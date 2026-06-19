import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, Box, Button, Container, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AdminLayout from "../../../../components/layout/AdminLayout";
import supabase from "../../../../utils/supabase";
import {
  deleteReservationPayment,
  getAdminReservationById,
  getReservationFinancials,
  updateReservationPayment,
} from "../../../../services/resortService";
import { formatMoney, guestName, paymentMethods, paymentTypeLabels } from "../../../../utils/reservationUi";

export default function EditReservationPaymentPage() {
  const router = useRouter();
  const { id, paymentId } = router.query;
  const [reservation, setReservation] = useState(null);
  const [payment, setPayment] = useState(null);
  const [form, setForm] = useState({
    paymentType: "partial_payment",
    amount: "",
    method: "cash",
    referenceNumber: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

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
        const nextPayment = (nextReservation.reservation_payments || []).find((item) => item.id === paymentId);

        if (!nextPayment) {
          throw new Error("Payment record was not found.");
        }

        setReservation(nextReservation);
        setPayment(nextPayment);
        setForm({
          paymentType: nextPayment.payment_type === "downpayment" ? "partial_payment" : nextPayment.payment_type,
          amount: String(nextPayment.amount),
          method: nextPayment.method || "cash",
          referenceNumber: nextPayment.reference_number || "",
          notes: nextPayment.notes || "",
        });
      } catch (err) {
        setError(err.message || "Unable to load payment.");
      } finally {
        setLoading(false);
      }
    }

    loadReservation();
  }, [id, paymentId, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const financials = reservation ? getReservationFinancials(reservation) : null;
  const fullPaymentAmount = Math.max(
    (financials?.balance || 0) + (payment && payment.payment_type !== "refund" ? Number(payment.amount || 0) : 0),
    0
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "paymentType" && value === "full_payment"
        ? { amount: fullPaymentAmount > 0 ? String(fullPaymentAmount) : "" }
        : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await updateReservationPayment(reservation, payment.id, form);
      router.push(`/reservations/${reservation.id}`);
    } catch (err) {
      setError(err.message || "Unable to update payment.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this payment record?")) return;

    setDeleting(true);
    setError("");
    try {
      await deleteReservationPayment(reservation, payment.id);
      router.push(`/reservations/${reservation.id}`);
    } catch (err) {
      setError(err.message || "Unable to delete payment.");
      setDeleting(false);
    }
  };

  return (
    <AdminLayout loading={loading} onSignOut={handleLogout}>
      <Container maxWidth="sm" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Button component={Link} href={reservation ? `/reservations/${reservation.id}` : "/bookings"} sx={{ alignSelf: "flex-start" }}>
            Back
          </Button>
          {error && <Alert severity="error">{error}</Alert>}
          {reservation && payment && (
            <Paper elevation={1} sx={{ p: { xs: 2.5, md: 3 } }}>
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      Edit payment
                    </Typography>
                    <Typography color="text.secondary">
                      {guestName(reservation.customers)} / Balance {formatMoney(financials.balance)} / Net paid {formatMoney(financials.netPaid)}
                    </Typography>
                  </Box>
                  <TextField select label="Payment type" name="paymentType" value={form.paymentType} onChange={handleChange} fullWidth>
                    <MenuItem value="partial_payment">{paymentTypeLabels.partial_payment}</MenuItem>
                    <MenuItem value="full_payment">{paymentTypeLabels.full_payment}</MenuItem>
                    {form.paymentType === "refund" && (
                      <MenuItem value="refund">{paymentTypeLabels.refund}</MenuItem>
                    )}
                  </TextField>
                  <TextField
                    label="Amount"
                    name="amount"
                    type="number"
                    value={form.amount}
                    onChange={handleChange}
                    inputProps={{
                      min: form.paymentType === "full_payment" ? fullPaymentAmount || 1 : 1,
                      readOnly: form.paymentType === "full_payment",
                      step: "0.01",
                    }}
                    helperText={form.paymentType === "full_payment" ? "Full payment uses the remaining balance." : ""}
                    fullWidth
                    required
                  />
                  <TextField select label="Method" name="method" value={form.method} onChange={handleChange} fullWidth>
                    {paymentMethods.map((method) => (
                      <MenuItem key={method.value} value={method.value}>{method.label}</MenuItem>
                    ))}
                  </TextField>
                  <TextField label="Notes" name="notes" value={form.notes} onChange={handleChange} fullWidth multiline minRows={3} />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
                    <Button color="error" variant="outlined" onClick={handleDelete} disabled={saving || deleting}>
                      {deleting ? "Deleting..." : "Delete payment"}
                    </Button>
                    <Button type="submit" variant="contained" size="large" disabled={saving || deleting || !form.amount}>
                      {saving ? "Saving..." : "Save changes"}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </Paper>
          )}
        </Stack>
      </Container>
    </AdminLayout>
  );
}
