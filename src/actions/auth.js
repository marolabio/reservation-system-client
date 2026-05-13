import { setAlert } from "./alert";
import supabase from "../utils/supabase";

import {
  LOGIN_SUCCESS,
  LOGIN_FAIL,
  USER_LOADED,
  AUTH_ERROR,
  LOGOUT,
} from "./types";

export const loadUser = () => async (dispatch) => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    dispatch({
      type: AUTH_ERROR,
    });
    return;
  }

  dispatch({
    type: USER_LOADED,
    payload: data.user,
  });
};

export const login = (body) => async (dispatch) => {
  const email = body.email || body.identifier;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: body.password,
  });

  if (error) {
    dispatch(setAlert("Email or password invalid.", "error"));
    dispatch({
      type: LOGIN_FAIL,
    });
    return;
  }

  dispatch({
    type: LOGIN_SUCCESS,
    payload: data,
  });
};

// Logout
export const logout = () => async (dispatch) => {
  await supabase.auth.signOut();
  dispatch({ type: LOGOUT });
};
