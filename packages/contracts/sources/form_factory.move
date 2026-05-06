module walform::form_factory;

use walform::form::{Self, Form, Tiers};

public fun create_form_for_owner(
    owner: address,
    schema_blob_id: vector<u8>,
    schema_version: u64,
    close_epoch: option::Option<u64>,
    tiers: Tiers,
    created_at_ms: u64,
    ctx: &mut TxContext,
): Form {
    form::new_form(owner, schema_blob_id, schema_version, close_epoch, tiers, created_at_ms, ctx)
}

entry fun create_and_transfer(
    schema_blob_id: vector<u8>,
    schema_version: u64,
    ctx: &mut TxContext,
) {
    let owner = tx_context::sender(ctx);
    let form = form::new_form(
        owner,
        schema_blob_id,
        schema_version,
        option::none(),
        form::default_tiers(),
        0,
        ctx,
    );
    transfer::public_transfer(form, owner);
}
