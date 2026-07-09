# Reservation System Client

A Next.js reservation and front desk management app for a resort or hotel. The system is internal-only: staff create bookings, manage payments, add-ons, check-ins, check-outs, cancellations, walk-in bills, and reports from the admin area.

The root route `/` is not a public booking page. It redirects signed-in staff to `/bookings` and sends unauthenticated users to `/admin`.

## Guest Journey Logic

The reservation lifecycle is driven by the `reservations.status` value and the related room, payment, add-on, and customer records stored in Supabase.

### 1. Staff Starts a Booking

Staff sign in through `/admin` and create guest bookings from `/admin-booking`.

Staff choose:

- Check-in and check-out dates
- Number of adults and children
- Number of rooms needed

The app loads active rooms from Supabase and checks availability against existing reservations with these active inventory-holding statuses:

- `pending`
- `confirmed`
- `checked_in`

A room is shown only when it has enough available quantity for the selected date range and enough occupancy for the adult count.

### 2. Staff Selects Rooms

Staff add one or more available rooms to the reservation.

For every selected room, the app tracks:

- Room ID
- Selected quantity
- Room rate
- Number of stay nights

The estimated total is calculated as:

```text
room rate x selected quantity x stay nights
```

### 3. Staff Enters Guest Details

Staff enter the guest details:

- First name
- Last name
- Contact number
- Email, optional
- City or province, optional
- Notes, optional

Before submitting, the app requires at least one room plus the required customer fields.

### 4. Reservation Is Created

When staff submit the booking form, the app creates:

- A `customers` record
- A `reservations` record
- One or more `reserved_rooms` records

Internal bookings can start as either:

```text
status = pending
status = confirmed
```

After creation, the app redirects staff back to `/bookings` with the short reservation reference. Pending bookings still require staff review and payment before confirmation.

### 5. Staff Reviews Pending Bookings

Staff sign in through the admin flow and review reservations from the booking queues, especially:

- `/bookings`
- `/pending`
- `/confirmed`
- `/checkin`

The queues support searching by customer, room, notes, status, and reservation reference. Opening a reservation shows customer details, stay dates, rooms, add-ons, payments, totals, balance, and available actions.

### 6. Staff Records Payment

Before a pending reservation can be confirmed, staff must record at least one payment.

Financial totals are calculated from:

- Room total
- Reservation add-ons
- Non-refund payments
- Refund payments

The app derives:

```text
total = room total + add-on total
net paid = payments - refunds
balance = total - net paid
downpayment required = 30% of total
check-in payment required = 50% of total
```

Payment rules:

- Partial payments cannot exceed the remaining balance.
- Full payment must cover the full remaining balance.
- Refunds are only recorded during cancellation or when editing an existing refund.
- Confirmed reservations must be fully paid before check-in.
- Checked-in reservations can still record payment when add-ons or other changes create a new balance.

### 7. Staff Confirms the Reservation

Staff can move a reservation from `pending` to:

```text
confirmed
```

The system blocks confirmation if no payment has been recorded. Once confirmed, the reservation remains counted against room availability for overlapping dates.

### 8. Staff Handles Arrival

When the guest arrives, staff can check in a confirmed reservation only after the balance is fully paid.

The reservation moves to:

```text
checked_in
```

The app stores `checked_in_at` with the current timestamp. Checked-in reservations continue to hold room availability. Checked-in reservations cannot be cancelled from the reservation dialog; they must be checked out after settlement.

### 9. Staff Manages the Stay

While a reservation is still open (`pending`, `confirmed`, or `checked_in`), staff may update operational details:

- Change stay dates, if the existing rooms are available for the new dates
- Change rooms, if selected rooms have enough availability and capacity
- Add, edit, or delete add-ons from the service catalog
- Add, edit, or delete payments when the reservation has a payable balance

Closed reservations cannot be modified in the same way.

Closed statuses are:

- `checked_out`
- `cancelled`
- `no_show`

### 10. Staff Checks Out the Guest

A guest can only be checked out from a checked-in reservation.

Before checkout, the balance must be fully paid. If any balance remains, checkout is blocked.

After checkout, the reservation moves to:

```text
checked_out
```

The app stores `checked_out_at` with the current timestamp. Checked-out reservations are treated as closed and no longer hold future availability.

### 11. Cancellation and Refund Path

Staff can cancel a reservation while it is still `pending` or `confirmed`.

If the guest has paid, staff must record a valid refund amount up to the net paid amount. The refund is stored as a reservation payment with:

```text
payment_type = refund
```

Cancellation uses a simple confirmation dialog. If the guest has already paid, the refundable net paid amount is recorded automatically as a refund. After cancellation, the reservation moves to:

```text
cancelled
```

Cancelled reservations are closed and no longer hold room availability.

### 12. No-Show Path

Staff can mark a confirmed reservation as:

```text
no_show
```

The no-show action uses a confirmation dialog. Checked-in and checked-out reservations cannot be marked as no-show from the reservation dialog. No-show reservations are closed and excluded from future room availability holds.

## Reservation Status Flow

```text
pending
  -> confirmed, after at least one payment
  -> cancelled, with automatic refund handling when needed

confirmed
  -> checked_in, when fully paid and the guest arrives
  -> cancelled, with automatic refund handling when needed
  -> no_show

checked_in
  -> checked_out, after full payment

checked_out
  -> final closed state

cancelled
  -> final closed state

no_show
  -> final closed state
```

## Front Desk Booking Flow

Staff can also create bookings from `/admin-booking`.

This is the only booking entry point for the business. It follows the same room availability, customer creation, reservation creation, and reserved room logic described above. Staff can choose whether the new booking starts as:

- `pending`
- `confirmed`

After creation, the app redirects back to `/bookings` with a booking reference.

## Admin and Reporting Areas

The admin side includes:

- Booking queues by status
- Reservation detail dialog
- Payment tracking
- Add-on tracking from the service catalog
- Room and amenity management
- Walk-in sales
- Sales summaries and status reports

Reports use closed and operational statuses such as `checked_out`, `cancelled`, and `no_show` to separate completed, cancelled, and missed customer journeys.

## Walk-In Bills

Staff can create walk-in bills from `/walk-in-sales`.

The walk-in bill flow is separate from room reservations:

- Staff choose one or more services from the active service catalog.
- The bill total is calculated from item quantity and unit price.
- Payment method sits directly above payment amount in the new bill form.
- Payment amount auto-fills to the bill total until staff manually edits or clears it.
- Staff can save the bill, save and print a receipt, view previous bills, edit bills, print receipts, or delete walk-in sales.

## Available Scripts

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

Run linting:

```bash
npm run lint
```
