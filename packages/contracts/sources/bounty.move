module walform::bounty;

use sui::coin::Coin;
use walform::form::{Self, Form, WAL};

public fun deposit(form: &mut Form, coin: Coin<WAL>) {
    form::deposit_bounty(form, coin);
}

public fun approve_response(form: &mut Form, response_index: u64, ctx: &mut TxContext): Coin<WAL> {
    form::approve_response(form, response_index, ctx)
}
