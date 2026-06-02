import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, Box, Button, Container, LinearProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AdminLayout from "../../../components/layout/AdminLayout";
import supabase from "../../../utils/supabase";
import { addReservationPayment, getAdminReservationById, getReservationFinancials } from "../../../services/resortService";
import { formatMoney, guestName, paymentMethods, paymentTypeLabels } from "../../../utils/reservationUi";

export default function ReservationPaymentPage({ forcedType } = {}) {
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
        const paymentType = forcedType || (type === "full_payment" ? "full_payment" : "downpayment");
        const amount = paymentType === "refund"
          ? financials.netPaid
          : paymentType === "full_payment"
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
  }, [forcedType, id, router, type]);

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
          <Button component={Link} href={reservation ? `/reservations/${reservation.id}` : "/dashboard"} sx={{ alignSelf: "flex-start" }}>
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
                      {form.paymentType === "refund" ? "Record refund" : "Record payment"}
                    </Typography>
                    <Typography color="text.secondary">
                      {guestName(reservation.customers)} / Balance {formatMoney(financials.balance)} / Net paid {formatMoney(financials.netPaid)}
                    </Typography>
                  </Box>
                  <TextField select label="Payment type" name="paymentType" value={form.paymentType} onChange={handleChange} fullWidth>
                    {forcedType === "refund" ? (
                      <MenuItem value="refund">{paymentTypeLabels.refund}</MenuItem>
                    ) : (
                      [
                        <MenuItem key="downpayment" value="downpayment">{paymentTypeLabels.downpayment}</MenuItem>,
                        <MenuItem key="full_payment" value="full_payment">{paymentTypeLabels.full_payment}</MenuItem>,
                      ]
                    )}
                  </TextField>
                  <TextField label="Amount" name="amount" type="number" value={form.amount} onChange={handleChange} inputProps={{ min: 1, step: "0.01" }} fullWidth required />
                  <TextField select label="Method" name="method" value={form.method} onChange={handleChange} fullWidth>
                    {paymentMethods.map((method) => (
                      <MenuItem key={method.value} value={method.value}>{method.label}</MenuItem>
                    ))}
                  </TextField>
                  <TextField label="Reference number" name="referenceNumber" value={form.referenceNumber} onChange={handleChange} fullWidth />
                  <TextField label="Notes" name="notes" value={form.notes} onChange={handleChange} fullWidth multiline minRows={3} />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={
                      saving ||
                      !form.amount ||
                      (form.paymentType === "refund" ? financials.netPaid <= 0 : financials.balance <= 0)
                    }
                  >
                    {saving ? "Saving..." : form.paymentType === "refund" ? "Save refund" : "Save payment"}
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
