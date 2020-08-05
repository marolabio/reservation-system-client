import {
  RESERVATION_SUCCESS,
  RESERVATION_FAIL,
  GET_RESERVATION_SUCCESS,
  GET_RESERVATION_FAIL,
} from "./types";
import { setAlert } from "./alert";
import api from "../utils/api";

export const reserve = (body) => async (dispatch) => {
  return await api
    .post("/reservations", body)
    .then((res) => {
      dispatch({
        type: RESERVATION_SUCCESS,
        payload: res.data,
      });
      dispatch(setAlert("Reservation successful.", "success"));
    })
    .catch((err) => {
      dispatch(setAlert("Reservation failed.", "error"));

      dispatch({
        type: RESERVATION_FAIL,
      });
    });
};

export const getReservations = (params = {}) => async (dispatch) => {
  return await api
    .get(`/reservations${params.limit ? `?_limit=${params.limit}` : ""}`)
    .then((res) => {
      dispatch({
        type: GET_RESERVATION_SUCCESS,
        payload: res.data,
      });
      return { error: false };
    })
    .catch((err) => {
      dispatch({
        type: GET_RESERVATION_FAIL,
      });
      return { error: true };
    });
};
