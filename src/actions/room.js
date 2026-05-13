import supabase from "../utils/supabase";
import { GET_ROOMS_SUCCESS, GET_ROOMS_FAIL } from "./types";

export const getRooms = () => async (dispatch) => {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    dispatch({
      type: GET_ROOMS_FAIL,
      payload: error,
    });
    return;
  }

  dispatch({
    type: GET_ROOMS_SUCCESS,
    payload: data,
  });
};
