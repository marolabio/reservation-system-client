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
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AdminLayout from "../components/layout/AdminLayout";
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

function getQueryDate(value) {
  if (Array.isArray(value)) return getQueryDate(value[0]);
  if (!value) return "";

  const date = moment(value, "YYYY-MM-DD", true);
  return date.isValid() ? date.format("YYYY-MM-DD") : "";
}

export default function AdminBookingPage() {
  const router = useRouter();
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [adult, setAdult] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomQuantity, setRoomQuantity] = useState(1);
  const [status, setStatus] = useState("pending");
  const [roomFilter, setRoomFilter] = useState("");
  const [rooms, setRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  useEffect(() => {
    async function requireSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/admin");
        return;
      }

      const queryCheckin = getQueryDate(router.query.checkin);
      const queryCheckout = getQueryDate(router.query.checkout);
      const fallbackCheckin = moment().add(1, "day").format("YYYY-MM-DD");
      const fallbackCheckout = moment().add(2, "days").format("YYYY-MM-DD");
      const nextCheckin = queryCheckin || fallbackCheckin;
      const nextCheckout =
        queryCheckout && moment(queryCheckout).isAfter(nextCheckin, "day")
          ? queryCheckout
          : moment(nextCheckin).add(1, "day").format("YYYY-MM-DD");

      setCheckin(nextCheckin);
      setCheckout(nextCheckout || fallbackCheckout);
    }

    if (!router.isReady) return;
    requireSession();
  }, [router, router.isReady, router.query.checkin, router.query.checkout]);

  useEffect(() => {
    async function loadRooms() {
      if (!checkin || !checkout || moment(checkout).isSameOrBefore(checkin))
        return;

      setLoading(true);
      try {
        const availability = await getRoomAvailability({ checkin, checkout });
        setRooms(availability);
        setSelectedRooms((current) =>
          current
            .map((selectedRoom) => {
              const availableRoom = availability.find(
                (room) => room.id === selectedRoom.id,
              );
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
        setToast({
          open: true,
          severity: "error",
          message: err.message || "Unable to load rooms.",
        });
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
      ...(room.amenities || []).map((amenity) => amenity.name),
      `capacity ${room.occupancy}`,
      `${room.occupancy} guests`,
      `${room.available_quantity} left`,
      `${room.rate}`,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedFilter));
  });

  const total = selectedRooms.reduce(
    (sum, room) =>
      sum + Number(room.rate) * Number(room.selectedQuantity) * nights,
    0,
  );

  const totalSelectedRooms = selectedRooms.reduce(
    (sum, room) => sum + Number(room.selectedQuantity),
    0,
  );

  const handleAddRoom = (room) => {
    setSelectedRooms((current) => {
      const existingRoom = current.find(
        (selectedRoom) => selectedRoom.id === room.id,
      );
      const quantity = Math.min(
        Number(roomQuantity),
        Number(room.available_quantity),
      );

      if (existingRoom) return current;
      setToast({
        open: true,
        severity: "success",
        message: `${room.name} added.`,
      });
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

    if (selectedRooms.length === 0) {
      setToast({
        open: true,
        severity: "error",
        message: "Choose a room first.",
      });
      return;
    }

    if (
      !form.firstName ||
      !form.lastName ||
      !form.email ||
      !form.contactNumber
    ) {
      setToast({
        open: true,
        severity: "error",
        message: "Complete guest details.",
      });
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

      setToast({
        open: true,
        severity: "success",
        message: `Booking created. Ref ${reservationId.slice(0, 8)}`,
      });
      router.push({
        pathname: "/bookings",
        query: {
          bookingCreated: reservationId.slice(0, 8),
        },
      });
    } catch (err) {
      setToast({
        open: true,
        severity: "error",
        message: err.message || "Unable to create booking.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  return (
    <AdminLayout loading={loading} onSignOut={handleLogout}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Box
          sx={{
            mb: 3,
            width: "100%",
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Front desk booking
            </Typography>
          </Box>
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

        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 380px" },
            alignItems: "start",
          }}
        >
          <Box>
            <Paper elevation={1} sx={{ overflow: "hidden" }}>
              <Box
                sx={{
                  p: 2.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box
                  sx={{
                    alignItems: { xs: "stretch", sm: "center" },
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Available rooms
                    </Typography>
                  </Box>
                  <TextField
                    label="Filter rooms"
                    value={roomFilter}
                    onChange={(event) => setRoomFilter(event.target.value)}
                    placeholder="Name, guests, rate..."
                    sx={{ flexShrink: 0, width: { xs: "100%", sm: 260 } }}
                  />
                </Box>
              </Box>
              <TableContainer>
                <Table size="small" sx={{ minWidth: 680 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "action.hover" }}>
                      <TableCell sx={{ fontWeight: 800 }}>Room</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Amenities</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Available</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Rate</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {availableRooms.map((room) => {
                      const isSelected = selectedRooms.some(
                        (selectedRoom) => selectedRoom.id === room.id,
                      );

                      return (
                        <TableRow
                          key={room.id}
                          hover
                          sx={{ "& td": { py: 1.25, verticalAlign: "top" } }}
                        >
                          <TableCell sx={{ minWidth: 190 }}>
                            <Typography sx={{ fontWeight: 700 }}>
                              {room.name}
                            </Typography>
                            <Typography color="text.secondary" variant="body2">
                              Capacity: {room.occupancy} Pax
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ minWidth: 150 }}>
                            {(room.amenities || []).length > 0 ? (
                              <Stack
                                direction="row"
                                spacing={0.75}
                                useFlexGap
                                flexWrap="wrap"
                              >
                                {room.amenities.map((amenity) => (
                                  <Chip
                                    key={amenity.id}
                                    label={amenity.name}
                                    size="small"
                                  />
                                ))}
                              </Stack>
                            ) : (
                              <Typography
                                color="text.secondary"
                                variant="body2"
                              >
                                None
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography color="text.secondary" variant="body2">
                              {room.available_quantity}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {Number(room.rate).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant={isSelected ? "contained" : "outlined"}
                              onClick={() => handleAddRoom(room)}
                              disabled={isSelected}
                              sx={{ minWidth: 112 }}
                            >
                              {isSelected ? "Added" : "Add room"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!loading && availableRooms.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography>
                            No rooms match those dates, guest counts, and
                            filter.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>

          <Stack spacing={2} sx={{ position: { md: "sticky" }, top: 24 }}>
            <Paper elevation={1} sx={{ p: { xs: 2.5, md: 3 } }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
                Selected rooms
              </Typography>
              {selectedRooms.length > 0 ? (
                <Box>
                  <Stack spacing={1.25}>
                    {selectedRooms.map((room) => (
                      <Paper
                        key={room.id}
                        variant="outlined"
                        sx={{ p: 1.5, position: "relative" }}
                      >
                        <Stack spacing={1.25}>
                          <Box sx={{ minWidth: 0, pr: 9 }}>
                            <Typography sx={{ fontWeight: 700 }}>
                              {room.name}
                            </Typography>
                            <Typography
                              color="text.secondary"
                              variant="caption"
                            >
                              {room.available_quantity} available
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            color="secondary"
                            onClick={() => handleRemoveRoom(room.id)}
                            sx={{
                              position: "absolute",
                              right: 8,
                              top: 8,
                            }}
                          >
                            Remove
                          </Button>
                          <Box
                            sx={{
                              alignItems: "center",
                              display: "grid",
                              gap: 1.25,
                              gridTemplateColumns: {
                                xs: "92px minmax(0, 1fr)",
                                sm: "92px minmax(0, 1fr) minmax(0, 1fr)",
                              },
                            }}
                          >
                            <TextField
                              label="Qty"
                              type="number"
                              size="small"
                              value={room.selectedQuantity}
                              onChange={(event) =>
                                handleSelectedRoomQuantity(
                                  room.id,
                                  event.target.value,
                                )
                              }
                              inputProps={{
                                min: 1,
                                max: room.available_quantity,
                              }}
                              sx={{ width: 92 }}
                            />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                color="text.secondary"
                                variant="caption"
                                sx={{ display: "block" }}
                              >
                                Rate
                              </Typography>
                              <Typography sx={{ fontWeight: 700 }}>
                                {Number(room.rate).toLocaleString()}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                gridColumn: { xs: "1 / -1", sm: "auto" },
                                minWidth: 0,
                                textAlign: { xs: "left", sm: "right" },
                              }}
                            >
                              <Typography
                                color="text.secondary"
                                variant="caption"
                                sx={{ display: "block" }}
                              >
                                Amount
                              </Typography>
                              <Typography sx={{ fontWeight: 800 }}>
                                {(
                                  Number(room.rate) *
                                  Number(room.selectedQuantity) *
                                  nights
                                ).toLocaleString()}
                              </Typography>
                            </Box>
                          </Box>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>

                  <Divider sx={{ my: 2 }} />
                  <Box
                    sx={{
                      alignItems: { xs: "stretch", sm: "flex-end" },
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      gap: 2,
                      justifyContent: "space-between",
                    }}
                  >
                    <Box
                      sx={{
                        color: "text.secondary",
                        display: "grid",
                        gap: 0.5,
                        gridTemplateColumns: "auto minmax(0, 1fr)",
                      }}
                    >
                      <Typography sx={{ marginRight: 1 }}>Stay</Typography>
                      <Typography sx={{ fontWeight: 700 }}>
                        {nights} night{nights === 1 ? "" : "s"}
                      </Typography>
                      <Typography sx={{ marginRight: 1 }}>Rooms</Typography>
                      <Typography sx={{ fontWeight: 700 }}>
                        {totalSelectedRooms} room
                        {totalSelectedRooms === 1 ? "" : "s"}
                      </Typography>
                      <Typography sx={{ marginRight: 1 }}>Guests</Typography>
                      <Typography sx={{ fontWeight: 700 }}>
                        {adult} adult{Number(adult) === 1 ? "" : "s"},{" "}
                        {children} child{Number(children) === 1 ? "" : "ren"}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                      <Typography color="text.secondary" variant="caption">
                        Total
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800 }}>
                        {total.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Typography color="text.secondary">
                  No room selected.
                </Typography>
              )}
            </Paper>

            <Paper elevation={1} sx={{ p: { xs: 2.5, md: 3 } }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
                Guest details
              </Typography>
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
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="confirmed">Confirmed</MenuItem>
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
                    disabled={
                      submitting || selectedRooms.length === 0 || nights < 1
                    }
                  >
                    {submitting ? "Creating..." : "Create booking"}
                  </Button>
                </Stack>
              </Box>
            </Paper>
          </Stack>
        </Box>
      </Container>
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
