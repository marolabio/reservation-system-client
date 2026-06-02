import React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Title from "./Title";

export default function Customers({ reservations }) {
  const rows = reservations.map((res) => {
    const { first_name, last_name, email, contact_number } = res.customer;
    return {
      name: `${first_name} ${last_name}`,
      email,
      contactNumber: contact_number,
      status: res.status,
    };
  });

  return (
    <React.Fragment>
      <Title>Recent Customers</Title>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Customer Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Contact Number</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell>{row.contactNumber}</TableCell>
              <TableCell>{row.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={(theme) => ({ marginTop: theme.spacing(3) })}>
        <Link
          style={{ textDecoration: "none" }}
          href="/customers"
        >
          See more customers
        </Link>
      </Box>
    </React.Fragment>
  );
}
