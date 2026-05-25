import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
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
  LinearProgress,
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
import { createRoom, deleteRoom, getAdminRooms, getRoomImage, updateRoom } from "../services/resortService";
import supabase from "../utils/supabase";

const initialForm = {
  name: "",
  description: "",
  occupancy: 2,
  quantity: 1,
  rate: 0,
  imageUrl: "",
};

function roomToForm(room) {
  return {
    name: room.name || "",
    description: room.description || "",
    occupancy: room.occupancy || 1,
    quantity: room.quantity || 0,
    rate: room.rate || 0,
    imageUrl: room.image?.url || room.image?.publicUrl || "",
  };
}

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteRoomTarget, setDeleteRoomTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ open: false, severity: "success", message: "" });

  async function loadRooms() {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminRooms();
      setRooms(data);
    } catch (err) {
      setError(err.message || "Unable to load rooms.");
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
      loadRooms();
    }

    requireSession();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const validateRoomForm = (values) => {
    if (!values.name.trim()) return "Room name is required.";
    if (Number(values.occupancy) < 1 || Number(values.quantity) < 0 || Number(values.rate) < 0) {
      return "Check capacity, quantity, and rate.";
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateRoomForm(form);
    if (validationError) {
      setToast({ open: true, severity: "error", message: validationError });
      return;
    }

    setSaving(true);
    try {
      const room = await createRoom(form);
      setRooms((current) => [room, ...current]);
      setForm(initialForm);
      setToast({ open: true, severity: "success", message: "Room added." });
    } catch (err) {
      setToast({ open: true, severity: "error", message: err.message || "Unable to add room." });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (room) => {
    setEditRoom(room);
    setEditForm(roomToForm(room));
  };

  const handleCloseEdit = () => {
    if (editSaving) return;
    setEditRoom(null);
    setEditForm(initialForm);
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editRoom) return;

    const validationError = validateRoomForm(editForm);
    if (validationError) {
      setToast({ open: true, severity: "error", message: validationError });
      return;
    }

    setEditSaving(true);
    try {
      const room = await updateRoom(editRoom.id, editForm);
      setRooms((current) => current.map((currentRoom) => (currentRoom.id === room.id ? room : currentRoom)));
      setEditRoom(null);
      setEditForm(initialForm);
      setToast({ open: true, severity: "success", message: "Room updated." });
    } catch (err) {
      setToast({ open: true, severity: "error", message: err.message || "Unable to update room." });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRoomTarget) return;

    setDeleteSaving(true);
    try {
      await deleteRoom(deleteRoomTarget.id);
      setRooms((current) => current.filter((room) => room.id !== deleteRoomTarget.id));
      setDeleteRoomTarget(null);
      setToast({ open: true, severity: "success", message: "Room deleted." });
    } catch (err) {
      setToast({
        open: true,
        severity: "error",
        message: err.message || "Unable to delete room. It may already be used by a reservation.",
      });
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <AdminLayout onSignOut={handleLogout}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Rooms
          </Typography>
          <Typography color="text.secondary">Inventory, capacity, rates.</Typography>
        </Box>

        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 8 }} />}
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "420px minmax(0, 1fr)" } }}>
          <Paper elevation={1} sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Add room
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField label="Room name" name="name" value={form.name} onChange={handleChange} fullWidth required />
                <TextField
                  label="Description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  minRows={3}
                />
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                  <TextField
                    label="Capacity"
                    name="occupancy"
                    type="number"
                    value={form.occupancy}
                    onChange={handleChange}
                    inputProps={{ min: 1 }}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Quantity"
                    name="quantity"
                    type="number"
                    value={form.quantity}
                    onChange={handleChange}
                    inputProps={{ min: 0 }}
                    fullWidth
                    required
                  />
                </Box>
                <TextField
                  label="Rate per night"
                  name="rate"
                  type="number"
                  value={form.rate}
                  onChange={handleChange}
                  inputProps={{ min: 0, step: "0.01" }}
                  fullWidth
                  required
                />
                <TextField
                  label="Image URL"
                  name="imageUrl"
                  value={form.imageUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  fullWidth
                />
                <Button type="submit" variant="contained" size="large" disabled={saving}>
                  {saving ? "Adding..." : "Add room"}
                </Button>
              </Stack>
            </Box>
          </Paper>

          <TableContainer component={Paper} elevation={1}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Room</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Capacity</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Quantity</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Rate</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Image</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id} hover sx={{ "& td": { py: 2, verticalAlign: "top" } }}>
                    <TableCell sx={{ minWidth: 260 }}>
                      <Typography sx={{ fontWeight: 800 }}>{room.name}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {room.description || "No description"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={`${room.occupancy} guests`} />
                    </TableCell>
                    <TableCell>{room.quantity}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>PHP {Number(room.rate || 0).toLocaleString()}</TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography
                        component="a"
                        href={getRoomImage(room.image)}
                        target="_blank"
                        rel="noreferrer"
                        variant="body2"
                        sx={{
                          color: "primary.main",
                          display: "block",
                          overflow: "hidden",
                          textDecoration: "none",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        View image
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={() => handleOpenEdit(room)}>
                          Edit
                        </Button>
                        <Button size="small" color="error" variant="outlined" onClick={() => setDeleteRoomTarget(room)}>
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && rooms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography align="center" sx={{ py: 4 }}>
                        No rooms yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Container>

      <Dialog open={Boolean(editRoom)} onClose={handleCloseEdit} fullWidth maxWidth="sm">
        <DialogTitle>Edit room</DialogTitle>
        <DialogContent>
          <Box component="form" id="edit-room-form" onSubmit={handleSaveEdit} sx={{ pt: 1 }}>
            <Stack spacing={2}>
              <TextField label="Room name" name="name" value={editForm.name} onChange={handleEditChange} fullWidth required />
              <TextField
                label="Description"
                name="description"
                value={editForm.description}
                onChange={handleEditChange}
                fullWidth
                multiline
                minRows={3}
              />
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <TextField
                  label="Capacity"
                  name="occupancy"
                  type="number"
                  value={editForm.occupancy}
                  onChange={handleEditChange}
                  inputProps={{ min: 1 }}
                  fullWidth
                  required
                />
                <TextField
                  label="Quantity"
                  name="quantity"
                  type="number"
                  value={editForm.quantity}
                  onChange={handleEditChange}
                  inputProps={{ min: 0 }}
                  fullWidth
                  required
                />
              </Box>
              <TextField
                label="Rate per night"
                name="rate"
                type="number"
                value={editForm.rate}
                onChange={handleEditChange}
                inputProps={{ min: 0, step: "0.01" }}
                fullWidth
                required
              />
              <TextField label="Image URL" name="imageUrl" value={editForm.imageUrl} onChange={handleEditChange} fullWidth />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit} disabled={editSaving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-room-form" variant="contained" disabled={editSaving}>
            {editSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteRoomTarget)} onClose={() => setDeleteRoomTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete room</DialogTitle>
        <DialogContent>
          <Typography>
            Delete {deleteRoomTarget?.name || "this room"}? Rooms already used by reservations may be protected by the database.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteRoomTarget(null)} disabled={deleteSaving}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteSaving}>
            {deleteSaving ? "Deleting..." : "Delete"}
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
