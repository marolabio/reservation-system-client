import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Dashboard from "./components/dashboard";
import Alert from "./components/layout/Alert";
import PrivateRoute from "./components/routing/PrivateRoute";
import setAuthToken from "./utils/setAuthToken";
import { loadUser } from "./actions/auth";
import history from "./components/routing/history";
import Reservations from "./components/reservations";
import { CssBaseline } from "@material-ui/core";
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
  }, []);

  return (
    <Provider store={store}>
      <CssBaseline />
      <Router history={history}>
        <Alert />
        <Switch>
          <Route exact path="/" component={Login} />
          <Route exact path="/forgot-password" component={ForgotPassword} />
          <PrivateRoute exact path="/dashboard" component={Dashboard} />
          <PrivateRoute exact path="/reservations" component={Reservations} />
        </Switch>
      </Router>
    </Provider>
  );
};

export default App;
