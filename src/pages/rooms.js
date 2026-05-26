import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SearchIcon from "@mui/icons-material/Search";
import AdminLayout from "../components/layout/AdminLayout";
import {
  createRoom,
  deleteRoom,
  getAmenities,
  getAdminRoomsPage,
  getRoomImage,
  updateRoom,
} from "../services/resortService";
import supabase from "../utils/supabase";

const initialForm = {
  name: "",
  description: "",
  occupancy: 2,
  quantity: 1,
  rate: 0,
  status: "active",
  imageUrl: "",
  amenityIds: [],
};

const roomStatusColors = {
  active: "primary",
  maintenance: "warning",
  disabled: "default",
};

function roomToForm(room) {
  return {
    name: room.name || "",
    description: room.description || "",
    occupancy: room.occupancy || 1,
    quantity: room.quantity || 0,
    rate: room.rate || 0,
    status: room.status || "active",
    imageUrl: room.image?.url || room.image?.publicUrl || "",
    amenityIds: (room.amenities || []).map((amenity) => amenity.id),
  };
}

function RoomForm({ formId, values, amenities, onChange, onSubmit, renderAmenityValue }) {
  return (
    <Box component="form" id={formId} onSubmit={onSubmit} sx={{ pt: 1 }}>
      <Stack spacing={2}>
        <TextField label="Room name" name="name" value={values.name} onChange={onChange} fullWidth required />
        <TextField
          label="Description"
          name="description"
          value={values.description}
          onChange={onChange}
          fullWidth
          multiline
          minRows={3}
        />
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <TextField
            label="Capacity"
            name="occupancy"
            type="number"
            value={values.occupancy}
            onChange={onChange}
            inputProps={{ min: 1 }}
            fullWidth
            required
          />
          <TextField
            label="Quantity"
            name="quantity"
            type="number"
            value={values.quantity}
            onChange={onChange}
            inputProps={{ min: 0 }}
            fullWidth
            required
          />
        </Box>
        <TextField
          label="Rate per night"
          name="rate"
          type="number"
          value={values.rate}
          onChange={onChange}
          inputProps={{ min: 0, step: "0.01" }}
          fullWidth
          required
        />
        <FormControl fullWidth>
          <InputLabel id={`${formId}-status-label`}>Status</InputLabel>
          <Select
            labelId={`${formId}-status-label`}
            label="Status"
            name="status"
            value={values.status}
            onChange={onChange}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="maintenance">Maintenance</MenuItem>
            <MenuItem value="disabled">Disabled</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel id={`${formId}-amenities-label`}>Amenities</InputLabel>
          <Select
            labelId={`${formId}-amenities-label`}
            label="Amenities"
            name="amenityIds"
            multiple
            value={values.amenityIds}
            onChange={onChange}
            renderValue={renderAmenityValue}
          >
            {amenities.map((amenity) => (
              <MenuItem key={amenity.id} value={amenity.id}>
                <Checkbox checked={values.amenityIds.includes(amenity.id)} />
                <ListItemText primary={amenity.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label="Image URL" name="imageUrl" value={values.imageUrl} onChange={onChange} fullWidth />
      </Stack>
    </Box>
  );
}

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [roomCount, setRoomCount] = useState(0);
  const [amenities, setAmenities] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteRoomTarget, setDeleteRoomTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ open: false, severity: "success", message: "" });

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminRoomsPage({ page, pageSize: rowsPerPage, search });
      setRooms(data.rooms);
      setRoomCount(data.count);
    } catch (err) {
      setError(err.message || "Unable to load rooms.");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  const loadAmenities = useCallback(async () => {
    try {
      const data = await getAmenities();
      setAmenities(data);
    } catch (err) {
      setToast({ open: true, severity: "error", message: err.message || "Unable to load amenities." });
    }
  }, []);

  useEffect(() => {
    async function requireSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/admin");
        return;
      }
      loadAmenities();
      setSessionReady(true);
    }

    requireSession();
  }, [loadAmenities, router]);

  useEffect(() => {
    if (!sessionReady) return;
    loadRooms();
  }, [sessionReady, loadRooms]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const handleOpenAdd = () => {
    setForm(initialForm);
    setAddOpen(true);
  };

  const handleCloseAdd = () => {
    if (saving) return;
    setAddOpen(false);
    setForm(initialForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const renderAmenityValue = (selected) => {
    const names = amenities
      .filter((amenity) => selected.includes(amenity.id))
      .map((amenity) => amenity.name);

    return names.length ? names.join(", ") : "None";
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(0);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSearch("");
    setPage(0);
  };

  const handlePageChange = (event, nextPage) => {
    setPage(nextPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
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
      await createRoom(form);
      await loadRooms();
      setForm(initialForm);
      setAddOpen(false);
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
      await updateRoom(editRoom.id, editForm);
      await loadRooms();
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
      await loadRooms();
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
        </Box>

        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 8 }} />}
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Box>
          <TableContainer component={Paper} elevation={1}>
            <Box
              component="form"
              onSubmit={handleSearchSubmit}
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                display: "flex",
                gap: 1,
                p: 2,
              }}
            >
              <Button
                type="button"
                variant="contained"
                onClick={handleOpenAdd}
                sx={{ flexShrink: 0 }}
              >
                Add room
              </Button>
              <TextField
                label="Search rooms"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Room, amenity, status, rate..."
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                startIcon={<SearchIcon />}
                disabled={loading}
                sx={{ flexShrink: 0 }}
              >
                Search
              </Button>
              <Button
                type="button"
                variant="outlined"
                startIcon={<RestartAltIcon />}
                disabled={loading}
                onClick={handleResetFilters}
                sx={{ flexShrink: 0 }}
              >
                Reset
              </Button>
            </Box>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Room</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Amenities</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Capacity</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Quantity</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Rate</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
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
                    <TableCell sx={{ minWidth: 220 }}>
                      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                        {(room.amenities || []).length ? (
                          room.amenities.map((amenity) => (
                            <Chip key={amenity.id} size="small" label={amenity.name} />
                          ))
                        ) : (
                          <Typography color="text.secondary" variant="body2">
                            None
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={`${room.occupancy} guests`} />
                    </TableCell>
                    <TableCell>{room.quantity}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>PHP {Number(room.rate || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={roomStatusColors[room.status] || "default"}
                        label={room.status || "active"}
                      />
                    </TableCell>
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
                    <TableCell colSpan={8}>
                      <Typography align="center" sx={{ py: 4 }}>
                        No rooms yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={roomCount}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[10, 25, 50]}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
            />
          </TableContainer>
        </Box>
      </Container>

      <Dialog open={addOpen} onClose={handleCloseAdd} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
          Add room
          <IconButton
            aria-label="Close"
            disabled={saving}
            onClick={handleCloseAdd}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <RoomForm
            formId="room-form"
            values={form}
            amenities={amenities}
            onChange={handleChange}
            onSubmit={handleSubmit}
            renderAmenityValue={renderAmenityValue}
          />
        </DialogContent>
        <DialogActions>
          <Button type="submit" form="room-form" variant="contained" disabled={saving}>
            {saving ? "Adding..." : "Add room"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editRoom)} onClose={handleCloseEdit} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
          Edit room
          <IconButton
            aria-label="Close"
            disabled={editSaving}
            onClick={handleCloseEdit}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <RoomForm
            formId="edit-room-form"
            values={editForm}
            amenities={amenities}
            onChange={handleEditChange}
            onSubmit={handleSaveEdit}
            renderAmenityValue={renderAmenityValue}
          />
        </DialogContent>
        <DialogActions>
          <Button type="submit" form="edit-room-form" variant="contained" disabled={editSaving}>
            {editSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteRoomTarget)} onClose={() => setDeleteRoomTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pr: 6 }}>
          Delete room
          <IconButton
            aria-label="Close"
            disabled={deleteSaving}
            onClick={() => setDeleteRoomTarget(null)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Delete {deleteRoomTarget?.name || "this room"}? Rooms already used by reservations may be protected by the database.
          </Typography>
        </DialogContent>
        <DialogActions>
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
