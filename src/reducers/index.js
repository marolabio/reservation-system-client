import { combineReducers } from "redux";
import alert from "./alert";
import auth from "./auth";
import room from "./room";

export default combineReducers({
  alert,
  auth,
  room,
});
