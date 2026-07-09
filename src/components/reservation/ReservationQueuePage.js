import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SearchIcon from "@mui/icons-material/Search";
import AdminLayout from "../layout/AdminLayout";
import supabase from "../../utils/supabase";
import {
  getAdminReservationsPage,
  getReservationDashboardStats,
  getReservationFinancials,
} from "../../services/resortService";
import {
  formatDateRange,
  formatMoney,
  guestName,
} from "../../utils/reservationUi";
import ReservationViewDialog from "./ReservationViewDialog";

function roomSummary(rooms = []) {
  const totalRooms = rooms.reduce(
    (sum, room) => sum + Number(room.reserved_quantity || 0),
    0,
  );

  if (!rooms.length || totalRooms === 0) return "No rooms";
  return `${totalRooms} ${totalRooms === 1 ? "room" : "rooms"}`;
}

function guestCount(reservation) {
  const adults = Number(reservation.adult || 0);
  const children = Number(reservation.children || 0);
  const total = adults + children;

  return `${total} ${total === 1 ? "guest" : "guests"}`;
}

function stayNightSummary(reservation) {
  const nights = Math.max(
    Math.ceil(
      (new Date(reservation.checkout) - new Date(reservation.checkin)) /
        (1000 * 60 * 60 * 24),
    ),
    0,
  );

  return `${nights} ${nights === 1 ? "night" : "nights"}`;
}

function countFromStats(stats, status) {
  if (status === "pending") return stats?.pending || 0;
  if (status === "confirmed") return stats?.confirmed || 0;
  if (status === "checked_in") return stats?.inHouse || 0;
  if (status === "checked_out") return stats?.checkedOut || 0;
  if (status === "no_show") return stats?.noShow || 0;
  if (status === "cancelled") return stats?.cancelled || 0;
  return 0;
}

export default function ReservationQueuePage({
  title,
  status,
  emptyMessage,
  tabs,
  hideTitleCount = false,
  hideFinancials = false,
  showStayNights = false,
}) {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState(status);
  const [tabCounts, setTabCounts] = useState({});
  const [reservations, setReservations] = useState([]);
  const [reservationCount, setReservationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [toast, setToast] = useState({
    open: false,
    severity: "success",
    message: "",
  });
  const activeTab = tabs?.find((tab) => tab.status === activeStatus);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminReservationsPage({
        page,
        pageSize: rowsPerPage,
        status: activeStatus,
        search,
      });
      setReservations(data.reservations);
      setReservationCount(data.count);
    } catch (err) {
      setError(err.message || "Unable to load reservations.");
    } finally {
      setLoading(false);
    }
  }, [activeStatus, page, rowsPerPage, search]);

  const loadTabCounts = useCallback(async () => {
    if (!tabs?.length) return;

    try {
      const stats = await getReservationDashboardStats();
      setTabCounts(
        tabs.reduce(
          (counts, tab) => ({
            ...counts,
            [tab.status]: countFromStats(stats, tab.status),
          }),
          {},
        ),
      );
    } catch {
      setTabCounts({});
    }
  }, [tabs]);

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
    if (!sessionReady) return;
    loadReservations();
    loadTabCounts();
  }, [sessionReady, loadReservations, loadTabCounts]);

  useEffect(() => {
    setActiveStatus(status);
  }, [status]);

  useEffect(() => {
    if (!router.isReady) return;

    const bookingCreated = Array.isArray(router.query.bookingCreated)
      ? router.query.bookingCreated[0]
      : router.query.bookingCreated;

    if (!bookingCreated) return;

    setToast({
      open: true,
      severity: "success",
      message: `Booking created. Ref ${bookingCreated}`,
    });

    const nextQuery = { ...router.query };
    delete nextQuery.bookingCreated;
    router.replace(
      { pathname: router.pathname, query: nextQuery },
      undefined,
      { shallow: true },
    );
  }, [router, router.isReady, router.query.bookingCreated]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(0);
  };

  const handleReset = () => {
    setSearchInput("");
    setSearch("");
    setPage(0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const handleTabChange = (event, nextStatus) => {
    setActiveStatus(nextStatus);
    setPage(0);
  };

  const handleReservationUpdated = (nextReservation) => {
    setSelectedReservation(nextReservation);

    if (nextReservation.status !== activeStatus) {
      setReservations((current) =>
        current.filter((reservation) => reservation.id !== nextReservation.id),
      );
      setReservationCount((current) => Math.max(current - 1, 0));
      loadReservations();
      loadTabCounts();
      return;
    }

    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === nextReservation.id ? nextReservation : reservation,
      ),
    );
    loadTabCounts();
  };

  return (
    <AdminLayout loading={loading} onSignOut={handleLogout}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            {!hideTitleCount && (
              <Typography color="text.secondary">
                {reservationCount} reservation
                {reservationCount === 1 ? "" : "s"}
              </Typography>
            )}
          </Box>

          {tabs?.length ? (
            <Paper elevation={1} sx={{ px: 1 }}>
              <Tabs
                value={activeStatus}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 56,
                  "& .MuiTab-root": {
                    minHeight: 56,
                    textTransform: "none",
                  },
                }}
              >
                {tabs.map((tab) => (
                  <Tab
                    key={tab.status}
                    value={tab.status}
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box component="span">{tab.label}</Box>
                        <Chip label={tabCounts[tab.status] || 0} size="small" />
                      </Stack>
                    }
                  />
                ))}
              </Tabs>
            </Paper>
          ) : null}

          {error && <Alert severity="error">{error}</Alert>}

          <TableContainer component={Paper} elevation={1}>
            <Box
              component="form"
              onSubmit={handleSearchSubmit}
              sx={{
                alignItems: { xs: "stretch", sm: "center" },
                borderBottom: "1px solid",
                borderColor: "divider",
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 1,
                p: 2,
              }}
            >
              <TextField
                label="Search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Guest, room, notes..."
                sx={{ maxWidth: { md: 420 } }}
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                startIcon={<SearchIcon />}
                disabled={loading}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                Search
              </Button>
              <Button
                type="button"
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={handleReset}
                disabled={loading}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                Reset
              </Button>
            </Box>
            <Table
              size="small"
              sx={{
                minWidth: hideFinancials ? 760 : showStayNights ? 980 : 900,
              }}
            >
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover", "& th": { px: 1.25, py: 1 } }}>
                  <TableCell sx={{ fontWeight: 800 }}>Customer name</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Contact number</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Guests</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Rooms</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Stay</TableCell>
                  {showStayNights && (
                    <TableCell sx={{ fontWeight: 800 }}>Nights</TableCell>
                  )}
                  {!hideFinancials && (
                    <>
                      <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Balance</TableCell>
                    </>
                  )}
                  <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservations.map((reservation) => {
                  const financials = getReservationFinancials(reservation);
                  const customer = reservation.customers || {};

                  return (
                    <TableRow
                      key={reservation.id}
                      hover
                      sx={{ "& td": { px: 1.25, py: 1, verticalAlign: "middle" } }}
                    >
                      <TableCell sx={{ minWidth: 140 }}>
                        {guestName(customer)}
                      </TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        {customer.contact_number || "No contact number"}
                      </TableCell>
                      <TableCell>{guestCount(reservation)}</TableCell>
                      <TableCell sx={{ minWidth: 100 }}>
                        {roomSummary(reservation.reserved_rooms)}
                      </TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        {formatDateRange(reservation)}
                      </TableCell>
                      {showStayNights && (
                        <TableCell sx={{ minWidth: 80 }}>
                          {stayNightSummary(reservation)}
                        </TableCell>
                      )}
                      {!hideFinancials && (
                        <>
                          <TableCell>{formatMoney(financials.total)}</TableCell>
                          <TableCell
                            sx={{
                              color:
                                financials.balance > 0
                                  ? "error.main"
                                  : "success.main",
                            }}
                          >
                            {formatMoney(financials.balance)}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setSelectedReservation(reservation)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loading && reservations.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={
                        3 +
                        2 +
                        (showStayNights ? 1 : 0) +
                        (hideFinancials ? 0 : 2) +
                        1
                      }
                    >
                      <Typography align="center" sx={{ py: 4 }}>
                        {activeTab?.emptyMessage ||
                          emptyMessage ||
                          "No reservations found."}
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
              onPageChange={(event, nextPage) => setPage(nextPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
            />
          </TableContainer>
        </Stack>
      </Container>
      <ReservationViewDialog
        open={Boolean(selectedReservation)}
        reservation={selectedReservation}
        onClose={() => setSelectedReservation(null)}
        onReservationUpdated={handleReservationUpdated}
      />
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
