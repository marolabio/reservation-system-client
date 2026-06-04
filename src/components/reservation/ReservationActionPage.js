import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, Button, Container, LinearProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AdminLayout from "../layout/AdminLayout";
import supabase from "../../utils/supabase";
import {
  cancelReservation,
  getAdminReservationById,
  getReservationFinancials,
  updateReservationStatus,
} from "../../services/resortService";
import { formatDateRange, formatMoney, guestName, paymentMethods, shortReference } from "../../utils/reservationUi";

const actionConfig = {
  confirm: {
    title: "Confirm reservation",
    button: "Confirm reservation",
    status: "confirmed",
    description: "Use this after the guest has made a partial payment.",
  },
  "check-in": {
    title: "Check in guest",
    button: "Check in",
    status: "checked_in",
    description: "Use this when the guest arrives and the reservation is ready.",
  },
  "check-out": {
    title: "Check out guest",
    button: "Check out",
    status: "checked_out",
    description: "Use this after full payment is settled.",
  },
  cancel: {
    title: "Cancel reservation",
    button: "Cancel reservation",
    description: "Use this to cancel the booking and optionally record a refund.",
  },
};

export default function ReservationActionPage({ action }) {
  const router = useRouter();
  const { id } = router.query;
  const config = actionConfig[action];
  const [reservation, setReservation] = useState(null);
  const [form, setForm] = useState({
    refundAmount: "",
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
        setReservation(nextReservation);

        if (action === "cancel" && financials.netPaid > 0) {
          setForm((current) => ({ ...current, refundAmount: String(financials.netPaid) }));
        }
      } catch (err) {
        setError(err.message || "Unable to load reservation.");
      } finally {
        setLoading(false);
      }
    }

    loadReservation();
  }, [action, id, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const financials = reservation ? getReservationFinancials(reservation) : null;
  const canRecordRefund = (financials?.netPaid || 0) > 0;

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (action === "cancel") {
        await cancelReservation(reservation, form);
      } else {
        await updateReservationStatus(reservation.id, config.status);
      }
      router.push(`/reservations/${reservation.id}`);
    } catch (err) {
      setError(err.message || "Unable to update reservation.");
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
              <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
                <Stack spacing={0.75}>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {config.title}
                  </Typography>
                  <Typography color="text.secondary">{config.description}</Typography>
                </Stack>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography sx={{ fontWeight: 800 }}>{guestName(reservation.customers)}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Ref {shortReference(reservation.id)} / {formatDateRange(reservation)}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    Balance {formatMoney(financials.balance)} / Net paid {formatMoney(financials.netPaid)}
                  </Typography>
                </Paper>
                {action === "cancel" && (
                  <>
                    {canRecordRefund ? (
                      <>
                        <TextField
                          label="Refund amount"
                          name="refundAmount"
                          type="number"
                          value={form.refundAmount}
                          onChange={handleChange}
                          inputProps={{ min: 0.01, max: financials.netPaid, step: "0.01" }}
                          helperText="Required when there is a refundable amount."
                          fullWidth
                        />
                        <TextField select label="Refund method" name="method" value={form.method} onChange={handleChange} fullWidth>
                          {paymentMethods.map((method) => (
                            <MenuItem key={method.value} value={method.value}>{method.label}</MenuItem>
                          ))}
                        </TextField>
                      </>
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        No refundable amount.
                      </Typography>
                    )}
                    <TextField label="Cancellation notes" name="notes" value={form.notes} onChange={handleChange} fullWidth multiline minRows={3} />
                  </>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  color={action === "cancel" ? "error" : "primary"}
                  size="large"
                  disabled={
                    saving ||
                    (
                      action === "cancel" &&
                      canRecordRefund &&
                      (!Number.isFinite(Number(form.refundAmount)) || Number(form.refundAmount) <= 0)
                    )
                  }
                >
                  {saving ? "Saving..." : config.button}
                </Button>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Container>
    </AdminLayout>
  );
}
