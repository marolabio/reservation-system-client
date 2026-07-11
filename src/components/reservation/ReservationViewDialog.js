import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PrintIcon from "@mui/icons-material/Print";
import {
  addReservationPayment,
  addReservationAddOn,
  cancelReservation,
  deleteReservationAddOn,
  deleteReservationPayment,
  getAdminReservationById,
  getReservationCapacity,
  getRoomAvailability,
  getReservationFinancials,
  getServiceCatalog,
  updateReservationAddOn,
  updateReservationGuestDetails,
  updateReservationGuests,
  updateReservationPayment,
  updateReservationRooms,
  updateReservationStayDates,
  updateReservationStatus,
} from "../../services/resortService";
import {
  formatDateRange,
  formatDateTime,
  formatMoney,
  guestName,
  paymentMethods,
  paymentTypeLabels,
  shortReference,
  statusColors,
} from "../../utils/reservationUi";

const emptyPaymentForm = {
  paymentType: "partial_payment",
  amount: "",
  method: "cash",
  referenceNumber: "",
  notes: "",
};

const emptyCancelForm = {
  refundAmount: "",
  method: "cash",
  referenceNumber: "",
  notes: "",
};

const emptyAddOnForm = {
  serviceId: "",
  description: "",
  quantity: "1",
  unitPrice: "",
};

const emptyStayForm = {
  checkin: "",
  checkout: "",
};

const emptyGuestForm = {
  adult: "1",
  children: "0",
};

const emptyGuestDetailsForm = {
  firstName: "",
  lastName: "",
  email: "",
  contactNumber: "",
  cityProvince: "",
};

const summaryLabelSx = {
  color: "text.primary",
  fontWeight: 700,
};

const summaryValueSx = {
  color: "text.secondary",
};

function primaryStatusFromHref(href = "") {
  if (href === "confirm") return "confirmed";
  if (href === "check-in") return "checked_in";
  return "";
}

function DialogCloseButton({ onClick, disabled = false }) {
  return (
    <IconButton
      aria-label="Close"
      onClick={onClick}
      disabled={disabled}
      sx={{ position: "absolute", right: 8, top: 8 }}
    >
      <CloseIcon />
    </IconButton>
  );
}

function FinancialKpi({ label, value, color }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      justifyContent="space-between"
    >
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography
        color={color}
        sx={{ fontWeight: 700, textAlign: "right", whiteSpace: "nowrap" }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function escapePrintValue(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

function formatStatusLabel(status) {
  return String(status || "").replace("_", " ");
}

export default function ReservationViewDialog({
  open,
  reservation,
  onClose,
  onReservationUpdated,
}) {
  const [currentReservation, setCurrentReservation] = useState(reservation);
  const [error, setError] = useState("");
  const [actionSaving, setActionSaving] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [editingPayment, setEditingPayment] = useState(null);
  const [deletePayment, setDeletePayment] = useState(null);
  const [deletePaymentSaving, setDeletePaymentSaving] = useState(false);
  const [addOnOpen, setAddOnOpen] = useState(false);
  const [addOnSaving, setAddOnSaving] = useState(false);
  const [addOnForm, setAddOnForm] = useState(emptyAddOnForm);
  const [editingAddOn, setEditingAddOn] = useState(null);
  const [deleteAddOn, setDeleteAddOn] = useState(null);
  const [deleteAddOnSaving, setDeleteAddOnSaving] = useState(false);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelForm, setCancelForm] = useState(emptyCancelForm);
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [noShowSaving, setNoShowSaving] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSaving, setCheckoutSaving] = useState(false);
  const [roomEditorOpen, setRoomEditorOpen] = useState(false);
  const [roomEditorLoading, setRoomEditorLoading] = useState(false);
  const [roomEditorSaving, setRoomEditorSaving] = useState(false);
  const [roomOptions, setRoomOptions] = useState([]);
  const [roomSelections, setRoomSelections] = useState([]);
  const [stayEditorOpen, setStayEditorOpen] = useState(false);
  const [stayEditorSaving, setStayEditorSaving] = useState(false);
  const [stayEditorError, setStayEditorError] = useState("");
  const [stayForm, setStayForm] = useState(emptyStayForm);
  const [guestEditorOpen, setGuestEditorOpen] = useState(false);
  const [guestEditorSaving, setGuestEditorSaving] = useState(false);
  const [guestEditorError, setGuestEditorError] = useState("");
  const [guestForm, setGuestForm] = useState(emptyGuestForm);
  const [guestDetailsEditorOpen, setGuestDetailsEditorOpen] = useState(false);
  const [guestDetailsEditorSaving, setGuestDetailsEditorSaving] =
    useState(false);
  const [guestDetailsEditorError, setGuestDetailsEditorError] = useState("");
  const [guestDetailsForm, setGuestDetailsForm] = useState(
    emptyGuestDetailsForm,
  );

  useEffect(() => {
    setCurrentReservation(reservation);
    setError("");
  }, [reservation]);

  const customer = currentReservation?.customers || {};
  const financials = currentReservation
    ? getReservationFinancials(currentReservation)
    : null;
  const canRecordRefund = (financials?.netPaid || 0) > 0;
  const rooms = currentReservation?.reserved_rooms || [];
  const addOns = currentReservation?.reservation_addons || [];
  const payments = currentReservation?.reservation_payments || [];
  const stayNights = currentReservation
    ? Math.max(
        Math.ceil(
          (new Date(currentReservation.checkout) -
            new Date(currentReservation.checkin)) /
            (1000 * 60 * 60 * 24),
        ),
        0,
      )
    : 0;
  const actionsAvailable =
    currentReservation &&
    !["checked_out", "cancelled", "no_show"].includes(currentReservation.status);
  const canModifyPayments = !["checked_out", "cancelled", "no_show"].includes(
    currentReservation?.status,
  );
  const canModifyAddOns = !["checked_out", "cancelled", "no_show"].includes(
    currentReservation?.status,
  );
  const canModifyRooms = ["pending", "confirmed", "checked_in"].includes(
    currentReservation?.status,
  );
  const canModifyStay = canModifyRooms;
  const canModifyGuests = canModifyRooms;
  const canModifyGuestDetails = canModifyRooms;
  const reservationCapacity = currentReservation
    ? getReservationCapacity(currentReservation)
    : 0;
  const guestFormTotal =
    Number(guestForm.adult || 0) + Number(guestForm.children || 0);
  const guestFormExceedsCapacity = guestFormTotal > reservationCapacity;
  const addOnGridColumns = canModifyAddOns
    ? "minmax(180px, 1fr) 80px 120px 130px 96px"
    : "minmax(180px, 1fr) 80px 120px 130px";
  const addOnTableMinWidth = canModifyAddOns ? 706 : 610;
  const addOnTotal = addOns.reduce(
    (sum, addOn) =>
      sum + Number(addOn.quantity || 0) * Number(addOn.unit_price || 0),
    0,
  );
  const roomTotal = Math.max((financials?.total || 0) - addOnTotal, 0);
  const paymentGridColumns = canModifyPayments
    ? "140px minmax(180px, 1fr) 120px 150px 112px"
    : "140px minmax(180px, 1fr) 120px 150px";
  const paymentTableMinWidth = canModifyPayments ? 700 : 588;
  const fullPaymentAmount = Math.max(
    (financials?.balance || 0) +
      (editingPayment && editingPayment.payment_type !== "refund"
        ? Number(editingPayment.amount || 0)
        : 0),
    0,
  );
  const canCancelReservation = ["pending", "confirmed"].includes(
    currentReservation?.status,
  );
  const canMarkNoShow = currentReservation?.status === "confirmed";
  const canPrintReservation = [
    "confirmed",
    "checked_out",
    "no_show",
    "cancelled",
  ].includes(currentReservation?.status);
  const printTitle =
    currentReservation?.status === "checked_out"
      ? "Reservation Receipt"
      : currentReservation?.status === "no_show"
        ? "No-show Reservation"
      : currentReservation?.status === "cancelled"
        ? "Cancelled Reservation"
        : "Reservation Confirmation";
  const statusAction =
    currentReservation?.status === "pending"
      ? {
          label: "Confirm reservation",
          href: "confirm",
          disabled: (financials?.netPaid || 0) <= 0,
        }
      : currentReservation?.status === "confirmed"
        ? {
            label: "Check in",
            href: "check-in",
            disabled: (financials?.balance || 0) > 0,
          }
      : currentReservation?.status === "checked_in"
          ? {
              label: "Check out",
              href: "check-out",
              disabled: (financials?.balance || 0) > 0,
            }
          : null;
  const paymentAction =
    currentReservation?.status === "pending" && (financials?.netPaid || 0) <= 0
      ? { paymentType: "partial_payment", target: "", disabled: false }
      : currentReservation?.status === "confirmed" &&
          (financials?.balance || 0) > 0
        ? { paymentType: "full_payment", target: "check_in", disabled: false }
        : currentReservation?.status === "checked_in"
          ? {
              paymentType: "full_payment",
              target: "",
              disabled: (financials?.balance || 0) <= 0,
            }
          : null;
  const stayPreviewReservation = currentReservation
    ? {
        ...currentReservation,
        checkin: stayForm.checkin || currentReservation.checkin,
        checkout: stayForm.checkout || currentReservation.checkout,
      }
    : null;
  const stayPreviewFinancials = stayPreviewReservation
    ? getReservationFinancials(stayPreviewReservation)
    : null;
  const stayPreviewNights = stayPreviewReservation
    ? Math.max(
        Math.ceil(
          (new Date(stayPreviewReservation.checkout) -
            new Date(stayPreviewReservation.checkin)) /
            (1000 * 60 * 60 * 24),
        ),
        0,
      )
    : 0;
  const stayPreviewCredit = Math.max(
    (stayPreviewFinancials?.netPaid || 0) - (stayPreviewFinancials?.total || 0),
    0,
  );

  const reloadReservation = async () => {
    const nextReservation = await getAdminReservationById(
      currentReservation.id,
    );
    setCurrentReservation(nextReservation);
    onReservationUpdated?.(nextReservation);
    return nextReservation;
  };

  const openPaymentModal = (paymentType = "partial_payment", target = "") => {
    const amountNeededForCheckIn = Math.max(
      (financials?.checkInPaymentRequired || 0) - (financials?.netPaid || 0),
      0,
    );
    const nextAmount =
      paymentType === "refund"
        ? financials.netPaid
        : paymentType === "full_payment"
          ? financials.balance
          : target === "check_in"
            ? Math.min(amountNeededForCheckIn, financials.balance)
            : Math.min(financials.downpaymentRequired, financials.balance);

    setPaymentForm({
      ...emptyPaymentForm,
      paymentType,
      amount: nextAmount > 0 ? String(nextAmount) : "",
    });
    setEditingPayment(null);
    setPaymentOpen(true);
  };

  const openEditPaymentModal = (payment) => {
    setPaymentForm({
      paymentType:
        payment.payment_type === "downpayment"
          ? "partial_payment"
          : payment.payment_type || "partial_payment",
      amount: String(payment.amount || ""),
      method: payment.method || "cash",
      referenceNumber: payment.reference_number || "",
      notes: payment.notes || "",
      paidAt: payment.paid_at || "",
    });
    setEditingPayment(payment);
    setPaymentOpen(true);
  };

  const closePaymentModal = () => {
    if (paymentSaving) return;
    setPaymentOpen(false);
    setPaymentForm(emptyPaymentForm);
    setEditingPayment(null);
  };

  const handlePaymentFormChange = (event) => {
    const { name, value } = event.target;
    setPaymentForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "paymentType" && value === "full_payment"
        ? { amount: fullPaymentAmount > 0 ? String(fullPaymentAmount) : "" }
        : {}),
    }));
  };

  const handleSavePayment = async () => {
    if (!currentReservation) return;
    setPaymentSaving(true);
    setError("");

    try {
      if (editingPayment) {
        await updateReservationPayment(
          currentReservation,
          editingPayment.id,
          paymentForm,
        );
      } else {
        await addReservationPayment(currentReservation, paymentForm);
      }
      await reloadReservation();
      setPaymentOpen(false);
      setPaymentForm(emptyPaymentForm);
      setEditingPayment(null);
    } catch (err) {
      setError(err.message || "Unable to save payment.");
    } finally {
      setPaymentSaving(false);
    }
  };

  const closeDeletePaymentModal = () => {
    if (deletePaymentSaving) return;
    setDeletePayment(null);
  };

  const handleDeletePayment = async () => {
    if (!currentReservation || !deletePayment) return;
    setDeletePaymentSaving(true);
    setError("");

    try {
      await deleteReservationPayment(currentReservation, deletePayment.id);
      await reloadReservation();
      setDeletePayment(null);
    } catch (err) {
      setError(err.message || "Unable to delete payment.");
    } finally {
      setDeletePaymentSaving(false);
    }
  };

  const openAddOnModal = async () => {
    setAddOnForm(emptyAddOnForm);
    setEditingAddOn(null);
    await loadServiceCatalog();
    setAddOnOpen(true);
  };

  const openEditAddOnModal = async (addOn) => {
    const catalog = await loadServiceCatalog();
    const matchingService = catalog.find(
      (service) =>
        service.name === addOn.description &&
        Number(service.unit_price || 0) === Number(addOn.unit_price || 0),
    );

    setAddOnForm({
      serviceId: matchingService?.id || "",
      description: addOn.description || "",
      quantity: String(addOn.quantity || 1),
      unitPrice: String(addOn.unit_price || ""),
    });
    setEditingAddOn(addOn);
    setAddOnOpen(true);
  };

  const closeAddOnModal = () => {
    if (addOnSaving) return;
    setAddOnOpen(false);
    setAddOnForm(emptyAddOnForm);
    setEditingAddOn(null);
  };

  const handleAddOnFormChange = (event) => {
    setAddOnForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const loadServiceCatalog = async () => {
    try {
      const data = await getServiceCatalog({ activeOnly: true });
      setServiceCatalog(data);
      return data;
    } catch (err) {
      setError(err.message || "Unable to load services.");
      return [];
    }
  };

  const handleAddOnServiceChange = (event) => {
    const serviceId = event.target.value;
    const service = serviceCatalog.find((catalogItem) => catalogItem.id === serviceId);

    setAddOnForm((current) => ({
      ...current,
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
    }));
  };

  const handleSaveAddOn = async () => {
    if (!currentReservation) return;
    setAddOnSaving(true);
    setError("");

    try {
      if (editingAddOn) {
        await updateReservationAddOn(
          currentReservation,
          editingAddOn.id,
          addOnForm,
        );
      } else {
        await addReservationAddOn(currentReservation, addOnForm);
      }
      await reloadReservation();
      setAddOnOpen(false);
      setAddOnForm(emptyAddOnForm);
      setEditingAddOn(null);
    } catch (err) {
      setError(err.message || "Unable to save add-on.");
    } finally {
      setAddOnSaving(false);
    }
  };

  const closeDeleteAddOnModal = () => {
    if (deleteAddOnSaving) return;
    setDeleteAddOn(null);
  };

  const handleDeleteAddOn = async () => {
    if (!currentReservation || !deleteAddOn) return;
    setDeleteAddOnSaving(true);
    setError("");

    try {
      await deleteReservationAddOn(currentReservation, deleteAddOn.id);
      await reloadReservation();
      setDeleteAddOn(null);
    } catch (err) {
      setError(err.message || "Unable to delete add-on.");
    } finally {
      setDeleteAddOnSaving(false);
    }
  };

  const openCancelModal = () => {
    setCancelForm({
      ...emptyCancelForm,
      refundAmount: canRecordRefund ? String(financials.netPaid) : "",
      notes: canRecordRefund ? "Cancellation refund" : "",
    });
    setCancelOpen(true);
  };

  const closeCancelModal = () => {
    if (cancelSaving) return;
    setCancelOpen(false);
    setCancelForm(emptyCancelForm);
  };

  const handleCancelReservation = async () => {
    if (!currentReservation) return;
    setCancelSaving(true);
    setError("");

    try {
      await cancelReservation(currentReservation, cancelForm);
      await reloadReservation();
      setCancelOpen(false);
      setCancelForm(emptyCancelForm);
      onClose?.();
    } catch (err) {
      setError(err.message || "Unable to cancel reservation.");
    } finally {
      setCancelSaving(false);
    }
  };

  const closeNoShowModal = () => {
    if (noShowSaving) return;
    setNoShowOpen(false);
  };

  const handleNoShowReservation = async () => {
    if (!currentReservation) return;
    setNoShowSaving(true);
    setError("");

    try {
      await updateReservationStatus(currentReservation.id, "no_show");
      await reloadReservation();
      setNoShowOpen(false);
      onClose?.();
    } catch (err) {
      setError(err.message || "Unable to mark reservation as no-show.");
    } finally {
      setNoShowSaving(false);
    }
  };

  const closeCheckoutModal = () => {
    if (checkoutSaving) return;
    setCheckoutOpen(false);
  };

  const handleCheckoutReservation = async () => {
    if (!currentReservation) return;
    setCheckoutSaving(true);
    setError("");

    try {
      await updateReservationStatus(currentReservation.id, "checked_out");
      await reloadReservation();
      setCheckoutOpen(false);
      onClose?.();
    } catch (err) {
      setError(err.message || "Unable to check out guest.");
    } finally {
      setCheckoutSaving(false);
    }
  };

  const openStayEditor = () => {
    if (!currentReservation) return;

    setStayForm({
      checkin: currentReservation.checkin || "",
      checkout: currentReservation.checkout || "",
    });
    setStayEditorOpen(true);
    setStayEditorError("");
    setError("");
  };

  const closeStayEditor = () => {
    if (stayEditorSaving) return;
    setStayEditorOpen(false);
    setStayEditorError("");
    setStayForm(emptyStayForm);
  };

  const handleStayFormChange = (event) => {
    const { name, value } = event.target;
    setStayForm((current) => ({
      ...current,
      [name]: value,
    }));
    setStayEditorError("");
  };

  const handleSaveStayDates = async () => {
    if (!currentReservation) return;
    setStayEditorSaving(true);
    setStayEditorError("");

    try {
      await updateReservationStayDates(currentReservation, stayForm);
      await reloadReservation();
      setStayEditorOpen(false);
      setStayEditorError("");
      setStayForm(emptyStayForm);
    } catch (err) {
      setStayEditorError(err.message || "Unable to update stay dates.");
    } finally {
      setStayEditorSaving(false);
    }
  };

  const openGuestEditor = () => {
    if (!currentReservation) return;

    setGuestForm({
      adult: String(currentReservation.adult || 1),
      children: String(currentReservation.children || 0),
    });
    setGuestEditorOpen(true);
    setGuestEditorError("");
    setError("");
  };

  const closeGuestEditor = () => {
    if (guestEditorSaving) return;
    setGuestEditorOpen(false);
    setGuestEditorError("");
    setGuestForm(emptyGuestForm);
  };

  const handleGuestFormChange = (event) => {
    const { name, value } = event.target;
    setGuestForm((current) => ({
      ...current,
      [name]: value,
    }));
    setGuestEditorError("");
  };

  const handleSaveGuests = async () => {
    if (!currentReservation) return;
    setGuestEditorSaving(true);
    setGuestEditorError("");

    try {
      await updateReservationGuests(currentReservation, guestForm);
      await reloadReservation();
      setGuestEditorOpen(false);
      setGuestEditorError("");
      setGuestForm(emptyGuestForm);
    } catch (err) {
      setGuestEditorError(err.message || "Unable to update guests.");
    } finally {
      setGuestEditorSaving(false);
    }
  };

  const openGuestDetailsEditor = () => {
    if (!currentReservation) return;

    setGuestDetailsForm({
      firstName: customer.first_name || "",
      lastName: customer.last_name || "",
      email: customer.email || "",
      contactNumber: customer.contact_number || "",
      cityProvince: customer.city_province || "",
    });
    setGuestDetailsEditorOpen(true);
    setGuestDetailsEditorError("");
    setError("");
  };

  const closeGuestDetailsEditor = () => {
    if (guestDetailsEditorSaving) return;
    setGuestDetailsEditorOpen(false);
    setGuestDetailsEditorError("");
    setGuestDetailsForm(emptyGuestDetailsForm);
  };

  const handleGuestDetailsFormChange = (event) => {
    const { name, value } = event.target;
    setGuestDetailsForm((current) => ({
      ...current,
      [name]: value,
    }));
    setGuestDetailsEditorError("");
  };

  const handleSaveGuestDetails = async () => {
    if (!currentReservation) return;
    setGuestDetailsEditorSaving(true);
    setGuestDetailsEditorError("");

    try {
      await updateReservationGuestDetails(currentReservation, guestDetailsForm);
      await reloadReservation();
      setGuestDetailsEditorOpen(false);
      setGuestDetailsEditorError("");
      setGuestDetailsForm(emptyGuestDetailsForm);
    } catch (err) {
      setGuestDetailsEditorError(
        err.message || "Unable to update guest details.",
      );
    } finally {
      setGuestDetailsEditorSaving(false);
    }
  };

  const openRoomEditor = async () => {
    if (!currentReservation) return;

    const currentRoomOptions = rooms.map((room) => ({
      id: room.room_id,
      name: room.rooms?.name || "Room",
      rate: room.rooms?.rate || 0,
      occupancy: room.rooms?.occupancy || 0,
      available_quantity: Number(room.reserved_quantity || 1),
    }));

    setRoomEditorOpen(true);
    setRoomEditorLoading(true);
    setError("");
    setRoomOptions(currentRoomOptions);
    setRoomSelections(
      rooms.map((room) => ({
        key: room.id,
        roomId: room.room_id,
        roomQuantity: Number(room.reserved_quantity || 1),
      })),
    );

    try {
      const availability = await getRoomAvailability({
        checkin: currentReservation.checkin,
        checkout: currentReservation.checkout,
        excludeReservationId: currentReservation.id,
      });
      setRoomOptions([
        ...availability,
        ...currentRoomOptions.filter(
          (currentRoom) =>
            !availability.some((room) => room.id === currentRoom.id),
        ),
      ]);
    } catch (err) {
      setError(err.message || "Unable to load room availability.");
    } finally {
      setRoomEditorLoading(false);
    }
  };

  const closeRoomEditor = () => {
    if (roomEditorSaving) return;
    setRoomEditorOpen(false);
    setRoomSelections([]);
    setRoomOptions([]);
  };

  const handleRoomSelectionChange = (key, field, value) => {
    setRoomSelections((current) =>
      current.map((selection) =>
        selection.key === key
          ? {
              ...selection,
              [field]:
                field === "roomQuantity"
                  ? Math.max(Number(value), 1)
                  : value,
            }
          : selection,
      ),
    );
  };

  const handleAddRoomSelection = () => {
    const usedRoomIds = new Set(roomSelections.map((selection) => selection.roomId));
    const nextRoom = roomOptions.find((room) => !usedRoomIds.has(room.id));
    if (!nextRoom) return;

    setRoomSelections((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        roomId: nextRoom.id,
        roomQuantity: 1,
      },
    ]);
  };

  const handleRemoveRoomSelection = (key) => {
    setRoomSelections((current) =>
      current.length > 1
        ? current.filter((selection) => selection.key !== key)
        : current,
    );
  };

  const handleSaveRooms = async () => {
    if (!currentReservation) return;
    setRoomEditorSaving(true);
    setError("");

    try {
      await updateReservationRooms(currentReservation, roomSelections);
      await reloadReservation();
      setRoomEditorOpen(false);
      setRoomSelections([]);
      setRoomOptions([]);
    } catch (err) {
      setError(err.message || "Unable to update reservation rooms.");
    } finally {
      setRoomEditorSaving(false);
    }
  };

  const handleStatusAction = async () => {
    if (!statusAction || !currentReservation || statusAction.disabled) return;

    if (statusAction.href === "check-out") {
      setCheckoutOpen(true);
      return;
    }

    const nextStatus = primaryStatusFromHref(statusAction.href);
    if (!nextStatus) return;

    setActionSaving(true);
    setError("");
    try {
      await updateReservationStatus(currentReservation.id, nextStatus);
      await reloadReservation();
      onClose?.();
    } catch (err) {
      setError(err.message || "Unable to update reservation.");
    } finally {
      setActionSaving(false);
    }
  };

  const handlePrintConfirmation = () => {
    if (!currentReservation || !financials) return;

    const printWindow = window.open("", "_blank", "width=840,height=960");
    if (!printWindow) {
      setError("Unable to open print window.");
      return;
    }

    const roomRows = rooms.length
      ? rooms
          .map(
            (reservedRoom) => `
          <tr>
            <td>${escapePrintValue(reservedRoom.rooms?.name || "Room")}</td>
            <td>${escapePrintValue(reservedRoom.reserved_quantity || 0)}</td>
            <td>${escapePrintValue(formatMoney(reservedRoom.rooms?.rate))} / night</td>
          </tr>
        `,
          )
          .join("")
      : `<tr><td colspan="3">No rooms recorded.</td></tr>`;
    const addOnRows = addOns.length
      ? addOns
          .map((addOn) => {
            const quantity = Number(addOn.quantity || 0);
            const unitPrice = Number(addOn.unit_price || 0);
            return `
          <tr>
            <td>${escapePrintValue(addOn.description || "Add-on")}</td>
            <td>${escapePrintValue(quantity)}</td>
            <td>${escapePrintValue(formatMoney(unitPrice))}</td>
            <td>${escapePrintValue(formatMoney(quantity * unitPrice))}</td>
          </tr>
        `;
          })
          .join("")
      : `<tr><td colspan="4">No add-ons recorded.</td></tr>`;

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapePrintValue(printTitle)} ${escapePrintValue(shortReference(currentReservation.id))}</title>
          <style>
            body { color: #111827; font-family: Arial, sans-serif; margin: 40px; }
            h1 { font-size: 24px; margin: 0 0 4px; }
            h2 { border-bottom: 1px solid #e5e7eb; font-size: 15px; margin: 28px 0 12px; padding-bottom: 8px; }
            table { border: 1px solid #d1d5db; border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #d1d5db; padding: 9px 12px; text-align: left; }
            th { color: #6b7280; font-size: 12px; text-transform: uppercase; }
            .muted { color: #6b7280; }
            .grid { display: grid; gap: 12px 32px; grid-template-columns: 1fr 1fr; }
            .label { color: #6b7280; font-size: 12px; margin-bottom: 3px; }
            .value { font-weight: 700; }
            .summary td:last-child { font-weight: 700; text-align: right; }
            @media print { body { margin: 24px; } }
          </style>
        </head>
        <body>
          <h1>${escapePrintValue(printTitle)}</h1>
          <div class="muted">Ref ${escapePrintValue(shortReference(currentReservation.id))}</div>

          <h2>Guest</h2>
          <div class="grid">
            <div><div class="label">Name</div><div class="value">${escapePrintValue(guestName(customer))}</div></div>
            <div><div class="label">Status</div><div class="value">${escapePrintValue(formatStatusLabel(currentReservation.status))}</div></div>
            <div><div class="label">Email</div><div class="value">${escapePrintValue(customer.email || "No email")}</div></div>
            <div><div class="label">Contact</div><div class="value">${escapePrintValue(customer.contact_number || "No contact number")}</div></div>
            <div><div class="label">City/Province</div><div class="value">${escapePrintValue(customer.city_province || "No city/province")}</div></div>
            <div><div class="label">Stay</div><div class="value">${escapePrintValue(formatDateRange(currentReservation))}</div></div>
            <div><div class="label">Guests</div><div class="value">${escapePrintValue(`${currentReservation.adult || 0} adult, ${currentReservation.children || 0} child`)}</div></div>
          </div>

          <h2>Rooms</h2>
          <table>
            <thead><tr><th>Room</th><th>Qty</th><th>Rate</th></tr></thead>
            <tbody>${roomRows}</tbody>
          </table>

          ${addOns.length ? `
          <h2>Add-ons</h2>
          <table>
            <thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead>
            <tbody>${addOnRows}</tbody>
          </table>
          ` : ""}

          <h2>Payment Summary</h2>
          <table class="summary">
            <tbody>
              <tr><td>Total</td><td>${escapePrintValue(formatMoney(financials.total))}</td></tr>
              <tr><td>Paid</td><td>${escapePrintValue(formatMoney(financials.paid))}</td></tr>
              ${financials.refunded > 0 ? `<tr><td>Refunded</td><td>${escapePrintValue(formatMoney(financials.refunded))}</td></tr>` : ""}
              <tr><td>Balance</td><td>${escapePrintValue(formatMoney(financials.balance))}</td></tr>
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ pb: 1, pr: 6, position: "relative" }}>
          <DialogCloseButton onClick={onClose} />
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Box>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ flexWrap: "wrap" }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {currentReservation ? guestName(customer) : "Reservation"}
                </Typography>
                {currentReservation && (
                  <Chip
                    label={currentReservation.status}
                    color={statusColors[currentReservation.status] || "default"}
                    size="small"
                  />
                )}
              </Stack>
              {currentReservation && (
                <Typography color="text.secondary" variant="body2">
                  Ref {shortReference(currentReservation.id)} /{" "}
                  {formatDateRange(currentReservation)}
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {currentReservation && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
                  Reservation summary
                </Typography>
                <Stack spacing={2.5}>
                  <Box
                    sx={{
                      display: "grid",
                      gap: 3,
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "minmax(0, 1.3fr) minmax(0, 1fr) minmax(220px, 0.8fr)",
                      },
                    }}
                  >
                    <Stack spacing={1}>
                      <Box
                        sx={{
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          p: 1.5,
                        }}
                      >
                        <Stack spacing={1}>
                          <Box>
                          <Stack direction="row" spacing={0.5} alignItems="baseline">
                            <Typography variant="caption" sx={summaryLabelSx}>
                              Customer
                            </Typography>
                            {canModifyGuestDetails && (
                              <Button
                                size="small"
                                variant="text"
                                onClick={openGuestDetailsEditor}
                                sx={{
                                  minWidth: 0,
                                  p: 0,
                                  textTransform: "none",
                                  textDecoration: "underline",
                                  fontSize: "0.75rem",
                                  lineHeight: 1,
                                  "&:hover": {
                                    textDecoration: "underline",
                                  },
                                }}
                              >
                                edit
                              </Button>
                            )}
                          </Stack>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            justifyContent="space-between"
                          >
                            <Typography sx={summaryValueSx}>
                              {guestName(customer)}
                            </Typography>
                          </Stack>
                          </Box>
                          <Box>
                          <Typography variant="caption" sx={summaryLabelSx}>
                            Contact
                          </Typography>
                          <Typography variant="body2" sx={summaryValueSx}>
                            {customer.email || "No email"}
                          </Typography>
                          <Typography variant="body2" sx={summaryValueSx}>
                            {customer.contact_number || "No contact number"}
                          </Typography>
                          <Typography variant="body2" sx={summaryValueSx}>
                            {customer.city_province || "No city/province"}
                          </Typography>
                          </Box>
                        </Stack>
                        </Box>
                      <Box>
                        <Typography variant="caption" sx={summaryLabelSx}>
                          Status
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ ...summaryValueSx, textTransform: "capitalize" }}
                        >
                          {String(currentReservation.status || "").replace(
                            "_",
                            " ",
                          )}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack spacing={1}>
                      <Box>
                        <Stack direction="row" spacing={0.5} alignItems="baseline">
                          <Typography variant="caption" sx={summaryLabelSx}>
                            Stay
                          </Typography>
                          {canModifyStay && (
                            <Button
                              size="small"
                              variant="text"
                              onClick={openStayEditor}
                              sx={{
                                minWidth: 0,
                                p: 0,
                                textTransform: "none",
                                textDecoration: "underline",
                                fontSize: "0.75rem",
                                lineHeight: 1,
                                "&:hover": {
                                  textDecoration: "underline",
                                },
                              }}
                            >
                              edit
                            </Button>
                          )}
                        </Stack>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          alignItems={{ xs: "flex-start", sm: "center" }}
                        >
                          <Typography variant="body2" sx={summaryValueSx}>
                            {formatDateRange(currentReservation)}
                          </Typography>
                        </Stack>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={summaryLabelSx}>
                          Nights
                        </Typography>
                        <Typography variant="body2" sx={summaryValueSx}>
                          {stayNights} {stayNights === 1 ? "night" : "nights"}
                        </Typography>
                      </Box>
                      <Box>
                        <Stack direction="row" spacing={0.5} alignItems="baseline">
                          <Typography variant="caption" sx={summaryLabelSx}>
                            Guests
                          </Typography>
                          {canModifyGuests && (
                            <Button
                              size="small"
                              variant="text"
                              onClick={openGuestEditor}
                              sx={{
                                minWidth: 0,
                                p: 0,
                                textTransform: "none",
                                textDecoration: "underline",
                                fontSize: "0.75rem",
                                lineHeight: 1,
                                "&:hover": {
                                  textDecoration: "underline",
                                },
                              }}
                            >
                              edit
                            </Button>
                          )}
                        </Stack>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          alignItems={{ xs: "flex-start", sm: "center" }}
                        >
                          <Box>
                            <Typography variant="body2" sx={summaryValueSx}>
                              {currentReservation.adult || 0} adult
                              {Number(currentReservation.adult) === 1
                                ? ""
                                : "s"}
                              , {currentReservation.children || 0} child
                              {Number(currentReservation.children) === 1
                                ? ""
                                : "ren"}
                            </Typography>
                            <Typography color="text.secondary" variant="caption">
                              Capacity {reservationCapacity} guests
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    </Stack>

                    <Stack
                      spacing={1.25}
                      sx={{ bgcolor: "action.hover", borderRadius: 1, p: 1.5 }}
                    >
                      <FinancialKpi
                        label="Total"
                        value={formatMoney(financials.total)}
                      />
                      <FinancialKpi
                        label="Paid"
                        value={formatMoney(financials.paid)}
                        color="success.main"
                      />
                      <Divider />
                      <FinancialKpi
                        label="Balance"
                        value={formatMoney(financials.balance)}
                        color={
                          financials.balance > 0 ? "error.main" : "success.main"
                        }
                      />
                    </Stack>
                  </Box>

                  <Divider />

                  <Box>
                    <Box
                      sx={{
                        alignItems: "center",
                        display: "grid",
                        gap: 1,
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        mb: 1.5,
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, minWidth: 0 }}>
                        Rooms
                      </Typography>
                      {canModifyRooms && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={openRoomEditor}
                        >
                          Change rooms
                        </Button>
                      )}
                    </Box>
                    {rooms.length ? (
                      <Box
                        sx={{
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          overflowX: "auto",
                        }}
                      >
                        <Box
                          sx={{
                            bgcolor: "action.hover",
                            display: "grid",
                            gap: 1,
                            gridTemplateColumns:
                              "minmax(160px, 1fr) 64px 120px 72px 120px",
                            minWidth: 620,
                            px: 1.5,
                            py: 1,
                          }}
                        >
                          <Typography color="text.secondary" variant="caption">
                            Room
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="caption"
                            sx={{ textAlign: "right" }}
                          >
                            Qty
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="caption"
                            sx={{ textAlign: "right" }}
                          >
                            Rate
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="caption"
                            sx={{ textAlign: "right" }}
                          >
                            Nights
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="caption"
                            sx={{ textAlign: "right" }}
                          >
                            Total
                          </Typography>
                        </Box>
                        {rooms.map((reservedRoom) => {
                          const quantity = Number(
                            reservedRoom.reserved_quantity || 0,
                          );
                          const rate = Number(reservedRoom.rooms?.rate || 0);
                          const lineTotal = quantity * rate * stayNights;

                          return (
                            <Box
                              key={reservedRoom.id}
                              sx={{
                                borderTop: 1,
                                borderColor: "divider",
                                display: "grid",
                                gap: 1,
                                gridTemplateColumns:
                                  "minmax(160px, 1fr) 64px 120px 72px 120px",
                                minWidth: 620,
                                px: 1.5,
                                py: 1.25,
                              }}
                            >
                              <Typography>
                                {reservedRoom.rooms?.name || "Room"}
                              </Typography>
                              <Typography sx={{ textAlign: "right" }}>
                                {quantity}
                              </Typography>
                              <Typography sx={{ textAlign: "right" }}>
                                {formatMoney(rate)}
                              </Typography>
                              <Typography sx={{ textAlign: "right" }}>
                                {stayNights}
                              </Typography>
                              <Typography sx={{ textAlign: "right" }}>
                                {formatMoney(lineTotal)}
                              </Typography>
                            </Box>
                          );
                        })}
                        <Box
                          sx={{
                            borderTop: 1,
                            borderColor: "divider",
                            display: "grid",
                            gap: 1,
                            gridTemplateColumns:
                              "minmax(160px, 1fr) 64px 120px 72px 120px",
                            minWidth: 620,
                            px: 1.5,
                            py: 1.25,
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: 700,
                              gridColumn: "1 / 5",
                              textAlign: "right",
                            }}
                          >
                            Room total
                          </Typography>
                          <Typography
                            sx={{ fontWeight: 700, textAlign: "right" }}
                          >
                            {formatMoney(roomTotal)}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        No rooms recorded.
                      </Typography>
                    )}
                  </Box>

                  <Divider />

                  <Box>
                    <Box
                      sx={{
                        alignItems: "center",
                        display: "grid",
                        gap: 1,
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        mb: 1.5,
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, minWidth: 0 }}>
                        Add-ons
                      </Typography>
                      {canModifyAddOns && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={openAddOnModal}
                        >
                          Add add-on
                        </Button>
                      )}
                    </Box>
                    {addOns.length ? (
                      <Box
                        sx={{
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          overflowX: "auto",
                        }}
                      >
                        <Box
                          sx={{
                            bgcolor: "action.hover",
                            display: "grid",
                            gap: 1,
                            gridTemplateColumns: addOnGridColumns,
                            minWidth: addOnTableMinWidth,
                            pl: 1.5,
                            pr: 0.75,
                            py: 1,
                          }}
                        >
                          <Typography color="text.secondary" variant="caption">
                            Description
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="caption"
                            sx={{ textAlign: "right" }}
                          >
                            Qty
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="caption"
                            sx={{ textAlign: "right" }}
                          >
                            Unit price
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="caption"
                            sx={{ textAlign: "right" }}
                          >
                            Total
                          </Typography>
                          {canModifyAddOns && (
                            <Typography
                              color="text.secondary"
                              variant="caption"
                              sx={{ textAlign: "right" }}
                            >
                              Actions
                            </Typography>
                          )}
                        </Box>
                        {addOns.map((addOn) => {
                          const quantity = Number(addOn.quantity || 0);
                          const unitPrice = Number(addOn.unit_price || 0);
                          const lineTotal = quantity * unitPrice;

                          return (
                            <Box
                              key={addOn.id}
                              sx={{
                                alignItems: "center",
                                borderTop: 1,
                                borderColor: "divider",
                                display: "grid",
                                gap: 1,
                                gridTemplateColumns: addOnGridColumns,
                                minWidth: addOnTableMinWidth,
                                pl: 1.5,
                                pr: 0.75,
                                py: 1,
                              }}
                            >
                              <Typography variant="body2">
                                {addOn.description}
                              </Typography>
                              <Typography variant="body2" sx={{ textAlign: "right" }}>
                                {quantity}
                              </Typography>
                              <Typography variant="body2" sx={{ textAlign: "right" }}>
                                {formatMoney(unitPrice)}
                              </Typography>
                              <Typography sx={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                {formatMoney(lineTotal)}
                              </Typography>
                              {canModifyAddOns && (
                                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                  <IconButton
                                    aria-label="Edit add-on"
                                    size="small"
                                    onClick={() => openEditAddOnModal(addOn)}
                                    sx={{ p: 0.5 }}
                                  >
                                    <EditIcon fontSize="inherit" />
                                  </IconButton>
                                  <IconButton
                                    aria-label="Delete add-on"
                                    size="small"
                                    color="error"
                                    onClick={() => setDeleteAddOn(addOn)}
                                    sx={{ p: 0.5 }}
                                  >
                                    <DeleteIcon fontSize="inherit" />
                                  </IconButton>
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                        <Box
                          sx={{
                            borderTop: 1,
                            borderColor: "divider",
                            display: "grid",
                            gap: 1,
                            gridTemplateColumns: addOnGridColumns,
                            minWidth: addOnTableMinWidth,
                            pl: 1.5,
                            pr: 0.75,
                            py: 1.25,
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: 700,
                              gridColumn: "1 / 4",
                              textAlign: "right",
                            }}
                          >
                            Add-on total
                          </Typography>
                          <Typography sx={{ fontWeight: 700, textAlign: "right" }}>
                            {formatMoney(addOnTotal)}
                          </Typography>
                          {canModifyAddOns && <Box />}
                        </Box>
                      </Box>
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        No add-ons recorded.
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
                  Payments
                </Typography>
                {payments.length ? (
                  <Box
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      overflowX: "auto",
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: "action.hover",
                        display: "grid",
                        gap: 1,
                        gridTemplateColumns: paymentGridColumns,
                        minWidth: paymentTableMinWidth,
                        pl: 1.5,
                        pr: 0.75,
                        py: 1,
                      }}
                    >
                      <Typography color="text.secondary" variant="caption">
                        Date
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        Type
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        Method
                      </Typography>
                      <Typography
                        color="text.secondary"
                        variant="caption"
                        sx={{ textAlign: "right" }}
                      >
                        Amount
                      </Typography>
                      {canModifyPayments && (
                        <Typography
                          color="text.secondary"
                          variant="caption"
                          sx={{ textAlign: "right" }}
                        >
                          Actions
                        </Typography>
                      )}
                    </Box>
                    {[...payments]
                      .sort(
                        (first, second) =>
                          new Date(second.paid_at) - new Date(first.paid_at),
                      )
                      .map((payment) => (
                        <Box
                          key={payment.id}
                          sx={{
                            alignItems: "center",
                            borderTop: 1,
                            borderColor: "divider",
                            display: "grid",
                            gap: 1,
                            gridTemplateColumns: paymentGridColumns,
                            minWidth: paymentTableMinWidth,
                            pl: 1.5,
                            pr: 0.75,
                            py: 1,
                          }}
                        >
                          <Typography variant="body2">
                            {formatDateTime(payment.paid_at)}
                          </Typography>
                          <Typography variant="body2">
                            {paymentTypeLabels[payment.payment_type] ||
                              payment.payment_type}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ textTransform: "capitalize" }}
                          >
                            {String(payment.method || "").replace("_", " ")}
                          </Typography>
                          <Typography
                            sx={{ textAlign: "right", whiteSpace: "nowrap" }}
                            color={
                              payment.payment_type === "refund"
                                ? "error.main"
                                : "success.main"
                            }
                          >
                            {payment.payment_type === "refund" ? "-" : "+"}
                            {formatMoney(payment.amount)}
                          </Typography>
                          {canModifyPayments && (
                            <Box sx={{ display: "flex", justifyContent:"flex-end" }}>
                              <IconButton
                                aria-label="Edit payment"
                                size="small"
                                onClick={() => openEditPaymentModal(payment)}
                                sx={{ p: 0.5 }}
                              >
                                <EditIcon fontSize="inherit" />
                              </IconButton>
                              <IconButton
                                aria-label="Delete payment"
                                size="small"
                                color="error"
                                onClick={() => setDeletePayment(payment)}
                                sx={{ p: 0.5 }}
                              >
                                <DeleteIcon fontSize="inherit" />
                              </IconButton>
                            </Box>
                          )}
                        </Box>
                      ))}
                    <Box
                      sx={{
                        borderTop: 1,
                        borderColor: "divider",
                        display: "grid",
                        gap: 1,
                        gridTemplateColumns: paymentGridColumns,
                        minWidth: paymentTableMinWidth,
                        pl: 1.5,
                        pr: 0.75,
                        py: 1.25,
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 700,
                          gridColumn: "1 / 4",
                          textAlign: "right",
                        }}
                      >
                        Net paid
                      </Typography>
                      <Typography sx={{ fontWeight: 700, textAlign: "right" }}>
                        {formatMoney(financials.netPaid)}
                      </Typography>
                      {canModifyPayments && <Box />}
                    </Box>
                  </Box>
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    No payments recorded.
                  </Typography>
                )}
              </Paper>
            </Stack>
          )}
        </DialogContent>
        {currentReservation &&
          (actionsAvailable || canPrintReservation || canCancelReservation) && (
          <DialogActions
            sx={{
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
              justifyContent: "flex-end",
              px: 3,
              py: 2,
            }}
          >
            {canPrintReservation && (
              <Button
                onClick={handlePrintConfirmation}
                variant="outlined"
                startIcon={<PrintIcon />}
              >
                Print
              </Button>
            )}
            {canPrintReservation && <Box sx={{ flexGrow: 1 }} />}
            {canCancelReservation && (
              <Button
                onClick={openCancelModal}
                variant="outlined"
                color="error"
                disabled={actionSaving}
              >
                Cancel reservation
              </Button>
            )}
            {canMarkNoShow && (
              <Button
                onClick={() => setNoShowOpen(true)}
                variant="outlined"
                color="warning"
                disabled={noShowSaving}
              >
                No show
              </Button>
            )}
            {paymentAction && (
              <Button
                onClick={() =>
                  openPaymentModal(
                    paymentAction.paymentType,
                    paymentAction.target,
                  )
                }
                variant="outlined"
                disabled={paymentAction.disabled}
              >
                Record payment
              </Button>
            )}
            {statusAction ? (
              <Button
                variant="contained"
                onClick={handleStatusAction}
                disabled={actionSaving || statusAction.disabled}
              >
                {actionSaving ? "Saving..." : statusAction.label}
              </Button>
            ) : null}
          </DialogActions>
        )}
      </Dialog>

      <Dialog
        open={stayEditorOpen}
        onClose={closeStayEditor}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          Edit stay
          <DialogCloseButton
            onClick={closeStayEditor}
            disabled={stayEditorSaving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {currentReservation
                  ? guestName(currentReservation.customers)
                  : ""}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Current stay{" "}
                {currentReservation ? formatDateRange(currentReservation) : ""}
              </Typography>
            </Paper>
            {stayEditorError && (
              <Alert severity="error">{stayEditorError}</Alert>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="Check-in"
                name="checkin"
                type="date"
                value={stayForm.checkin}
                onChange={handleStayFormChange}
                InputLabelProps={{ shrink: true }}
                disabled={stayEditorSaving}
                fullWidth
                required
              />
              <TextField
                label="Checkout"
                name="checkout"
                type="date"
                value={stayForm.checkout}
                onChange={handleStayFormChange}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: stayForm.checkin || undefined }}
                disabled={stayEditorSaving}
                fullWidth
                required
              />
            </Stack>
            {stayPreviewFinancials && (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={1}>
                  <FinancialKpi
                    label="New nights"
                    value={`${stayPreviewNights} ${
                      stayPreviewNights === 1 ? "night" : "nights"
                    }`}
                  />
                  <FinancialKpi
                    label="New total"
                    value={formatMoney(stayPreviewFinancials.total)}
                  />
                  <FinancialKpi
                    label="New balance"
                    value={formatMoney(stayPreviewFinancials.balance)}
                    color={
                      stayPreviewFinancials.balance > 0
                        ? "error.main"
                        : "success.main"
                    }
                  />
                  {stayPreviewCredit > 0 && (
                    <FinancialKpi
                      label="Credit/refund due"
                      value={formatMoney(stayPreviewCredit)}
                      color="warning.main"
                    />
                  )}
                </Stack>
              </Paper>
            )}
            <Alert severity="info">
              Saving checks the current rooms against the new dates before the
              stay is updated.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeStayEditor} disabled={stayEditorSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveStayDates}
            disabled={
              stayEditorSaving ||
              !stayForm.checkin ||
              !stayForm.checkout ||
              new Date(stayForm.checkout) <= new Date(stayForm.checkin)
            }
          >
            {stayEditorSaving ? "Saving..." : "Save stay"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={guestEditorOpen}
        onClose={closeGuestEditor}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          Edit guests
          <DialogCloseButton
            onClick={closeGuestEditor}
            disabled={guestEditorSaving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {guestEditorError && (
              <Alert severity="error">{guestEditorError}</Alert>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Adults"
                name="adult"
                type="number"
                value={guestForm.adult}
                onChange={handleGuestFormChange}
                inputProps={{ min: 1, step: 1 }}
                fullWidth
                required
              />
              <TextField
                label="Children"
                name="children"
                type="number"
                value={guestForm.children}
                onChange={handleGuestFormChange}
                inputProps={{ min: 0, step: 1 }}
                fullWidth
                required
              />
            </Stack>
            {guestFormExceedsCapacity && (
              <Alert severity="error">
                Guest total cannot exceed total capacity ({reservationCapacity}).
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeGuestEditor} disabled={guestEditorSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveGuests}
            disabled={
              guestEditorSaving ||
              !guestForm.adult ||
              guestFormTotal < 1 ||
              guestFormExceedsCapacity
            }
          >
            {guestEditorSaving ? "Saving..." : "Save guests"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={guestDetailsEditorOpen}
        onClose={closeGuestDetailsEditor}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          Edit guest details
          <DialogCloseButton
            onClick={closeGuestDetailsEditor}
            disabled={guestDetailsEditorSaving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {guestDetailsEditorError && (
              <Alert severity="error">{guestDetailsEditorError}</Alert>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="First name"
                name="firstName"
                value={guestDetailsForm.firstName}
                onChange={handleGuestDetailsFormChange}
                fullWidth
                required
              />
              <TextField
                label="Last name"
                name="lastName"
                value={guestDetailsForm.lastName}
                onChange={handleGuestDetailsFormChange}
                fullWidth
                required
              />
            </Stack>
            <TextField
              label="Email"
              name="email"
              type="email"
              value={guestDetailsForm.email}
              onChange={handleGuestDetailsFormChange}
              fullWidth
            />
            <TextField
              label="Contact number"
              name="contactNumber"
              value={guestDetailsForm.contactNumber}
              onChange={handleGuestDetailsFormChange}
              fullWidth
              required
            />
            <TextField
              label="City/Province"
              name="cityProvince"
              value={guestDetailsForm.cityProvince}
              onChange={handleGuestDetailsFormChange}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeGuestDetailsEditor}
            disabled={guestDetailsEditorSaving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveGuestDetails}
            disabled={
              guestDetailsEditorSaving ||
              !guestDetailsForm.firstName.trim() ||
              !guestDetailsForm.lastName.trim() ||
              !guestDetailsForm.contactNumber.trim()
            }
          >
            {guestDetailsEditorSaving ? "Saving..." : "Save details"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={roomEditorOpen}
        onClose={closeRoomEditor}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          Change rooms
          <DialogCloseButton
            onClick={closeRoomEditor}
            disabled={roomEditorSaving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {roomEditorLoading && (
              <Typography color="text.secondary">
                Loading room availability...
              </Typography>
            )}
            {roomSelections.map((selection) => {
              const selectedRoom = roomOptions.find(
                (room) => room.id === selection.roomId,
              );
              const selectedRoomIds = new Set(
                roomSelections
                  .filter((roomSelection) => roomSelection.key !== selection.key)
                  .map((roomSelection) => roomSelection.roomId),
              );

              return (
                <Paper key={selection.key} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1.5}>
                    <TextField
                      select
                      label="Room"
                      value={selection.roomId}
                      onChange={(event) =>
                        handleRoomSelectionChange(
                          selection.key,
                          "roomId",
                          event.target.value,
                        )
                      }
                      disabled={roomEditorLoading || roomEditorSaving}
                      fullWidth
                    >
                      {roomOptions.map((room) => (
                        <MenuItem
                          key={room.id}
                          value={room.id}
                          disabled={selectedRoomIds.has(room.id)}
                        >
                          {room.name} / {room.available_quantity} available /{" "}
                          {formatMoney(room.rate)}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      alignItems={{ xs: "stretch", sm: "flex-start" }}
                    >
                      <TextField
                        label="Rooms"
                        type="number"
                        size="small"
                        value={selection.roomQuantity}
                        onChange={(event) =>
                          handleRoomSelectionChange(
                            selection.key,
                            "roomQuantity",
                            event.target.value,
                          )
                        }
                        inputProps={{
                          min: 1,
                          max: selectedRoom?.available_quantity || 1,
                        }}
                        helperText={
                          selectedRoom
                            ? `${selectedRoom.available_quantity} available`
                            : "Choose a room"
                        }
                        disabled={roomEditorLoading || roomEditorSaving}
                        sx={{ width: { sm: 150 } }}
                      />
                      <Button
                        color="error"
                        variant="outlined"
                        onClick={() => handleRemoveRoomSelection(selection.key)}
                        sx={{
                          alignSelf: { xs: "stretch", sm: "flex-start" },
                          minHeight: 40,
                        }}
                        disabled={
                          roomEditorSaving ||
                          roomEditorLoading ||
                          roomSelections.length <= 1
                        }
                      >
                        Remove
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
            <Button
              variant="outlined"
              onClick={handleAddRoomSelection}
              disabled={
                roomEditorLoading ||
                roomEditorSaving ||
                roomSelections.length >= roomOptions.length
              }
              sx={{ alignSelf: "flex-start" }}
            >
              Add another room
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRoomEditor} disabled={roomEditorSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveRooms}
            disabled={roomEditorSaving || roomEditorLoading}
          >
            {roomEditorSaving ? "Saving..." : "Save rooms"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addOnOpen}
        onClose={closeAddOnModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          {editingAddOn ? "Edit add-on" : "Add add-on"}
          <DialogCloseButton
            onClick={closeAddOnModal}
            disabled={addOnSaving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {currentReservation
                  ? guestName(currentReservation.customers)
                  : ""}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Current balance {formatMoney(financials?.balance)}
              </Typography>
            </Paper>
            <TextField
              select
              label="Catalog service"
              name="serviceId"
              value={addOnForm.serviceId}
              onChange={handleAddOnServiceChange}
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
              label="Quantity"
              name="quantity"
              type="number"
              value={addOnForm.quantity}
              onChange={handleAddOnFormChange}
              inputProps={{ min: 1, step: "0.01" }}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={handleSaveAddOn}
            disabled={
              addOnSaving ||
              !addOnForm.serviceId ||
              !addOnForm.description ||
              !addOnForm.quantity ||
              addOnForm.unitPrice === ""
            }
          >
            {addOnSaving
              ? "Saving..."
              : editingAddOn
                ? "Update add-on"
                : "Save add-on"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteAddOn)}
        onClose={closeDeleteAddOnModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          Delete add-on
          <DialogCloseButton
            onClick={closeDeleteAddOnModal}
            disabled={deleteAddOnSaving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              This will remove the add-on from the reservation and recalculate
              the financials.
            </Alert>
            {deleteAddOn && (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 800 }}>
                  {deleteAddOn.description}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {deleteAddOn.quantity} x {formatMoney(deleteAddOn.unit_price)}
                </Typography>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeDeleteAddOnModal}
            disabled={deleteAddOnSaving}
          >
            Keep add-on
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteAddOn}
            disabled={deleteAddOnSaving}
          >
            {deleteAddOnSaving ? "Deleting..." : "Delete add-on"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={paymentOpen}
        onClose={closePaymentModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          {editingPayment ? "Edit payment" : "Record payment"}
          <DialogCloseButton
            onClick={closePaymentModal}
            disabled={paymentSaving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {currentReservation
                  ? guestName(currentReservation.customers)
                  : ""}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Balance {formatMoney(financials?.balance)} / Net paid{" "}
                {formatMoney(financials?.netPaid)}
              </Typography>
            </Paper>
            <TextField
              select
              label="Type"
              name="paymentType"
              value={paymentForm.paymentType}
              onChange={handlePaymentFormChange}
              fullWidth
            >
              <MenuItem value="partial_payment">
                {paymentTypeLabels.partial_payment}
              </MenuItem>
              <MenuItem value="full_payment">
                {paymentTypeLabels.full_payment}
              </MenuItem>
              {editingPayment?.payment_type === "refund" && (
                <MenuItem value="refund">
                  {paymentTypeLabels.refund || "Refund"}
                </MenuItem>
              )}
            </TextField>
            <TextField
              label="Amount"
              name="amount"
              type="number"
              value={paymentForm.amount}
              onChange={handlePaymentFormChange}
              inputProps={{
                min:
                  paymentForm.paymentType === "full_payment"
                    ? fullPaymentAmount || 1
                    : 1,
                readOnly: paymentForm.paymentType === "full_payment",
                step: "0.01",
              }}
              helperText={
                paymentForm.paymentType === "full_payment"
                  ? "Full payment uses the remaining balance."
                  : ""
              }
              fullWidth
              required
            />
            <TextField
              select
              label="Method"
              name="method"
              value={paymentForm.method}
              onChange={handlePaymentFormChange}
              fullWidth
            >
              {paymentMethods.map((method) => (
                <MenuItem key={method.value} value={method.value}>
                  {method.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Notes"
              name="notes"
              value={paymentForm.notes}
              onChange={handlePaymentFormChange}
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={handleSavePayment}
            disabled={paymentSaving || !paymentForm.amount}
          >
            {paymentSaving
              ? "Saving..."
              : editingPayment
                ? "Update payment"
                : "Save payment"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deletePayment)}
        onClose={closeDeletePaymentModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          Delete payment
          <DialogCloseButton
            onClick={closeDeletePaymentModal}
            disabled={deletePaymentSaving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              This will remove the payment from the reservation and recalculate
              the financials.
            </Alert>
            {deletePayment && (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 800 }}>
                  {deletePayment.payment_type === "refund" ? "-" : "+"}
                  {formatMoney(deletePayment.amount)}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {paymentTypeLabels[deletePayment.payment_type] ||
                    deletePayment.payment_type}{" "}
                  / {formatDateTime(deletePayment.paid_at)}
                </Typography>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeDeletePaymentModal}
            disabled={deletePaymentSaving}
          >
            Keep payment
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeletePayment}
            disabled={deletePaymentSaving}
          >
            {deletePaymentSaving ? "Deleting..." : "Delete payment"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={noShowOpen}
        onClose={closeNoShowModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          Mark as no-show
          <DialogCloseButton
            onClick={closeNoShowModal}
            disabled={noShowSaving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {currentReservation
                  ? guestName(currentReservation.customers)
                  : ""}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Ref {currentReservation ? shortReference(currentReservation.id) : ""}
              </Typography>
            </Paper>
            <Typography color="text.secondary">
              Mark this confirmed reservation as no-show? This will close the
              reservation and release the reserved room availability.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeNoShowModal} disabled={noShowSaving}>
            Keep reservation
          </Button>
          <Button
            color="warning"
            variant="contained"
            onClick={handleNoShowReservation}
            disabled={noShowSaving}
          >
            {noShowSaving ? "Saving..." : "Mark no-show"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={cancelOpen}
        onClose={closeCancelModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          Cancel reservation
          <DialogCloseButton
            onClick={closeCancelModal}
            disabled={cancelSaving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {currentReservation
                  ? guestName(currentReservation.customers)
                  : ""}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Net paid {formatMoney(financials?.netPaid)}
              </Typography>
            </Paper>
            <Typography color="text.secondary">
              Cancel this reservation? This action will move it to cancelled and
              release the reserved room availability.
            </Typography>
            {canRecordRefund && (
              <Alert severity="info">
                A refund of {formatMoney(financials?.netPaid)} will be recorded
                automatically.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancelModal} disabled={cancelSaving}>
            Keep reservation
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleCancelReservation}
            disabled={cancelSaving}
          >
            {cancelSaving ? "Cancelling..." : "Cancel reservation"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={checkoutOpen}
        onClose={closeCheckoutModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pr: 6, position: "relative" }}>
          Check out guest
          <DialogCloseButton
            onClick={closeCheckoutModal}
            disabled={checkoutSaving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {currentReservation
                  ? guestName(currentReservation.customers)
                  : ""}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Balance {formatMoney(financials?.balance)}
              </Typography>
            </Paper>
            <Typography color="text.secondary">
              Confirm that the guest has settled the stay and is ready to check
              out.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={handleCheckoutReservation}
            disabled={checkoutSaving || (financials?.balance || 0) > 0}
          >
            {checkoutSaving ? "Checking out..." : "Check out"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
