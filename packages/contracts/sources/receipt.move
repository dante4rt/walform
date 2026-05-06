module walform::receipt;

use walform::events;
use walform::form::{Self, Form};

public struct Receipt has key, store {
    id: UID,
    form_id: ID,
    response_index: u64,
    issued_to: address,
    issued_at_ms: u64,
}

public fun mint_receipt(
    form: &Form,
    response_index: u64,
    issued_to: address,
    issued_at_ms: u64,
    ctx: &mut TxContext,
): Receipt {
    let receipt = Receipt {
        id: object::new(ctx),
        form_id: form::id(form),
        response_index,
        issued_to,
        issued_at_ms,
    };

    events::emit_receipt_minted(form::id(form), response_index, issued_to);

    receipt
}

public fun form_id(receipt: &Receipt): ID {
    receipt.form_id
}

public fun response_index(receipt: &Receipt): u64 {
    receipt.response_index
}

public fun issued_to(receipt: &Receipt): address {
    receipt.issued_to
}

#[test_only]
public fun destroy_for_testing(receipt: Receipt) {
    let Receipt {
        id,
        form_id: _,
        response_index: _,
        issued_to: _,
        issued_at_ms: _,
    } = receipt;

    id.delete();
}
