import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import moment from "moment";
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import supabase from "../utils/supabase";
import { getAdminReservations } from "../services/resortService";

const statusColors = {
  pending: "default",
  confirmed: "primary",
  cancelled: "secondary",
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function bookingNights(reservation) {
  const checkin = moment(reservation.checkin);
  const checkout = moment(reservation.checkout);
  const dates = [];

  for (let day = checkin.clone(); day.isBefore(checkout, "day"); day.add(1, "day")) {
    dates.push(day.format("YYYY-MM-DD"));
  }

  return dates.length ? dates : [checkin.format("YYYY-MM-DD")];
}

function guestName(reservation) {
  const customer = reservation.customers || {};
  return `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Guest";
}

function roomSummary(reservation) {
  return (reservation.reserved_rooms || [])
    .map((reservedRoom) => `${reservedRoom.rooms?.name || "Room"} x ${reservedRoom.reserved_quantity}`)
    .join(", ");
}

export default function CalendarPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(moment().startOf("month"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);

  async function loadReservations() {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminReservations();
      setReservations(data);
    } catch (err) {
      setError(err.message || "Unable to load bookings.");
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

  const calendarDays = useMemo(() => {
    const start = currentMonth.clone().startOf("month").startOf("week");
    const end = currentMonth.clone().endOf("month").endOf("week");
    const days = [];

    for (let day = start.clone(); day.isSameOrBefore(end, "day"); day.add(1, "day")) {
      days.push(day.clone());
    }

    return days;
  }, [currentMonth]);

  const bookingsByDate = useMemo(() => {
    return reservations.reduce((map, reservation) => {
      bookingNights(reservation).forEach((date) => {
        map[date] = [...(map[date] || []), reservation];
      });
      return map;
    }, {});
  }, [reservations]);

  const selectedDateBookings = selectedDate ? bookingsByDate[selectedDate] || [] : [];
  const monthBookings = reservations.filter((reservation) =>
    bookingNights(reservation).some((date) => moment(date).isSame(currentMonth, "month"))
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Booking calendar
            </Typography>
            <Typography color="text.secondary">See check-ins, stays, and room assignments by date.</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, flexWrap: "wrap" }}>
              <Button href="/dashboard" variant={router.pathname === "/dashboard" ? "contained" : "outlined"} size="small">
                Dashboard
              </Button>
              <Button href="/admin-booking" variant={router.pathname === "/admin-booking" ? "contained" : "outlined"} size="small">
                New booking
              </Button>
              <Button href="/calendar" variant={router.pathname === "/calendar" ? "contained" : "outlined"} size="small">
                Calendar
              </Button>
            </Stack>
          </Box>
          <Button variant="outlined" size="small" onClick={handleLogout} sx={{ alignSelf: "flex-start", flexShrink: 0 }}>
            Sign out
          </Button>
        </Stack>

        <Paper elevation={1} sx={{ p: { xs: 1.5, md: 2 }, mb: 1.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button size="small" variant="outlined" onClick={() => setCurrentMonth((month) => month.clone().subtract(1, "month"))}>
                Previous
              </Button>
              <Button size="small" variant="outlined" onClick={() => setCurrentMonth(moment().startOf("month"))}>
                Today
              </Button>
              <Button size="small" variant="outlined" onClick={() => setCurrentMonth((month) => month.clone().add(1, "month"))}>
                Next
              </Button>
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {currentMonth.format("MMMM YYYY")}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mt: 1.5 }}>
            <Chip size="small" label={`${monthBookings.length} bookings this month`} />
            <Chip size="small" color="primary" label={`${monthBookings.filter((booking) => booking.status === "confirmed").length} confirmed`} />
            <Chip size="small" label={`${monthBookings.filter((booking) => booking.status === "pending").length} pending`} />
          </Stack>
        </Paper>

        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 8 }} />}
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Paper elevation={1} sx={{ overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", borderBottom: "1px solid", borderColor: "divider" }}>
            {weekDays.map((day) => (
              <Box key={day} sx={{ px: 1, py: 0.75, bgcolor: "grey.100", borderRight: "1px solid", borderColor: "divider" }}>
                <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 800, color: "text.secondary" }}>
                  {day}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
            {calendarDays.map((day) => {
              const dateKey = day.format("YYYY-MM-DD");
              const dayBookings = bookingsByDate[dateKey] || [];
              const isCurrentMonth = day.isSame(currentMonth, "month");

              const statusCounts = dayBookings.reduce((counts, reservation) => {
                counts[reservation.status] = (counts[reservation.status] || 0) + 1;
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
                    p: 1,
                    borderRight: "1px solid",
                    borderBottom: "1px solid",
                    borderTop: 0,
                    borderLeft: 0,
                    borderColor: "divider",
                    color: "text.primary",
                    textAlign: "left",
                    bgcolor: isCurrentMonth ? "background.paper" : "grey.50",
                    opacity: isCurrentMonth ? 1 : 0.55,
                    "&:hover": {
                      bgcolor: dayBookings.length > 0 ? "rgba(15, 118, 110, 0.08)" : "action.hover",
                    },
                  }}
                >
                  <Stack spacing={0.75}>
                    <Typography
                      sx={{
                        alignItems: "center",
                        bgcolor: day.isSame(moment(), "day") ? "primary.main" : "transparent",
                        borderRadius: "50%",
                        color: day.isSame(moment(), "day") ? "primary.contrastText" : "text.primary",
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
                          px: 0.75,
                          py: 0.5,
                        }}
                      >
                        <Typography sx={{ color: "primary.dark", fontSize: 12, fontWeight: 800, lineHeight: 1.2 }}>
                          {dayBookings.length} booking{dayBookings.length === 1 ? "" : "s"}
                        </Typography>
                        <Typography sx={{ color: "text.secondary", fontSize: 10.5, lineHeight: 1.2, mt: 0.25 }}>
                          {Object.entries(statusCounts)
                            .map(([status, count]) => `${count} ${status}`)
                            .join(" · ")}
                        </Typography>
                      </Box>
                    )}
                    {dayBookings.length > 2 && (
                      <Typography sx={{ color: "text.secondary", fontSize: 10.5 }}>
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

      <Dialog open={Boolean(selectedDate)} onClose={() => setSelectedDate(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {selectedDate ? moment(selectedDate).format("MMMM D, YYYY") : "Bookings"}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {selectedDateBookings.length} booking{selectedDateBookings.length === 1 ? "" : "s"}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedDateBookings.length === 0 ? (
            <Typography color="text.secondary" sx={{ pb: 2 }}>
              No bookings for this date.
            </Typography>
          ) : (
            <Stack spacing={1.5} sx={{ pb: 1 }}>
              {selectedDateBookings.map((reservation) => {
                const customer = reservation.customers || {};
                return (
                  <Paper key={reservation.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800 }}>{guestName(reservation)}</Typography>
                        <Typography color="text.secondary" variant="body2">
                          {customer.email || "No email"} · {customer.contact_number || "No contact number"}
                        </Typography>
                      </Box>
                      <Chip label={reservation.status} color={statusColors[reservation.status] || "default"} size="small" />
                    </Stack>
                    <Box component="ul" sx={{ color: "text.secondary", listStylePosition: "inside", m: "8px 0 0", p: 0 }}>
                      <Typography component="li" variant="body2">
                        Stay: {moment(reservation.checkin).format("MMM D, YYYY")} - {moment(reservation.checkout).format("MMM D, YYYY")}
                      </Typography>
                      <Typography component="li" variant="body2">
                        Guests: {reservation.adult} adult{Number(reservation.adult) === 1 ? "" : "s"}, {reservation.children} child{Number(reservation.children) === 1 ? "" : "ren"}
                      </Typography>
                      <Typography component="li" variant="body2">
                        Rooms: {roomSummary(reservation)}
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
