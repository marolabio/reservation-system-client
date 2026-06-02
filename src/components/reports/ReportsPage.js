import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import moment from "moment";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  LinearProgress,
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
import { getAdminReservationsPage, getReservationDashboardStats, getReservationFinancials } from "../../services/resortService";
import { formatDateRange, formatMoney, guestName, shortReference, statusColors } from "../../utils/reservationUi";

function getDefaultCustomDates() {
  return {
    from: moment().startOf("month").format("YYYY-MM-DD"),
    to: moment().endOf("month").format("YYYY-MM-DD"),
  };
}

function roomSummary(rooms = []) {
  const totalRooms = rooms.reduce((sum, room) => sum + Number(room.reserved_quantity || 0), 0);
  const names = [...new Set(rooms.map((room) => room.rooms?.name).filter(Boolean))];
  if (!totalRooms) return "No rooms";
  return `${totalRooms} ${totalRooms === 1 ? "room" : "rooms"}${names.length ? ` / ${names.join(", ")}` : ""}`;
}

export default function ReportsPage() {
  const router = useRouter();
  const defaultDates = useMemo(() => getDefaultCustomDates(), []);
  const [stats, setStats] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [reservationCount, setReservationCount] = useState(0);
  const [financials, setFinancials] = useState({
    grossSales: 0,
    collected: 0,
    refunds: 0,
    balance: 0,
  });
  const [dateFilter, setDateFilter] = useState("month");
  const [customFrom, setCustomFrom] = useState(defaultDates.from);
  const [customTo, setCustomTo] = useState(defaultDates.to);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState("");

  const activeDateParams = useMemo(() => {
    if (dateFilter !== "custom") return { dateFilter };
    return {
      dateFilter: "all",
      dateFrom: customFrom,
      dateTo: customTo,
    };
  }, [customFrom, customTo, dateFilter]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextStats, reservationsData, totalsData] = await Promise.all([
        getReservationDashboardStats(activeDateParams),
        getAdminReservationsPage({
          page,
          pageSize: rowsPerPage,
          status: "all",
          ...activeDateParams,
        }),
        getAdminReservationsPage({
          page: 0,
          pageSize: 1000,
          status: "all",
          ...activeDateParams,
        }),
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

      setStats(nextStats);
      setReservations(reservationsData.reservations);
      setReservationCount(reservationsData.count);
      setFinancials(totals);
    } catch (err) {
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [activeDateParams, page, rowsPerPage]);

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

  const handleDateFilterChange = (event, value) => {
    if (!value) return;
    setDateFilter(value);
    setPage(0);
  };

  const moneyCards = [
    { label: "Gross sales", value: formatMoney(financials.grossSales) },
    { label: "Collected", value: formatMoney(financials.collected) },
    { label: "Refunds", value: formatMoney(financials.refunds) },
    { label: "Open balance", value: formatMoney(financials.balance) },
  ];

  const countCards = [
    { label: "Reservations", value: stats?.total || 0 },
    { label: "Pending", value: stats?.pending || 0 },
    { label: "Confirmed", value: stats?.confirmed || 0 },
    { label: "Checked in", value: stats?.inHouse || 0 },
    { label: "Checked out", value: stats?.checkedOut || 0 },
    { label: "Cancelled", value: stats?.cancelled || 0 },
  ];

  return (
    <AdminLayout onSignOut={handleLogout}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Sales Summary
            </Typography>
            <Typography color="text.secondary">Reservation and payment summary by date range.</Typography>
          </Box>

          <Paper elevation={1} sx={{ p: 2 }}>
            <Stack spacing={2}>
              <ToggleButtonGroup
                value={dateFilter}
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
                <ToggleButton value="custom">Custom</ToggleButton>
              </ToggleButtonGroup>

              {dateFilter === "custom" && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="From"
                    type="date"
                    value={customFrom}
                    onChange={(event) => {
                      setCustomFrom(event.target.value);
                      setPage(0);
                    }}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <TextField
                    label="To"
                    type="date"
                    value={customTo}
                    onChange={(event) => {
                      setCustomTo(event.target.value);
                      setPage(0);
                    }}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Stack>
              )}
            </Stack>
          </Paper>

          {loading && <LinearProgress sx={{ borderRadius: 8 }} />}
          {error && <Alert severity="error">{error}</Alert>}

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

          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(6, 1fr)" } }}>
            {countCards.map((card) => (
              <Paper key={card.label} elevation={1} sx={{ p: 2 }}>
                <Typography color="text.secondary" variant="body2">{card.label}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                  {card.value}
                </Typography>
              </Paper>
            ))}
          </Box>

          <TableContainer component={Paper} elevation={1}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Reservations
              </Typography>
            </Box>
            <Table sx={{ minWidth: 1050 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Guest</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Rooms</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Stay</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Paid</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Refunded</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Balance</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservations.map((reservation) => {
                  const financial = getReservationFinancials(reservation);
                  return (
                    <TableRow key={reservation.id} hover sx={{ "& td": { py: 2, verticalAlign: "top" } }}>
                      <TableCell sx={{ minWidth: 180 }}>
                        <Typography sx={{ fontWeight: 800 }}>{guestName(reservation.customers)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Ref {shortReference(reservation.id)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>{roomSummary(reservation.reserved_rooms)}</TableCell>
                      <TableCell sx={{ minWidth: 170 }}>{formatDateRange(reservation)}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{formatMoney(financial.total)}</TableCell>
                      <TableCell>{formatMoney(financial.paid)}</TableCell>
                      <TableCell>{formatMoney(financial.refunded)}</TableCell>
                      <TableCell sx={{ color: financial.balance > 0 ? "error.main" : "success.main", fontWeight: 800 }}>
                        {formatMoney(financial.balance)}
                      </TableCell>
                      <TableCell>
                        <Chip label={reservation.status} color={statusColors[reservation.status] || "default"} size="small" />
                      </TableCell>
                      <TableCell>
                        <Button component={Link} href={`/reservations/${reservation.id}`} size="small" variant="outlined">
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loading && reservations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Typography align="center" sx={{ py: 4 }}>
                        No reservations found for this date range.
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
    </AdminLayout>
  );
}
