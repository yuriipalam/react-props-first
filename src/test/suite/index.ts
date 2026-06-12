import { runSmokeTest } from "./smoke.test";

export function run(): Promise<void> {
  return runSmokeTest();
}
