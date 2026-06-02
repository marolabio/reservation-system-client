alter table reservation_payments
drop constraint if exists reservation_payments_payment_type_check;

alter table reservation_payments
add constraint reservation_payments_payment_type_check
check (payment_type in ('downpayment', 'partial_payment', 'full_payment', 'refund'));
