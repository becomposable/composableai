export type ActivityOptions = {
    startToCloseTimeout?: string;
    retry?: ActivityRetryPolicy;
}

export type ActivityRetryPolicy = {
    initialInterval?: string;
    backoffCoefficient?: number;
    maximumAttempts?: number;
    maximumInterval?: string;
    nonRetryableErrorTypes?: string[];
}

export type ActivityOptionsWrapper = {
    name: string;
    options: ActivityOptions;
};
