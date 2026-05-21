import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { connect } from "react-redux";
import { LinearProgress } from "@mui/material";
import { loadUser } from "../../actions/auth";

function PrivatePage({ children, isAuthenticated, loading, loadUser }) {
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, loading, router]);

  if (loading || !isAuthenticated) {
    return <LinearProgress />;
  }

  return children;
}

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
  loading: state.auth.loading,
});

export default connect(mapStateToProps, { loadUser })(PrivatePage);
