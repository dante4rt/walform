module walform::events;

use sui::event;

public struct FormCreated has copy, drop {
    form_id: ID,
    owner: address,
    schema_version: u64,
}

public struct ResponseSubmitted has copy, drop {
    form_id: ID,
    response_index: u64,
    submitter: address,
    severity: u8,
}

public struct AdminAdded has copy, drop {
    form_id: ID,
    admin: address,
}

public struct BountyPaid has copy, drop {
    form_id: ID,
    response_index: u64,
    recipient: address,
    amount: u64,
}

public struct ReceiptMinted has copy, drop {
    form_id: ID,
    response_index: u64,
    recipient: address,
}

public fun emit_form_created(form_id: ID, owner: address, schema_version: u64) {
    event::emit(FormCreated { form_id, owner, schema_version });
}

public fun emit_response_submitted(
    form_id: ID,
    response_index: u64,
    submitter: address,
    severity: u8,
) {
    event::emit(ResponseSubmitted { form_id, response_index, submitter, severity });
}

public fun emit_admin_added(form_id: ID, admin: address) {
    event::emit(AdminAdded { form_id, admin });
}

public fun emit_bounty_paid(
    form_id: ID,
    response_index: u64,
    recipient: address,
    amount: u64,
) {
    event::emit(BountyPaid { form_id, response_index, recipient, amount });
}

public fun emit_receipt_minted(form_id: ID, response_index: u64, recipient: address) {
    event::emit(ReceiptMinted { form_id, response_index, recipient });
}
