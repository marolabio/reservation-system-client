import { combineReducers } from "redux";
import alert from "./alert";
import auth from "./auth";
import room from "./room";
import reservation from "./reservation";

export default combineReducers({
  alert,
  auth,
  room,
  reservation
});
