module walform::policy_allowlist;

use walform::form::{Self, Form};

public fun seal_approve(form: &Form, requester: address): bool {
    form::is_admin(form, requester)
}
