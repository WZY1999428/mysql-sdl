import type { Query } from "./index.js";

type When = {
  when: Query;
  then: any;
}

export type Case = {
    branches: When[];
    else?: any;
}