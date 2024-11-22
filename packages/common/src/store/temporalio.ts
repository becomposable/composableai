export type ParentClosePolicy = (typeof ParentClosePolicy)[keyof typeof ParentClosePolicy];
export declare const ParentClosePolicy: {
    /**
     * When the Parent is Closed, the Child is Terminated.
     *
     * @default
     */
    readonly TERMINATE: "TERMINATE";
    /**
     * When the Parent is Closed, nothing is done to the Child.
     */
    readonly ABANDON: "ABANDON";
    /**
     * When the Parent is Closed, the Child is Cancelled.
     */
    readonly REQUEST_CANCEL: "REQUEST_CANCEL";
    /**
     * If a `ParentClosePolicy` is set to this, or is not set at all, the server default value will be used.
     *
     * @deprecated Either leave property `undefined`, or set an explicit policy instead.
     */
    readonly PARENT_CLOSE_POLICY_UNSPECIFIED: undefined;
    /**
     * When the Parent is Closed, the Child is Terminated.
     *
     * @deprecated Use {@link ParentClosePolicy.TERMINATE} instead.
     */
    readonly PARENT_CLOSE_POLICY_TERMINATE: "TERMINATE";
    /**
     * When the Parent is Closed, nothing is done to the Child.
     *
     * @deprecated Use {@link ParentClosePolicy.ABANDON} instead.
     */
    readonly PARENT_CLOSE_POLICY_ABANDON: "ABANDON";
    /**
     * When the Parent is Closed, the Child is Cancelled.
     *
     * @deprecated Use {@link ParentClosePolicy.REQUEST_CANCEL} instead.
     */
    readonly PARENT_CLOSE_POLICY_REQUEST_CANCEL: "REQUEST_CANCEL";
};
