import { RESERVATION_SUCCESS, RESERVATION_FAIL } from "./../actions/types";

const initialState = {
  activeStep: 0,
  personalDetails: {},
  reservation: {},
  error: {},
  loading: true,
};

export default function (state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case RESERVATION_SUCCESS:
      return {
        ...state,
        reservation: payload,
        loading: false,
      };
    case RESERVATION_FAIL:
      return {
        ...state,
        error: payload,
        loading: false,
      };
    default:
      return state;
  }
}