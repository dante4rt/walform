module walform::policy_time_locked;

use walform::form::{Self, Form};

public fun seal_approve(form: &Form, current_epoch: u64): bool {
    let close_epoch = form::close_epoch(form);

    if (close_epoch.is_some()) {
        current_epoch >= *close_epoch.borrow()
    } else {
        false
    }
}
