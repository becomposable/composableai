import { ActivityOptions } from "@temporalio/common";

export type ActivityOptionsWrapper = {
    name: string;
    options: ActivityOptions;
};
