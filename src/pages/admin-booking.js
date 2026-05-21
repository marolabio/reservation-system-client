import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import moment from "moment";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import supabase from "../utils/supabase";
import {
  createReservation,
  getRoomAvailability,
} from "../services/resortService";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  contactNumber: "",
  notes: "",
};

export default function AdminBookingPage() {
  const router = useRouter();
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [adult, setAdult] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomQuantity, setRoomQuantity] = useState(1);
  const [status, setStatus] = useState("confirmed");
  const [roomFilter, setRoomFilter] = useState("");
  const [rooms, setRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function requireSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/admin");
        return;
      }

      setCheckin(moment().add(1, "day").format("YYYY-MM-DD"));
      setCheckout(moment().add(2, "days").format("YYYY-MM-DD"));
    }

    requireSession();
  }, [router]);

  useEffect(() => {
    async function loadRooms() {
      if (!checkin || !checkout || moment(checkout).isSameOrBefore(checkin))
        return;

      setLoading(true);
      setError("");
      try {
        const availability = await getRoomAvailability({ checkin, checkout });
        setRooms(availability);
        setSelectedRooms((current) =>
          current
            .map((selectedRoom) => {
              const availableRoom = availability.find((room) => room.id === selectedRoom.id);
              if (!availableRoom) return null;
              return {
                ...availableRoom,
                selectedQuantity: Math.min(
                  Number(selectedRoom.selectedQuantity || 1),
                  Number(availableRoom.available_quantity || 0),
                ),
              };
            })
            .filter(Boolean)
            .filter((room) => Number(room.selectedQuantity) > 0),
        );
      } catch (err) {
        setError(err.message || "Unable to load rooms.");
      } finally {
        setLoading(false);
      }
    }

    loadRooms();
  }, [checkin, checkout]);

  const nights = useMemo(
    () => Math.max(moment(checkout).diff(moment(checkin), "days"), 0),
    [checkin, checkout],
  );

  const availableRooms = rooms.filter((room) => {
    const matchesCapacity =
      Number(room.available_quantity) >= Number(roomQuantity) &&
      Number(room.occupancy) >= Number(adult);
    const normalizedFilter = roomFilter.trim().toLowerCase();

    if (!matchesCapacity) return false;
    if (!normalizedFilter) return true;

    return [
      room.name,
      room.description,
      `capacity ${room.occupancy}`,
      `${room.occupancy} guests`,
      `${room.available_quantity} left`,
      `${room.rate}`,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedFilter));
  });

  const total = selectedRooms.reduce(
    (sum, room) => sum + Number(room.rate) * Number(room.selectedQuantity) * nights,
    0,
  );

  const totalSelectedRooms = selectedRooms.reduce(
    (sum, room) => sum + Number(room.selectedQuantity),
    0,
  );

  const handleAddRoom = (room) => {
    setSelectedRooms((current) => {
      const existingRoom = current.find((selectedRoom) => selectedRoom.id === room.id);
      const quantity = Math.min(Number(roomQuantity), Number(room.available_quantity));

      if (existingRoom) return current;
      return [...current, { ...room, selectedQuantity: quantity }];
    });
  };

  const handleSelectedRoomQuantity = (roomId, quantity) => {
    setSelectedRooms((current) =>
      current.map((room) =>
        room.id === roomId
          ? {
              ...room,
              selectedQuantity: Math.min(
                Math.max(Number(quantity), 1),
                Number(room.available_quantity || 1),
              ),
            }
          : room,
      ),
    );
  };

  const handleRemoveRoom = (roomId) => {
    setSelectedRooms((current) => current.filter((room) => room.id !== roomId));
  };

  const handleFormChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleCreateBooking = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (selectedRooms.length === 0) {
      setError("Choose at least one available room first.");
      return;
    }

    if (
      !form.firstName ||
      !form.lastName ||
      !form.email ||
      !form.contactNumber
    ) {
      setError("Complete the guest contact details.");
      return;
    }

    setSubmitting(true);
    try {
      const reservationId = await createReservation({
        ...form,
        rooms: selectedRooms.map((room) => ({
          roomId: room.id,
          roomQuantity: room.selectedQuantity,
        })),
        checkin,
        checkout,
        adult,
        children,
        status,
      });

      setMessage(`Booking created. Reference: ${reservationId}`);
      setForm(initialForm);
      setSelectedRooms([]);
      const availability = await getRoomAvailability({ checkin, checkout });
      setRooms(availability);
    } catch (err) {
      setError(err.message || "Unable to create booking.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        py: { xs: 3, md: 5 },
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            mb: 3,
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Front desk booking
            </Typography>
            <Typography color="text.secondary">
              Create reservations for walk-ins, calls, and staff-assisted
              guests.
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 1.5, flexWrap: "wrap" }}
            >
              <Button
                href="/dashboard"
                variant={
                  router.pathname === "/dashboard" ? "contained" : "outlined"
                }
                size="small"
              >
                Dashboard
              </Button>
              <Button
                href="/admin-booking"
                variant={
                  router.pathname === "/admin-booking"
                    ? "contained"
                    : "outlined"
                }
                size="small"
              >
                New booking
              </Button>
              <Button
                href="/calendar"
                variant={
                  router.pathname === "/calendar" ? "contained" : "outlined"
                }
                size="small"
              >
                Calendar
              </Button>
            </Stack>
          </Box>
          <Button variant="outlined" size="small" onClick={handleLogout} sx={{ alignSelf: "flex-start", flexShrink: 0 }}>
            Sign out
          </Button>
        </Box>

        <Paper elevation={1} sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(12, 1fr)",
              },
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
              helperText={
                moment(checkout).isSameOrBefore(checkin)
                  ? "Must be after check-in"
                  : ""
              }
              sx={{ gridColumn: { md: "span 3" } }}
              fullWidth
            />
            <TextField
              label="Adults"
              type="number"
              value={adult}
              onChange={(event) =>
                setAdult(Math.max(Number(event.target.value), 1))
              }
              inputProps={{ min: 1 }}
              sx={{ gridColumn: { md: "span 2" } }}
              fullWidth
            />
            <TextField
              label="Children"
              type="number"
              value={children}
              onChange={(event) =>
                setChildren(Math.max(Number(event.target.value), 0))
              }
              inputProps={{ min: 0 }}
              sx={{ gridColumn: { md: "span 2" } }}
              fullWidth
            />
            <TextField
              label="Rooms"
              type="number"
              value={roomQuantity}
              onChange={(event) =>
                setRoomQuantity(Math.max(Number(event.target.value), 1))
              }
              inputProps={{ min: 1 }}
              sx={{ gridColumn: { md: "span 2" } }}
              fullWidth
            />
          </Box>
        </Paper>

        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 8 }} />}

        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 380px" },
            alignItems: "start",
          }}
        >
          <Box>
            <Stack spacing={2} sx={{ mb: 2 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {message && <Alert severity="success">{message}</Alert>}
            </Stack>

            <Paper elevation={1} sx={{ overflow: "hidden" }}>
              <Box
                sx={{
                  p: 2.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", sm: "center" }}
                  spacing={2}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Available rooms
                    </Typography>
                    <Typography color="text.secondary">
                      {availableRooms.length} option
                      {availableRooms.length === 1 ? "" : "s"} match the guest
                      count, quantity, and filter.
                    </Typography>
                  </Box>
                  <TextField
                    label="Filter rooms"
                    value={roomFilter}
                    onChange={(event) => setRoomFilter(event.target.value)}
                    placeholder="Name, guests, rate..."
                    sx={{ width: { xs: "100%", sm: 260 } }}
                  />
                </Stack>
              </Box>
              <Stack divider={<Divider />} sx={{ p: 0 }}>
                {availableRooms.map((room) => (
                  <Box
                    key={room.id}
                    sx={{ display: "flex", justifyContent: "space-between", p: 2.5 }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mb: 0.5 }}
                      >
                        <Typography sx={{ fontWeight: 800 }}>
                          {room.name}
                        </Typography>
                        <Chip
                          label={`${room.available_quantity} left`}
                          color="primary"
                          size="small"
                        />
                      </Stack>
                      <Box
                        component="ul"
                        sx={{
                          color: "text.secondary",
                          display: "grid",
                          gap: 0.5,
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(2, minmax(0, 1fr))",
                          },
                          listStylePosition: "inside",
                          m: 0,
                          p: 0,
                        }}
                      >
                        <Typography component="li">
                          Capacity: {room.occupancy} guests
                        </Typography>
                        <Typography component="li">
                          Available: {room.available_quantity} room
                          {Number(room.available_quantity) === 1 ? "" : "s"}
                        </Typography>
                        <Typography component="li">
                          Rate: PHP {Number(room.rate).toLocaleString()} / night
                        </Typography>
                        <Typography component="li">
                          Add qty: {roomQuantity} room
                          {Number(roomQuantity) === 1 ? "" : "s"}
                        </Typography>
                      </Box>
                      {room.description && (
                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                          {room.description}
                        </Typography>
                      )}
                    </Box>
                    {(() => {
                      const isSelected = selectedRooms.some((selectedRoom) => selectedRoom.id === room.id);
                      return (
                    <Button
                      variant={isSelected ? "contained" : "outlined"}
                      onClick={() => handleAddRoom(room)}
                      disabled={isSelected}
                      sx={{ minWidth: 130 }}
                    >
                      {isSelected ? "Added" : "Add room"}
                    </Button>
                      );
                    })()}
                  </Box>
                ))}
                {!loading && availableRooms.length === 0 && (
                  <Box sx={{ p: 3 }}>
                    <Typography>
                      No rooms match those dates, guest counts, and filter.
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Box>

          <Paper
            elevation={1}
            sx={{ p: { xs: 2.5, md: 3 }, position: { md: "sticky" }, top: 24 }}
          >
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
              Guest details
            </Typography>
            {selectedRooms.length > 0 ? (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 800 }}>Selected rooms</Typography>
                <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                  {selectedRooms.map((room) => (
                    <Paper key={room.id} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700 }}>{room.name}</Typography>
                          <Typography color="text.secondary" variant="body2">
                            PHP {Number(room.rate).toLocaleString()} / night
                          </Typography>
                        </Box>
                        <Button size="small" color="secondary" onClick={() => handleRemoveRoom(room.id)}>
                          Remove
                        </Button>
                      </Stack>
                      <TextField
                        label="Rooms"
                        type="number"
                        size="small"
                        value={room.selectedQuantity}
                        onChange={(event) => handleSelectedRoomQuantity(room.id, event.target.value)}
                        inputProps={{ min: 1, max: room.available_quantity }}
                        helperText={`${room.available_quantity} available`}
                        sx={{ mt: 1.5, width: 140 }}
                      />
                    </Paper>
                  ))}
                </Stack>
                <Box
                  component="ul"
                  sx={{
                    color: "text.secondary",
                    listStylePosition: "inside",
                    m: "8px 0 0",
                    p: 0,
                  }}
                >
                  <Typography component="li">
                    Stay: {nights} night{nights === 1 ? "" : "s"}
                  </Typography>
                  <Typography component="li">
                    Rooms: {totalSelectedRooms} room{totalSelectedRooms === 1 ? "" : "s"}
                  </Typography>
                  <Typography component="li">
                    Guests: {adult} adult{Number(adult) === 1 ? "" : "s"},{" "}
                    {children} child{Number(children) === 1 ? "" : "ren"}
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
                  PHP {total.toLocaleString()}
                </Typography>
              </Box>
            ) : (
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Add one or more rooms to continue.
              </Typography>
            )}
            <Divider sx={{ mb: 2 }} />
            <Box component="form" onSubmit={handleCreateBooking}>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="First name"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleFormChange}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Last name"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleFormChange}
                    fullWidth
                    required
                  />
                </Stack>
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                  fullWidth
                  required
                />
                <TextField
                  label="Contact number"
                  name="contactNumber"
                  value={form.contactNumber}
                  onChange={handleFormChange}
                  fullWidth
                  required
                />
                <TextField
                  select
                  label="Booking status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  fullWidth
                >
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </TextField>
                <TextField
                  label="Notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  fullWidth
                  multiline
                  minRows={3}
                />
                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={submitting || selectedRooms.length === 0 || nights < 1}
                >
                  {submitting ? "Creating..." : "Create booking"}
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}
