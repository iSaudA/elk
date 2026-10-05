# Synthetic event catalogue

The Azure Function generates one correlated checkout journey on each timer run. A
manual `POST /api/shop/checkout` with the `x-ayn-shop-token` header also generates a journey. Every journey shares
`order.id`, `trace.id`, and `transaction.id`, while every individual event has a
unique `event.id`.

## Current scenarios

| Scenario | Default weight | Event sequence | HTTP result |
| --- | ---: | --- | ---: |
| Successful checkout | 75% | `CHECKOUT_STARTED`, `INVENTORY_RESERVED`, `PAYMENT_SUCCESS`, `ORDER_CREATED`, `HTTP_REQUEST_COMPLETED` | 201 |
| Ghost order | 8% | `CHECKOUT_STARTED`, `INVENTORY_RESERVED`, `PAYMENT_SUCCESS`, `ORDER_CREATE_FAILED`, `DATABASE_TIMEOUT`, `HTTP_REQUEST_COMPLETED` | 500 |
| Payment declined | 10% | `CHECKOUT_STARTED`, `INVENTORY_RESERVED`, `PAYMENT_DECLINED`, `HTTP_REQUEST_COMPLETED` | 402 |
| Inventory shortage | 7% | `CHECKOUT_STARTED`, `INVENTORY_OUT_OF_STOCK`, `HTTP_REQUEST_COMPLETED` | 409 |

The scenario, customer, product, quantity, amount, identifiers, event timings,
and synthetic duration are randomized. The weights live in `function-app/src/events.js`.
Pass a `scenario` in the checkout request to make a demonstration repeatable.

Live events use `labels.generation: live`. The historical seeder uses
`labels.generation: historical` and stable event identifiers, allowing the same
baseline to be rerun without duplicating Elasticsearch documents or Azure SQL
rows. Historical events are sent directly to Logstash and do not trigger
Telegram alerts.

## Event design rules

All events use the same ECS-style envelope and contain only synthetic data. Card
numbers, passwords, access tokens, and other secrets must never be included in
telemetry. Telegram receives one summary per failed checkout rather than the raw
event batch.
