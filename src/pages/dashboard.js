import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  IconButton,
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
  TablePagination,
  TableRow,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SearchIcon from "@mui/icons-material/Search";
import AdminLayout from "../components/layout/AdminLayout";
import supabase from "../utils/supabase";
import {
  deleteReservation,
  getAdminReservationsPage,
  getRoomAvailability,
  getReservationDashboardStats,
  updateReservationRooms,
  updateReservationStatus,
} from "../services/resortService";

const statusColors = {
  pending: "default",
  confirmed: "primary",
  checked_in: "success",
  checked_out: "warning",
  cancelled: "secondary",
};

const statusFilterOptions = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked in" },
  { value: "checked_out", label: "Checked out" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

function normalizeStatusFilter(value) {
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  return statusFilterOptions.some((option) => option.value === normalizedValue) ? normalizedValue : "pending";
}

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

function formatDateTime(value) {
  return value ? moment(value).format("MMM D, YYYY h:mm A") : "";
}

export default function DashboardPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState([]);
  const [reservationCount, setReservationCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    inHouse: 0,
    checkedOut: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState("");
  const [viewReservation, setViewReservation] = useState(null);
  const [editReservation, setEditReservation] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [roomEditReservation, setRoomEditReservation] = useState(null);
  const [roomSelections, setRoomSelections] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [roomEditSearch, setRoomEditSearch] = useState("");
  const [roomEditLoading, setRoomEditLoading] = useState(false);
  const [roomEditSaving, setRoomEditSaving] = useState(false);
  const [deleteReservationTarget, setDeleteReservationTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [searchByStatus, setSearchByStatus] = useState({});
  const [statusFilter, setStatusFilter] = useState("pending");
  const [dateFilter, setDateFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [toast, setToast] = useState({ open: false, severity: "success", message: "" });

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminReservationsPage({
        page,
        pageSize: rowsPerPage,
        status: statusFilter,
        dateFilter,
        search,
      });
      setReservations(data.reservations);
      setReservationCount(data.count);
    } catch (err) {
      setError(err.message || "Unable to load reservations.");
    } finally {
      setLoading(false);
    }
  }, [dateFilter, page, rowsPerPage, search, statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      const data = await getReservationDashboardStats({ dateFilter, search });
      setStats(data);
    } catch (err) {
      setToast({ open: true, severity: "error", message: err.message || "Unable to load reservation counts." });
    }
  }, [dateFilter, search]);

  useEffect(() => {
    async function requireSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/admin");
        return;
      }
      setSessionReady(true);
    }

    requireSession();
  }, [router]);

  useEffect(() => {
    if (!router.isReady) return;
    const nextStatus = normalizeStatusFilter(router.query.status);
    const nextSearch = searchByStatus[nextStatus] || "";
    setStatusFilter(nextStatus);
    setSearchInput(nextSearch);
    setSearch(nextSearch);
  }, [router.isReady, router.query.status, searchByStatus]);

  useEffect(() => {
    if (!sessionReady) return;
    loadReservations();
    loadStats();
  }, [sessionReady, loadReservations, loadStats]);

  const handleStatusFilterChange = (event, value) => {
    const nextStatus = normalizeStatusFilter(value);
    const nextQuery = { ...router.query };
    const nextSearch = searchByStatus[nextStatus] || "";

    if (nextStatus === "pending") {
      delete nextQuery.status;
    } else {
      nextQuery.status = nextStatus;
    }

    setStatusFilter(nextStatus);
    setSearchInput(nextSearch);
    setSearch(nextSearch);
    setPage(0);
    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
  };

  const handlePageChange = (event, nextPage) => {
    setPage(nextPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    setSearchByStatus((current) => ({ ...current, [statusFilter]: nextSearch }));
    setSearch(nextSearch);
    setPage(0);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSearch("");
    setSearchByStatus((current) => ({ ...current, [statusFilter]: "" }));
    setDateFilter("all");
    setPage(0);
    const nextQuery = statusFilter === "pending" ? {} : { status: statusFilter };
    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
  };

  const handleStatusChange = async (id, status) => {
    setEditSaving(true);
    try {
      const updatedReservation = await updateReservationStatus(id, status);
      await loadReservations();
      await loadStats();
      setViewReservation((current) => (current?.id === id ? { ...current, ...updatedReservation } : current));
      setEditReservation((current) => (current?.id === id ? { ...current, ...updatedReservation } : current));
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

  const handleOpenRoomEdit = async (reservation) => {
    setRoomEditReservation(reservation);
    setRoomSelections(
      (reservation?.reserved_rooms || []).map((room) => ({
        roomId: room.room_id || room.rooms?.id,
        roomQuantity: Number(room.reserved_quantity || 1),
      }))
    );
    setAvailableRooms([]);
    setRoomEditSearch("");
    setRoomEditLoading(true);

    try {
      const rooms = await getRoomAvailability({
        checkin: reservation.checkin,
        checkout: reservation.checkout,
        excludeReservationId: reservation.id,
      });
      setAvailableRooms(rooms);
    } catch (err) {
      setToast({ open: true, severity: "error", message: err.message || "Unable to load rooms." });
    } finally {
      setRoomEditLoading(false);
    }
  };

  const handleCloseRoomEdit = () => {
    if (roomEditSaving) return;
    setRoomEditReservation(null);
    setRoomSelections([]);
    setAvailableRooms([]);
    setRoomEditSearch("");
  };

  const handleAddReservationRoom = (room) => {
    setRoomSelections((current) => {
      if (current.some((selection) => selection.roomId === room.id)) return current;

      return [
        ...current,
        {
          roomId: room.id,
          roomQuantity: Math.min(1, Number(room.available_quantity || 1)),
        },
      ];
    });
  };

  const handleRemoveReservationRoom = (roomId) => {
    setRoomSelections((current) => current.filter((selection) => selection.roomId !== roomId));
  };

  const handleReservationRoomQuantity = (roomId, quantity) => {
    const room = availableRooms.find((availableRoom) => availableRoom.id === roomId);
    const maxQuantity = Math.max(Number(room?.available_quantity || 1), 1);
    const nextQuantity = Math.max(1, Math.min(Number(quantity || 1), maxQuantity));

    setRoomSelections((current) =>
      current.map((selection) =>
        selection.roomId === roomId ? { ...selection, roomQuantity: nextQuantity } : selection
      )
    );
  };

  const handleSaveRooms = async () => {
    if (!roomEditReservation || !roomSelections.length) return;

    setRoomEditSaving(true);
    try {
      await updateReservationRooms(roomEditReservation, roomSelections);
      await loadReservations();
      await loadStats();
      setRoomEditReservation(null);
      setRoomSelections([]);
      setAvailableRooms([]);
      setRoomEditSearch("");
      setToast({ open: true, severity: "success", message: "Reservation rooms updated." });
    } catch (err) {
      setToast({
        open: true,
        severity: "error",
        message: err.message || "Unable to update rooms.",
      });
    } finally {
      setRoomEditSaving(false);
    }
  };

  const handleDeleteReservation = async () => {
    if (!deleteReservationTarget) return;

    setDeleteSaving(true);
    try {
      await deleteReservation(deleteReservationTarget.id);
      await loadReservations();
      await loadStats();
      setViewReservation((current) => (current?.id === deleteReservationTarget.id ? null : current));
      setEditReservation((current) => (current?.id === deleteReservationTarget.id ? null : current));
      setRoomEditReservation((current) => (current?.id === deleteReservationTarget.id ? null : current));
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
  const selectedRoomIds = new Set(roomSelections.map((selection) => selection.roomId));
  const selectedRoomDetails = roomSelections.map((selection) => {
    const room = availableRooms.find((availableRoom) => availableRoom.id === selection.roomId);
    return {
      ...selection,
      room,
    };
  });
  const filteredAvailableRooms = useMemo(() => {
    const term = roomEditSearch.trim().toLowerCase();
    if (!term) return availableRooms;

    return availableRooms.filter((room) =>
      [
        room.name,
        room.description,
        `capacity ${room.occupancy}`,
        `${room.occupancy} guests`,
        `${room.available_quantity} available`,
        `${room.rate}`,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [availableRooms, roomEditSearch]);
  const statusTabCounts = {
    all: stats.total,
    pending: stats.pending,
    confirmed: stats.confirmed,
    checked_in: stats.inHouse,
    checked_out: stats.checkedOut,
    cancelled: stats.cancelled,
  };

  return (
    <AdminLayout onSignOut={handleLogout}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Reservations dashboard
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 3 }}>
          {loading && <LinearProgress sx={{ mb: 2, borderRadius: 8 }} />}
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
              >
                <Box
                  component="form"
                  onSubmit={handleSearchSubmit}
                  sx={{
                    display: "flex",
                    gap: 1,
                    minWidth: { md: 280 },
                    width: "100%",
                  }}
                >
                  <TextField
                    label="Search reservations"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Customer, room, date..."
                    fullWidth
                    size="medium"
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SearchIcon />}
                    disabled={loading}
                    sx={{ flexShrink: 0 }}
                  >
                    Search
                  </Button>
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<RestartAltIcon />}
                    disabled={loading}
                    onClick={handleResetFilters}
                    sx={{ flexShrink: 0 }}
                  >
                    Reset
                  </Button>
                </Box>
                <ToggleButtonGroup
                  value={dateFilter}
                  exclusive
                  onChange={(event, value) => {
                    if (value) {
                      setDateFilter(value);
                      setPage(0);
                    }
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
            </Stack>
          </Paper>
          <TableContainer component={Paper} elevation={1}>
            <Tabs
              value={statusFilter}
              onChange={handleStatusFilterChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 56,
                p: 1,
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: "grey.100",
                "& .MuiTabs-indicator": {
                  display: "none",
                },
                "& .MuiTab-root": {
                  minHeight: 40,
                  mx: 0.5,
                  px: 2,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "background.paper",
                  color: "text.secondary",
                  fontWeight: 800,
                  textTransform: "none",
                  whiteSpace: "nowrap",
                },
                "& .MuiTab-root.Mui-selected": {
                  borderColor: "primary.main",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                },
              }}
            >
              {statusFilterOptions.map((option) => (
                <Tab
                  key={option.value}
                  value={option.value}
                  label={`${option.label} (${statusTabCounts[option.value] || 0})`}
                />
              ))}
            </Tabs>
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
                {reservations.map((reservation) => {
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
                {!loading && reservations.length === 0 && (
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
            <TablePagination
              component="div"
              count={reservationCount}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[10, 25, 50]}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
            />
          </TableContainer>
        </Box>
      </Container>

      <Dialog open={Boolean(viewReservation)} onClose={handleCloseView} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
          Reservation details
          <IconButton
            aria-label="Close"
            onClick={handleCloseView}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
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
                    {viewReservation.checked_in_at && (
                      <Typography component="li" variant="body2">
                        Checked in at {formatDateTime(viewReservation.checked_in_at)}
                      </Typography>
                    )}
                    {viewReservation.checked_out_at && (
                      <Typography component="li" variant="body2">
                        Checked out at {formatDateTime(viewReservation.checked_out_at)}
                      </Typography>
                    )}
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
          <Button
            variant="outlined"
            onClick={() => {
              const reservation = viewReservation;
              handleCloseView();
              handleOpenEdit(reservation);
            }}
            disabled={!viewReservation}
          >
            Change status
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const reservation = viewReservation;
              handleCloseView();
              handleOpenRoomEdit(reservation);
            }}
            disabled={!viewReservation}
          >
            Edit rooms
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
        <DialogTitle sx={{ pr: 6 }}>
          Delete reservation
          <IconButton
            aria-label="Close"
            disabled={deleteSaving}
            onClick={() => setDeleteReservationTarget(null)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Delete reservation Ref {shortReference(deleteReservationTarget?.id)}? This will remove its reserved rooms.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="error" variant="contained" onClick={handleDeleteReservation} disabled={deleteSaving}>
            {deleteSaving ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editReservation)} onClose={handleCloseEdit} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pr: 6 }}>
          Change status
          <IconButton
            aria-label="Close"
            disabled={editSaving}
            onClick={handleCloseEdit}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {editReservation && (
              <>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800 }}>{guestName(editReservation.customers)}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Ref {shortReference(editReservation.id)}
                      </Typography>
                    </Box>
                    <Chip
                      label={editReservation.status}
                      color={statusColors[editReservation.status] || "default"}
                      size="small"
                    />
                  </Stack>
                  <Box component="ul" sx={{ color: "text.secondary", listStylePosition: "inside", m: "10px 0 0", p: 0 }}>
                    <Typography component="li" variant="body2">
                      {editReservation.customers?.email} / {editReservation.customers?.contact_number}
                    </Typography>
                    <Typography component="li" variant="body2">
                      {moment(editReservation.checkin).format("MMM D, YYYY")} -{" "}
                      {moment(editReservation.checkout).format("MMM D, YYYY")}
                    </Typography>
                    <Typography component="li" variant="body2">
                      {editReservation.adult} adult, {editReservation.children} child
                    </Typography>
                  </Box>
                </Paper>
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
                    <MenuItem value="checked_in">Checked in</MenuItem>
                    <MenuItem value="checked_out">Checked out</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={handleSaveStatus}
            disabled={editSaving || !editStatus || editStatus === editReservation?.status}
          >
            {editSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(roomEditReservation)} onClose={handleCloseRoomEdit} fullWidth maxWidth="md">
        <DialogTitle sx={{ pr: 6 }}>
          Edit rooms
          <IconButton
            aria-label="Close"
            disabled={roomEditSaving}
            onClick={handleCloseRoomEdit}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {roomEditLoading && <LinearProgress sx={{ borderRadius: 8 }} />}
            {roomEditReservation && (
              <Box>
                <Typography sx={{ fontWeight: 800 }}>{guestName(roomEditReservation.customers)}</Typography>
                <Typography color="text.secondary" variant="body2">
                  {moment(roomEditReservation.checkin).format("MMM D, YYYY")} -{" "}
                  {moment(roomEditReservation.checkout).format("MMM D, YYYY")}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>Available rooms</Typography>
                <TextField
                  label="Search rooms"
                  value={roomEditSearch}
                  onChange={(event) => setRoomEditSearch(event.target.value)}
                  placeholder="Room, capacity, rate..."
                  fullWidth
                  size="small"
                  sx={{ mb: 1.5 }}
                />
                <Stack spacing={1.25}>
                  {filteredAvailableRooms.map((room) => {
                    const isSelected = selectedRoomIds.has(room.id);
                    return (
                      <Paper key={room.id} variant="outlined" sx={{ p: 1.25 }}>
                        <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700 }}>{room.name}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              {room.available_quantity} available / PHP {Number(room.rate || 0).toLocaleString()} per night
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant={isSelected ? "outlined" : "contained"}
                            disabled={isSelected || Number(room.available_quantity) < 1}
                            onClick={() => handleAddReservationRoom(room)}
                          >
                            {isSelected ? "Added" : "Add"}
                          </Button>
                        </Stack>
                      </Paper>
                    );
                  })}
                  {!roomEditLoading && availableRooms.length === 0 && (
                    <Typography color="text.secondary">No rooms are available for these dates.</Typography>
                  )}
                  {!roomEditLoading && availableRooms.length > 0 && filteredAvailableRooms.length === 0 && (
                    <Typography color="text.secondary">No rooms match your search.</Typography>
                  )}
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>Selected rooms</Typography>
                <Stack spacing={1.25}>
                  {selectedRoomDetails.map((selection) => (
                    <Paper key={selection.roomId} variant="outlined" sx={{ p: 1.25 }}>
                      <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700 }}>{selection.room?.name || "Room"}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {selection.room?.available_quantity || 0} available
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          color="secondary"
                          onClick={() => handleRemoveReservationRoom(selection.roomId)}
                        >
                          Remove
                        </Button>
                      </Stack>
                      <TextField
                        label="Quantity"
                        type="number"
                        value={selection.roomQuantity}
                        onChange={(event) => handleReservationRoomQuantity(selection.roomId, event.target.value)}
                        inputProps={{ min: 1, max: selection.room?.available_quantity || 1 }}
                        fullWidth
                        size="small"
                        sx={{ mt: 1.5 }}
                      />
                    </Paper>
                  ))}
                  {selectedRoomDetails.length === 0 && (
                    <Typography color="text.secondary">No room selected.</Typography>
                  )}
                </Stack>
              </Paper>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={handleSaveRooms}
            disabled={roomEditSaving || roomEditLoading || selectedRoomDetails.length === 0}
          >
            {roomEditSaving ? "Saving..." : "Save rooms"}
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
