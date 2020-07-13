import { setAlert } from "./alert";
import api from "../utils/api";

import {
  FORGOT_PASSWORD_SUCCESS,
  FORGOT_PASSWORD_FAIL,
} from "./types";

export const forgotPassword = (body) => async (dispatch) => {
  return await api
    .post("/auth/forgot-password", body)
    .then((res) => {
      dispatch({
        type: FORGOT_PASSWORD_SUCCESS,
        payload: res.data,
      });
    })
    .catch((err) => {
      dispatch(setAlert("Email invalid.", "error"));

      dispatch({
        type: FORGOT_PASSWORD_FAIL,
      });
    });
};


