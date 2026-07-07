import {
  RESERVATION_SUCCESS,
  RESERVATION_FAIL,
  GET_RESERVATION_SUCCESS,
  GET_RESERVATION_FAIL,
} from "./types";
import { setAlert } from "./alert";
import supabase from "../utils/supabase";
import { mapReservation } from "../utils/reservationMapper";

export const reserve = (body) => async (dispatch) => {
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      first_name: body.firstName,
      last_name: body.lastName,
      contact_number: body.contactNumber,
      email: body.email?.trim() ? body.email.trim().toLowerCase() : null,
      city_province: body.cityProvince || null,
    })
    .select()
    .single();

  if (customerError) {
    dispatch(setAlert("Reservation failed.", "error"));
    dispatch({ type: RESERVATION_FAIL });
    return;
  }

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .insert({
      customer_id: customer.id,
      checkin: body.checkin,
      checkout: body.checkout,
      adult: body.adult,
      children: body.children,
      status: "pending",
    })
    .select()
    .single();

  if (reservationError) {
    dispatch(setAlert("Reservation failed.", "error"));
    dispatch({ type: RESERVATION_FAIL });
    return;
  }

  const reservedRooms = body.rooms.map((room) => ({
    reservation_id: reservation.id,
    room_id: room.id,
    reserved_quantity: room.quantity,
  }));

  const { error: roomsError } = await supabase
    .from("reserved_rooms")
    .insert(reservedRooms);

  if (roomsError) {
    dispatch(setAlert("Reservation failed.", "error"));
    dispatch({ type: RESERVATION_FAIL });
    return;
  }

  dispatch({
    type: RESERVATION_SUCCESS,
    payload: reservation,
  });
  dispatch(setAlert("Reservation successful.", "success"));
};

export const getReservations = (params = {}) => async (dispatch) => {
  let query = supabase
    .from("reservations")
    .select(
      `
        *,
        customers(*),
        reserved_rooms(
          id,
          reserved_quantity,
          rooms(*)
        )
      `
    )
    .order("created_at", { ascending: false });

  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;

  if (error) {
    dispatch({
      type: GET_RESERVATION_FAIL,
      payload: error,
    });
    return { error: true };
  }

  dispatch({
    type: GET_RESERVATION_SUCCESS,
    payload: data.map(mapReservation),
  });
  return { error: false };
};
