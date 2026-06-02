import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, Box, Button, Container, LinearProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AdminLayout from "../../../components/layout/AdminLayout";
import supabase from "../../../utils/supabase";
import { addReservationPayment, getAdminReservationById, getReservationFinancials } from "../../../services/resortService";
import { formatMoney, guestName, paymentMethods, paymentTypeLabels } from "../../../utils/reservationUi";

export default function ReservationPaymentPage() {
  const router = useRouter();
  const { id, type } = router.query;
  const [reservation, setReservation] = useState(null);
  const [form, setForm] = useState({
    paymentType: "downpayment",
    amount: "",
    method: "cash",
    referenceNumber: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      try {
        const nextReservation = await getAdminReservationById(id);
        const financials = getReservationFinancials(nextReservation);
        const paymentType = type === "full_payment"
          ? "full_payment"
          : type === "partial_payment"
            ? "partial_payment"
            : "downpayment";
        const amount = paymentType === "full_payment"
            ? financials.balance
            : Math.min(financials.downpaymentRequired, financials.balance);

        setReservation(nextReservation);
        setForm((current) => ({
          ...current,
          paymentType,
          amount: amount > 0 ? String(amount) : "",
        }));
      } catch (err) {
        setError(err.message || "Unable to load reservation.");
      } finally {
        setLoading(false);
      }
    }

    loadReservation();
  }, [id, router, type]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const financials = reservation ? getReservationFinancials(reservation) : null;

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await addReservationPayment(reservation, form);
      router.push(`/reservations/${reservation.id}`);
    } catch (err) {
      setError(err.message || "Unable to record payment.");
      setSaving(false);
    }
  };

  return (
    <AdminLayout onSignOut={handleLogout}>
      <Container maxWidth="sm" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Button component={Link} href={reservation ? `/reservations/${reservation.id}` : "/bookings"} sx={{ alignSelf: "flex-start" }}>
            Back
          </Button>
          {loading && <LinearProgress sx={{ borderRadius: 8 }} />}
          {error && <Alert severity="error">{error}</Alert>}
          {reservation && (
            <Paper elevation={1} sx={{ p: { xs: 2.5, md: 3 } }}>
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      Record payment
                    </Typography>
                    <Typography color="text.secondary">
                      {guestName(reservation.customers)} / Balance {formatMoney(financials.balance)} / Net paid {formatMoney(financials.netPaid)}
                    </Typography>
                  </Box>
                  <TextField select label="Payment type" name="paymentType" value={form.paymentType} onChange={handleChange} fullWidth>
                    <MenuItem value="downpayment">{paymentTypeLabels.downpayment}</MenuItem>
                    <MenuItem value="partial_payment">{paymentTypeLabels.partial_payment}</MenuItem>
                    <MenuItem value="full_payment">{paymentTypeLabels.full_payment}</MenuItem>
                  </TextField>
                  <TextField
                    label="Amount"
                    name="amount"
                    type="number"
                    value={form.amount}
                    onChange={handleChange}
                    inputProps={{ min: form.paymentType === "full_payment" ? financials.balance || 1 : 1, step: "0.01" }}
                    fullWidth
                    required
                  />
                  <TextField select label="Method" name="method" value={form.method} onChange={handleChange} fullWidth>
                    {paymentMethods.map((method) => (
                      <MenuItem key={method.value} value={method.value}>{method.label}</MenuItem>
                    ))}
                  </TextField>
                  <TextField label="Notes" name="notes" value={form.notes} onChange={handleChange} fullWidth multiline minRows={3} />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={
                      saving ||
                      !form.amount ||
                      financials.balance <= 0
                    }
                  >
                    {saving ? "Saving..." : "Save payment"}
                  </Button>
                </Stack>
              </Box>
            </Paper>
          )}
        </Stack>
      </Container>
    </AdminLayout>
  );
}
