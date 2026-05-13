import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import moment from "moment";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { createReservation, getRoomAvailability, getRoomImage } from "../services/resortService";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  contactNumber: "",
  notes: "",
};

const defaultCheckin = "2026-05-14";
const defaultCheckout = "2026-05-15";

export default function BookingPage() {
  const [checkin, setCheckin] = useState(defaultCheckin);
  const [checkout, setCheckout] = useState(defaultCheckout);
  const [adult, setAdult] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomQuantity, setRoomQuantity] = useState(1);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const nights = useMemo(
    () => Math.max(moment(checkout).diff(moment(checkin), "days"), 0),
    [checkin, checkout]
  );
  const total = selectedRoom ? Number(selectedRoom.rate) * roomQuantity * nights : 0;

  useEffect(() => {
    const nextCheckin = moment().add(1, "day").format("YYYY-MM-DD");
    const nextCheckout = moment().add(2, "days").format("YYYY-MM-DD");
    setCheckin(nextCheckin);
    setCheckout(nextCheckout);
  }, []);

  useEffect(() => {
    async function loadRooms() {
      if (!checkin || !checkout || moment(checkout).isSameOrBefore(checkin)) return;
      setLoading(true);
      setError("");
      try {
        const availability = await getRoomAvailability({ checkin, checkout });
        setRooms(availability);
        setSelectedRoom((current) => {
          if (!current) return null;
          return availability.find((room) => room.id === current.id) || null;
        });
      } catch (err) {
        setError(err.message || "Unable to load rooms.");
      } finally {
        setLoading(false);
      }
    }

    loadRooms();
  }, [checkin, checkout]);

  const availableRooms = rooms.filter(
    (room) =>
      Number(room.available_quantity) >= Number(roomQuantity) &&
      Number(room.occupancy) >= Number(adult)
  );

  const handleFormChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedRoom) {
      setError("Choose an available room first.");
      return;
    }

    if (!form.firstName || !form.lastName || !form.email || !form.contactNumber) {
      setError("Please complete your contact details.");
      return;
    }

    setSubmitting(true);
    try {
      const reservationId = await createReservation({
        ...form,
        roomId: selectedRoom.id,
        roomQuantity,
        checkin,
        checkout,
        adult,
        children,
      });

      setMessage(`Reservation received. Your booking reference is ${reservationId}.`);
      setForm(initialForm);
      setSelectedRoom(null);
      const availability = await getRoomAvailability({ checkin, checkout });
      setRooms(availability);
    } catch (err) {
      setError(err.message || "Reservation failed. Please try another room or date.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Head>
        <title>Resort Room Reservations</title>
      </Head>

      <Box
        sx={{
          color: "#fff",
          backgroundImage:
            "linear-gradient(rgba(6, 44, 39, 0.68), rgba(6, 44, 39, 0.62)), url(https://images.unsplash.com/photo-1540541338287-41700207dee6)",
          backgroundPosition: "center",
          backgroundSize: "cover",
          pb: { xs: 11, md: 13 },
          pt: { xs: 4, md: 6 },
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: { xs: 7, md: 10 } }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Resort Reservations
            </Typography>
            <Button href="/admin" variant="outlined" sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.75)" }}>
              Admin
            </Button>
          </Stack>
          <Box sx={{ maxWidth: 720 }}>
            <Typography variant="h2" component="h1" sx={{ fontWeight: 800, fontSize: { xs: 38, md: 64 }, mb: 2 }}>
              Book your resort stay
            </Typography>
            <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.88)", lineHeight: 1.6 }}>
              Choose dates, pick an available room, and submit your reservation request.
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <Paper
          elevation={2}
          sx={{
            mt: { xs: -7, md: -6 },
            p: { xs: 2, md: 3 },
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(12, 1fr)" },
            }}
          >
            <TextField
              label="Check-in"
              type="date"
              value={checkin}
              onChange={(event) => setCheckin(event.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ gridColumn: { md: "span 3" } }}
              fullWidth
            />
            <TextField
              label="Check-out"
              type="date"
              value={checkout}
              onChange={(event) => setCheckout(event.target.value)}
              InputLabelProps={{ shrink: true }}
              error={moment(checkout).isSameOrBefore(checkin)}
              helperText={moment(checkout).isSameOrBefore(checkin) ? "Must be after check-in" : ""}
              sx={{ gridColumn: { md: "span 3" } }}
              fullWidth
            />
            <TextField
              label="Adults"
              type="number"
              value={adult}
              onChange={(event) => setAdult(Math.max(Number(event.target.value), 1))}
              inputProps={{ min: 1 }}
              sx={{ gridColumn: { md: "span 2" } }}
              fullWidth
            />
            <TextField
              label="Children"
              type="number"
              value={children}
              onChange={(event) => setChildren(Math.max(Number(event.target.value), 0))}
              inputProps={{ min: 0 }}
              sx={{ gridColumn: { md: "span 2" } }}
              fullWidth
            />
            <TextField
              label="Rooms"
              type="number"
              value={roomQuantity}
              onChange={(event) => setRoomQuantity(Math.max(Number(event.target.value), 1))}
              inputProps={{ min: 1 }}
              sx={{ gridColumn: { md: "span 2" } }}
              fullWidth
            />
          </Box>
        </Paper>

        {loading && <LinearProgress sx={{ mt: 2, borderRadius: 8 }} />}

        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 380px" },
            alignItems: "start",
            py: { xs: 4, md: 5 },
          }}
        >
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Available rooms
                </Typography>
                <Typography color="text.secondary">
                  {availableRooms.length} option{availableRooms.length === 1 ? "" : "s"} for your dates
                </Typography>
              </Box>
            </Stack>

            <Stack spacing={2} sx={{ mb: 2 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {message && <Alert severity="success">{message}</Alert>}
            </Stack>

            <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}>
              {availableRooms.map((room) => (
                <Card key={room.id} sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <CardMedia component="img" height="210" image={getRoomImage(room.image)} alt={room.name} />
                  <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="start" sx={{ mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {room.name}
                      </Typography>
                      <Chip label={`${room.available_quantity} left`} color="primary" size="small" />
                    </Stack>
                    <Typography color="text.secondary" sx={{ mb: 1 }}>
                      Good for {room.occupancy} guests
                    </Typography>
                    <Typography sx={{ mb: 2 }}>{room.description}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      PHP {Number(room.rate).toLocaleString()} / night
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                    <Button
                      color="primary"
                      variant={selectedRoom && selectedRoom.id === room.id ? "contained" : "outlined"}
                      onClick={() => setSelectedRoom(room)}
                      fullWidth
                    >
                      {selectedRoom && selectedRoom.id === room.id ? "Selected" : "Select room"}
                    </Button>
                  </CardActions>
                </Card>
              ))}

              {!loading && availableRooms.length === 0 && (
                <Paper sx={{ p: 3, gridColumn: "1 / -1" }}>
                  <Typography>No rooms match those dates and guest counts.</Typography>
                </Paper>
              )}
            </Box>
          </Box>

          <Paper sx={{ p: { xs: 2.5, md: 3 }, position: { md: "sticky" }, top: 24 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
              Reservation details
            </Typography>
            {selectedRoom ? (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 800 }}>{selectedRoom.name}</Typography>
                <Typography color="text.secondary">
                  {nights} night{nights === 1 ? "" : "s"} x {roomQuantity} room
                  {roomQuantity === 1 ? "" : "s"}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
                  PHP {total.toLocaleString()}
                </Typography>
              </Box>
            ) : (
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Select a room to continue.
              </Typography>
            )}
            <Divider sx={{ mb: 2 }} />
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField label="First name" name="firstName" value={form.firstName} onChange={handleFormChange} fullWidth required />
                  <TextField label="Last name" name="lastName" value={form.lastName} onChange={handleFormChange} fullWidth required />
                </Stack>
                <TextField label="Email" name="email" type="email" value={form.email} onChange={handleFormChange} fullWidth required />
                <TextField label="Contact number" name="contactNumber" value={form.contactNumber} onChange={handleFormChange} fullWidth required />
                <TextField label="Notes" name="notes" value={form.notes} onChange={handleFormChange} fullWidth multiline minRows={3} />
                <Button type="submit" color="primary" variant="contained" size="large" fullWidth disabled={submitting || !selectedRoom || nights < 1}>
                  {submitting ? "Submitting..." : "Reserve room"}
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}
