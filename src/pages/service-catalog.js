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
  IconButton,
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
import CloseIcon from "@mui/icons-material/Close";
import AdminLayout from "../components/layout/AdminLayout";
import {
  createServiceCatalogItem,
  deleteServiceCatalogItem,
  getServiceCatalog,
  updateServiceCatalogItem,
} from "../services/resortService";
import { formatMoney } from "../utils/reservationUi";
import supabase from "../utils/supabase";

const initialForm = {
  name: "",
  unitPrice: "",
  status: "active",
};

function serviceToForm(service) {
  return {
    name: service.name || "",
    unitPrice: String(service.unit_price ?? ""),
    status: service.status || "active",
  };
}

export default function ServiceCatalogPage() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editService, setEditService] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteService, setDeleteService] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  async function loadServices() {
    setLoading(true);
    setError("");
    try {
      const data = await getServiceCatalog();
      setServices(data);
    } catch (err) {
      setError(err.message || "Unable to load service catalog.");
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

      loadServices();
    }

    requireSession();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const handleFormChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleEditFormChange = (event) => {
    setEditForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const service = await createServiceCatalogItem(form);
      setServices((current) =>
        [...current, service].sort((first, second) => first.name.localeCompare(second.name)),
      );
      setForm(initialForm);
      setAddOpen(false);
      setToast({ open: true, severity: "success", message: "Service added." });
    } catch (err) {
      setToast({ open: true, severity: "error", message: err.message || "Unable to add service." });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (service) => {
    setEditService(service);
    setEditForm(serviceToForm(service));
  };

  const handleCloseAdd = () => {
    if (saving) return;
    setAddOpen(false);
    setForm(initialForm);
  };

  const handleCloseEdit = () => {
    if (editSaving) return;
    setEditService(null);
    setEditForm(initialForm);
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editService) return;

    setEditSaving(true);
    try {
      const service = await updateServiceCatalogItem(editService.id, editForm);
      setServices((current) =>
        current
          .map((currentService) => (currentService.id === service.id ? service : currentService))
          .sort((first, second) => first.name.localeCompare(second.name)),
      );
      setEditService(null);
      setEditForm(initialForm);
      setToast({ open: true, severity: "success", message: "Service updated." });
    } catch (err) {
      setToast({ open: true, severity: "error", message: err.message || "Unable to update service." });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteService) return;
    setDeleteSaving(true);

    try {
      await deleteServiceCatalogItem(deleteService.id);
      setServices((current) => current.filter((service) => service.id !== deleteService.id));
      setDeleteService(null);
      setToast({ open: true, severity: "success", message: "Service deleted." });
    } catch (err) {
      setToast({ open: true, severity: "error", message: err.message || "Unable to delete service." });
    } finally {
      setDeleteSaving(false);
    }
  };

  const renderServiceForm = (values, onChange) => (
    <Stack spacing={2}>
      <TextField
        label="Service name"
        name="name"
        value={values.name}
        onChange={onChange}
        placeholder="Pool access, kayak, cottage rental"
        fullWidth
        required
      />
      <TextField
        label="Unit price"
        name="unitPrice"
        type="number"
        value={values.unitPrice}
        onChange={onChange}
        inputProps={{ min: 0, step: "0.01" }}
        fullWidth
        required
      />
      <TextField
        select
        label="Status"
        name="status"
        value={values.status}
        onChange={onChange}
        fullWidth
      >
        <MenuItem value="active">Active</MenuItem>
        <MenuItem value="inactive">Inactive</MenuItem>
      </TextField>
    </Stack>
  );

  return (
    <AdminLayout loading={loading} onSignOut={handleLogout}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Box
          sx={{
            alignItems: { xs: "stretch", sm: "center" },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Service Catalog
          </Typography>
          <Button variant="contained" onClick={() => setAddOpen(true)}>
            Add service
          </Button>
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <TableContainer component={Paper} elevation={1}>
            <Table sx={{ minWidth: 680 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Unit price</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id} hover sx={{ "& td": { py: 2, verticalAlign: "top" } }}>
                    <TableCell sx={{ fontWeight: 800 }}>{service.name}</TableCell>
                    <TableCell>{formatMoney(service.unit_price)}</TableCell>
                    <TableCell>
                      <Chip
                        label={service.status === "active" ? "Active" : "Inactive"}
                        color={service.status === "active" ? "primary" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={() => handleOpenEdit(service)}>
                          Edit
                        </Button>
                        <Button size="small" color="error" variant="outlined" onClick={() => setDeleteService(service)}>
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && services.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography align="center" sx={{ py: 4 }}>
                        No services yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
        </TableContainer>
      </Container>

      <Dialog open={addOpen} onClose={handleCloseAdd} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pr: 6 }}>
          Add service
          <IconButton
            aria-label="Close"
            onClick={handleCloseAdd}
            disabled={saving}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>{renderServiceForm(form, handleFormChange)}</DialogContent>
          <DialogActions>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || !form.name.trim() || form.unitPrice === ""}
            >
              {saving ? "Adding..." : "Add service"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(editService)} onClose={handleCloseEdit} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pr: 6 }}>
          Edit service
          <IconButton
            aria-label="Close"
            onClick={handleCloseEdit}
            disabled={editSaving}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Box component="form" onSubmit={handleSaveEdit}>
          <DialogContent>{renderServiceForm(editForm, handleEditFormChange)}</DialogContent>
          <DialogActions>
            <Button
              type="submit"
              variant="contained"
              disabled={editSaving || !editForm.name.trim() || editForm.unitPrice === ""}
            >
              {editSaving ? "Saving..." : "Save service"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(deleteService)} onClose={() => setDeleteService(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pr: 6 }}>
          Delete service
          <IconButton
            aria-label="Close"
            onClick={() => setDeleteService(null)}
            disabled={deleteSaving}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              Existing bills will keep their saved text and price. This only removes the reusable catalog item.
            </Alert>
            {deleteService && (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 800 }}>{deleteService.name}</Typography>
                <Typography color="text.secondary" variant="body2">
                  {formatMoney(deleteService.unit_price)}
                </Typography>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteService(null)} disabled={deleteSaving}>
            Keep service
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteSaving}>
            {deleteSaving ? "Deleting..." : "Delete service"}
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
