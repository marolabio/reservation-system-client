import { setAlert } from "./alert";
import supabase from "../utils/supabase";

import {
  FORGOT_PASSWORD_SUCCESS,
  FORGOT_PASSWORD_FAIL,
} from "./types";

export const forgotPassword = (body) => async (dispatch) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(body.email);

  if (error) {
    dispatch(setAlert("Email invalid.", "error"));
    dispatch({
      type: FORGOT_PASSWORD_FAIL,
    });
    return;
  }

  dispatch({
    type: FORGOT_PASSWORD_SUCCESS,
    payload: data,
  });
};


