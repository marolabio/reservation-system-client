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
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AdminLayout from "../components/layout/AdminLayout";
import supabase from "../utils/supabase";
import { getAdminReservations } from "../services/resortService";

const statusColors = {
  pending: "default",
  confirmed: "primary",
  checked_in: "success",
  checked_out: "warning",
  cancelled: "secondary",
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  const bookingsByDate = useMemo(() => {
    return reservations.reduce((map, reservation) => {
      bookingNights(reservation).forEach((date) => {
        map[date] = [...(map[date] || []), reservation];
      });
      return map;
    }, {});
  }, [reservations]);

  const selectedDateBookings = selectedDate
    ? bookingsByDate[selectedDate] || []
    : [];
  const monthBookings = reservations.filter((reservation) =>
    bookingNights(reservation).some((date) =>
      moment(date).isSame(currentMonth, "month"),
    ),
  );
  const monthStats = [
    ["Bookings this month", monthBookings.length],
    [
      "Confirmed",
      monthBookings.filter((booking) => booking.status === "confirmed").length,
    ],
    [
      "Pending",
      monthBookings.filter((booking) => booking.status === "pending").length,
    ],
    [
      "Cancelled",
      monthBookings.filter((booking) => booking.status === "cancelled").length,
    ],
  ];

  return (
    <AdminLayout onSignOut={handleLogout}>
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
            <Stack direction="row" spacing={1} alignItems="center">
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
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {currentMonth.format("MMMM YYYY")}
            </Typography>
          </Stack>
        </Paper>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            mb: 2,
          }}
        >
          {monthStats.map(([label, value]) => (
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

        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 8 }} />}
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
                  bgcolor: "grey.100",
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
                          px: 0.75,
                          py: 0.5,
                        }}
                      >
                        <Typography
                          sx={{
                            color: "primary.dark",
                            fontSize: 12,
                            fontWeight: 800,
                            lineHeight: 1.2,
                          }}
                        >
                          {dayBookings.length} booking
                          {dayBookings.length === 1 ? "" : "s"}
                        </Typography>
                        <Typography
                          sx={{
                            color: "text.secondary",
                            fontSize: 10.5,
                            lineHeight: 1.2,
                            mt: 0.25,
                          }}
                        >
                          {Object.entries(statusCounts)
                            .map(([status, count]) => `${count} ${status}`)
                            .join(" / ")}
                        </Typography>
                      </Box>
                    )}
                    {dayBookings.length > 2 && (
                      <Typography
                        sx={{ color: "text.secondary", fontSize: 10.5 }}
                      >
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
                        display: "flex",
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
                        label={reservation.status}
                        color={statusColors[reservation.status] || "default"}
                        size="small"
                      />
                      <Box sx={{ display: "flex" }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setSelectedReservation(reservation)}
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

      <Dialog
        open={Boolean(selectedReservation)}
        onClose={() => setSelectedReservation(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1, pr: 6 }}>
          <IconButton
            aria-label="Close"
            onClick={() => setSelectedReservation(null)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Reservation details
          </Typography>
          {selectedReservation && (
            <Typography color="text.secondary" variant="body2">
              {moment(selectedReservation.checkin).format("MMM D, YYYY")} -{" "}
              {moment(selectedReservation.checkout).format("MMM D, YYYY")}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedReservation && (
            <Stack spacing={1.5} sx={{ pb: 1 }}>
              {(() => {
                const customer = selectedReservation.customers || {};
                const reservedRooms = selectedReservation.reserved_rooms || [];

                return (
                  <>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        spacing={2}
                        alignItems="flex-start"
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800 }}>
                            {guestName(selectedReservation)}
                          </Typography>
                          <Typography color="text.secondary" variant="body2">
                            {customer.email || "No email"} /{" "}
                            {customer.contact_number || "No contact number"}
                          </Typography>
                        </Box>
                        <Chip
                          label={selectedReservation.status}
                          color={
                            statusColors[selectedReservation.status] ||
                            "default"
                          }
                          size="small"
                        />
                      </Stack>

                      <Box
                        sx={{
                          display: "grid",
                          gap: 1,
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(2, minmax(0, 1fr))",
                          },
                          mt: 1.5,
                        }}
                      >
                        <Box>
                          <Typography color="text.secondary" variant="caption">
                            Stay
                          </Typography>
                          <Typography variant="body2">
                            {moment(selectedReservation.checkin).format(
                              "MMM D, YYYY",
                            )}{" "}
                            -{" "}
                            {moment(selectedReservation.checkout).format(
                              "MMM D, YYYY",
                            )}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography color="text.secondary" variant="caption">
                            Guests
                          </Typography>
                          <Typography variant="body2">
                            {selectedReservation.adult} adult
                            {Number(selectedReservation.adult) === 1 ? "" : "s"}
                            , {selectedReservation.children} child
                            {Number(selectedReservation.children) === 1
                              ? ""
                              : "ren"}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>

                    <Paper
                      variant="outlined"
                      sx={{ bgcolor: "grey.50", p: 1.5 }}
                    >
                      <Typography sx={{ fontWeight: 800, mb: 1 }}>
                        Rooms
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
                        {reservedRooms.map((reservedRoom) => (
                          <Typography
                            component="li"
                            key={reservedRoom.id}
                            sx={{ mb: 0.75, pl: 0.25 }}
                          >
                            <Box component="span" sx={{ fontWeight: 700 }}>
                              {reservedRoom.rooms?.name || "Room"}
                            </Box>{" "}
                            x {reservedRoom.reserved_quantity}
                            <Typography
                              component="span"
                              color="text.secondary"
                              sx={{ display: "block", fontSize: 13 }}
                            >
                              PHP{" "}
                              {Number(
                                reservedRoom.rooms?.rate || 0,
                              ).toLocaleString()}{" "}
                              / night
                            </Typography>
                          </Typography>
                        ))}
                      </Box>
                    </Paper>
                  </>
                );
              })()}
            </Stack>
          )}
        </DialogContent>
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
