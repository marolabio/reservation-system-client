import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  Box,
  Button,
  Collapse,
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
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PrintIcon from "@mui/icons-material/Print";
import AdminLayout from "../components/layout/AdminLayout";
import {
  createWalkInSale,
  deleteWalkInSale,
  getServiceCatalog,
  getWalkInSalesPage,
  updateWalkInSale,
} from "../services/resortService";
import {
  formatDateTime,
  formatMoney,
  paymentMethods,
  shortReference,
} from "../utils/reservationUi";
import supabase from "../utils/supabase";

const emptyItem = {
  serviceId: "",
  quantity: "1",
  unitPrice: "",
};

const initialForm = {
  customerName: "",
  contactNumber: "",
  paymentMethod: "cash",
  paymentAmount: "",
  notes: "",
  items: [{ ...emptyItem }],
};

function saleCustomerName(sale) {
  return sale.customer_name || "Walk-in";
}

function itemTotal(item) {
  return Number(item.quantity || 0) * Number(item.unitPrice || item.unit_price || 0);
}

function itemsSummary(items = []) {
  if (!items.length) return "No items";
  const totalQuantity = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const itemLabel = items.length === 1 ? items[0].description : `${items.length} services`;
  return `${itemLabel} / ${totalQuantity} item${totalQuantity === 1 ? "" : "s"}`;
}

function saleToForm(sale) {
  return {
    customerName: sale.customer_name || "",
    contactNumber: sale.contact_number || "",
    paymentMethod: sale.payment_method || "cash",
    paymentAmount: String(sale.total_amount || ""),
    notes: sale.notes || "",
    items: (sale.walk_in_sale_items || []).length
      ? sale.walk_in_sale_items.map((item) => ({
        serviceId: "",
        description: item.description || "",
        quantity: String(item.quantity || 1),
          unitPrice: String(item.unit_price ?? ""),
        }))
      : [{ ...emptyItem }],
  };
}

function escapePrintValue(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printWalkInReceipt(sale) {
  const printWindow = window.open("", "_blank", "width=760,height=880");
  if (!printWindow) return false;

  const rows = (sale.walk_in_sale_items || [])
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      return `
        <tr>
          <td>${escapePrintValue(item.description || "Item")}</td>
          <td>${escapePrintValue(quantity)}</td>
          <td>${escapePrintValue(formatMoney(unitPrice))}</td>
          <td>${escapePrintValue(formatMoney(quantity * unitPrice))}</td>
        </tr>
      `;
    })
    .join("");

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Walk-in Receipt ${escapePrintValue(shortReference(sale.id))}</title>
        <style>
          body { color: #111827; font-family: Arial, sans-serif; margin: 40px; }
          h1 { font-size: 24px; margin: 0 0 4px; }
          h2 { border-bottom: 1px solid #e5e7eb; font-size: 15px; margin: 28px 0 12px; padding-bottom: 8px; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border-bottom: 1px solid #e5e7eb; padding: 9px 0; text-align: left; }
          th { color: #6b7280; font-size: 12px; text-transform: uppercase; }
          td:nth-child(2), td:nth-child(3), td:nth-child(4), th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
          .muted { color: #6b7280; }
          .grid { display: grid; gap: 12px 32px; grid-template-columns: 1fr 1fr; }
          .label { color: #6b7280; font-size: 12px; margin-bottom: 3px; }
          .value { font-weight: 700; }
          .summary td:last-child { font-weight: 700; text-align: right; }
          @media print { body { margin: 24px; } }
        </style>
      </head>
      <body>
        <h1>Walk-in Receipt</h1>
        <div class="muted">Ref ${escapePrintValue(shortReference(sale.id))}</div>

        <h2>Customer</h2>
        <div class="grid">
          <div><div class="label">Name</div><div class="value">${escapePrintValue(saleCustomerName(sale))}</div></div>
          <div><div class="label">Date</div><div class="value">${escapePrintValue(formatDateTime(sale.paid_at))}</div></div>
          <div><div class="label">Contact</div><div class="value">${escapePrintValue(sale.contact_number || "-")}</div></div>
          <div><div class="label">Payment</div><div class="value">${escapePrintValue(String(sale.payment_method || "").replace("_", " "))}</div></div>
        </div>

        <h2>Items</h2>
        <table>
          <thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>

        <h2>Summary</h2>
        <table class="summary">
          <tbody><tr><td>Total paid</td><td>${escapePrintValue(formatMoney(sale.total_amount))}</td></tr></tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
  return true;
}

export default function WalkInSalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState([]);
  const [saleCount, setSaleCount] = useState(0);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editSale, setEditSale] = useState(null);
  const [viewSale, setViewSale] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteSale, setDeleteSale] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const saleTotal = useMemo(
    () => form.items.reduce((sum, item) => sum + itemTotal(item), 0),
    [form.items],
  );
  const paymentAmount = Number(form.paymentAmount || 0);
  const changeDue = Math.max(paymentAmount - saleTotal, 0);

  const loadSales = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getWalkInSalesPage({ page, pageSize: rowsPerPage });
      setSales(data.sales);
      setSaleCount(data.count);
    } catch (err) {
      setError(err.message || "Unable to load walk-in sales.");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  const loadServiceCatalog = useCallback(async () => {
    try {
      const data = await getServiceCatalog({ activeOnly: true });
      setServiceCatalog(data);
    } catch (err) {
      setToast({ open: true, severity: "error", message: err.message || "Unable to load services." });
    }
  }, []);

  useEffect(() => {
    async function requireSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/admin");
        return;
      }
      loadServiceCatalog();
      loadSales();
    }

    requireSession();
  }, [loadSales, loadServiceCatalog, router]);

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

  const handleItemChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const handleItemServiceChange = (index, serviceId) => {
    const service = serviceCatalog.find((catalogItem) => catalogItem.id === serviceId);
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              serviceId,
              ...(service
                ? {
                    description: service.name,
                    unitPrice: String(service.unit_price ?? ""),
                  }
                : {
                    description: "",
                    unitPrice: "",
                  }),
            }
          : item,
      ),
    }));
  };

  useEffect(() => {
    if (!addOpen || form.paymentAmount !== "") return;
    if (saleTotal <= 0) return;

    setForm((current) => ({
      ...current,
      paymentAmount: String(saleTotal),
    }));
  }, [addOpen, form.paymentAmount, saleTotal]);

  const handleAddItem = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, { ...emptyItem }],
    }));
  };

  const handleRemoveItem = (index) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((item, itemIndex) => itemIndex !== index),
    }));
  };

  const handleCloseAdd = () => {
    if (saving) return;
    setAddOpen(false);
    setEditSale(null);
    setDetailsOpen(false);
    setForm(initialForm);
  };

  const handleOpenAdd = () => {
    setEditSale(null);
    setForm(initialForm);
    setDetailsOpen(false);
    setAddOpen(true);
  };

  const handleOpenEdit = (sale) => {
    setViewSale(null);
    setEditSale(sale);
    setForm(saleToForm(sale));
    setDetailsOpen(Boolean(sale.customer_name || sale.contact_number || sale.notes));
    setAddOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await saveWalkInSale({ printReceipt: false });
  };

  const saveWalkInSale = async ({ printReceipt = false } = {}) => {
    setSaving(true);
    setError("");

    try {
      const sale = editSale
        ? await updateWalkInSale(editSale.id, form)
        : await createWalkInSale(form);
      const nextData = await getWalkInSalesPage({ page: 0, pageSize: rowsPerPage });
      setForm(initialForm);
      setAddOpen(false);
      setEditSale(null);
      setDetailsOpen(false);
      setPage(0);
      setSales(nextData.sales);
      setSaleCount(nextData.count);
      setToast({ open: true, severity: "success", message: editSale ? "Walk-in sale updated." : "Walk-in sale saved." });
      if (printReceipt) {
        printWalkInReceipt(sale);
      }
    } catch (err) {
      setToast({ open: true, severity: "error", message: err.message || "Unable to save walk-in sale." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSale = async () => {
    if (!deleteSale) return;
    setDeleteSaving(true);

    try {
      await deleteWalkInSale(deleteSale.id);
      setDeleteSale(null);
      setViewSale(null);
      await loadSales();
      setToast({ open: true, severity: "success", message: "Walk-in sale deleted." });
    } catch (err) {
      setToast({ open: true, severity: "error", message: err.message || "Unable to delete walk-in sale." });
    } finally {
      setDeleteSaving(false);
    }
  };

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
            Walk-in Sales
          </Typography>
          <Button variant="contained" onClick={handleOpenAdd}>
            New walk-in bill
          </Button>
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <TableContainer component={Paper} elevation={1}>
            <Table sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Items</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Payment</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: "right" }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: "right" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id} hover sx={{ "& td": { py: 2, verticalAlign: "top" } }}>
                    <TableCell>{formatDateTime(sale.paid_at)}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800 }}>
                        {saleCustomerName(sale)}
                      </Typography>
                    </TableCell>
                    <TableCell>{sale.contact_number || "-"}</TableCell>
                    <TableCell>
                      {itemsSummary(sale.walk_in_sale_items)}
                    </TableCell>
                    <TableCell sx={{ textTransform: "capitalize" }}>
                      {String(sale.payment_method || "").replace("_", " ")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: "right" }}>
                      {formatMoney(sale.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ textAlign: "right" }}>
                        <Button size="small" variant="outlined" onClick={() => setViewSale(sale)}>
                          View
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography align="center" sx={{ py: 4 }}>
                        No walk-in sales yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={saleCount}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
              onPageChange={(event, nextPage) => setPage(nextPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
            />
        </TableContainer>
      </Container>

      <Dialog open={addOpen} onClose={handleCloseAdd} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
          {editSale ? "Edit walk-in bill" : "New walk-in bill"}
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
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                select
                label="Payment method"
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={handleFormChange}
                fullWidth
              >
                {paymentMethods.map((method) => (
                  <MenuItem key={method.value} value={method.value}>
                    {method.label}
                  </MenuItem>
                ))}
              </TextField>

              <Stack spacing={1}>
                {form.items.map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      borderBottom: index === form.items.length - 1 ? 0 : 1,
                      borderColor: "divider",
                      pb: index === form.items.length - 1 ? 0 : 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        alignItems: "center",
                        display: "grid",
                        gap: 1,
                        gridTemplateColumns: {
                          xs: "minmax(0, 1fr) 84px 36px",
                          sm: "minmax(0, 1fr) 96px 36px",
                        },
                      }}
                    >
                      <TextField
                        select
                        label="Service"
                        value={item.serviceId}
                        onChange={(event) => handleItemServiceChange(index, event.target.value)}
                        fullWidth
                        required
                      >
                        <MenuItem value="" disabled>
                          Select service
                        </MenuItem>
                        {serviceCatalog.map((service) => (
                          <MenuItem key={service.id} value={service.id}>
                            {service.name} / {formatMoney(service.unit_price)}
                          </MenuItem>
                        ))}
                      </TextField>
                        <TextField
                          label="Qty"
                          type="number"
                          value={item.quantity}
                          onChange={(event) => handleItemChange(index, "quantity", event.target.value)}
                          inputProps={{ min: 1, step: "0.01" }}
                          fullWidth
                          required
                        />
                        <IconButton
                          aria-label="Remove item"
                          size="small"
                          color="error"
                          onClick={() => handleRemoveItem(index)}
                          disabled={form.items.length <= 1}
                          sx={{ justifySelf: "end" }}
                        >
                          <DeleteIcon fontSize="inherit" />
                        </IconButton>
                    </Box>
                  </Box>
                ))}
                <Button variant="text" onClick={handleAddItem} sx={{ alignSelf: "flex-start", px: 0 }}>
                  Add item
                </Button>
              </Stack>

              <Button
                variant="text"
                onClick={() => setDetailsOpen((current) => !current)}
                sx={{ alignSelf: "flex-start", px: 0 }}
              >
                {detailsOpen ? "Hide customer details" : "Add customer details"}
              </Button>

              <Collapse in={detailsOpen} unmountOnExit>
                <Stack spacing={2}>
                  <TextField
                    label="Customer name"
                    name="customerName"
                    value={form.customerName}
                    onChange={handleFormChange}
                    placeholder="Walk-in"
                    fullWidth
                  />
                  <TextField
                    label="Contact number"
                    name="contactNumber"
                    value={form.contactNumber}
                    onChange={handleFormChange}
                    fullWidth
                  />
                  <TextField
                    label="Notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    fullWidth
                    multiline
                    minRows={2}
                  />
                </Stack>
              </Collapse>

              <Box sx={{ borderTop: 1, borderColor: "divider", pt: 1.5 }}>
                <Stack spacing={1.5}>
                  <TextField
                    label="Payment amount"
                    name="paymentAmount"
                    type="number"
                    value={form.paymentAmount}
                    onChange={handleFormChange}
                    inputProps={{ min: 0, step: "0.01" }}
                    fullWidth
                    required
                  />
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography color="text.secondary">Total</Typography>
                  <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800, textAlign: "right" }}>
                    {formatMoney(saleTotal)}
                  </Typography>
                </Stack>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Typography color="text.secondary">Change</Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        color:
                          paymentAmount >= saleTotal && saleTotal > 0
                            ? "success.main"
                            : "text.primary",
                        flexGrow: 1,
                        fontWeight: 800,
                        textAlign: "right",
                      }}
                    >
                      {formatMoney(changeDue)}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button
              type="submit"
              variant="outlined"
              disabled={
                saving ||
                saleTotal <= 0 ||
                paymentAmount < saleTotal ||
                form.items.some((item) => !item.serviceId)
              }
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="contained"
              onClick={() => saveWalkInSale({ printReceipt: true })}
              disabled={
                saving ||
                saleTotal <= 0 ||
                paymentAmount < saleTotal ||
                form.items.some((item) => !item.serviceId)
              }
            >
              {saving ? "Saving..." : "Save & print"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(viewSale)} onClose={() => setViewSale(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
          Walk-in sale
          <IconButton
            aria-label="Close"
            onClick={() => setViewSale(null)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {viewSale && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">Customer</Typography>
                  <Typography sx={{ fontWeight: 800 }}>{saleCustomerName(viewSale)}</Typography>
                </Box>
                <Box>
                  <Typography color="text.secondary" variant="caption">Date</Typography>
                  <Typography>{formatDateTime(viewSale.paid_at)}</Typography>
                </Box>
                <Box>
                  <Typography color="text.secondary" variant="caption">Contact</Typography>
                  <Typography>{viewSale.contact_number || "-"}</Typography>
                </Box>
                <Box>
                  <Typography color="text.secondary" variant="caption">Payment</Typography>
                  <Typography sx={{ textTransform: "capitalize" }}>
                    {String(viewSale.payment_method || "").replace("_", " ")}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ borderTop: 1, borderColor: "divider", pt: 1.5 }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>Items</Typography>
                <Stack spacing={1}>
                  {(viewSale.walk_in_sale_items || []).map((item) => {
                    const quantity = Number(item.quantity || 0);
                    const unitPrice = Number(item.unit_price || 0);

                    return (
                      <Box
                        key={item.id}
                        sx={{
                          alignItems: "center",
                          display: "grid",
                          gap: 1,
                          gridTemplateColumns: "minmax(0, 1fr) 64px 120px",
                        }}
                      >
                        <Typography>{item.description}</Typography>
                        <Typography sx={{ textAlign: "right" }}>{quantity}</Typography>
                        <Typography sx={{ fontWeight: 800, textAlign: "right" }}>
                          {formatMoney(quantity * unitPrice)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>

              {viewSale.notes && (
                <Box sx={{ borderTop: 1, borderColor: "divider", pt: 1.5 }}>
                  <Typography color="text.secondary" variant="caption">Notes</Typography>
                  <Typography>{viewSale.notes}</Typography>
                </Box>
              )}

              <Box sx={{ borderTop: 1, borderColor: "divider", pt: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography color="text.secondary">Total</Typography>
                  <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800, textAlign: "right" }}>
                    {formatMoney(viewSale.total_amount)}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        {viewSale && (
          <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              variant="outlined"
              onClick={() => {
                setDeleteSale(viewSale);
                setViewSale(null);
              }}
            >
              Delete
            </Button>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<PrintIcon />}
                variant="outlined"
                onClick={() => printWalkInReceipt(viewSale)}
              >
                Print
              </Button>
              <Button
                startIcon={<EditIcon />}
                variant="outlined"
                onClick={() => handleOpenEdit(viewSale)}
              >
                Edit
              </Button>
            </Stack>
          </DialogActions>
        )}
      </Dialog>

      <Dialog open={Boolean(deleteSale)} onClose={() => setDeleteSale(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pr: 6 }}>
          Delete walk-in sale
          <IconButton
            aria-label="Close"
            onClick={() => setDeleteSale(null)}
            disabled={deleteSaving}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              This will remove the walk-in sale and its item records.
            </Alert>
            {deleteSale && (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 800 }}>
                  {saleCustomerName(deleteSale)}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {formatMoney(deleteSale.total_amount)} / {formatDateTime(deleteSale.paid_at)}
                </Typography>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteSale(null)} disabled={deleteSaving}>
            Keep sale
          </Button>
          <Button color="error" variant="contained" onClick={handleDeleteSale} disabled={deleteSaving}>
            {deleteSaving ? "Deleting..." : "Delete sale"}
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
