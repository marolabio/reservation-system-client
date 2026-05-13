import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import moment from "moment";
import {
  Box,
  Button,
  Chip,
  Container,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import supabase from "../utils/supabase";
import { getAdminReservations, updateReservationStatus } from "../services/resortService";

const statusColors = {
  pending: "default",
  confirmed: "primary",
  cancelled: "secondary",
};

function reservationTotal(reservation) {
  const nights = Math.max(moment(reservation.checkout).diff(reservation.checkin, "days"), 0);
  return (reservation.reserved_rooms || []).reduce((sum, reservedRoom) => {
    return sum + Number(reservedRoom.rooms?.rate || 0) * Number(reservedRoom.reserved_quantity || 0) * nights;
  }, 0);
}

export default function DashboardPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReservations() {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminReservations();
      setReservations(data);
    } catch (err) {
      setError(err.message || "Unable to load reservations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function requireSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/admin");
        return;
      }
      loadReservations();
    }

    requireSession();
  }, [router]);

  const stats = useMemo(() => {
    const active = reservations.filter((reservation) => reservation.status !== "cancelled");
    return {
      total: reservations.length,
      pending: reservations.filter((reservation) => reservation.status === "pending").length,
      confirmed: reservations.filter((reservation) => reservation.status === "confirmed").length,
      revenue: active.reduce((sum, reservation) => sum + reservationTotal(reservation), 0),
    };
  }, [reservations]);

  const handleStatusChange = async (id, status) => {
    try {
      await updateReservationStatus(id, status);
      setReservations((current) =>
        current.map((reservation) => (reservation.id === id ? { ...reservation, status } : reservation))
      );
    } catch (err) {
      setError(err.message || "Unable to update reservation.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Reservations dashboard
            </Typography>
            <Typography color="text.secondary">Review bookings and confirm or cancel requests.</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button href="/" variant="outlined">
              Booking page
            </Button>
            <Button variant="contained" onClick={handleLogout}>
              Sign out
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" } }}>
          {[
            ["Total bookings", stats.total],
            ["Pending", stats.pending],
            ["Confirmed", stats.confirmed],
            ["Active value", `PHP ${stats.revenue.toLocaleString()}`],
          ].map(([label, value]) => (
            <Paper key={label} elevation={1} sx={{ p: { xs: 2, md: 2.5 } }}>
              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                {label}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                {value}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Box sx={{ mt: 3 }}>
          {loading && <LinearProgress sx={{ mb: 2, borderRadius: 8 }} />}
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          <TableContainer component={Paper} elevation={1}>
            <Table sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Guest</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Room</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Guests</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservations.map((reservation) => {
                  const customer = reservation.customers || {};
                  const rooms = reservation.reserved_rooms || [];
                  return (
                    <TableRow key={reservation.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700 }}>{`${customer.first_name || ""} ${customer.last_name || ""}`}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {reservation.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography>{customer.email}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {customer.contact_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {rooms.map((room) => (
                          <Typography key={room.id}>
                            {room.rooms?.name} x {room.reserved_quantity}
                          </Typography>
                        ))}
                      </TableCell>
                      <TableCell>
                        {moment(reservation.checkin).format("MMM D, YYYY")} -{" "}
                        {moment(reservation.checkout).format("MMM D, YYYY")}
                      </TableCell>
                      <TableCell>
                        {reservation.adult} adult, {reservation.children} child
                      </TableCell>
                      <TableCell>PHP {reservationTotal(reservation).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip label={reservation.status} color={statusColors[reservation.status] || "default"} size="small" />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={reservation.status}
                          size="small"
                          onChange={(event) => handleStatusChange(reservation.id, event.target.value)}
                        >
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="confirmed">Confirmed</MenuItem>
                          <MenuItem value="cancelled">Cancelled</MenuItem>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loading && reservations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography align="center" sx={{ py: 4 }}>
                        No reservations yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Container>
    </Box>
  );
}
