// Reserved for application events. Email authentication flows await delivery
// directly so provider errors are handled by Express instead of becoming
// unhandled promise rejections.
import { EventEmitter } from "node:events";
export const eventEmitter = new EventEmitter();
