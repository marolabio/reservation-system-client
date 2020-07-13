import { GET_ROOMS_SUCCESS, GET_ROOMS_FAIL } from "../actions/types";

const initialState = {
  rooms: [],
  error: {},
  loading: true,
};

export default function (state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case GET_ROOMS_SUCCESS:
      return {
        ...state,
        rooms: payload,
        loading: false,
      };
    case GET_ROOMS_FAIL:
      return {
        ...state,
        error: payload,
        loading: false,
      };
    default:
      return state;
  }
}
