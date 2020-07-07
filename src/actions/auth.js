import { setAlert } from "./alert";
import setAuthToken from "../utils/setAuthToken";
import api from "../utils/api";

import {
  LOGIN_SUCCESS,
  LOGIN_FAIL,
  USER_LOADED,
  AUTH_ERROR,
  LOGOUT,
} from "./types";

export const loadUser = () => async (dispatch) => {
  if (localStorage.token) {
    setAuthToken(localStorage.token);
  }

  return await api
    .get("/users/me")
    .then((res) => {
      dispatch({
        type: USER_LOADED,
        payload: res.data,
      });
    })
    .catch((err) => {
      dispatch({
        type: AUTH_ERROR,
      });
    });
};

export const login = (body) => async (dispatch) => {
  return await api
    .post("/auth/local", body)
    .then((res) => {
      dispatch({
        type: LOGIN_SUCCESS,
        payload: res.data,
      });
    })
    .catch((err) => {
      dispatch(setAlert("Email or password invalid.", "error"));

      dispatch({
        type: LOGIN_FAIL,
      });
    });
};

// Logout
export const logout = () => (dispatch) => {
  dispatch({ type: LOGOUT });
};
