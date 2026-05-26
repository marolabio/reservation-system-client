import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import CloseIcon from "@mui/icons-material/Close";
import AdminLayout from "../components/layout/AdminLayout";
import { createAmenity, deleteAmenity, getAmenities, updateAmenity } from "../services/resortService";
import supabase from "../utils/supabase";

export default function AmenitiesPage() {
  const router = useRouter();
  const [amenities, setAmenities] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editAmenity, setEditAmenity] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleteAmenityTarget, setDeleteAmenityTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ open: false, severity: "success", message: "" });

  async function loadAmenities() {
    setLoading(true);
    setError("");
    try {
      const data = await getAmenities();
      setAmenities(data);
    } catch (err) {
      setError(err.message || "Unable to load amenities.");
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

      loadAmenities();
    }

    requireSession();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    try {
      const amenity = await createAmenity(name);
      setAmenities((current) => [...current, amenity].sort((first, second) => first.name.localeCompare(second.name)));
      setName("");
      setToast({ open: true, severity: "success", message: "Amenity added." });
    } catch (err) {
      setToast({ open: true, severity: "error", message: err.message || "Unable to add amenity." });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (amenity) => {
    setEditAmenity(amenity);
    setEditName(amenity.name || "");
  };

  const handleCloseEdit = () => {
    if (editSaving) return;
    setEditAmenity(null);
    setEditName("");
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editAmenity) return;

    setEditSaving(true);
    try {
      const amenity = await updateAmenity(editAmenity.id, editName);
      setAmenities((current) =>
        current
          .map((currentAmenity) => (currentAmenity.id === amenity.id ? amenity : currentAmenity))
          .sort((first, second) => first.name.localeCompare(second.name))
      );
      setEditAmenity(null);
      setEditName("");
      setToast({ open: true, severity: "success", message: "Amenity updated." });
    } catch (err) {
      setToast({ open: true, severity: "error", message: err.message || "Unable to update amenity." });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAmenityTarget) return;

    setDeleteSaving(true);
    try {
      await deleteAmenity(deleteAmenityTarget.id);
      setAmenities((current) => current.filter((amenity) => amenity.id !== deleteAmenityTarget.id));
      setDeleteAmenityTarget(null);
      setToast({ open: true, severity: "success", message: "Amenity deleted." });
    } catch (err) {
      setToast({ open: true, severity: "error", message: err.message || "Unable to delete amenity." });
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <AdminLayout onSignOut={handleLogout}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Amenities
          </Typography>
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
              Add amenity
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Amenity name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="WiFi, Breakfast, Pool access..."
                  fullWidth
                  required
                />
                <Button type="submit" variant="contained" size="large" disabled={saving || !name.trim()}>
                  {saving ? "Adding..." : "Add amenity"}
                </Button>
              </Stack>
            </Box>
          </Paper>

          <TableContainer component={Paper} elevation={1}>
            <Table sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Amenity</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {amenities.map((amenity) => (
                  <TableRow key={amenity.id} hover sx={{ "& td": { py: 2, verticalAlign: "top" } }}>
                    <TableCell sx={{ fontWeight: 800 }}>{amenity.name}</TableCell>
                    <TableCell>{amenity.created_at ? new Date(amenity.created_at).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={() => handleOpenEdit(amenity)}>
                          Edit
                        </Button>
                        <Button size="small" color="error" variant="outlined" onClick={() => setDeleteAmenityTarget(amenity)}>
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && amenities.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography align="center" sx={{ py: 4 }}>
                        No amenities yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Container>

      <Dialog open={Boolean(editAmenity)} onClose={handleCloseEdit} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pr: 6 }}>
          Edit amenity
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
          <Box component="form" id="edit-amenity-form" onSubmit={handleSaveEdit} sx={{ pt: 1 }}>
            <TextField
              label="Amenity name"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button type="submit" form="edit-amenity-form" variant="contained" disabled={editSaving || !editName.trim()}>
            {editSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteAmenityTarget)} onClose={() => setDeleteAmenityTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pr: 6 }}>
          Delete amenity
          <IconButton
            aria-label="Close"
            disabled={deleteSaving}
            onClick={() => setDeleteAmenityTarget(null)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Delete {deleteAmenityTarget?.name || "this amenity"}? It will be removed from assigned rooms.
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
