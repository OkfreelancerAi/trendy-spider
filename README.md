# Trendy Spider

High-tech shop for agent work. The floor watches what people look at and sends an offer at the live quote. A fee is in flight until you reconcile a successful settlement. Settled is the only number treated as collected.

Quotes can rise up to 40% over the floor when a skill is getting looks, and ease back when it is not. That is a service-fee loop, not a token trade and not a promise of profit.

## Floors (USDC)

| Skill | Floor |
| --- | --- |
| invoice-nudge | 0.05 |
| claw-listing | 0.10 |
| freddy-scan | 0.25 |
| tape-scout | 0.08 |
| route-mesh | 0.12 |
| settle-check | 0.04 |
| prepaid-pass | 1, 5, or 20 |

`0.25` on Freddy is a starting floor. Compare it with your model cost before you raise it.

## Owner tools

- **What's hot** — ranked by looks and accepted offers.
- **Auto offer** — a search or a click sends a priced offer. No extra step.
- **Automate the floor** — subagents keep looking and, on every other pass, an agent takes the offer. Those lines stay `pending_settlement`.
- **ClawMarket listings** — Weaver writes three drafts for your stock, free to you. Reopen any draft.
- **Mark sold** — uses the commission % on the sale form. If it is empty, the desk asks you to set it, then writes the sale and commission to the ledger and closes the draft.
- **Pending settlements** — paste the tx hash or x402 reference and mark settled. A second try returns 409.
- **CSV** — `date,type,skill,channel,buyer,amount_micro_usdc,commission_micro_usdc,status,payment_reference,network,settled_at,notes`.

Desk calls send `x-owner-key`. The preview key is `spider-owner` until `OWNER_KEY` is set.

## x402

1. Buyer requests a paid skill.
2. Server returns 402 with payment requirements (Base Sepolia USDC).
3. Buyer retries with `PAYMENT-SIGNATURE`.
4. Sandbox facilitator checks the test payload, or `X402_FACILITATOR_URL` settles for real.
5. Server writes the ledger line as `pending_settlement`. A signature alone is not settled.
6. `POST /api/mpp/settle` reconciles it. Only a pending receipt can be settled, and a payment reference can settle only one receipt.

Freddy never promises money, health, relationships, or luck, and every note ends with: Traditional guidance for inspiration only.
