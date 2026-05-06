module walform::form;

use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::table::{Self, Table};
use sui::vec_set::{Self, VecSet};
use walform::events;

const ENOT_OWNER: u64 = 0;
const ENOT_ADMIN: u64 = 1;
const EPAUSED: u64 = 2;
const EINVALID_SEVERITY: u64 = 3;
const EINVALID_STATUS: u64 = 4;
const EBOUNTY_DISABLED: u64 = 5;
const EBOUNTY_EMPTY: u64 = 6;
const EANON_BOUNTY: u64 = 7;
const ENOT_APPROVABLE: u64 = 8;

const SEVERITY_NONE: u8 = 0;
const SEVERITY_LOW: u8 = 1;
const SEVERITY_MEDIUM: u8 = 2;
const SEVERITY_HIGH: u8 = 3;
const SEVERITY_CRITICAL: u8 = 4;

const STATUS_NEW: u8 = 0;
const STATUS_TRIAGED: u8 = 1;
const STATUS_APPROVED: u8 = 2;
const STATUS_RESOLVED: u8 = 3;
const STATUS_REJECTED: u8 = 4;

public struct WAL has drop {}

public struct Tiers has store, copy, drop {
    low: u64,
    medium: u64,
    high: u64,
    critical: u64,
}

public struct ResponseRef has store, copy, drop {
    blob_id: vector<u8>,
    root_hash: vector<u8>,
    submitter: Option<address>,
    timestamp_ms: u64,
    severity: u8,
    status: u8,
    notes_blob_id: Option<vector<u8>>,
}

public struct Form has key, store {
    id: UID,
    owner: address,
    schema_blob_id: vector<u8>,
    schema_version: u64,
    response_count: u64,
    aggregate_rating_sum: u64,
    aggregate_rating_count: u64,
    responses: Table<u64, ResponseRef>,
    admins: VecSet<address>,
    paused: bool,
    close_epoch: Option<u64>,
    bounty_pool: Balance<WAL>,
    bounty_tiers: Tiers,
    created_at_ms: u64,
}

public fun new_tiers(low: u64, medium: u64, high: u64, critical: u64): Tiers {
    Tiers { low, medium, high, critical }
}

public fun default_tiers(): Tiers {
    new_tiers(0, 0, 0, 0)
}

public fun new_form(
    owner: address,
    schema_blob_id: vector<u8>,
    schema_version: u64,
    close_epoch: Option<u64>,
    bounty_tiers: Tiers,
    created_at_ms: u64,
    ctx: &mut TxContext,
): Form {
    let mut admins = vec_set::empty<address>();
    admins.insert(owner);

    let form = Form {
        id: object::new(ctx),
        owner,
        schema_blob_id,
        schema_version,
        response_count: 0,
        aggregate_rating_sum: 0,
        aggregate_rating_count: 0,
        responses: table::new(ctx),
        admins,
        paused: false,
        close_epoch,
        bounty_pool: balance::zero<WAL>(),
        bounty_tiers,
        created_at_ms,
    };

    events::emit_form_created(object::id(&form), owner, schema_version);

    form
}

entry fun create_form(schema_blob_id: vector<u8>, schema_version: u64, ctx: &mut TxContext) {
    let owner = tx_context::sender(ctx);
    let form = new_form(
        owner,
        schema_blob_id,
        schema_version,
        option::none(),
        default_tiers(),
        0,
        ctx,
    );
    transfer::transfer(form, owner);
}

public fun severity_none(): u8 { SEVERITY_NONE }

public fun severity_low(): u8 { SEVERITY_LOW }

public fun severity_medium(): u8 { SEVERITY_MEDIUM }

public fun severity_high(): u8 { SEVERITY_HIGH }

public fun severity_critical(): u8 { SEVERITY_CRITICAL }

public fun status_new(): u8 { STATUS_NEW }

public fun status_triaged(): u8 { STATUS_TRIAGED }

public fun status_approved(): u8 { STATUS_APPROVED }

public fun status_resolved(): u8 { STATUS_RESOLVED }

public fun status_rejected(): u8 { STATUS_REJECTED }

public fun id(form: &Form): ID {
    object::id(form)
}

public fun owner(form: &Form): address {
    form.owner
}

public fun schema_blob_id(form: &Form): &vector<u8> {
    &form.schema_blob_id
}

public fun schema_version(form: &Form): u64 {
    form.schema_version
}

public fun is_paused(form: &Form): bool {
    form.paused
}

public fun is_admin(form: &Form, address: address): bool {
    form.admins.contains(&address)
}

public fun admin_count(form: &Form): u64 {
    form.admins.length()
}

public fun close_epoch(form: &Form): Option<u64> {
    form.close_epoch
}

public fun count_responses(form: &Form): u64 {
    form.response_count
}

public fun aggregate_rating(form: &Form, _field_id: vector<u8>): Option<u64> {
    if (form.aggregate_rating_count == 0) {
        option::none()
    } else {
        option::some(form.aggregate_rating_sum / form.aggregate_rating_count)
    }
}

public fun bounty_balance(form: &Form): u64 {
    form.bounty_pool.value()
}

public fun add_admin(form: &mut Form, admin: address, ctx: &TxContext) {
    assert_owner(form, tx_context::sender(ctx));

    if (!form.admins.contains(&admin)) {
        form.admins.insert(admin);
    };

    events::emit_admin_added(object::id(form), admin);
}

public fun transfer_ownership(form: &mut Form, new_owner: address, ctx: &TxContext) {
    assert_owner(form, tx_context::sender(ctx));
    form.owner = new_owner;

    if (!form.admins.contains(&new_owner)) {
        form.admins.insert(new_owner);
    };
}

public fun pause(form: &mut Form, ctx: &TxContext) {
    assert_owner(form, tx_context::sender(ctx));
    form.paused = true;
}

public fun resume(form: &mut Form, ctx: &TxContext) {
    assert_owner(form, tx_context::sender(ctx));
    form.paused = false;
}

public fun submit_response(
    form: &mut Form,
    blob_id: vector<u8>,
    root_hash: vector<u8>,
    submitter: Option<address>,
    timestamp_ms: u64,
    severity: u8,
    mut rating: Option<u64>,
): u64 {
    assert!(!form.paused, EPAUSED);
    assert_valid_severity(severity);

    let response_index = form.response_count;

    if (rating.is_some()) {
        form.aggregate_rating_sum = form.aggregate_rating_sum + rating.extract();
        form.aggregate_rating_count = form.aggregate_rating_count + 1;
    };

    let event_submitter = if (submitter.is_some()) {
        *submitter.borrow()
    } else {
        @0x0
    };

    table::add(&mut form.responses, response_index, ResponseRef {
        blob_id,
        root_hash,
        submitter,
        timestamp_ms,
        severity,
        status: STATUS_NEW,
        notes_blob_id: option::none(),
    });

    form.response_count = form.response_count + 1;

    events::emit_response_submitted(object::id(form), response_index, event_submitter, severity);

    response_index
}

public fun response_ref(form: &Form, response_index: u64): &ResponseRef {
    &form.responses[response_index]
}

public fun response_status(form: &Form, response_index: u64): u8 {
    form.responses[response_index].status
}

public fun response_submitter(form: &Form, response_index: u64): Option<address> {
    form.responses[response_index].submitter
}

public fun set_status(form: &mut Form, response_index: u64, status: u8, ctx: &TxContext) {
    assert_admin(form, tx_context::sender(ctx));
    assert_valid_status(status);

    let response = &mut form.responses[response_index];
    response.status = status;
}

public fun set_notes_blob(
    form: &mut Form,
    response_index: u64,
    notes_blob_id: vector<u8>,
    ctx: &TxContext,
) {
    assert_admin(form, tx_context::sender(ctx));
    let response = &mut form.responses[response_index];
    response.notes_blob_id = option::some(notes_blob_id);
}

public fun verify_response(form: &Form, blob_id: vector<u8>): bool {
    let mut index = 0;
    while (index < form.response_count) {
        if (form.responses.contains(index) && form.responses[index].blob_id == blob_id) {
            return true
        };
        index = index + 1;
    };
    false
}

public fun deposit_bounty(form: &mut Form, coin: Coin<WAL>) {
    form.bounty_pool.join(coin::into_balance(coin));
}

public fun approve_response(form: &mut Form, response_index: u64, ctx: &mut TxContext): Coin<WAL> {
    assert_admin(form, tx_context::sender(ctx));

    let response = &mut form.responses[response_index];
    assert!(response.status != STATUS_APPROVED, ENOT_APPROVABLE);
    assert!(response.submitter.is_some(), EANON_BOUNTY);

    let amount = bounty_amount(&form.bounty_tiers, response.severity);
    assert!(amount > 0, EBOUNTY_DISABLED);
    assert!(form.bounty_pool.value() >= amount, EBOUNTY_EMPTY);

    response.status = STATUS_APPROVED;
    let recipient = *response.submitter.borrow();

    events::emit_bounty_paid(object::id(form), response_index, recipient, amount);

    coin::from_balance(form.bounty_pool.split(amount), ctx)
}

public fun bounty_amount(tiers: &Tiers, severity: u8): u64 {
    if (severity == SEVERITY_LOW) {
        tiers.low
    } else if (severity == SEVERITY_MEDIUM) {
        tiers.medium
    } else if (severity == SEVERITY_HIGH) {
        tiers.high
    } else if (severity == SEVERITY_CRITICAL) {
        tiers.critical
    } else {
        0
    }
}

fun assert_owner(form: &Form, sender: address) {
    assert!(form.owner == sender, ENOT_OWNER);
}

fun assert_admin(form: &Form, sender: address) {
    assert!(form.admins.contains(&sender), ENOT_ADMIN);
}

fun assert_valid_severity(severity: u8) {
    assert!(severity <= SEVERITY_CRITICAL, EINVALID_SEVERITY);
}

fun assert_valid_status(status: u8) {
    assert!(status <= STATUS_REJECTED, EINVALID_STATUS);
}

#[test_only]
public fun remove_response_for_testing(form: &mut Form, response_index: u64): ResponseRef {
    table::remove(&mut form.responses, response_index)
}

#[test_only]
public fun destroy_for_testing(form: Form) {
    let Form {
        id,
        owner: _,
        schema_blob_id: _,
        schema_version: _,
        response_count: _,
        aggregate_rating_sum: _,
        aggregate_rating_count: _,
        responses,
        admins: _,
        paused: _,
        close_epoch: _,
        bounty_pool,
        bounty_tiers: _,
        created_at_ms: _,
    } = form;

    responses.drop();
    let _remaining_bounty = bounty_pool.destroy_for_testing();
    id.delete();
}
