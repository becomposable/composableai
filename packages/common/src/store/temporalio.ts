
/**
 * Copied from temporalio
 * The temporalio ParentClosePolicy
 */
export declare enum ParentClosePolicy {
    /**
     * If a `ParentClosePolicy` is set to this, or is not set at all, the server default value will be used.
     */
    PARENT_CLOSE_POLICY_UNSPECIFIED = 0,
    /**
     * When the Parent is Closed, the Child is Terminated.
     *
     * @default
     */
    PARENT_CLOSE_POLICY_TERMINATE = 1,
    /**
     * When the Parent is Closed, nothing is done to the Child.
     */
    PARENT_CLOSE_POLICY_ABANDON = 2,
    /**
     * When the Parent is Closed, the Child is Cancelled.
     */
    PARENT_CLOSE_POLICY_REQUEST_CANCEL = 3
}
