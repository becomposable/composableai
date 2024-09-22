import { ActivityOptions } from "@temporalio/workflow";

export type ActivityOptionsWrapper = {
    name: string;
    options: ActivityOptions;
};
