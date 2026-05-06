#[test_only]
module walform::walform_tests;

use sui::coin;
use sui::test_scenario;
use walform::bounty;
use walform::form::{Self, Form, WAL};
use walform::policy_allowlist;
use walform::policy_open;
use walform::policy_time_locked;
use walform::policy_token_gated;
use walform::receipt;

const OWNER: address = @0xA;
const ADMIN: address = @0xB;
const SUBMITTER: address = @0xC;

fun new_test_form(scenario: &mut test_scenario::Scenario): Form {
    form::new_form(
        OWNER,
        b"schema_blob",
        1,
        option::some(9),
        form::new_tiers(100, 500, 2_000, 5_000),
        1_730_800_000_000,
        scenario.ctx(),
    )
}

#[test]
fun create_form_and_add_admin() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut form = new_test_form(&mut scenario);

    assert!(form::owner(&form) == OWNER);
    assert!(form::count_responses(&form) == 0);
    assert!(form::is_admin(&form, OWNER));
    assert!(form::admin_count(&form) == 1);

    form::add_admin(&mut form, ADMIN, scenario.ctx());
    assert!(form::is_admin(&form, ADMIN));

    form::destroy_for_testing(form);
    scenario.end();
}

#[test]
fun submit_response_updates_count_and_rating() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut form = new_test_form(&mut scenario);

    let index = form::submit_response(
        &mut form,
        b"blob_one",
        b"root_hash",
        option::some(SUBMITTER),
        10,
        form::severity_medium(),
        option::some(5),
    );

    assert!(index == 0);
    assert!(form::count_responses(&form) == 1);
    assert!(form::verify_response(&form, b"blob_one"));
    assert!(*form::aggregate_rating(&form, b"rating").borrow() == 5);

    form::remove_response_for_testing(&mut form, index);
    form::destroy_for_testing(form);
    scenario.end();
}

#[test]
fun transfer_pause_and_resume() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut form = new_test_form(&mut scenario);

    form::transfer_ownership(&mut form, ADMIN, scenario.ctx());
    assert!(form::owner(&form) == ADMIN);
    assert!(form::is_admin(&form, ADMIN));

    test_scenario::next_tx(&mut scenario, ADMIN);
    form::pause(&mut form, scenario.ctx());
    assert!(form::is_paused(&form));
    form::resume(&mut form, scenario.ctx());
    assert!(!form::is_paused(&form));

    form::destroy_for_testing(form);
    scenario.end();
}

#[test]
fun bounty_deposit_and_approve_pays_submitter_tier() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut form = new_test_form(&mut scenario);
    let wal = coin::mint_for_testing<WAL>(1_000, scenario.ctx());

    bounty::deposit(&mut form, wal);
    assert!(form::bounty_balance(&form) == 1_000);

    let index = form::submit_response(
        &mut form,
        b"blob_two",
        b"root_hash",
        option::some(SUBMITTER),
        10,
        form::severity_medium(),
        option::none(),
    );

    let payout = bounty::approve_response(&mut form, index, scenario.ctx());
    assert!(payout.value() == 500);
    assert!(form::bounty_balance(&form) == 500);
    assert!(form::response_status(&form, index) == form::status_approved());

    coin::burn_for_testing(payout);
    form::remove_response_for_testing(&mut form, index);
    form::destroy_for_testing(form);
    scenario.end();
}

#[test]
fun mint_receipt_records_response_identity() {
    let mut scenario = test_scenario::begin(OWNER);
    let form = new_test_form(&mut scenario);
    let receipt = receipt::mint_receipt(&form, 7, SUBMITTER, 99, scenario.ctx());

    assert!(receipt::form_id(&receipt) == form::id(&form));
    assert!(receipt::response_index(&receipt) == 7);
    assert!(receipt::issued_to(&receipt) == SUBMITTER);

    receipt::destroy_for_testing(receipt);
    form::destroy_for_testing(form);
    scenario.end();
}

#[test]
fun policy_modules_match_expected_access() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut form = new_test_form(&mut scenario);

    form::add_admin(&mut form, ADMIN, scenario.ctx());

    assert!(policy_open::seal_approve(SUBMITTER));
    assert!(policy_token_gated::seal_approve(SUBMITTER, 1));
    assert!(!policy_token_gated::seal_approve(SUBMITTER, 0));
    assert!(policy_allowlist::seal_approve(&form, ADMIN));
    assert!(!policy_allowlist::seal_approve(&form, SUBMITTER));
    assert!(!policy_time_locked::seal_approve(&form, 8));
    assert!(policy_time_locked::seal_approve(&form, 9));

    form::destroy_for_testing(form);
    scenario.end();
}
