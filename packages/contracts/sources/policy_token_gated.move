module walform::policy_token_gated;

public fun seal_approve(_requester: address, token_balance: u64): bool {
    token_balance > 0
}
