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
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AdminLayout from "../components/layout/AdminLayout";
import supabase from "../utils/supabase";
import {
  deleteReservation,
  getAdminReservations,
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

function shortReference(id) {
  return String(id || "").slice(0, 8);
}

function guestName(customer = {}) {
  return `${customer.first_name || ""} ${customer.last_name || ""}`.trim().toUpperCase() || "GUEST";
}

function roomSummary(rooms = []) {
  const totalRooms = rooms.reduce((sum, room) => sum + Number(room.reserved_quantity || 0), 0);
  const roomNames = [...new Set(rooms.map((room) => room.rooms?.name).filter(Boolean))];
  const roomLabel = totalRooms === 1 ? "room" : "rooms";
  const typeLabel = roomNames.length === 1 ? "type" : "types";

  if (!rooms.length || totalRooms === 0) {
    return { title: "No rooms", detail: "View reservation details" };
  }

  return {
    title: `${totalRooms} ${roomLabel}`,
    detail: roomNames.length ? `${roomNames.length} ${typeLabel}: ${roomNames.join(", ")}` : "View reservation details",
  };
}

function reservationMatchesDateFilter(reservation, dateFilter) {
  if (dateFilter === "all") return true;

  const now = moment();
  const start = now.clone().startOf(dateFilter);
  const end = now.clone().endOf(dateFilter);
  const checkin = moment(reservation.checkin);
  const checkout = moment(reservation.checkout);

  return checkin.isSameOrBefore(end, "day") && checkout.isSameOrAfter(start, "day");
}

export default function DashboardPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewReservation, setViewReservation] = useState(null);
  const [editReservation, setEditReservation] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleteReservationTarget, setDeleteReservationTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [toast, setToast] = useState({ open: false, severity: "success", message: "" });

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

  const filteredReservations = useMemo(() => {
    const term = search.trim().toLowerCase();

    return reservations.filter((reservation) => {
      if (statusFilter !== "all" && reservation.status !== statusFilter) {
        return false;
      }

      if (!reservationMatchesDateFilter(reservation, dateFilter)) {
        return false;
      }

      if (!term) return true;

      const customer = reservation.customers || {};
      const rooms = reservation.reserved_rooms || [];
      const roomText = rooms
        .map((room) => `${room.rooms?.name || ""} ${room.reserved_quantity || ""}`)
        .join(" ");
      const dateText = [
        reservation.checkin,
        reservation.checkout,
        moment(reservation.checkin).format("MMM D, YYYY"),
        moment(reservation.checkout).format("MMM D, YYYY"),
      ].join(" ");

      return [
        reservation.id,
        shortReference(reservation.id),
        reservation.status,
        customer.first_name,
        customer.last_name,
        customer.email,
        customer.contact_number,
        roomText,
        dateText,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [reservations, search, statusFilter, dateFilter]);

  const handleStatusChange = async (id, status) => {
    setEditSaving(true);
    try {
      await updateReservationStatus(id, status);
      setReservations((current) =>
        current.map((reservation) => (reservation.id === id ? { ...reservation, status } : reservation))
      );
      setViewReservation((current) => (current?.id === id ? { ...current, status } : current));
      setEditReservation((current) => (current?.id === id ? { ...current, status } : current));
      setEditStatus(status);
      setToast({ open: true, severity: "success", message: `Status set to ${status}.` });
    } catch (err) {
      setToast({
        open: true,
        severity: "error",
        message: err.message || "Unable to update reservation.",
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleOpenView = (reservation) => {
    setViewReservation(reservation);
  };

  const handleCloseView = () => {
    setViewReservation(null);
  };

  const handleOpenEdit = (reservation) => {
    setEditReservation(reservation);
    setEditStatus(reservation?.status || "");
  };

  const handleCloseEdit = () => {
    if (editSaving) return;
    setEditReservation(null);
    setEditStatus("");
  };

  const handleSaveStatus = async () => {
    if (!editReservation || !editStatus) return;
    await handleStatusChange(editReservation.id, editStatus);
  };

  const handleDeleteReservation = async () => {
    if (!deleteReservationTarget) return;

    setDeleteSaving(true);
    try {
      await deleteReservation(deleteReservationTarget.id);
      setReservations((current) => current.filter((reservation) => reservation.id !== deleteReservationTarget.id));
      setViewReservation((current) => (current?.id === deleteReservationTarget.id ? null : current));
      setEditReservation((current) => (current?.id === deleteReservationTarget.id ? null : current));
      setDeleteReservationTarget(null);
      setToast({ open: true, severity: "success", message: "Reservation deleted." });
    } catch (err) {
      setToast({ open: true, severity: "error", message: err.message || "Unable to delete reservation." });
    } finally {
      setDeleteSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const viewCustomer = viewReservation?.customers || {};
  const viewReservedRooms = viewReservation?.reserved_rooms || [];

  return (
    <AdminLayout onSignOut={handleLogout}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Reservations dashboard
            </Typography>
            <Typography color="text.secondary">Bookings, rooms, status.</Typography>
          </Box>
        </Box>

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
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
            >
              <TextField
                label="Search reservations"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Customer, room, date..."
                sx={{ minWidth: { md: 180 } }}
                fullWidth
                size="medium"
              />
              <FormControl sx={{ minWidth: { md: 180 } }} fullWidth>
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <MenuItem value="all">All statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              <ToggleButtonGroup
                value={dateFilter}
                exclusive
                onChange={(event, value) => {
                  if (value) setDateFilter(value);
                }}
                size="small"
                sx={{
                  flexShrink: 0,
                  maxWidth: "100%",
                  overflowX: "auto",
                  width: { xs: "100%", md: "auto" },
                  "& .MuiToggleButton-root": {
                    px: 1.5,
                    textTransform: "none",
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="day">Today</ToggleButton>
                <ToggleButton value="week">This week</ToggleButton>
                <ToggleButton value="month">This month</ToggleButton>
                <ToggleButton value="year">This year</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Paper>
          <TableContainer component={Paper} elevation={1}>
            <Table sx={{ minWidth: 1040 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Guest</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 800, minWidth: 240 }}>Rooms</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Stay</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Guests</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReservations.map((reservation) => {
                  const customer = reservation.customers || {};
                  const rooms = reservation.reserved_rooms || [];
                  const roomsDisplay = roomSummary(rooms);
                  return (
                    <TableRow key={reservation.id} hover sx={{ "& td": { py: 2, verticalAlign: "top" } }}>
                      <TableCell sx={{ minWidth: 170 }}>
                        <Typography sx={{ fontWeight: 800 }}>{guestName(customer)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Ref {shortReference(reservation.id)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        <Typography sx={{ fontSize: 14 }}>{customer.email}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {customer.contact_number}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        <Typography sx={{ fontWeight: 700 }}>{roomsDisplay.title}</Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: "block",
                            maxWidth: 220,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {roomsDisplay.detail}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 160 }}>
                        {moment(reservation.checkin).format("MMM D, YYYY")} -{" "}
                        {moment(reservation.checkout).format("MMM D, YYYY")}
                      </TableCell>
                      <TableCell sx={{ minWidth: 110 }}>
                        {reservation.adult} adult, {reservation.children} child
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, minWidth: 120 }}>
                        PHP {reservationTotal(reservation).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip label={reservation.status} color={statusColors[reservation.status] || "default"} size="small" />
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" onClick={() => handleOpenView(reservation)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loading && filteredReservations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography align="center" sx={{ py: 4 }}>
                        {search || statusFilter !== "all"
                        || dateFilter !== "all"
                          ? "No reservations match your filters."
                          : "No reservations yet."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Container>

      <Dialog open={Boolean(viewReservation)} onClose={handleCloseView} fullWidth maxWidth="sm">
        <DialogTitle>Reservation details</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {viewReservation && (
              <>
                <Box>
                  <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800 }}>
                        {guestName(viewCustomer)}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        Ref {shortReference(viewReservation.id)}
                      </Typography>
                    </Box>
                    <Chip
                      label={viewReservation.status}
                      color={statusColors[viewReservation.status] || "default"}
                      size="small"
                    />
                  </Stack>
                  <Box component="ul" sx={{ color: "text.secondary", listStylePosition: "inside", m: "10px 0 0", p: 0 }}>
                    <Typography component="li" variant="body2">
                      {viewCustomer.email} / {viewCustomer.contact_number}
                    </Typography>
                    <Typography component="li" variant="body2">
                      {moment(viewReservation.checkin).format("MMM D, YYYY")} -{" "}
                      {moment(viewReservation.checkout).format("MMM D, YYYY")}
                    </Typography>
                    <Typography component="li" variant="body2">
                      {viewReservation.adult} adult, {viewReservation.children} child
                    </Typography>
                    <Typography component="li" variant="body2">
                      PHP {reservationTotal(viewReservation).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>

                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>Rooms</Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
                    {viewReservedRooms.map((room) => (
                      <Typography component="li" key={room.id} sx={{ mb: 0.75, pl: 0.25 }}>
                        <Box component="span" sx={{ fontWeight: 700 }}>
                          {room.rooms?.name || "Room"}
                        </Box>{" "}
                        x {room.reserved_quantity}
                        <Typography component="span" color="text.secondary" sx={{ display: "block", fontSize: 13 }}>
                          PHP {Number(room.rooms?.rate || 0).toLocaleString()} / night
                        </Typography>
                      </Typography>
                    ))}
                  </Box>
                </Paper>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            onClick={() => setDeleteReservationTarget(viewReservation)}
            disabled={!viewReservation}
          >
            Delete
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={handleCloseView}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              const reservation = viewReservation;
              handleCloseView();
              handleOpenEdit(reservation);
            }}
            disabled={!viewReservation}
          >
            Edit
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteReservationTarget)}
        onClose={() => {
          if (!deleteSaving) setDeleteReservationTarget(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete reservation</DialogTitle>
        <DialogContent>
          <Typography>
            Delete reservation Ref {shortReference(deleteReservationTarget?.id)}? This will remove its reserved rooms.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteReservationTarget(null)} disabled={deleteSaving}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDeleteReservation} disabled={deleteSaving}>
            {deleteSaving ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editReservation)} onClose={handleCloseEdit} fullWidth maxWidth="xs">
        <DialogTitle>Edit status</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {editReservation && (
              <FormControl fullWidth>
                <InputLabel id="edit-status-label">Status</InputLabel>
                <Select
                  labelId="edit-status-label"
                  label="Status"
                  value={editStatus}
                  onChange={(event) => setEditStatus(event.target.value)}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit} disabled={editSaving}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveStatus}
            disabled={editSaving || !editStatus || editStatus === editReservation?.status}
          >
            {editSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((current) => ({ ...current, open: false }))}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </AdminLayout>
  );
}
