import {
  GET_RESERVATION_SUCCESS,
  GET_RESERVATION_FAIL,
} from "../actions/types";

const initialState = {
  reservations: [],
  error: {},
  loading: true,
};

export default function (state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case GET_RESERVATION_SUCCESS:
      return {
        ...state,
        reservations: payload,
        loading: false,
      };
    case GET_RESERVATION_FAIL:
      return {
        ...state,
        error: payload,
        loading: false,
      };
    default:
      return state;
  }
}
