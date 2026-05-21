import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import moment from "moment";
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
  FormControl,
  InputLabel,
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
  TextField,
  Typography,
} from "@mui/material";
import supabase from "../utils/supabase";
import {
  getAdminReservations,
  getRoomAvailability,
  updateReservationRoom,
  updateReservationStatus,
} from "../services/resortService";

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
  const [editReservation, setEditReservation] = useState(null);
  const [editRooms, setEditRooms] = useState([]);
  const [editRoomId, setEditRoomId] = useState("");
  const [editRoomQuantity, setEditRoomQuantity] = useState(1);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

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

  const handleOpenEditRoom = async (reservation) => {
    const currentRoom = reservation.reserved_rooms?.[0];

    setEditReservation(reservation);
    setEditRoomId(currentRoom?.rooms?.id || "");
    setEditRoomQuantity(Number(currentRoom?.reserved_quantity || 1));
    setEditRooms([]);
    setEditError("");
    setEditLoading(true);

    try {
      const rooms = await getRoomAvailability({
        checkin: reservation.checkin,
        checkout: reservation.checkout,
        excludeReservationId: reservation.id,
      });
      setEditRooms(rooms);
    } catch (err) {
      setEditError(err.message || "Unable to load available rooms.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleCloseEditRoom = () => {
    if (editSaving) return;
    setEditReservation(null);
    setEditRooms([]);
    setEditRoomId("");
    setEditRoomQuantity(1);
    setEditError("");
  };

  const handleSaveEditRoom = async () => {
    if (!editReservation || !editRoomId) return;

    setEditSaving(true);
    setEditError("");

    try {
      await updateReservationRoom({
        reservationId: editReservation.id,
        roomId: editRoomId,
        roomQuantity: editRoomQuantity,
        checkin: editReservation.checkin,
        checkout: editReservation.checkout,
      });
      await loadReservations();
      setEditReservation(null);
      setEditRooms([]);
      setEditRoomId("");
      setEditRoomQuantity(1);
      setEditError("");
    } catch (err) {
      setEditError(err.message || "Unable to update reservation room.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const selectedEditRoom = editRooms.find((room) => room.id === editRoomId);
  const maxEditQuantity = selectedEditRoom ? Math.max(Number(selectedEditRoom.available_quantity || 0), 1) : 1;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Reservations dashboard
            </Typography>
            <Typography color="text.secondary">Review bookings and confirm or cancel requests.</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, flexWrap: "wrap" }}>
              <Button href="/dashboard" variant={router.pathname === "/dashboard" ? "contained" : "outlined"} size="small">
                Dashboard
              </Button>
              <Button href="/admin-booking" variant={router.pathname === "/admin-booking" ? "contained" : "outlined"} size="small">
                New booking
              </Button>
            </Stack>
          </Box>
          <Button variant="outlined" size="small" onClick={handleLogout} sx={{ alignSelf: "flex-start", flexShrink: 0 }}>
            Sign out
          </Button>
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
                        <Stack direction="row" spacing={1}>
                          <Select
                            value={reservation.status}
                            size="small"
                            onChange={(event) => handleStatusChange(reservation.id, event.target.value)}
                          >
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="confirmed">Confirmed</MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                          </Select>
                          <Button size="small" variant="outlined" onClick={() => handleOpenEditRoom(reservation)}>
                            Edit room
                          </Button>
                        </Stack>
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

      <Dialog open={Boolean(editReservation)} onClose={handleCloseEditRoom} fullWidth maxWidth="sm">
        <DialogTitle>Edit reservation room</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {editReservation && (
              <Box>
                <Typography sx={{ fontWeight: 700 }}>
                  {editReservation.customers?.first_name} {editReservation.customers?.last_name}
                </Typography>
                <Typography color="text.secondary">
                  {moment(editReservation.checkin).format("MMM D, YYYY")} -{" "}
                  {moment(editReservation.checkout).format("MMM D, YYYY")}
                </Typography>
              </Box>
            )}

            {editError && <Alert severity="error">{editError}</Alert>}
            {editLoading && <LinearProgress sx={{ borderRadius: 8 }} />}

            <FormControl fullWidth disabled={editLoading || editSaving}>
              <InputLabel id="edit-room-label">Room</InputLabel>
              <Select
                labelId="edit-room-label"
                label="Room"
                value={editRoomId}
                onChange={(event) => {
                  setEditRoomId(event.target.value);
                  setEditRoomQuantity(1);
                }}
              >
                {editRooms.map((room) => (
                  <MenuItem key={room.id} value={room.id} disabled={Number(room.available_quantity) < 1}>
                    {room.name} - {room.available_quantity} available - PHP {Number(room.rate).toLocaleString()} / night
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Rooms"
              type="number"
              value={editRoomQuantity}
              onChange={(event) => {
                const quantity = Math.max(Number(event.target.value), 1);
                setEditRoomQuantity(Math.min(quantity, maxEditQuantity));
              }}
              inputProps={{ min: 1, max: maxEditQuantity }}
              disabled={editLoading || editSaving || !editRoomId}
              helperText={selectedEditRoom ? `${selectedEditRoom.available_quantity} available for these dates` : "Select a room"}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditRoom} disabled={editSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEditRoom}
            disabled={editLoading || editSaving || !editRoomId || !selectedEditRoom}
          >
            {editSaving ? "Saving..." : "Save room"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
