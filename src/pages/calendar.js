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
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AdminLayout from "../components/layout/AdminLayout";
import ReservationViewDialog from "../components/reservation/ReservationViewDialog";
import supabase from "../utils/supabase";
import { getAdminReservations } from "../services/resortService";

const statusColors = {
  pending: "default",
  confirmed: "primary",
  checked_in: "success",
  checked_out: "warning",
  no_show: "error",
  cancelled: "secondary",
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatStatusLabel(status) {
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function bookingNights(reservation) {
  const checkin = moment(reservation.checkin);
  const checkout = moment(reservation.checkout);
  const dates = [];

  for (
    let day = checkin.clone();
    day.isBefore(checkout, "day");
    day.add(1, "day")
  ) {
    dates.push(day.format("YYYY-MM-DD"));
  }

  return dates.length ? dates : [checkin.format("YYYY-MM-DD")];
}

function guestName(reservation) {
  const customer = reservation.customers || {};
  return (
    `${customer.first_name || ""} ${customer.last_name || ""}`
      .trim()
      .toUpperCase() || "GUEST"
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(moment().startOf("month"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({
    open: false,
    severity: "success",
    message: "",
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [activeBookingFilter, setActiveBookingFilter] = useState("pending");

  async function loadReservations() {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminReservations();
      setReservations(data);
    } catch (err) {
      const message = err.message || "Unable to load bookings.";
      setError(message);
      setToast({ open: true, severity: "error", message });
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const handleReservationUpdated = (nextReservation) => {
    setSelectedReservation(nextReservation);
    setReservations((current) => current.map((reservation) => (
      reservation.id === nextReservation.id ? nextReservation : reservation
    )));
  };

  const handleNewBookingForSelectedDate = () => {
    if (!selectedDate) return;

    router.push({
      pathname: "/admin-booking",
      query: {
        checkin: selectedDate,
        checkout: moment(selectedDate).add(1, "day").format("YYYY-MM-DD"),
      },
    });
  };

  const calendarDays = useMemo(() => {
    const start = currentMonth.clone().startOf("month").startOf("week");
    const end = currentMonth.clone().endOf("month").endOf("week");
    const days = [];

    for (
      let day = start.clone();
      day.isSameOrBefore(end, "day");
      day.add(1, "day")
    ) {
      days.push(day.clone());
    }

    return days;
  }, [currentMonth]);

  const filteredReservations = useMemo(
    () =>
      reservations.filter(
        (reservation) => reservation.status === activeBookingFilter,
      ),
    [activeBookingFilter, reservations],
  );

  const bookingsByDate = useMemo(() => {
    return filteredReservations.reduce((map, reservation) => {
      bookingNights(reservation).forEach((date) => {
        map[date] = [...(map[date] || []), reservation];
      });
      return map;
    }, {});
  }, [filteredReservations]);

  const selectedDateBookings = selectedDate
    ? bookingsByDate[selectedDate] || []
    : [];
  const monthBookings = reservations.filter((reservation) =>
    bookingNights(reservation).some((date) =>
      moment(date).isSame(currentMonth, "month"),
    ),
  );
  const monthStats = [
    {
      label: formatStatusLabel("pending"),
      value: monthBookings.filter((booking) => booking.status === "pending")
        .length,
      filter: "pending",
    },
    {
      label: formatStatusLabel("confirmed"),
      value: monthBookings.filter((booking) => booking.status === "confirmed")
        .length,
      filter: "confirmed",
    },
    {
      label: formatStatusLabel("checked_in"),
      value: monthBookings.filter((booking) => booking.status === "checked_in")
        .length,
      filter: "checked_in",
    },
    {
      label: formatStatusLabel("checked_out"),
      value: monthBookings.filter((booking) => booking.status === "checked_out")
        .length,
      filter: "checked_out",
    },
    {
      label: formatStatusLabel("no_show"),
      value: monthBookings.filter((booking) => booking.status === "no_show")
        .length,
      filter: "no_show",
    },
  ];

  return (
    <AdminLayout loading={loading} onSignOut={handleLogout}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Booking calendar
            </Typography>
          </Box>
        </Box>

        <Paper elevation={1} sx={{ p: { xs: 1.5, md: 2 }, mb: 1.5 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            spacing={2}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ overflowX: "auto", pb: { xs: 0.5, sm: 0 } }}
            >
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  setCurrentMonth((month) => month.clone().subtract(1, "month"))
                }
              >
                Previous
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setCurrentMonth(moment().startOf("month"))}
              >
                Today
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  setCurrentMonth((month) => month.clone().add(1, "month"))
                }
              >
                Next
              </Button>
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 800, textAlign: { xs: "center", sm: "right" } }}>
              {currentMonth.format("MMMM YYYY")}
            </Typography>
          </Stack>
        </Paper>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(5, 1fr)" },
            mb: 2,
          }}
        >
          {monthStats.map(({ label, value, filter }) => {
            const isActive = activeBookingFilter === filter;

            return (
              <Paper
                component="button"
                type="button"
                aria-pressed={isActive}
                key={filter}
                elevation={isActive ? 4 : 1}
                onClick={() => setActiveBookingFilter(filter)}
                sx={{
                  appearance: "none",
                  bgcolor: isActive ? "primary.main" : "background.paper",
                  border: "1px solid",
                  borderColor: isActive ? "primary.main" : "divider",
                  borderRadius: 1,
                  color: isActive ? "primary.contrastText" : "text.primary",
                  cursor: "pointer",
                  font: "inherit",
                  p: { xs: 2, md: 2.5 },
                  textAlign: "left",
                  transition:
                    "background-color 150ms ease, box-shadow 150ms ease",
                  "&:hover": {
                    bgcolor: isActive ? "primary.dark" : "action.hover",
                  },
                  "&:focus-visible": {
                    outline: "3px solid",
                    outlineColor: "primary.light",
                    outlineOffset: 2,
                  },
                }}
              >
                <Typography
                  sx={{ fontSize: 14, opacity: isActive ? 0.85 : 0.7 }}
                >
                  {label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                  {value}
                </Typography>
              </Paper>
            );
          })}
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Paper
          elevation={1}
          sx={{
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            {weekDays.map((day) => (
              <Box
                key={day}
                sx={{
                  px: 1,
                  py: 0.75,
                  bgcolor: "action.selected",
                  borderRight: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "text.secondary",
                  }}
                >
                  {day}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            }}
          >
            {calendarDays.map((day) => {
              const dateKey = day.format("YYYY-MM-DD");
              const dayBookings = bookingsByDate[dateKey] || [];
              const isCurrentMonth = day.isSame(currentMonth, "month");

              const statusCounts = dayBookings.reduce((counts, reservation) => {
                counts[reservation.status] =
                  (counts[reservation.status] || 0) + 1;
                return counts;
              }, {});

              return (
                <Box
                  component="button"
                  type="button"
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  sx={{
                    appearance: "none",
                    cursor: "pointer",
                    font: "inherit",
                    minHeight: { xs: 92, md: 112 },
                    p: { xs: 0.5, sm: 1 },
                    borderRight: "1px solid",
                    borderBottom: "1px solid",
                    borderTop: 0,
                    borderLeft: 0,
                    borderColor: "divider",
                    color: "text.primary",
                    textAlign: "left",
                    bgcolor: isCurrentMonth ? "background.paper" : "action.hover",
                    opacity: isCurrentMonth ? 1 : 0.55,
                    "&:hover": {
                      bgcolor:
                        dayBookings.length > 0
                          ? "rgba(15, 118, 110, 0.08)"
                          : "action.hover",
                    },
                  }}
                >
                  <Stack spacing={0.75}>
                    <Typography
                      sx={{
                        alignItems: "center",
                        bgcolor: day.isSame(moment(), "day")
                          ? "primary.main"
                          : "transparent",
                        borderRadius: "50%",
                        color: day.isSame(moment(), "day")
                          ? "primary.contrastText"
                          : "text.primary",
                        display: "inline-flex",
                        fontSize: 13,
                        fontWeight: 800,
                        height: 24,
                        justifyContent: "center",
                        width: 24,
                      }}
                    >
                      {day.date()}
                    </Typography>
                    {dayBookings.length > 0 && (
                      <Box
                        sx={{
                          bgcolor: "rgba(15, 118, 110, 0.08)",
                          border: "1px solid",
                          borderColor: "primary.light",
                          borderRadius: 1,
                          display: { xs: "none", sm: "block" },
                          px: 0.75,
                          py: 0.5,
                        }}
                      >
                        <Typography
                          sx={{
                            color: "text.secondary",
                            fontSize: 10.5,
                            lineHeight: 1.2,
                          }}
                        >
                          {Object.entries(statusCounts)
                            .map(
                              ([status, count]) =>
                                `${count} ${formatStatusLabel(status)}`,
                            )
                            .join(" / ")}
                        </Typography>
                      </Box>
                    )}
                    {dayBookings.length > 2 && (
                      <Typography sx={{ color: "text.secondary", display: { xs: "none", sm: "block" }, fontSize: 10.5 }}>
                        Tap to view all
                      </Typography>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Paper>
      </Container>

      <Dialog
        open={Boolean(selectedDate)}
        onClose={() => setSelectedDate(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1, pr: 6 }}>
          <IconButton
            aria-label="Close"
            onClick={() => setSelectedDate(null)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {selectedDate
              ? moment(selectedDate).format("MMMM D, YYYY")
              : "Bookings"}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {selectedDateBookings.length} booking
            {selectedDateBookings.length === 1 ? "" : "s"}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Button
            variant="contained"
            onClick={handleNewBookingForSelectedDate}
            sx={{ mb: 2 }}
            fullWidth
          >
            New booking for this date
          </Button>
          {selectedDateBookings.length === 0 ? (
            <Typography color="text.secondary" sx={{ pb: 2 }}>
              No bookings for this date.
            </Typography>
          ) : (
            <Stack spacing={1.5} sx={{ pb: 1 }}>
              {selectedDateBookings.map((reservation) => {
                const customer = reservation.customers || {};
                return (
                  <Paper
                    key={reservation.id}
                    variant="outlined"
                    sx={{ p: 1.5 }}
                  >
                    <Box
                      sx={{
                        alignItems: { xs: "flex-start", sm: "center" },
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        gap: 1,
                        justifyContent: "space-between",
                        width: "100%",
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>
                          {guestName(reservation)}
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                          {moment(reservation.checkin).format("MMM D, YYYY")} -{" "}
                          {moment(reservation.checkout).format("MMM D, YYYY")}
                        </Typography>
                      </Box>
                      <Chip
                        label={formatStatusLabel(reservation.status)}
                        color={statusColors[reservation.status] || "default"}
                        size="small"
                      />
                      <Box sx={{ display: "flex", width: { xs: "100%", sm: "auto" } }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setSelectedReservation(reservation)}
                          fullWidth
                        >
                          View
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

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
