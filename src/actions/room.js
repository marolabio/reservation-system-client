import api from "../utils/api";
import { GET_ROOMS_SUCCESS, GET_ROOMS_FAIL } from "./types";

export const getPost = () => async (dispatch) => {

  return await api
    .get("/rooms")
    .then((res) => {
      dispatch({
        type: GET_ROOMS_SUCCESS,
        payload: res.data,
      });
    })
    .catch((err) => {
      dispatch({
        type: GET_ROOMS_FAIL,
        payload: err.response.data
      });
    });
};

