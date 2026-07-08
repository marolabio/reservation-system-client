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
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AdminLayout from "../layout/AdminLayout";
import supabase from "../../utils/supabase";
import {
  getAdminReservationsPage,
  getReservationFinancials,
  getWalkInSalesSummary,
} from "../../services/resortService";
import { formatDateRange, formatMoney, guestName, shortReference } from "../../utils/reservationUi";
import ReservationViewDialog from "../reservation/ReservationViewDialog";

const reportConfigs = {
  checked_out: {
    title: "Checked out report",
    description: "Checked-out reservations and payment summary by date range.",
    tableTitle: "Checked-out guests",
    emptyMessage: "No checked-out reservations found for this date range.",
    showFinancialCards: true,
  },
  no_show: {
    title: "No-show report",
    description: "No-show reservations by date range.",
    tableTitle: "No-show guests",
    emptyMessage: "No no-show reservations found for this date range.",
    showFinancialCards: false,
  },
  cancelled: {
    title: "Cancelled report",
    description: "Cancelled reservations by date range.",
    tableTitle: "Cancelled guests",
    emptyMessage: "No cancelled reservations found for this date range.",
    showFinancialCards: false,
  },
};

function getDefaultCustomDates() {
  return {
    from: moment().startOf("year").format("YYYY-MM-DD"),
    to: moment().endOf("year").format("YYYY-MM-DD"),
  };
}

function getQuickDateRange(value) {
  if (value === "day") {
    return {
      from: moment().format("YYYY-MM-DD"),
      to: moment().format("YYYY-MM-DD"),
    };
  }

  if (value === "year") {
    return {
      from: moment().startOf("year").format("YYYY-MM-DD"),
      to: moment().endOf("year").format("YYYY-MM-DD"),
    };
  }

  return getDefaultCustomDates();
}

function isDefaultFilter({ dateFilter, dateFrom, dateTo, search }) {
  const defaultDates = getDefaultCustomDates();

  return (
    dateFilter === "year" &&
    dateFrom === defaultDates.from &&
    dateTo === defaultDates.to &&
    !search
  );
}

function roomSummary(rooms = []) {
  const totalRooms = rooms.reduce((sum, room) => sum + Number(room.reserved_quantity || 0), 0);
  if (!totalRooms) return "No rooms";
  return `${totalRooms} ${totalRooms === 1 ? "room" : "rooms"}`;
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

export default function ReportsPage({ status = "checked_out" }) {
  const router = useRouter();
  const reportConfig = reportConfigs[status] || reportConfigs.checked_out;
  const defaultDates = useMemo(() => getDefaultCustomDates(), []);
  const [reservations, setReservations] = useState([]);
  const [reservationCount, setReservationCount] = useState(0);
  const [financials, setFinancials] = useState({
    grossSales: 0,
    collected: 0,
    refunds: 0,
    balance: 0,
    walkInSales: 0,
    walkInCount: 0,
  });
  const [dateFilter, setDateFilter] = useState("year");
  const [dateFrom, setDateFrom] = useState(defaultDates.from);
  const [dateTo, setDateTo] = useState(defaultDates.to);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftDateFilter, setDraftDateFilter] = useState("year");
  const [draftDateFrom, setDraftDateFrom] = useState(defaultDates.from);
  const [draftDateTo, setDraftDateTo] = useState(defaultDates.to);
  const [draftSearch, setDraftSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null);

  const activeDateParams = useMemo(() => {
    return {
      dateFilter: "all",
      dateFrom,
      dateTo,
    };
  }, [dateFrom, dateTo]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [reservationsData, totalsData, walkInSummary] = await Promise.all([
        getAdminReservationsPage({
          page,
          pageSize: rowsPerPage,
          status,
          search,
          ...activeDateParams,
        }),
        getAdminReservationsPage({
          page: 0,
          pageSize: 1000,
          status,
          search,
          ...activeDateParams,
        }),
        reportConfig.showFinancialCards
          ? getWalkInSalesSummary(activeDateParams)
          : Promise.resolve({ total: 0, count: 0 }),
      ]);

      const totals = totalsData.reservations.reduce(
        (sum, reservation) => {
          const reservationFinancials = getReservationFinancials(reservation);
          return {
            grossSales: sum.grossSales + reservationFinancials.total,
            collected: sum.collected + reservationFinancials.paid,
            refunds: sum.refunds + reservationFinancials.refunded,
            balance: sum.balance + reservationFinancials.balance,
          };
        },
        { grossSales: 0, collected: 0, refunds: 0, balance: 0 }
      );
      setReservations(reservationsData.reservations);
      setReservationCount(reservationsData.count);
      setFinancials({
        grossSales: totals.grossSales + walkInSummary.total,
        collected: totals.collected + walkInSummary.total,
        refunds: totals.refunds,
        balance: totals.balance,
        walkInSales: walkInSummary.total,
        walkInCount: walkInSummary.count,
      });
    } catch (err) {
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [activeDateParams, page, reportConfig.showFinancialCards, rowsPerPage, search, status]);

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
    loadReports();
  }, [loadReports, sessionReady]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const handleOpenFilters = () => {
    setDraftDateFilter(dateFilter);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setDraftSearch(search);
    setFilterOpen(true);
  };

  const handleCloseFilters = () => {
    setFilterOpen(false);
  };

  const handleDateFilterChange = (event, value) => {
    if (!value) return;
    const range = getQuickDateRange(value);
    setDraftDateFilter(value);
    setDraftDateFrom(range.from);
    setDraftDateTo(range.to);
  };

  const handleDateRangeChange = (field, value) => {
    if (field === "from") {
      setDraftDateFrom(value);
    } else {
      setDraftDateTo(value);
    }
    setDraftDateFilter("custom");
  };

  const handleSearchFilters = () => {
    setDateFilter(draftDateFilter);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setSearch(draftSearch.trim());
    setPage(0);
    setFilterOpen(false);
  };

  const handleResetFilters = () => {
  const range = getQuickDateRange("year");

    setDateFilter("year");
    setDateFrom(range.from);
    setDateTo(range.to);
    setSearch("");
    setDraftDateFilter("year");
    setDraftDateFrom(range.from);
    setDraftDateTo(range.to);
    setDraftSearch("");
    setPage(0);
    setFilterOpen(false);
  };

  const handleReservationUpdated = (nextReservation) => {
    setSelectedReservation(nextReservation);
    setReservations((current) => current.map((reservation) => (
      reservation.id === nextReservation.id ? nextReservation : reservation
    )));
  };

  const moneyCards = reportConfig.showFinancialCards ? [
    { label: "Gross sales", value: formatMoney(financials.grossSales) },
    { label: "Collected", value: formatMoney(financials.collected) },
    { label: "Walk-in sales", value: formatMoney(financials.walkInSales) },
    financials.refunds > 0 ? { label: "Refunds", value: formatMoney(financials.refunds) } : null,
    { label: "Open balance", value: formatMoney(financials.balance) },
  ].filter(Boolean) : [];
  const hasActiveFilters = !isDefaultFilter({
    dateFilter,
    dateFrom,
    dateTo,
    search,
  });
  return (
    <AdminLayout loading={loading} onSignOut={handleLogout}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {reportConfig.title}
            </Typography>
            <Typography color="text.secondary">
              {reportConfig.description}
            </Typography>
          </Box>

          <Paper elevation={1} sx={{ p: 2 }}>
            <Box
              sx={{
                alignItems: { xs: "stretch", sm: "center" },
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) auto" },
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 700 }}>Date range</Typography>
                <Typography color="text.secondary" variant="body2">
                  {moment(dateFrom).format("MMM D, YYYY")} -{" "}
                  {moment(dateTo).format("MMM D, YYYY")}
                  {search ? ` / ${search}` : ""}
                </Typography>
              </Box>
              <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: { xs: "flex-start", sm: "flex-end" } }}
              >
                {hasActiveFilters && (
                  <Button variant="text" onClick={handleResetFilters}>
                    Reset
                  </Button>
                )}
                <Button variant="outlined" onClick={handleOpenFilters}>
                  Filter
                </Button>
              </Stack>
            </Box>
          </Paper>

          {error && <Alert severity="error">{error}</Alert>}

          {moneyCards.length > 0 && (
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" } }}>
              {moneyCards.map((card) => (
                <Paper key={card.label} elevation={1} sx={{ p: 2.5 }}>
                  <Typography color="text.secondary">{card.label}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                    {card.value}
                  </Typography>
                </Paper>
              ))}
            </Box>
          )}

          <TableContainer component={Paper} elevation={1}>
            <Box
              sx={{
                alignItems: "center",
                borderBottom: 1,
                borderColor: "divider",
                display: "flex",
                gap: 2,
                p: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {reportConfig.tableTitle}
              </Typography>
            </Box>
            <Table sx={{ minWidth: financials.refunds > 0 ? 1100 : 1000 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Reference</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer name</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Rooms</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Stay</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Nights</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Paid</TableCell>
                  {financials.refunds > 0 && (
                    <TableCell sx={{ fontWeight: 800 }}>Refunded</TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservations.map((reservation) => {
                  const financial = getReservationFinancials(reservation);
                  return (
                    <TableRow key={reservation.id} hover sx={{ "& td": { py: 1.5, verticalAlign: "middle" } }}>
                      <TableCell>{shortReference(reservation.id)}</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        {guestName(reservation.customers)}
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>{roomSummary(reservation.reserved_rooms)}</TableCell>
                      <TableCell sx={{ minWidth: 170 }}>{formatDateRange(reservation)}</TableCell>
                      <TableCell>{stayNightSummary(reservation)}</TableCell>
                      <TableCell>{formatMoney(financial.total)}</TableCell>
                      <TableCell>{formatMoney(financial.paid)}</TableCell>
                      {financials.refunds > 0 && (
                        <TableCell>{formatMoney(financial.refunded)}</TableCell>
                      )}
                      <TableCell>
                        <Button onClick={() => setSelectedReservation(reservation)} size="small" variant="outlined">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loading && reservations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={financials.refunds > 0 ? 9 : 8}>
                      <Typography align="center" sx={{ py: 4 }}>
                        {reportConfig.emptyMessage}
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
      <Dialog open={filterOpen} onClose={handleCloseFilters} fullWidth maxWidth="xs">
        <DialogTitle>Filter report</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <ToggleButtonGroup
              value={draftDateFilter}
              exclusive
              onChange={handleDateFilterChange}
              size="small"
              sx={{
                maxWidth: "100%",
                overflowX: "auto",
                "& .MuiToggleButton-root": {
                  px: 1.5,
                  textTransform: "none",
                  whiteSpace: "nowrap",
                },
              }}
            >
              <ToggleButton value="day">Today</ToggleButton>
              <ToggleButton value="month">This month</ToggleButton>
              <ToggleButton value="year">This year</ToggleButton>
              <ToggleButton value="custom">Custom range</ToggleButton>
            </ToggleButtonGroup>

            <Stack spacing={2}>
              <TextField
                label="Customer name or reference"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Search guest or reservation reference"
                fullWidth
              />
              <TextField
                label="From"
                type="date"
                value={draftDateFrom}
                onChange={(event) =>
                  handleDateRangeChange("from", event.target.value)
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="To"
                type="date"
                value={draftDateTo}
                onChange={(event) =>
                  handleDateRangeChange("to", event.target.value)
                }
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: draftDateFrom || undefined }}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          {hasActiveFilters && (
            <Button onClick={handleResetFilters}>Reset</Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={handleCloseFilters}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSearchFilters}
            disabled={
              !draftDateFrom ||
              !draftDateTo ||
              new Date(draftDateTo) < new Date(draftDateFrom)
            }
          >
            Search
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
