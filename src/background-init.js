// This file handeles the initalization of the background script
import { init } from "./background.js";

init().catch((error) => {
  throw error;
});
